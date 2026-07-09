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

export interface CommunityPost {
  id: string;
  topic: CommunityTopic;
  title: string;
  body: string;
  regionName?: string;
  catId?: string;
  catName?: string;
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
}
