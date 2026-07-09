import { useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { createAuthSessionFromSupabaseSession, signInWithGoogle, signInWithKakao, signOut, updateMyProfile, withdrawMyAccount } from '@/shared/api/auth.api';
import { setApiAccessToken } from '@/shared/api/client';
import { getUserFacingErrorMessage } from '@/shared/errors/user-facing-error';
import { supabase } from '@/shared/supabase/client';
import type { AuthProvider, AuthSession, AuthUser, ProfileUpdateDraft } from '@/shared/types/auth';

const authStorageKey = 'catdex.auth.session';

function isAuthProvider(value: unknown): value is AuthProvider {
  return value === 'kakao' || value === 'google';
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
    (candidate.profileImageUrl === undefined || typeof candidate.profileImageUrl === 'string') &&
    (candidate.profileSetupCompleted === undefined || typeof candidate.profileSetupCompleted === 'boolean')
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
    if (!isAuthSession(parsed)) {
      return null;
    }

    return {
      ...parsed,
      user: {
        ...parsed.user,
        profileSetupCompleted: parsed.user.profileSetupCompleted ?? false,
      },
    };
  } catch {
    return null;
  }
}

async function restoreSupabaseSession(restoredSession: AuthSession | null) {
  if (!restoredSession) {
    return null;
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: restoredSession.accessToken,
    refresh_token: restoredSession.refreshToken,
  });

  if (error || !data.session) {
    await SecureStore.deleteItemAsync(authStorageKey);
    return null;
  }

  const nextSession = createAuthSessionFromSupabaseSession(data.session, restoredSession.user.provider);

  await persistSession(nextSession);
  return nextSession;
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [pendingProvider, setPendingProvider] = useState<AuthProvider | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function hydrateAuthState() {
      try {
        const restoredSession = await restoreSession();
        const activeSession = await restoreSupabaseSession(restoredSession);

        if (isMounted) {
          setApiAccessToken(activeSession?.accessToken ?? null);
          setCurrentUser(activeSession?.user ?? null);
        }
      } catch (error) {
        console.warn('[auth] restore failed', error);
        await SecureStore.deleteItemAsync(authStorageKey);

        if (isMounted) {
          setApiAccessToken(null);
          setCurrentUser(null);
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
      console.warn('[auth] login failed', error);
      setAuthErrorMessage(getUserFacingErrorMessage(error, 'auth.login'));
      throw error;
    } finally {
      setPendingProvider(null);
    }
  };

  const loginWithKakao = () => login('kakao', signInWithKakao);
  const loginWithGoogle = () => login('google', signInWithGoogle);

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

  const withdrawAccount = async () => {
    setIsWithdrawing(true);

    try {
      await withdrawMyAccount();
      setApiAccessToken(null);
      await SecureStore.deleteItemAsync(authStorageKey);
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      setCurrentUser(null);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const updateProfile = async (draft: ProfileUpdateDraft) => {
    if (!currentUser) {
      throw new Error('프로필 수정에는 로그인이 필요합니다.');
    }

    const nextUser = await updateMyProfile(draft, currentUser.provider);
    setCurrentUser(nextUser);

    const storedSession = await restoreSession();
    if (storedSession) {
      await persistSession({
        ...storedSession,
        user: nextUser,
      });
    }

    return nextUser;
  };

  const isAuthenticated = useMemo(() => currentUser !== null, [currentUser]);

  return {
    currentUser,
    isAuthenticated,
    isRestoring,
    isSigningOut,
    isWithdrawing,
    authErrorMessage,
    pendingProvider,
    loginWithKakao,
    loginWithGoogle,
    updateProfile,
    withdrawAccount,
    logout,
  };
}
