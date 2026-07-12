export type CommunityStoredTopic = 'SIGHTING' | 'VERIFY' | 'STATUS' | 'INFO';
export type CommunityTopic = 'SIGHTING' | 'QUESTION' | 'STATUS' | 'INFO';
export type CommunityFilter = 'ALL' | CommunityTopic;

export interface CommunityAuthor {
  id: string;
  nickname: string;
  profileImageUrl?: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  author: CommunityAuthor;
  body: string;
  createdAt: string;
}

export interface CommunityPostImage {
  id: string;
  uri: string;
  storagePath: string;
}

export interface CommunityPost {
  id: string;
  topic: CommunityTopic;
  title: string;
  body: string;
  regionName?: string;
  catId?: string;
  catName?: string;
  catType?: string;
  catRarity?: number;
  catImageUrl?: string;
  imageUrls: string[];
  images: CommunityPostImage[];
  author: CommunityAuthor;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  comments: CommunityComment[];
}

export interface CommunityPostDraft {
  topic: CommunityTopic;
  title: string;
  body: string;
  regionName: string;
  catId?: string;
  images?: CommunityPostImageDraft[];
}

export interface CommunityPostUpdateDraft {
  topic: CommunityTopic;
  title: string;
  body: string;
  images?: CommunityPostImageDraft[];
}

export interface CommunityPostImageDraft {
  id?: string;
  uri: string;
  mimeType?: string;
  storagePath?: string;
}
