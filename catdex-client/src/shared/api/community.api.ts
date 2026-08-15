import { File } from 'expo-file-system';
import { getCurrentUserId } from '@/shared/api/auth.api';
import { throwIfSupabaseError } from '@/shared/api/client';
import { assertSupabaseConfigured, supabase } from '@/shared/supabase/client';
import type {
  CommunityAuthor,
  CommunityComment,
  CommunityImageDraft,
  CommunityPost,
  CommunityPostDetail,
  CommunityPostDraft,
  CommunityReportReason,
  CommunityTopic,
} from '@/shared/types/community';

interface CommunityPostImageRow {
  image_url: string;
  sort_order: number;
}

interface CommunityUserReactionRow {
  user_id: string;
}

interface CommunityCommentRow {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  community_comment_likes: CommunityUserReactionRow[] | null;
}

interface CommunityCatRow {
  id: string;
  name: string;
  image_url: string | null;
}

interface CommunityPostRow {
  id: string;
  author_id: string;
  title: string;
  content: string;
  topic: CommunityTopic;
  region_name: string | null;
  observation_note: string | null;
  observed_at: string | null;
  created_at: string;
  community_post_images: CommunityPostImageRow[] | null;
  community_post_likes: CommunityUserReactionRow[] | null;
  community_post_bookmarks: CommunityUserReactionRow[] | null;
  community_comments: Array<Pick<CommunityCommentRow, 'id'>> | CommunityCommentRow[] | null;
  cats: CommunityCatRow | CommunityCatRow[] | null;
}

interface CommunityAuthorRow {
  id: string;
  nickname: string | null;
  profile_image_url: string | null;
}

interface UploadedCommunityImage {
  path: string;
}

const SIGNED_IMAGE_TTL_SECONDS = 60 * 60;

function getRegionNameCandidates(regionName: string) {
  const normalizedName = regionName.trim();
  const parentName = normalizedName.replace(/\d+가$/, '');

  return [...new Set([normalizedName, parentName].filter(Boolean))];
}

function isDirectImageUri(value: string) {
  return /^(https?:|file:|data:)/.test(value);
}

function relationToOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function signImagePaths(bucket: string, values: string[]) {
  const storagePaths = [...new Set(values.filter((value) => value && !isDirectImageUri(value)))];

  if (storagePaths.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(storagePaths, SIGNED_IMAGE_TTL_SECONDS);

  throwIfSupabaseError(error);

  return new Map(
    (data ?? [])
      .filter((item): item is typeof item & { path: string; signedUrl: string } => Boolean(item.path && item.signedUrl))
      .map((item) => [item.path, item.signedUrl]),
  );
}

function resolveImageUri(value: string | null | undefined, signedUrls: Map<string, string>) {
  if (!value) {
    return undefined;
  }

  return isDirectImageUri(value) ? value : signedUrls.get(value);
}

async function fetchCommunityAuthors(authorIds: string[]) {
  if (authorIds.length === 0) {
    return new Map<string, CommunityAuthor>();
  }

  const { data, error } = await supabase.rpc('get_community_author_profiles', {
    p_user_ids: [...new Set(authorIds)],
  });

  throwIfSupabaseError(error);

  return new Map(
    ((data ?? []) as CommunityAuthorRow[]).map((row) => [
      row.id,
      {
        id: row.id,
        nickname: row.nickname?.trim() || '동네 냥냥단',
        profileImageUrl: row.profile_image_url ?? undefined,
      },
    ]),
  );
}

async function hydrateCommunityPosts(rows: CommunityPostRow[], currentUserId: string | null) {
  const authors = await fetchCommunityAuthors(rows.map((row) => row.author_id));
  const postImagePaths = rows.flatMap((row) =>
    (row.community_post_images ?? []).map((image) => image.image_url),
  );
  const catImagePaths = rows.flatMap((row) => {
    const cat = relationToOne(row.cats);
    return cat?.image_url ? [cat.image_url] : [];
  });
  const [signedPostImages, signedCatImages] = await Promise.all([
    signImagePaths('community-post-images', postImagePaths),
    signImagePaths('cat-images', catImagePaths),
  ]);

  return rows.map<CommunityPost>((row) => {
    const linkedCat = relationToOne(row.cats);
    const images = [...(row.community_post_images ?? [])].sort(
      (left, right) => left.sort_order - right.sort_order,
    );

    return {
      id: row.id,
      author:
        authors.get(row.author_id) ??
        ({ id: row.author_id, nickname: '동네 냥냥단' } satisfies CommunityAuthor),
      title: row.title,
      content: row.content,
      topic: row.topic,
      regionName: row.region_name ?? undefined,
      observationNote: row.observation_note?.trim() || undefined,
      observedAt: row.observed_at ?? undefined,
      createdAt: row.created_at,
      imageUrls: images
        .map((image) => resolveImageUri(image.image_url, signedPostImages))
        .filter((value): value is string => Boolean(value)),
      linkedCat: linkedCat
        ? {
            id: linkedCat.id,
            name: linkedCat.name,
            imageUrl: resolveImageUri(linkedCat.image_url, signedCatImages),
          }
        : undefined,
      likeCount: row.community_post_likes?.length ?? 0,
      commentCount: row.community_comments?.length ?? 0,
      isLikedByMe: Boolean(
        currentUserId && row.community_post_likes?.some((like) => like.user_id === currentUserId),
      ),
      isBookmarked: Boolean(
        currentUserId && row.community_post_bookmarks?.some((bookmark) => bookmark.user_id === currentUserId),
      ),
      isOwnedByMe: row.author_id === currentUserId,
    };
  });
}

const postSelect = `
  id,
  author_id,
  title,
  content,
  topic,
  region_name,
  observation_note,
  observed_at,
  created_at,
  community_post_images (image_url, sort_order),
  community_post_likes (user_id),
  community_post_bookmarks (user_id),
  community_comments (id),
  cats (id, name, image_url)
`;

/** 선택한 동네의 공개 커뮤니티 피드를 최신순으로 불러온다. */
export async function fetchCommunityPosts(regionName: string, limit = 30): Promise<CommunityPost[]> {
  assertSupabaseConfigured();

  const currentUserId = await getCurrentUserId();
  const regionNames = getRegionNameCandidates(regionName);
  const { data, error } = await supabase
    .from('community_posts')
    .select(postSelect)
    .eq('status', 'ACTIVE')
    .eq('visibility', 'PUBLIC')
    // 역지오코딩은 `성수동2가`, 운영 데이터는 `성수동`처럼 저장될 수 있다.
    // 상세 법정동과 그 상위 동 이름을 함께 조회해 같은 생활권 피드가 비지 않게 한다.
    .in('region_name', regionNames)
    .order('created_at', { ascending: false })
    .limit(limit);

  throwIfSupabaseError(error);

  return hydrateCommunityPosts((data ?? []) as CommunityPostRow[], currentUserId);
}

/** 마이페이지의 내 게시글 목록. 동네와 무관하게 내가 쓴 글만 최신순으로 온다. */
export async function fetchMyCommunityPosts(limit = 50): Promise<CommunityPost[]> {
  assertSupabaseConfigured();

  const currentUserId = await getCurrentUserId();

  if (!currentUserId) {
    return [];
  }

  const { data, error } = await supabase
    .from('community_posts')
    .select(postSelect)
    .eq('author_id', currentUserId)
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false })
    .limit(limit);

  throwIfSupabaseError(error);

  return hydrateCommunityPosts((data ?? []) as CommunityPostRow[], currentUserId);
}

