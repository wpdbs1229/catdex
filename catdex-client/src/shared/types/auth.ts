export type AuthProvider = 'kakao' | 'google' | 'apple';

export interface AuthUser {
  id: string;
  nickname: string;
  email?: string;
  provider: AuthProvider;
  profileImageUrl?: string;
  profileSetupCompleted: boolean;
  /** 가입 시각(ISO). 사원증 일련번호를 만드는 데 쓴다. */
  createdAt?: string;
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
  profileImageUrl?: string;
  useDefaultProfileImage?: boolean;
}
