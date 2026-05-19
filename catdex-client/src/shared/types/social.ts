import type { CatType } from '@/shared/types/cat';
import type { CollectionProfile, CollectionTheme } from '@/shared/types/collection';

export interface PublicFeaturedCat {
  slot: number;
  id: string;
  number: number;
  name: string;
  type: CatType;
  imageUrl?: string;
}

export interface PublicCollectionStats {
  collectedCount: number;
  badgeCount: number;
  stampCount: number;
  likeCount: number;
  followerCount: number;
}

export interface PublicCollectionViewerState {
  liked: boolean;
  following: boolean;
  isOwner: boolean;
}

export interface PublicCollection {
  ownerId: string;
  nickname: string;
  profileImageUrl?: string;
  planName: string;
  hasNyangkkureomi: boolean;
  profile: CollectionProfile & {
    isPublic: boolean;
  };
  theme: CollectionTheme;
  featuredCats: PublicFeaturedCat[];
  stats: PublicCollectionStats;
  viewer: PublicCollectionViewerState;
}

export interface CollectionLikeResult {
  liked: boolean;
  likeCount: number;
}

export interface CollectionFollowResult {
  following: boolean;
  followerCount: number;
}