/** 상세 화면에 필요한 게시글, 댓글, 현재 사용자의 반응 상태를 한 번에 불러온다. */
export async function fetchCommunityPost(postId: string): Promise<CommunityPostDetail> {
  assertSupabaseConfigured();

  const currentUserId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('community_posts')
    .select(`
      id,
      author_id,
      title,
      content,
      topic,
      region_name,
      observation_note,
      observed_at,
      created_at,
      community_post_images (image_url, sort_order),
      community_post_likes (user_id),
      community_post_bookmarks (user_id),
      community_comments (
        id,
        author_id,
        content,
        created_at,
        community_comment_likes (user_id)
      ),
      cats (id, name, image_url)
    `)
    .eq('id', postId)
    .eq('status', 'ACTIVE')
    .eq('visibility', 'PUBLIC')
    .single();

  throwIfSupabaseError(error);

  const row = data as CommunityPostRow;
  const [post] = await hydrateCommunityPosts([row], currentUserId);
  const commentRows = ((row.community_comments ?? []) as CommunityCommentRow[])
    .slice()
    .sort((left, right) => left.created_at.localeCompare(right.created_at));
  const commentAuthors = await fetchCommunityAuthors(commentRows.map((comment) => comment.author_id));
  const comments = commentRows.map<CommunityComment>((comment) => ({
    id: comment.id,
    author:
      commentAuthors.get(comment.author_id) ??
      ({ id: comment.author_id, nickname: '동네 냥냥단' } satisfies CommunityAuthor),
    content: comment.content,
    createdAt: comment.created_at,
    likeCount: comment.community_comment_likes?.length ?? 0,
    isLikedByMe: Boolean(
      currentUserId && comment.community_comment_likes?.some((like) => like.user_id === currentUserId),
    ),
    isOwnedByMe: comment.author_id === currentUserId,
  }));

  if (!post) {
    throw new Error('게시글을 찾을 수 없어요.');
  }

  return { ...post, comments, commentCount: comments.length };
}

/** 게시글 카드와 상세 화면에서 사용하는 공감 토글. */
export async function setCommunityPostLiked(postId: string, liked: boolean) {
  assertSupabaseConfigured();

  const currentUserId = await getCurrentUserId();

  if (!currentUserId) {
    throw new Error('로그인이 필요해요.');
  }

  if (liked) {
    const { error } = await supabase.from('community_post_likes').insert({
      post_id: postId,
      user_id: currentUserId,
    });

    throwIfSupabaseError(error);
    return;
  }

  const { error } = await supabase
    .from('community_post_likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', currentUserId);

  throwIfSupabaseError(error);
}

export async function setCommunityPostBookmarked(postId: string, bookmarked: boolean) {
  assertSupabaseConfigured();

  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    throw new Error('로그인이 필요해요.');
  }

  const query = bookmarked
    ? supabase.from('community_post_bookmarks').insert({ post_id: postId, user_id: currentUserId })
    : supabase.from('community_post_bookmarks').delete().eq('post_id', postId).eq('user_id', currentUserId);
  const { error } = await query;

  throwIfSupabaseError(error);
}

export async function createCommunityComment(postId: string, content: string) {
  assertSupabaseConfigured();

  const currentUserId = await getCurrentUserId();
  const normalizedContent = content.trim();

  if (!currentUserId) {
    throw new Error('로그인이 필요해요.');
  }
  if (!normalizedContent) {
    throw new Error('댓글을 입력해 주세요.');
  }

  const { error } = await supabase.from('community_comments').insert({
    post_id: postId,
    author_id: currentUserId,
    content: normalizedContent,
  });

  throwIfSupabaseError(error);
}

export async function setCommunityCommentLiked(commentId: string, liked: boolean) {
  assertSupabaseConfigured();

  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    throw new Error('로그인이 필요해요.');
  }

  const query = liked
    ? supabase.from('community_comment_likes').insert({ comment_id: commentId, user_id: currentUserId })
    : supabase.from('community_comment_likes').delete().eq('comment_id', commentId).eq('user_id', currentUserId);
  const { error } = await query;

  throwIfSupabaseError(error);
}

function imageFileDetails(image: CommunityImageDraft, index: number) {
  const mimeType = image.mimeType?.toLowerCase() ?? 'image/jpeg';
  const extensionFromName = /\.([a-z0-9]+)$/i.exec(image.fileName ?? '')?.[1]?.toLowerCase();
  const extensionFromUri = /\.([a-z0-9]+)(?:\?|$)/i.exec(image.uri)?.[1]?.toLowerCase();
  const rawExtension = extensionFromName ?? extensionFromUri ?? mimeType.split('/')[1] ?? 'jpg';
  const extension = rawExtension === 'jpeg' || rawExtension === 'heic' ? 'jpg' : rawExtension;
  const contentType = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';

  return { contentType, extension, suffix: `${Date.now()}-${index}` };
}

