import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import type { Provider, Session, User } from '@supabase/supabase-js';
import { throwIfSupabaseError } from '@/shared/api/client';
import { assertSupabaseConfigured, isSupabaseConfigured, supabase } from '@/shared/supabase/client';
import type { AuthProvider, AuthSession as CatdexAuthSession, AuthUser } from '@/shared/types/auth';

WebBrowser.maybeCompleteAuthSession();

function getOAuthRedirectUri() {
  const configuredRedirectUri = process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URI?.trim();

  if (configuredRedirectUri) {
    return configuredRedirectUri;
  }

  return AuthSession.makeRedirectUri({
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
