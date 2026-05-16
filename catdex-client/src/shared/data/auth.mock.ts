import type { AuthProvider, AuthUser } from '@/shared/types/auth';

export const authUsersMock: Record<AuthProvider, AuthUser> = {
  kakao: {
    id: 'mock-kakao-user',
    nickname: '카카오 탐험가',
    email: 'catdex.kakao@example.com',
    provider: 'kakao',
  },
  google: {
    id: 'mock-google-user',
    nickname: '구글 산책러',
    email: 'catdex.google@example.com',
    provider: 'google',
  },
};