async function uploadCommunityImage(
  userId: string,
  postId: string,
  image: CommunityImageDraft,
  index: number,
): Promise<UploadedCommunityImage> {
  const file = new File(image.uri);
  const bytes = await file.arrayBuffer();
  const { contentType, extension, suffix } = imageFileDetails(image, index);
  const path = `${userId}/posts/${postId}/${suffix}.${extension}`;
  const { data, error } = await supabase.storage.from('community-post-images').upload(path, bytes, {
    contentType,
    upsert: false,
  });

  throwIfSupabaseError(error);
  return { path: data.path };
}

export async function createCommunityPost(draft: CommunityPostDraft) {
  assertSupabaseConfigured();

  const currentUserId = await getCurrentUserId();
  const normalizedContent = draft.content.trim();
  const normalizedNote = draft.observationNote?.trim() || null;

  if (!currentUserId) {
    throw new Error('글을 올리려면 로그인이 필요해요.');
  }
  if (normalizedContent.length < 2) {
    throw new Error('동네 이야기를 2자 이상 입력해 주세요.');
  }
  if (!draft.regionName.trim()) {
    throw new Error('발견 위치를 선택해 주세요.');
  }
  if (draft.images.length > 3) {
    throw new Error('사진은 최대 3장까지 올릴 수 있어요.');
  }

  const { data: createdPost, error: insertError } = await supabase
    .from('community_posts')
    .insert({
      author_id: currentUserId,
      title: normalizedNote ?? normalizedContent.slice(0, 48),
      content: normalizedContent,
      topic: draft.topic,
      region_name: draft.regionName.trim(),
      cat_id: draft.catId ?? null,
      observation_note: normalizedNote,
      observed_at: draft.observedAt ?? new Date().toISOString(),
      visibility: 'PUBLIC',
      status: 'ACTIVE',
    })
    .select('id')
    .single();

  throwIfSupabaseError(insertError);

  const postId = createdPost.id as string;
  const uploadedPaths: string[] = [];

  try {
    for (const [index, image] of draft.images.entries()) {
      const uploaded = await uploadCommunityImage(currentUserId, postId, image, index);
      uploadedPaths.push(uploaded.path);
    }

    const { error: imageRowError } = await supabase.rpc('replace_community_post_images', {
      p_post_id: postId,
      p_image_paths: uploadedPaths,
    });
    throwIfSupabaseError(imageRowError);
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from('community-post-images').remove(uploadedPaths).catch(() => undefined);
    }
    try {
      await supabase.from('community_posts').delete().eq('id', postId);
    } catch {
      // 업로드 실패의 원래 오류를 유지한다. 남은 빈 게시글은 본인만 볼 수 있고
      // 다음 정리 작업에서 제거할 수 있다.
    }
    throw error;
  }

  return postId;
}

export async function deleteCommunityPost(postId: string) {
  assertSupabaseConfigured();
  const { error } = await supabase.from('community_posts').update({ status: 'DELETED' }).eq('id', postId);
  throwIfSupabaseError(error);
}

export async function reportCommunityPost(
  postId: string,
  reason: CommunityReportReason | 'OTHER' = 'ETC',
) {
  assertSupabaseConfigured();
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    throw new Error('로그인이 필요해요.');
  }

  // 이전 클라이언트가 쓰던 OTHER를 운영 스키마의 ETC로 호환한다.
  const normalizedReason = reason === 'OTHER' ? 'ETC' : reason;
  const { error } = await supabase.from('community_reports').insert({
    target_type: 'POST',
    target_id: postId,
    reporter_id: currentUserId,
    reason: normalizedReason,
  });

  // 이미 신고한 글을 다시 눌러도 사용자 관점에서는 접수 완료 상태다.
  if (error?.code === '23505') {
    return;
  }

  throwIfSupabaseError(error);
}
