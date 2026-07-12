import * as AuthSession from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import Constants from 'expo-constants';
import { File } from 'expo-file-system';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { Provider, Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { throwIfSupabaseError } from '@/shared/api/client';
import { DEFAULT_PROFILE_NICKNAME } from '@/shared/constants/profile.constants';
import { assertSupabaseConfigured, isSupabaseConfigured, supabase } from '@/shared/supabase/client';
import type {
  AuthProvider,
  AuthSession as CatdexAuthSession,
  AuthUser,
  ProfileUpdateDraft,
} from '@/shared/types/auth';

WebBrowser.maybeCompleteAuthSession();

function getAppScheme() {
  const configuredScheme = Constants.expoConfig?.scheme;

  if (Array.isArray(configuredScheme)) {
    return configuredScheme[0] ?? 'catdex';
  }

  if (typeof configuredScheme === 'string' && configuredScheme.trim()) {
    return configuredScheme.trim();
  }

  return 'catdex';
}

function getOAuthRedirectUri() {
  const configuredRedirectUri = process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URI?.trim();
  const appScheme = getAppScheme();
  const isExpoGo = Constants.appOwnership === 'expo';
  const isLocalDevelopmentRedirectUri =
    configuredRedirectUri?.startsWith('http://localhost') ||
    configuredRedirectUri?.startsWith('http://127.0.0.1') ||
    configuredRedirectUri?.startsWith('exp://localhost') ||
    configuredRedirectUri?.startsWith('exp://127.0.0.1');
  const isAppSchemeRedirectUri = configuredRedirectUri?.startsWith(`${appScheme}://`);

  if (configuredRedirectUri) {
    if (Platform.OS === 'web') {
      return configuredRedirectUri;
    }

    if (isExpoGo) {
      return isLocalDevelopmentRedirectUri ? configuredRedirectUri : Linking.createURL('auth/callback');
    }

    if (!isLocalDevelopmentRedirectUri && isAppSchemeRedirectUri) {
      return configuredRedirectUri;
    }
  }

  if (isExpoGo) {
    return Linking.createURL('auth/callback');
  }

  return AuthSession.makeRedirectUri({
    path: 'auth/callback',
    scheme: appScheme,
  });
}

function getProvider(user: User, fallback: AuthProvider): AuthProvider {
  const provider = user.app_metadata.provider;

  if (provider === 'kakao' || provider === 'google') {
    return provider;
  }

  return fallback;
}

function getNickname(user: User) {
  if (!isProfileSetupCompleted(user)) {
    return DEFAULT_PROFILE_NICKNAME;
  }

  const metadata = user.user_metadata;
  const nickname = metadata.nickname ?? metadata.name ?? metadata.full_name;

  if (typeof nickname === 'string' && nickname.trim()) {
    return nickname;
  }

  return DEFAULT_PROFILE_NICKNAME;
}

function getProfileImageUrl(user: User) {
  if (!isProfileSetupCompleted(user)) {
    return undefined;
  }

  const metadata = user.user_metadata;
  const imageUrl = metadata.avatar_url ?? metadata.picture;

  return typeof imageUrl === 'string' ? imageUrl : undefined;
}

function isProfileSetupCompleted(user: User) {
  const value = user.user_metadata.catdex_profile_setup_completed;

  return value === true || value === 'true';
}

function getProviderNickname(user: User) {
  const metadata = user.user_metadata;
  const nickname = metadata.catdex_oauth_nickname ?? metadata.nickname ?? metadata.name ?? metadata.full_name;

  return typeof nickname === 'string' && nickname.trim() ? nickname.trim() : undefined;
}

function getProviderProfileImageUrl(user: User) {
  const metadata = user.user_metadata;
  const imageUrl = metadata.catdex_oauth_profile_image_url ?? metadata.avatar_url ?? metadata.picture;

  return typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl : undefined;
}

function toAuthUser(user: User, fallbackProvider: AuthProvider): AuthUser {
  const provider = getProvider(user, fallbackProvider);
  const providerProfile = {
    nickname: getProviderNickname(user),
    profileImageUrl: getProviderProfileImageUrl(user),
  };

  return {
    id: user.id,
    nickname: getNickname(user),
    email: user.email,
    provider,
    profileImageUrl: getProfileImageUrl(user),
    profileSetupCompleted: isProfileSetupCompleted(user),
    providerProfile:
      providerProfile.nickname || providerProfile.profileImageUrl
        ? providerProfile
        : undefined,
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

function validateNickname(nickname: string) {
  const trimmedNickname = nickname.trim();

  if (trimmedNickname.length < 2 || trimmedNickname.length > 20) {
    throw new Error('닉네임은 2자 이상 20자 이하로 입력해 주세요.');
  }

  return trimmedNickname;
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

async function upsertProfile(user: User, provider: AuthProvider, nickname: string, profileImageUrl?: string) {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      nickname,
      email: user.email ?? null,
      provider,
      profile_image_url: profileImageUrl ?? null,
    },
    {
      onConflict: 'id',
    },
  );

  throwIfSupabaseError(error);
}

async function syncOAuthProfile(session: Session, provider: AuthProvider): Promise<CatdexAuthSession> {
  const nickname = getNickname(session.user);
  const profileImageUrl = getProfileImageUrl(session.user);

  await upsertProfile(session.user, provider, nickname, profileImageUrl);

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    user: {
      ...toAuthUser(session.user, provider),
      nickname,
      provider,
      profileImageUrl,
    },
  };
}

export function createAuthSessionFromSupabaseSession(session: Session, fallbackProvider: AuthProvider): CatdexAuthSession {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    user: toAuthUser(session.user, fallbackProvider),
  };
}

