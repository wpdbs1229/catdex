import type { CommunityComment, CommunityPost, CommunityPostMedia } from '@/features/community/types';

export interface CommunityPostRecord extends Omit<CommunityPost, 'isLikedByMe' | 'likeCount'> {
  likedUserIds: string[];
}

const now = Date.now();

function minutesAgo(minutes: number) {
  return new Date(now - minutes * 60 * 1000).toISOString();
}

function createMedia(
  postId: string,
  id: string,
  type: CommunityPostMedia['type'],
  url: string,
  sortOrder: number,
  thumbnailUrl?: string,
): CommunityPostMedia {
  return {
    id,
    postId,
    type,
    url,
    thumbnailUrl,
    width: 1200,
    height: 900,
    durationSec: type === 'VIDEO' ? 18 : undefined,
    sortOrder,
    createdAt: minutesAgo(240 - sortOrder),
  };
}

export const initialCommunityPosts: CommunityPostRecord[] = [
  {
    id: 'community-post-1',
    authorId: 'mock-author-1',
    authorNickname: '치즈냥집사',
    authorProfileImageUrl: undefined,
    content: '오늘 골목 끝 화단에서 늘어지게 낮잠 자던 치즈냥을 만났어요. 눈 마주치고도 도망가지 않아서 오래 바라봤습니다.',
    mediaList: [createMedia('community-post-1', 'community-media-1', 'IMAGE', 'asset:orange', 0)],
    linkedCatIds: [],
    likedUserIds: ['mock-author-2', 'mock-author-3'],
    commentCount: 2,
    visibility: 'PUBLIC',
    status: 'ACTIVE',
    createdAt: minutesAgo(12),
    updatedAt: minutesAgo(12),
  },
  {
    id: 'community-post-2',
    authorId: 'mock-author-2',
    authorNickname: '골목탐험가',
    authorProfileImageUrl: undefined,
    content: '비 오기 전에 턱시도 친구가 처마 아래로 쏙 들어가더라고요. 짧은 영상으로 남겼어요.',
    mediaList: [createMedia('community-post-2', 'community-media-2', 'VIDEO', 'mock-video:rain-tuxedo', 0, 'asset:tuxedo')],
    linkedCatIds: [],
    likedUserIds: ['mock-author-1'],
    commentCount: 1,
    visibility: 'PUBLIC',
    status: 'ACTIVE',
    createdAt: minutesAgo(76),
    updatedAt: minutesAgo(76),
  },
  {
    id: 'community-post-3',
    authorId: 'mock-author-3',
    authorNickname: '삼색이노트',
    authorProfileImageUrl: undefined,
    content: '새로 만난 삼색이 특징을 기록해 둡니다. 왼쪽 귀 끝이 살짝 접혀 있고, 사람을 천천히 관찰해요.',
    mediaList: [
      createMedia('community-post-3', 'community-media-3', 'IMAGE', 'asset:dark', 0),
      createMedia('community-post-3', 'community-media-4', 'IMAGE', 'asset:gray', 1),
    ],
    linkedCatIds: [],
    likedUserIds: ['mock-author-1', 'mock-author-2', 'mock-author-4'],
    commentCount: 0,
    visibility: 'PUBLIC',
    status: 'ACTIVE',
    createdAt: minutesAgo(150),
    updatedAt: minutesAgo(150),
  },
];

export const initialCommunityComments: Record<string, CommunityComment[]> = {
  'community-post-1': [
    {
      id: 'community-comment-1',
      postId: 'community-post-1',
      authorId: 'mock-author-2',
      authorNickname: '골목탐험가',
      content: '저 친구 저녁 시간에도 자주 보이더라고요.',
      status: 'ACTIVE',
      createdAt: minutesAgo(8),
    },
    {
      id: 'community-comment-2',
      postId: 'community-post-1',
      authorId: 'mock-author-3',
      authorNickname: '삼색이노트',
      content: '사진 분위기가 정말 따뜻해요.',
      status: 'ACTIVE',
      createdAt: minutesAgo(5),
    },
  ],
  'community-post-2': [
    {
      id: 'community-comment-3',
      postId: 'community-post-2',
      authorId: 'mock-author-1',
      authorNickname: '치즈냥집사',
      content: '영상 썸네일만 봐도 처마 아래가 편해 보여요.',
      status: 'ACTIVE',
      createdAt: minutesAgo(50),
    },
  ],
  'community-post-3': [],
};
