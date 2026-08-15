export interface CommunityAuthor {
  id: string;
  nickname: string;
  profileImageUrl?: string;
}

export interface CommunityLinkedCat {
  id: string;
  name: string;
  imageUrl?: string;
}

export type CommunityTopic = 'SIGHTING' | 'VERIFY' | 'STATUS' | 'INFO';

export type CommunityReportReason =
  | 'SPAM'
  | 'ABUSE'
  | 'INAPPROPRIATE_IMAGE'
  | 'PRIVACY'
  | 'ANIMAL_ABUSE'
  | 'LOCATION_EXPOSURE'
  | 'ETC';

export interface CommunityPost {
  id: string;
  author: CommunityAuthor;
  title: string;
  content: string;
  topic: CommunityTopic;
  regionName?: string;
  observationNote?: string;
  observedAt?: string;
  createdAt: string;
  imageUrls: string[];
  linkedCat?: CommunityLinkedCat;
  likeCount: number;
  commentCount: number;
  isLikedByMe: boolean;
  isBookmarked: boolean;
  isOwnedByMe: boolean;
}

export interface CommunityComment {
  id: string;
  author: CommunityAuthor;
  content: string;
  createdAt: string;
  likeCount: number;
  isLikedByMe: boolean;
  isOwnedByMe: boolean;
}

export interface CommunityPostDetail extends CommunityPost {
  comments: CommunityComment[];
}

export interface CommunityImageDraft {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

export interface CommunityPostDraft {
  content: string;
  topic: Exclude<CommunityTopic, 'STATUS'>;
  regionName: string;
  catId?: string;
  observationNote?: string;
  observedAt?: string;
  images: CommunityImageDraft[];
}
