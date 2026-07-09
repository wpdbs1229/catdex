import { File } from 'expo-file-system';
import { throwIfSupabaseError } from '@/shared/api/client';
import { assertSupabaseConfigured, supabase } from '@/shared/supabase/client';
import type { CatRarity, CatType } from '@/shared/types/cat';
import type {
  CommunityAuthor,
  CommunityComment,
  CommunityFilter,
  CommunityPost,
  CommunityPostDraft,
  CommunityStoredTopic,
  CommunityTopic,
} from '@/shared/types/community';

interface CommunityPostRow {
  id: string;
  author_id: string;
  title: string;
  content: string;
  topic: CommunityStoredTopic;
  region_name: string | null;
  cat_id: string | null;
  created_at: string;
}

interface CommunityCommentRow {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

interface CommunityLikeRow {
  post_id: string;
  user_id: string;
}

interface ProfileRow {
  id: string;
  nickname: string | null;
  profile_image_url: string | null;
}

interface CatSummaryRow {
  id: string;
  name: string;
  type: CatType;
  rarity: CatRarity;
  image_url: string | null;
  representative_photo_url: string | null;
}

interface CommunityPostImageRow {
  post_id: string;
  image_url: string;
  sort_order: number;
}

export interface FetchCommunityThreadsOptions {
  postId?: string;
  regionName?: string;
  topic?: CommunityFilter;
  limit?: number;
}

function formatRelativeTime(value: string) {
  const createdAt = new Date(value).getTime();
  const diffMs = Math.max(0, Date.now() - createdAt);
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return '방금 전';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}일 전`;
  }

  return value.slice(0, 10).replaceAll('-', '.');
}

function uniq<T>(items: Array<T | null | undefined>) {
  return Array.from(new Set(items.filter((item): item is T => item !== null && item !== undefined)));
}

function mapAuthor(row: ProfileRow | undefined, fallbackId: string): CommunityAuthor {
  return {
    id: row?.id ?? fallbackId,
    nickname: row?.nickname?.trim() || '동네 냥냥단',
    profileImageUrl: row?.profile_image_url ?? undefined,
  };
}

function toStoredTopic(topic: CommunityTopic): CommunityStoredTopic {
  return topic === 'QUESTION' ? 'VERIFY' : topic;
}

function toDisplayTopic(topic: CommunityStoredTopic): CommunityTopic {
  return topic === 'VERIFY' ? 'QUESTION' : topic;
}

function getImageExtension(mimeType?: string) {
  if (mimeType === 'image/png') {
    return 'png';
  }

  if (mimeType === 'image/webp') {
    return 'webp';
  }

  return 'jpg';
}

function getImageContentType(mimeType?: string) {
  if (mimeType === 'image/png' || mimeType === 'image/webp' || mimeType === 'image/jpeg') {
    return mimeType;
  }

  return 'image/jpeg';
}

async function getCommunityPostImageUrl(imageUrl: string | null) {
  if (!imageUrl || imageUrl.startsWith('http') || imageUrl.startsWith('file:')) {
    return imageUrl ?? undefined;
  }

  const { data, error } = await supabase.storage.from('community-post-images').createSignedUrl(imageUrl, 60 * 60);
  throwIfSupabaseError(error);

  return data.signedUrl;
}

async function getCatDisplayImageUrl(imageUrl: string | null) {
  if (!imageUrl || imageUrl.startsWith('http') || imageUrl.startsWith('file:')) {
    return imageUrl ?? undefined;
  }

  const { data, error } = await supabase.storage.from('cat-images').createSignedUrl(imageUrl, 60 * 60);
  throwIfSupabaseError(error);

  return data.signedUrl;
}

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  throwIfSupabaseError(error);

  if (!user) {
    throw new Error('커뮤니티 사용에는 로그인이 필요합니다.');
  }

  return user.id;
}

async function getOptionalCurrentUserId() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    return null;
  }

  return session?.user?.id ?? null;
}

export async function fetchCommunityPosts(options: FetchCommunityThreadsOptions = {}): Promise<CommunityPost[]> {
  assertSupabaseConfigured();

  const userId = await getOptionalCurrentUserId();
  const limit = options.limit ?? 30;
  let postsQuery = supabase
    .from('community_posts')
    .select('id, author_id, title, content, topic, region_name, cat_id, created_at')
    .eq('status', 'ACTIVE')
    .eq('visibility', 'PUBLIC')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (options.postId) {
    postsQuery = postsQuery.eq('id', options.postId);
  }

  if (options.regionName) {
    postsQuery = postsQuery.eq('region_name', options.regionName);
  }

  if (options.topic && options.topic !== 'ALL') {
    postsQuery = postsQuery.eq('topic', toStoredTopic(options.topic));
  }

  const postsResponse = await postsQuery;
  throwIfSupabaseError(postsResponse.error);

  const posts = (postsResponse.data ?? []) as CommunityPostRow[];
  const postIds = posts.map((post) => post.id);
  const authorIds = uniq(posts.map((post) => post.author_id));
  const catIds = uniq(posts.map((post) => post.cat_id));

  if (postIds.length === 0) {
    return [];
  }

  const [profilesResponse, catsResponse, commentsResponse, likesResponse, imagesResponse] = await Promise.all([
    supabase.from('profiles').select('id, nickname, profile_image_url').in('id', authorIds),
    catIds.length > 0
      ? supabase.from('cats').select('id, name, type, rarity, image_url, representative_photo_url').in('id', catIds)
      : Promise.resolve({ data: [] as CatSummaryRow[], error: null }),
    supabase
      .from('community_comments')
      .select('id, post_id, author_id, content, created_at')
      .eq('status', 'ACTIVE')
      .in('post_id', postIds)
      .order('created_at', { ascending: false }),
    supabase.from('community_post_likes').select('post_id, user_id').in('post_id', postIds),
    supabase
      .from('community_post_images')
      .select('post_id, image_url, sort_order')
      .in('post_id', postIds)
      .order('sort_order', { ascending: true }),
  ]);

  throwIfSupabaseError(profilesResponse.error);
  throwIfSupabaseError(catsResponse.error);
  throwIfSupabaseError(commentsResponse.error);
  throwIfSupabaseError(likesResponse.error);
  throwIfSupabaseError(imagesResponse.error);

  const comments = (commentsResponse.data ?? []) as CommunityCommentRow[];
  const commentAuthorIds = uniq(comments.map((comment) => comment.author_id));
  const missingCommentAuthorIds = commentAuthorIds.filter((authorId) => !authorIds.includes(authorId));
  const commentProfilesResponse =
    missingCommentAuthorIds.length > 0
      ? await supabase.from('profiles').select('id, nickname, profile_image_url').in('id', missingCommentAuthorIds)
      : { data: [] as ProfileRow[], error: null };

  throwIfSupabaseError(commentProfilesResponse.error);

  const profilesById = new Map(
    [...((profilesResponse.data ?? []) as ProfileRow[]), ...((commentProfilesResponse.data ?? []) as ProfileRow[])].map((profile) => [
      profile.id,
      profile,
    ]),
  );
  const catsById = new Map(((catsResponse.data ?? []) as CatSummaryRow[]).map((cat) => [cat.id, cat]));
  const rawImagesByPostId = ((imagesResponse.data ?? []) as CommunityPostImageRow[]).reduce<Record<string, CommunityPostImageRow[]>>(
    (acc, image) => {
      acc[image.post_id] = [...(acc[image.post_id] ?? []), image];
      return acc;
    },
    {},
  );
  const imageUrlsByPostId = new Map(
    await Promise.all(
      Object.entries(rawImagesByPostId).map(async ([postId, images]) => [
        postId,
        (
          await Promise.all(
            images
              .sort((left, right) => left.sort_order - right.sort_order)
              .map((image) => getCommunityPostImageUrl(image.image_url)),
          )
        ).filter((imageUrl): imageUrl is string => Boolean(imageUrl)),
      ] as const),
    ),
  );
  const catImageUrlsById = new Map(
    await Promise.all(
      ((catsResponse.data ?? []) as CatSummaryRow[]).map(async (cat) => [
        cat.id,
        await getCatDisplayImageUrl(cat.representative_photo_url ?? cat.image_url),
      ] as const),
    ),
  );
  const commentsByPostId = comments.reduce<Record<string, CommunityComment[]>>((acc, comment) => {
    acc[comment.post_id] = [
      ...(acc[comment.post_id] ?? []),
      {
        id: comment.id,
        postId: comment.post_id,
        author: mapAuthor(profilesById.get(comment.author_id), comment.author_id),
        body: comment.content,
        createdAt: formatRelativeTime(comment.created_at),
      },
    ];

    return acc;
  }, {});
  const likes = (likesResponse.data ?? []) as CommunityLikeRow[];
  const likesByPostId = likes.reduce<Record<string, CommunityLikeRow[]>>((acc, like) => {
    acc[like.post_id] = [...(acc[like.post_id] ?? []), like];
    return acc;
  }, {});

  return posts.map((post) => {
    const postLikes = likesByPostId[post.id] ?? [];
    const linkedCat = post.cat_id ? catsById.get(post.cat_id) : undefined;

    return {
      id: post.id,
      topic: toDisplayTopic(post.topic),
      title: post.title || post.content.slice(0, 48) || '동네 이야기',
      body: post.content,
      regionName: post.region_name ?? undefined,
      catId: post.cat_id ?? undefined,
      catName: linkedCat?.name,
      catType: linkedCat?.type,
      catRarity: linkedCat?.rarity,
      catImageUrl: linkedCat ? catImageUrlsById.get(linkedCat.id) : undefined,
      imageUrls: imageUrlsByPostId.get(post.id) ?? [],
      author: mapAuthor(profilesById.get(post.author_id), post.author_id),
      createdAt: formatRelativeTime(post.created_at),
      likeCount: postLikes.length,
      commentCount: commentsByPostId[post.id]?.length ?? 0,
      likedByMe: userId ? postLikes.some((like) => like.user_id === userId) : false,
      comments: commentsByPostId[post.id] ?? [],
    };
  });
}

export async function fetchCommunityPost(postId: string): Promise<CommunityPost | null> {
  const posts = await fetchCommunityPosts({
    postId,
    limit: 1,
  });

  return posts[0] ?? null;
}

export async function createCommunityPost(draft: CommunityPostDraft) {
  assertSupabaseConfigured();

  const userId = await getCurrentUserId();
  const title = draft.title.trim();
  const body = draft.body.trim();

  if (body.length < 2) {
    throw new Error('동네 이야기를 2자 이상 입력해 주세요.');
  }

  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      author_id: userId,
      title: title || body.slice(0, 48),
      content: body,
      topic: toStoredTopic(draft.topic),
      region_name: draft.regionName,
      cat_id: draft.catId ?? null,
      visibility: 'PUBLIC',
      status: 'ACTIVE',
    })
    .select('id')
    .single();

  throwIfSupabaseError(error);

  const postId = data.id as string;
  const images = draft.images ?? [];

  if (images.length > 0) {
    const imageRows = await Promise.all(
      images.slice(0, 5).map(async (image, index) => {
        const file = new File(image.uri);
        const bytes = await file.arrayBuffer();
        const extension = getImageExtension(image.mimeType);
        const contentType = getImageContentType(image.mimeType);
        const path = `${userId}/posts/${postId}/image-${Date.now()}-${index}.${extension}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('community-post-images').upload(path, bytes, {
          contentType,
          upsert: false,
        });

