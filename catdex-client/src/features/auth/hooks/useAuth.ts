import { useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { signInAsGuest, signInWithGoogle, signInWithKakao, signOut } from '@/shared/api/auth.api';
import { setApiAccessToken } from '@/shared/api/client';
import type { AuthProvider, AuthSession, AuthUser } from '@/shared/types/auth';

const authStorageKey = 'catdex.auth.session';

function isAuthProvider(value: unknown): value is AuthProvider {
  return value === 'kakao' || value === 'google' || value === 'guest';
}

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.nickname === 'string' &&
    isAuthProvider(candidate.provider) &&
    (candidate.email === undefined || typeof candidate.email === 'string') &&
    (candidate.profileImageUrl === undefined || typeof candidate.profileImageUrl === 'string')
  );
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.accessToken === 'string' &&
    typeof candidate.refreshToken === 'string' &&
    isAuthUser(candidate.user)
  );
}

async function persistSession(session: AuthSession) {
  await SecureStore.setItemAsync(authStorageKey, JSON.stringify(session));
}

async function restoreSession() {
  const storedSession = await SecureStore.getItemAsync(authStorageKey);

  if (!storedSession) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(storedSession);
    return isAuthSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [pendingProvider, setPendingProvider] = useState<AuthProvider | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function hydrateAuthState() {
      try {
        const restoredSession = await restoreSession();

        if (isMounted) {
          setApiAccessToken(restoredSession?.accessToken ?? null);
          setCurrentUser(restoredSession?.user ?? null);
        }
      } finally {
        if (isMounted) {
          setIsRestoring(false);
        }
      }
    }

    hydrateAuthState();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (provider: AuthProvider, authenticate: () => Promise<AuthSession>) => {
    setPendingProvider(provider);
    setAuthErrorMessage(null);

    try {
      const nextSession = await authenticate();
      setApiAccessToken(nextSession.accessToken);
      await persistSession(nextSession);
      setCurrentUser(nextSession.user);
      return nextSession.user;
    } catch (error) {
      const message = error instanceof Error ? error.message : '로그인 중 알 수 없는 오류가 발생했습니다.';
      setAuthErrorMessage(message);
      throw error;
    } finally {
      setPendingProvider(null);
    }
  };

  const loginWithKakao = () => login('kakao', signInWithKakao);
  const loginWithGoogle = () => login('google', signInWithGoogle);
  const loginAsGuest = () => login('guest', signInAsGuest);

  const logout = async () => {
    setIsSigningOut(true);

    try {
      await signOut();
      setApiAccessToken(null);
      await SecureStore.deleteItemAsync(authStorageKey);
      setCurrentUser(null);
    } finally {
      setIsSigningOut(false);
    }
  };

  const isAuthenticated = useMemo(() => currentUser !== null, [currentUser]);

  return {
    currentUser,
    isAuthenticated,
    isRestoring,
    isSigningOut,
    authErrorMessage,
    pendingProvider,
    loginWithKakao,
    loginWithGoogle,
    loginAsGuest,
    logout,
  };
}
