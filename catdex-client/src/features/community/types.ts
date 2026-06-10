export type CommunityPostVisibility = 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';

export type CommunityPostStatus = 'ACTIVE' | 'HIDDEN' | 'DELETED' | 'REPORTED' | 'PENDING_REVIEW';

export type CommunityPostMediaType = 'IMAGE' | 'VIDEO';

export type CommunityCommentStatus = 'ACTIVE' | 'HIDDEN' | 'DELETED' | 'REPORTED';

export type CommunityReportTargetType = 'POST' | 'COMMENT';

export type CommunityReportReason =
  | 'SPAM'
  | 'ABUSE'
  | 'INAPPROPRIATE_IMAGE'
  | 'PRIVACY'
  | 'ANIMAL_ABUSE'
  | 'LOCATION_EXPOSURE'
  | 'ETC';

export interface CommunityPostMedia {
  id: string;
  postId: string;
  type: CommunityPostMediaType;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  durationSec?: number;
  sortOrder: number;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorNickname: string;
  authorProfileImageUrl?: string;
  content: string;
  mediaList: CommunityPostMedia[];
  linkedCatIds?: string[];
  likeCount: number;
  commentCount: number;
  isLikedByMe: boolean;
  visibility: CommunityPostVisibility;
  status: CommunityPostStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorId: string;
  authorNickname: string;
  authorProfileImageUrl?: string;
  content: string;
  status: CommunityCommentStatus;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface CommunityPostLike {
  id: string;
  postId: string;
  userId: string;
  createdAt: string;
}

export interface CommunityReport {
  id: string;
  targetType: CommunityReportTargetType;
  targetId: string;
  reporterId: string;
  reason: CommunityReportReason;
  detail?: string;
  createdAt: string;
}

export interface CommunityPostListResponse {
  items: CommunityPost[];
  nextCursor?: string;
  hasNext: boolean;
}

export interface CommunityCreatePostMediaInput {
  type: CommunityPostMediaType;
  uri: string;
  thumbnailUri?: string;
  width?: number;
  height?: number;
  durationSec?: number;
}

export interface CommunityCreatePostInput {
  content: string;
  mediaList: CommunityCreatePostMediaInput[];
  linkedCatIds?: string[];
}

export const COMMUNITY_MEDIA_CONFIG = {
  maxImageCount: 10,
  maxVideoCount: 1,
  maxVideoDurationSec: 60,
  maxImageSizeMb: 10,
  maxVideoSizeMb: 100,
  maxContentLength: 1000,
} as const;
