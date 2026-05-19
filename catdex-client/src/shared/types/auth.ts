export type AuthProvider = 'kakao' | 'google';

export interface AuthUser {
  id: string;
  nickname: string;
  email?: string;
  provider: AuthProvider;
  profileImageUrl?: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface ProfileUpdateDraft {
  nickname: string;
  profileImageUri?: string;
  profileImageMimeType?: string;
}