        throwIfSupabaseError(uploadError);

        return {
          post_id: postId,
          author_id: userId,
          image_url: uploadData.path,
          sort_order: index,
        };
      }),
    );

    const { error: imageInsertError } = await supabase.from('community_post_images').insert(imageRows);
    throwIfSupabaseError(imageInsertError);
  }

  return postId;
}

export async function createCommunityComment(postId: string, body: string) {
  assertSupabaseConfigured();

  const userId = await getCurrentUserId();
  const content = body.trim();

  if (content.length < 1) {
    throw new Error('댓글을 입력해 주세요.');
  }

  const { data, error } = await supabase
    .from('community_comments')
    .insert({
      post_id: postId,
      author_id: userId,
      content,
      status: 'ACTIVE',
    })
    .select('id')
    .single();

  throwIfSupabaseError(error);

  return data.id as string;
}

export async function toggleCommunityPostLike(postId: string, liked: boolean) {
  assertSupabaseConfigured();

  const userId = await getCurrentUserId();

  if (liked) {
    const { error } = await supabase.from('community_post_likes').delete().eq('post_id', postId).eq('user_id', userId);
    throwIfSupabaseError(error);
    return false;
  }

  const { error } = await supabase.from('community_post_likes').insert({
    post_id: postId,
    user_id: userId,
  });

  throwIfSupabaseError(error);
  return true;
}
