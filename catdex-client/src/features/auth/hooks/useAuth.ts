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

function isDefinitiveAuthError(error: { status?: number } | null | undefined) {
  return typeof error?.status === 'number' && [400, 401, 403, 404].includes(error.status);
}

async function restoreSupabaseSession(restoredSession: AuthSession | null) {
  const fallbackProvider = restoredSession?.user.provider ?? 'kakao';

  // Supabase 클라이언트(persistSession: true)가 AsyncStorage에 보관·회전하는
  // 세션을 신뢰 소스로 사용한다. SecureStore 사본은 토큰 회전을 따라가지
  // 못하므로 여기로 먼저 오면 유효한 세션을 지워버린다.
  const { data: currentData, error: currentError } = await supabase.auth.getSession();

  if (!currentError && currentData.session) {
    const nextSession = createAuthSessionFromSupabaseSession(currentData.session, fallbackProvider);
    await persistSession(nextSession);
    return nextSession;
  }

  if (!restoredSession) {
    return null;
  }

  // 구버전에서 저장된 SecureStore 세션만 있는 경우의 마이그레이션 경로.
  const { data, error } = await supabase.auth.setSession({
    access_token: restoredSession.accessToken,
    refresh_token: restoredSession.refreshToken,
  });

  if (error || !data.session) {
    // 네트워크 오류 등 일시 장애에는 세션을 지우지 않는다.
    // 확정적인 인증 실패(만료·폐기)일 때만 제거한다.
    if (isDefinitiveAuthError(error)) {
      await SecureStore.deleteItemAsync(authStorageKey);
      return null;
    }

    return restoredSession;
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
        // 일시적인 오류(네트워크 등)로 복원이 실패해도 저장된 세션은 지우지
        // 않는다. 확정적인 인증 실패는 restoreSupabaseSession에서 처리한다.
        console.warn('[auth] restore failed', error);

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

    // Supabase가 토큰을 회전(TOKEN_REFRESHED)할 때마다 SecureStore 사본을
    // 따라 갱신해야 다음 콜드스타트에서 폐기된 refresh token을 재사용하지 않는다.
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session) {
          const nextSession = createAuthSessionFromSupabaseSession(session, 'kakao');
          restoreSession()
            .then((stored) =>
              persistSession(
                stored
                  ? createAuthSessionFromSupabaseSession(session, stored.user.provider)
                  : nextSession,
              ),
            )
            .catch((error) => console.warn('[auth] session sync failed', error));
        }
        return;
      }

      if (event === 'SIGNED_OUT') {
        SecureStore.deleteItemAsync(authStorageKey).catch(() => undefined);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
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

      // 사용자가 직접 취소한 경우는 오류 배너를 띄우지 않는다.
      const rawMessage = error instanceof Error ? error.message.toLowerCase() : '';
      if (!rawMessage.includes('cancel')) {
        setAuthErrorMessage(getUserFacingErrorMessage(error, 'auth.login'));
      }

      // 화면에서는 상태(authErrorMessage)로 결과를 전달하므로 다시 던지지
      // 않는다(버튼 onPress로 호출되어 rejection이 처리되지 않는 문제 방지).
      return null;
    } finally {
      setPendingProvider(null);
    }
  };

  const loginWithKakao = () => login('kakao', signInWithKakao);
  const loginWithGoogle = () => login('google', signInWithGoogle);

  const logout = async () => {
    setIsSigningOut(true);

    try {
      try {
        await signOut();
      } catch (error) {
        // 서버 로그아웃이 실패해도(오프라인 등) 로컬 세션은 반드시 정리한다.
        console.warn('[auth] server sign-out failed, falling back to local', error);
        await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      }

      setApiAccessToken(null);
      await SecureStore.deleteItemAsync(authStorageKey).catch(() => undefined);
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
