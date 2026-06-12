import { File } from 'expo-file-system';
import { throwIfSupabaseError } from '@/shared/api/client';
import { assertSupabaseConfigured, supabase } from '@/shared/supabase/client';
import type { AuthUser } from '@/shared/types/auth';
import type {
  CommunityComment,
  CommunityCreatePostInput,
  CommunityCreatePostMediaInput,
  CommunityPost,
  CommunityPostListResponse,
  CommunityPostMedia,
  CommunityReport,
  CommunityReportReason,
  CommunityReportTargetType,
} from '@/features/community/types';

const defaultPageSize = 5;
const communityMediaBucket = 'community-media';

interface CommunityPostRow {
  id: string;
  author_id: string;
  content: string;
  visibility: CommunityPost['visibility'];
  status: CommunityPost['status'];
  created_at: string;
  updated_at: string | null;
}

interface CommunityPostMediaRow {
  id: string;
  post_id: string;
  type: CommunityPostMedia['type'];
  url: string;
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  duration_sec: number | null;
  sort_order: number;
  created_at: string;
}

interface CommunityCommentRow {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  status: CommunityComment['status'];
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

interface CommunityProfileRow {
  id: string;
  nickname: string;
  profile_image_url: string | null;
}

interface CommunityLikeRow {
  post_id: string;
  user_id: string;
}

interface CommunityCommentCountRow {
  post_id: string;
  id: string;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function isExternalOrLocalUrl(value: string) {
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('file:');
}

async function getDisplayMediaUrl(url: string | null | undefined) {
  if (!url) {
    return undefined;
  }

  if (isExternalOrLocalUrl(url)) {
    return url;
  }

  const { data, error } = await supabase.storage.from(communityMediaBucket).createSignedUrl(url, 60 * 60);
  throwIfSupabaseError(error);

  return data.signedUrl;
}

function getUploadExtension(media: CommunityCreatePostMediaInput) {
  if (media.type === 'VIDEO') {
    return 'mp4';
  }

  if (media.uri.toLowerCase().includes('.png')) {
    return 'png';
  }

  if (media.uri.toLowerCase().includes('.webp')) {
    return 'webp';
  }

  return 'jpg';
}

function getUploadContentType(media: CommunityCreatePostMediaInput) {
  if (media.type === 'VIDEO') {
    return 'video/mp4';
  }

  const extension = getUploadExtension(media);

  if (extension === 'png') {
    return 'image/png';
  }

  if (extension === 'webp') {
    return 'image/webp';
  }

  return 'image/jpeg';
}

async function uploadCommunityMedia(media: CommunityCreatePostMediaInput, authorId: string, index: number) {
  if (isExternalOrLocalUrl(media.uri) && !media.uri.startsWith('file:')) {
    return media.uri;
  }

  const file = new File(media.uri);
  const bytes = await file.arrayBuffer();
  const extension = getUploadExtension(media);
  const path = `${authorId}/posts/community-${Date.now()}-${index}.${extension}`;
  const { data, error } = await supabase.storage.from(communityMediaBucket).upload(path, bytes, {
    contentType: getUploadContentType(media),
    upsert: false,
  });

  throwIfSupabaseError(error);

  return data.path;
}

async function fetchProfileMap(authorIds: string[]) {
  const ids = unique(authorIds);

  if (ids.length === 0) {
    return new Map<string, CommunityProfileRow>();
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, nickname, profile_image_url')
    .in('id', ids);

  throwIfSupabaseError(error);

  return new Map(((data ?? []) as CommunityProfileRow[]).map((profile) => [profile.id, profile]));
}

async function fetchMediaByPostId(postIds: string[]) {
  const ids = unique(postIds);

  if (ids.length === 0) {
    return new Map<string, CommunityPostMedia[]>();
  }

  const { data, error } = await supabase
    .from('community_post_media')
    .select('id, post_id, type, url, thumbnail_url, width, height, duration_sec, sort_order, created_at')
    .in('post_id', ids)
    .order('sort_order', { ascending: true });

  throwIfSupabaseError(error);

  const rows = (data ?? []) as CommunityPostMediaRow[];
  const mediaList = await Promise.all(
    rows.map(async (media) => ({
      id: media.id,
      postId: media.post_id,
      type: media.type,
      url: (await getDisplayMediaUrl(media.url)) ?? media.url,
      thumbnailUrl: await getDisplayMediaUrl(media.thumbnail_url),
      width: media.width ?? undefined,
      height: media.height ?? undefined,
      durationSec: media.duration_sec ?? undefined,
      sortOrder: media.sort_order,
      createdAt: media.created_at,
    })),
  );

  return mediaList.reduce<Map<string, CommunityPostMedia[]>>((acc, media) => {
    acc.set(media.postId, [...(acc.get(media.postId) ?? []), media]);
    return acc;
  }, new Map<string, CommunityPostMedia[]>());
}

async function fetchLikesByPostId(postIds: string[]) {
  const ids = unique(postIds);

  if (ids.length === 0) {
    return new Map<string, CommunityLikeRow[]>();
  }

  const { data, error } = await supabase
    .from('community_post_likes')
    .select('post_id, user_id')
    .in('post_id', ids);

  throwIfSupabaseError(error);

  return ((data ?? []) as CommunityLikeRow[]).reduce<Map<string, CommunityLikeRow[]>>((acc, like) => {
    acc.set(like.post_id, [...(acc.get(like.post_id) ?? []), like]);
    return acc;
  }, new Map<string, CommunityLikeRow[]>());
}

async function fetchCommentCountsByPostId(postIds: string[]) {
  const ids = unique(postIds);

  if (ids.length === 0) {
    return new Map<string, number>();
  }

  const { data, error } = await supabase
    .from('community_comments')
    .select('post_id, id')
    .eq('status', 'ACTIVE')
    .in('post_id', ids);

  throwIfSupabaseError(error);

  return ((data ?? []) as CommunityCommentCountRow[]).reduce<Map<string, number>>((acc, comment) => {
    acc.set(comment.post_id, (acc.get(comment.post_id) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());
}

async function mapPostRows(rows: CommunityPostRow[], userId?: string): Promise<CommunityPost[]> {
  const postIds = rows.map((row) => row.id);
  const [profileById, mediaByPostId, likesByPostId, commentCountByPostId] = await Promise.all([
    fetchProfileMap(rows.map((row) => row.author_id)),
    fetchMediaByPostId(postIds),
    fetchLikesByPostId(postIds),
    fetchCommentCountsByPostId(postIds),
  ]);

  return rows.map((row) => {
    const profile = profileById.get(row.author_id);
    const likes = likesByPostId.get(row.id) ?? [];

    return {
      id: row.id,
      authorId: row.author_id,
      authorNickname: profile?.nickname ?? '냥도감 탐험가',
      authorProfileImageUrl: profile?.profile_image_url ?? undefined,
      content: row.content,
      mediaList: mediaByPostId.get(row.id) ?? [],
      linkedCatIds: [],
      likeCount: likes.length,
      commentCount: commentCountByPostId.get(row.id) ?? 0,
      isLikedByMe: userId ? likes.some((like) => like.user_id === userId) : false,
      visibility: row.visibility,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at ?? undefined,
    };
  });
}

async function fetchCommunityPostById(postId: string, userId?: string) {
  const { data, error } = await supabase
    .from('community_posts')
    .select('id, author_id, content, visibility, status, created_at, updated_at')
    .eq('id', postId)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  throwIfSupabaseError(error);

  if (!data) {
    throw new Error('게시글을 찾지 못했어요.');
  }

  const [post] = await mapPostRows([data as CommunityPostRow], userId);

  return post;
}

async function mapCommentRow(row: CommunityCommentRow): Promise<CommunityComment> {
  const profileById = await fetchProfileMap([row.author_id]);
  const profile = profileById.get(row.author_id);

  return {
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    authorNickname: profile?.nickname ?? '냥도감 탐험가',
    authorProfileImageUrl: profile?.profile_image_url ?? undefined,
    content: row.content,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
  };
}

export async function fetchCommunityPosts(params: {
  cursor?: string;
  limit?: number;
  userId?: string;
} = {}): Promise<CommunityPostListResponse> {
  assertSupabaseConfigured();

  const limit = params.limit ?? defaultPageSize;
  const startIndex = params.cursor ? Number(params.cursor) : 0;
  const endIndex = startIndex + limit;
  const { data, error } = await supabase
    .from('community_posts')
    .select('id, author_id, content, visibility, status, created_at, updated_at')
    .eq('status', 'ACTIVE')
    .eq('visibility', 'PUBLIC')
    .order('created_at', { ascending: false })
    .range(startIndex, endIndex);

  throwIfSupabaseError(error);

  const rows = (data ?? []) as CommunityPostRow[];
  const pageRows = rows.slice(0, limit);

  return {
    items: await mapPostRows(pageRows, params.userId),
    nextCursor: rows.length > limit ? String(startIndex + limit) : undefined,
    hasNext: rows.length > limit,
  };
}

export async function createCommunityPost(input: CommunityCreatePostInput, author: AuthUser): Promise<CommunityPost> {
  assertSupabaseConfigured();

  const { data: post, error: postError } = await supabase
    .from('community_posts')
    .insert({
      author_id: author.id,
      content: input.content.trim(),
      visibility: 'PUBLIC',
      status: 'ACTIVE',
    })
    .select('id')
    .single();

  throwIfSupabaseError(postError);

  const mediaRows = await Promise.all(
    input.mediaList.map(async (media, index) => ({
      post_id: post.id,
      type: media.type,
      url: await uploadCommunityMedia(media, author.id, index),
      thumbnail_url: media.thumbnailUri && !media.thumbnailUri.startsWith('file:') ? media.thumbnailUri : null,
      width: media.width ?? null,
      height: media.height ?? null,
      duration_sec: media.durationSec ?? null,
      sort_order: index,
    })),
  );

  if (mediaRows.length > 0) {
    const { error: mediaError } = await supabase.from('community_post_media').insert(mediaRows);
    throwIfSupabaseError(mediaError);
  }

  return fetchCommunityPostById(post.id, author.id);
}

export async function toggleCommunityPostLike(postId: string, user: AuthUser): Promise<CommunityPost> {
  assertSupabaseConfigured();

  const { data: existingLike, error: likeLookupError } = await supabase
    .from('community_post_likes')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle();

  throwIfSupabaseError(likeLookupError);

  if (existingLike) {
    const { error } = await supabase
      .from('community_post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id);

    throwIfSupabaseError(error);
  } else {
    const { error } = await supabase
      .from('community_post_likes')
      .insert({
        post_id: postId,
        user_id: user.id,
      });

    throwIfSupabaseError(error);
  }

  return fetchCommunityPostById(postId, user.id);
}

export async function deleteCommunityPost(postId: string, user: AuthUser): Promise<void> {
  assertSupabaseConfigured();

  const { data, error } = await supabase
    .from('community_posts')
    .update({
      status: 'DELETED',
    })
    .eq('id', postId)
    .eq('author_id', user.id)
    .select('id')
    .maybeSingle();

  throwIfSupabaseError(error);

  if (!data) {
    throw new Error('내가 작성한 게시글만 삭제할 수 있어요.');
  }
}

export async function fetchCommunityComments(postId: string): Promise<CommunityComment[]> {
  assertSupabaseConfigured();

  const { data, error } = await supabase
    .from('community_comments')
    .select('id, post_id, author_id, content, status, created_at, updated_at, deleted_at')
    .eq('post_id', postId)
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: true });

  throwIfSupabaseError(error);

  return Promise.all(((data ?? []) as CommunityCommentRow[]).map(mapCommentRow));
}

export async function createCommunityComment(postId: string, content: string, author: AuthUser): Promise<CommunityComment> {
  assertSupabaseConfigured();

  const { data, error } = await supabase
    .from('community_comments')
    .insert({
      post_id: postId,
      author_id: author.id,
      content: content.trim(),
      status: 'ACTIVE',
    })
    .select('id, post_id, author_id, content, status, created_at, updated_at, deleted_at')
    .single();

  throwIfSupabaseError(error);

  return mapCommentRow(data as CommunityCommentRow);
}

export async function deleteCommunityComment(postId: string, commentId: string, user: AuthUser): Promise<void> {
  assertSupabaseConfigured();

  const { data, error } = await supabase
    .from('community_comments')
    .update({
      status: 'DELETED',
      deleted_at: new Date().toISOString(),
    })
    .eq('post_id', postId)
    .eq('id', commentId)
    .eq('author_id', user.id)
    .select('id')
    .maybeSingle();

  throwIfSupabaseError(error);

  if (!data) {
    throw new Error('내가 작성한 댓글만 삭제할 수 있어요.');
  }
}

export async function reportCommunityTarget(params: {
  targetType: CommunityReportTargetType;
  targetId: string;
  reporter: AuthUser;
  reason: CommunityReportReason;
  detail?: string;
}): Promise<CommunityReport> {
  assertSupabaseConfigured();

  const { data, error } = await supabase
    .from('community_reports')
    .insert({
      target_type: params.targetType,
      target_id: params.targetId,
      reporter_id: params.reporter.id,
      reason: params.reason,
      detail: params.detail ?? null,
    })
    .select('id, target_type, target_id, reporter_id, reason, detail, created_at')
    .single();

  throwIfSupabaseError(error);

  return {
    id: data.id,
    targetType: data.target_type,
    targetId: data.target_id,
    reporterId: data.reporter_id,
    reason: data.reason,
    detail: data.detail ?? undefined,
    createdAt: data.created_at,
  };
}
