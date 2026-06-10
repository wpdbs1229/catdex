import type { AuthUser } from '@/shared/types/auth';
import { initialCommunityComments, initialCommunityPosts, type CommunityPostRecord } from '@/features/community/services/communityMockData';
import type {
  CommunityComment,
  CommunityCreatePostInput,
  CommunityPost,
  CommunityPostListResponse,
  CommunityReport,
  CommunityReportReason,
  CommunityReportTargetType,
} from '@/features/community/types';

const repositoryDelayMs = 220;
const defaultPageSize = 5;

let postRecords: CommunityPostRecord[] = [...initialCommunityPosts];
let commentsByPostId: Record<string, CommunityComment[]> = Object.fromEntries(
  Object.entries(initialCommunityComments).map(([postId, comments]) => [postId, [...comments]]),
);
let reports: CommunityReport[] = [];

function wait(ms = repositoryDelayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toPost(record: CommunityPostRecord, userId?: string): CommunityPost {
  return {
    ...record,
    likeCount: record.likedUserIds.length,
    isLikedByMe: userId ? record.likedUserIds.includes(userId) : false,
  };
}

function getSortedActiveRecords() {
  return [...postRecords]
    .filter((post) => post.status === 'ACTIVE')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function syncCommentCount(postId: string) {
  const activeCount = (commentsByPostId[postId] ?? []).filter((comment) => comment.status === 'ACTIVE').length;
  postRecords = postRecords.map((post) => (post.id === postId ? { ...post, commentCount: activeCount } : post));

  return activeCount;
}

function requirePostRecord(postId: string) {
  const post = postRecords.find((record) => record.id === postId && record.status !== 'DELETED');

  if (!post) {
    throw new Error('게시글을 찾지 못했어요.');
  }

  return post;
}

export async function fetchCommunityPosts(params: {
  cursor?: string;
  limit?: number;
  userId?: string;
} = {}): Promise<CommunityPostListResponse> {
  await wait();

  const limit = params.limit ?? defaultPageSize;
  const startIndex = params.cursor ? Number(params.cursor) : 0;
  const records = getSortedActiveRecords();
  const page = records.slice(startIndex, startIndex + limit).map((record) => toPost(record, params.userId));
  const nextIndex = startIndex + limit;

  return {
    items: page,
    nextCursor: nextIndex < records.length ? String(nextIndex) : undefined,
    hasNext: nextIndex < records.length,
  };
}

export async function createCommunityPost(input: CommunityCreatePostInput, author: AuthUser): Promise<CommunityPost> {
  await wait(320);

  const now = new Date().toISOString();
  const postId = createId('community-post');
  const record: CommunityPostRecord = {
    id: postId,
    authorId: author.id,
    authorNickname: author.nickname,
    authorProfileImageUrl: author.profileImageUrl,
    content: input.content.trim(),
    mediaList: input.mediaList.map((media, index) => ({
      id: createId('community-media'),
      postId,
      type: media.type,
      url: media.uri,
      thumbnailUrl: media.thumbnailUri,
      width: media.width,
      height: media.height,
      durationSec: media.durationSec,
      sortOrder: index,
      createdAt: now,
    })),
    linkedCatIds: input.linkedCatIds ?? [],
    likedUserIds: [],
    commentCount: 0,
    visibility: 'PUBLIC',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  };

  postRecords = [record, ...postRecords];
  commentsByPostId[postId] = [];

  return toPost(record, author.id);
}

export async function toggleCommunityPostLike(postId: string, user: AuthUser): Promise<CommunityPost> {
  await wait(180);

  const record = requirePostRecord(postId);
  const isLiked = record.likedUserIds.includes(user.id);
  const nextLikedUserIds = isLiked ? record.likedUserIds.filter((userId) => userId !== user.id) : [...record.likedUserIds, user.id];

  postRecords = postRecords.map((post) => (post.id === postId ? { ...post, likedUserIds: nextLikedUserIds } : post));

  return toPost({ ...record, likedUserIds: nextLikedUserIds }, user.id);
}

export async function deleteCommunityPost(postId: string, user: AuthUser): Promise<void> {
  await wait(220);

  const record = requirePostRecord(postId);

  if (record.authorId !== user.id) {
    throw new Error('내가 작성한 게시글만 삭제할 수 있어요.');
  }

  postRecords = postRecords.map((post) =>
    post.id === postId
      ? {
          ...post,
          status: 'DELETED',
          updatedAt: new Date().toISOString(),
        }
      : post,
  );
}

export async function fetchCommunityComments(postId: string): Promise<CommunityComment[]> {
  await wait();

  requirePostRecord(postId);

  return [...(commentsByPostId[postId] ?? [])]
    .filter((comment) => comment.status === 'ACTIVE')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function createCommunityComment(postId: string, content: string, author: AuthUser): Promise<CommunityComment> {
  await wait(240);
  requirePostRecord(postId);

  const now = new Date().toISOString();
  const comment: CommunityComment = {
    id: createId('community-comment'),
    postId,
    authorId: author.id,
    authorNickname: author.nickname,
    authorProfileImageUrl: author.profileImageUrl,
    content: content.trim(),
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  };

  commentsByPostId = {
    ...commentsByPostId,
    [postId]: [...(commentsByPostId[postId] ?? []), comment],
  };
  syncCommentCount(postId);

  return comment;
}

export async function deleteCommunityComment(postId: string, commentId: string, user: AuthUser): Promise<void> {
  await wait(220);
  requirePostRecord(postId);

  const comments = commentsByPostId[postId] ?? [];
  const comment = comments.find((item) => item.id === commentId);

  if (!comment) {
    throw new Error('댓글을 찾지 못했어요.');
  }

  if (comment.authorId !== user.id) {
    throw new Error('내가 작성한 댓글만 삭제할 수 있어요.');
  }

  commentsByPostId = {
    ...commentsByPostId,
    [postId]: comments.map((item) =>
      item.id === commentId
        ? {
            ...item,
            status: 'DELETED',
            deletedAt: new Date().toISOString(),
          }
        : item,
    ),
  };
  syncCommentCount(postId);
}

export async function reportCommunityTarget(params: {
  targetType: CommunityReportTargetType;
  targetId: string;
  reporter: AuthUser;
  reason: CommunityReportReason;
  detail?: string;
}): Promise<CommunityReport> {
  await wait(220);

  const duplicated = reports.some(
    (report) =>
      report.targetType === params.targetType &&
      report.targetId === params.targetId &&
      report.reporterId === params.reporter.id,
  );

  if (duplicated) {
    throw new Error('이미 신고가 접수되었어요.');
  }

  const report: CommunityReport = {
    id: createId('community-report'),
    targetType: params.targetType,
    targetId: params.targetId,
    reporterId: params.reporter.id,
    reason: params.reason,
    detail: params.detail,
    createdAt: new Date().toISOString(),
  };

  reports = [report, ...reports];

  return report;
}