async function exchangeOAuthCallbackUrl(callbackUrl: string) {
  const { errorCode, params } = QueryParams.getQueryParams(callbackUrl);

  if (errorCode) {
    throw new Error(errorCode);
  }

  const errorDescription = params.error_description ?? params.error;

  if (errorDescription) {
    throw new Error(errorDescription);
  }

  if (params.code) {
    const exchange = await supabase.auth.exchangeCodeForSession(params.code);
    throwIfSupabaseError(exchange.error);

    return exchange.data.session;
  }

  if (params.access_token && params.refresh_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });

    throwIfSupabaseError(error);
    return data.session;
  }

  throw new Error('OAuth callback code is missing.');
}

async function signInWithOAuthProvider(provider: AuthProvider): Promise<CatdexAuthSession> {
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

  const session = await exchangeOAuthCallbackUrl(result.url);

  if (!session) {
    throw new Error('Supabase session was not returned.');
  }

  return syncOAuthProfile(session, provider);
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

export async function withdrawMyAccount(): Promise<void> {
  assertSupabaseConfigured();

  const { error } = await supabase.functions.invoke('account-withdrawal', {
    method: 'POST',
  });

  throwIfSupabaseError(error);
}

export async function updateMyProfile(draft: ProfileUpdateDraft, fallbackProvider: AuthProvider): Promise<AuthUser> {
  assertSupabaseConfigured();

  const nickname = validateNickname(draft.nickname);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  throwIfSupabaseError(userError);

  if (!user) {
    throw new Error('프로필 수정에는 로그인이 필요합니다.');
  }

  const provider = getProvider(user, fallbackProvider);
  const providerNickname = getProviderNickname(user);
  const providerProfileImageUrl = getProviderProfileImageUrl(user);
  const currentProfileImageUrl = getProfileImageUrl(user);
  const profileImageUrl = draft.useDefaultProfileImage
    ? undefined
    : draft.profileImageUri
      ? await uploadProfileImage(user.id, draft.profileImageUri, draft.profileImageMimeType)
      : (draft.profileImageUrl ?? currentProfileImageUrl);

  const { data: updatedAuth, error: updateAuthError } = await supabase.auth.updateUser({
    data: {
      nickname,
      name: nickname,
      full_name: nickname,
      avatar_url: profileImageUrl ?? null,
      picture: profileImageUrl ?? null,
      catdex_profile_setup_completed: true,
      ...(providerNickname ? { catdex_oauth_nickname: providerNickname } : {}),
      ...(providerProfileImageUrl ? { catdex_oauth_profile_image_url: providerProfileImageUrl } : {}),
    },
  });

  throwIfSupabaseError(updateAuthError);

  const nextUser = updatedAuth.user ?? user;
  await upsertProfile(nextUser, provider, nickname, profileImageUrl);

  return {
    ...toAuthUser(nextUser, provider),
    nickname,
    profileImageUrl,
  };
}
