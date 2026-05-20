import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { File } from 'expo-file-system';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { Provider, Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { throwIfSupabaseError } from '@/shared/api/client';
import { assertSupabaseConfigured, isSupabaseConfigured, supabase } from '@/shared/supabase/client';
import type { AuthProvider, AuthSession as CatdexAuthSession, AuthUser, ProfileUpdateDraft } from '@/shared/types/auth';

WebBrowser.maybeCompleteAuthSession();

function getOAuthRedirectUri() {
  const configuredRedirectUri = process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URI?.trim();
  const isExpoGo = Constants.appOwnership === 'expo';
  const isLocalDevelopmentRedirectUri =
    configuredRedirectUri?.startsWith('http://localhost') ||
    configuredRedirectUri?.startsWith('http://127.0.0.1') ||
    configuredRedirectUri?.startsWith('exp://localhost') ||
    configuredRedirectUri?.startsWith('exp://127.0.0.1');

  if (configuredRedirectUri) {
    if (Platform.OS === 'web') {
      return configuredRedirectUri;
    }

    if (isExpoGo) {
      return configuredRedirectUri.startsWith('catdex://') ? Linking.createURL('auth/callback') : configuredRedirectUri;
    }

    if (!isLocalDevelopmentRedirectUri) {
      return configuredRedirectUri;
    }
  }

  if (isExpoGo) {
    return Linking.createURL('auth/callback');
  }

  return AuthSession.makeRedirectUri({
    path: 'auth/callback',
    scheme: 'catdex',
  });
}

function getProvider(user: User, fallback: AuthProvider): AuthProvider {
  const provider = user.app_metadata.provider;

  if (provider === 'kakao' || provider === 'google') {
    return provider;
  }

  return fallback;
}

function getNickname(user: User, provider: AuthProvider) {
  const metadata = user.user_metadata;
  const nickname = metadata.nickname ?? metadata.name ?? metadata.full_name;

  if (typeof nickname === 'string' && nickname.trim()) {
    return nickname;
  }

  if (provider === 'kakao') {
    return '카카오 탐험가';
  }

  if (provider === 'google') {
    return '구글 탐험가';
  }

  return '냥도감 탐험가';
}

function getProfileImageUrl(user: User) {
  const metadata = user.user_metadata;
  const imageUrl = metadata.avatar_url ?? metadata.picture;

  return typeof imageUrl === 'string' ? imageUrl : undefined;
}

function toAuthUser(user: User, fallbackProvider: AuthProvider): AuthUser {
  const provider = getProvider(user, fallbackProvider);

  return {
    id: user.id,
    nickname: getNickname(user, provider),
    email: user.email,
    provider,
    profileImageUrl: getProfileImageUrl(user),
  };
}

function toCatdexSession(session: Session, fallbackProvider: AuthProvider): CatdexAuthSession {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    user: toAuthUser(session.user, fallbackProvider),
  };
}

function getMimeExtension(mimeType?: string) {
  if (mimeType === 'image/png') {
    return 'png';
  }

  if (mimeType === 'image/webp') {
    return 'webp';
  }

  return 'jpg';
}

async function uploadProfileImage(userId: string, imageUri: string, mimeType?: string) {
  const file = new File(imageUri);
  const bytes = await file.arrayBuffer();
  const extension = getMimeExtension(mimeType);
  const contentType = mimeType ?? 'image/jpeg';
  const path = `${userId}/avatar-${Date.now()}.${extension}`;
  const { data, error } = await supabase.storage.from('profile-images').upload(path, bytes, {
    contentType,
    upsert: false,
  });

  throwIfSupabaseError(error);

  const {
    data: { publicUrl },
  } = supabase.storage.from('profile-images').getPublicUrl(data.path);

  return publicUrl;
}

async function signInWithOAuthProvider(provider: Extract<AuthProvider, 'kakao' | 'google'>): Promise<CatdexAuthSession> {
  assertSupabaseConfigured();

  const redirectTo = getOAuthRedirectUri();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as Provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  throwIfSupabaseError(error);

  if (!data.url) {
    throw new Error('OAuth 로그인 URL을 만들 수 없습니다.');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== 'success') {
    throw new Error('OAuth login was cancelled or failed');
  }

  const callbackUrl = new URL(result.url);
  const code = callbackUrl.searchParams.get('code');

  if (!code) {
    throw new Error('OAuth callback code is missing.');
  }

  const exchange = await supabase.auth.exchangeCodeForSession(code);
  throwIfSupabaseError(exchange.error);

  if (!exchange.data.session) {
    throw new Error('Supabase session was not returned.');
  }

  return toCatdexSession(exchange.data.session, provider);
}

export function getGoogleOAuthEntryConfig() {
  return {
    provider: 'google' as const,
    redirectUri: getOAuthRedirectUri(),
  };
}

export function getKakaoOAuthEntryConfig() {
  return {
    provider: 'kakao' as const,
    redirectUri: getOAuthRedirectUri(),
  };
}

export async function signInWithKakao(): Promise<CatdexAuthSession> {
  return signInWithOAuthProvider('kakao');
}

export async function signInWithGoogle(): Promise<CatdexAuthSession> {
  return signInWithOAuthProvider('google');
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const { error } = await supabase.auth.signOut();
  throwIfSupabaseError(error);
}

export async function updateMyProfile(draft: ProfileUpdateDraft, fallbackProvider: AuthProvider): Promise<AuthUser> {
  assertSupabaseConfigured();

  const nickname = draft.nickname.trim();

  if (nickname.length < 2 || nickname.length > 20) {
    throw new Error('닉네임은 2자 이상 20자 이하로 입력해 주세요.');
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  throwIfSupabaseError(userError);

  if (!user) {
    throw new Error('프로필 수정에는 로그인이 필요합니다.');
  }

  const provider = getProvider(user, fallbackProvider);
  const currentProfileImageUrl = getProfileImageUrl(user);
  const profileImageUrl = draft.profileImageUri
    ? await uploadProfileImage(user.id, draft.profileImageUri, draft.profileImageMimeType)
    : currentProfileImageUrl;

  const { data: updatedAuth, error: updateAuthError } = await supabase.auth.updateUser({
    data: {
      nickname,
      name: nickname,
      full_name: nickname,
      ...(profileImageUrl ? { avatar_url: profileImageUrl, picture: profileImageUrl } : {}),
    },
  });

  throwIfSupabaseError(updateAuthError);

  const nextUser = updatedAuth.user ?? user;
  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      nickname,
      email: nextUser.email,
      provider,
      profile_image_url: profileImageUrl ?? null,
    },
    {
      onConflict: 'id',
    },
  );

  throwIfSupabaseError(profileError);

  return {
    ...toAuthUser(nextUser, provider),
    nickname,
    profileImageUrl,
  };
}
