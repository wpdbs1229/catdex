import { ActivityIndicator, Alert, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CREW_COMPANY_NAME } from '@/shared/constants/crew.constants';
import { SUPPORT_PRIVACY_URL } from '@/shared/constants/support.constants';
import { nd, theme } from '@/shared/styles/theme';
import type { AuthProvider, AuthUser } from '@/shared/types/auth';
import { AppleMark, GoogleMark, KakaoMark } from '../components/ProviderMarks';

const appIcon = require('../../../../assets/icon.png');
const patrolHero = require('../../../../assets/auth/patrol-hero.png');

/**
 * Apple 로그인은 Supabase 프로젝트에 Apple provider가 아직 등록돼 있지 않다
 * (authorize?provider=apple → "Unsupported provider: missing OAuth secret").
 * 시안의 세 번째 자리는 그대로 두되, 눌러도 실패하지 않고 안내만 띄운다.
 * 켤 때: Supabase 대시보드에 Apple Services ID·키를 넣고 이 값을 true로 바꾼 뒤
 * signInWithApple을 auth.api에 추가한다.
 */
const isAppleLoginReady = false;

interface LoginScreenProps {
  /** 진행 중인 제공자. 버튼을 잠그고 그 버튼에만 스피너를 돌린다. */
  pendingProvider: AuthProvider | null;
  errorMessage: string | null;
  onLoginWithKakao: () => Promise<AuthUser | null>;
  onLoginWithGoogle: () => Promise<AuthUser | null>;
}

function openDocument(url: string) {
  Linking.openURL(url).catch((error: unknown) => {
    console.warn('[login] open url failed', error);
    Alert.alert('페이지를 열지 못했어요', '잠시 후 다시 시도해 주세요.');
  });
}

/** 시안 로그인 화면. 로그인하지 않은 동안 앱이 보여주는 유일한 화면이다. */
export function LoginScreen({
  pendingProvider,
  errorMessage,
  onLoginWithKakao,
  onLoginWithGoogle,
}: LoginScreenProps) {
  const isBusy = pendingProvider !== null;

  const handleApple = () => {
    Alert.alert('Apple 로그인은 준비 중이에요', '지금은 카카오나 Google로 사원증을 받을 수 있어요.');
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.screen}>
      <View style={styles.brand}>
        <Image resizeMode="contain" source={appIcon} style={styles.logo} />
        <Text style={styles.company}>{CREW_COMPANY_NAME}</Text>
      </View>

      <Text style={styles.headline}>
        어라?{'\n'}
        <Text style={styles.headlineAccent}>고객</Text>이 먼저 찾아왔다냥!
      </Text>

      {/* 남는 세로 공간을 그림이 가져간다. 화면이 짧으면 그림만 줄고 버튼은 자리를 지킨다. */}
      <View style={styles.heroWrap}>
        <Image resizeMode="contain" source={patrolHero} style={styles.hero} />
      </View>

      <Text style={styles.lead}>로그인하고 함께 동네 순찰을 시작해요.</Text>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel="카카오 로그인"
          accessibilityRole="button"
          accessibilityState={{ busy: pendingProvider === 'kakao', disabled: isBusy }}
          disabled={isBusy}
          onPress={() => void onLoginWithKakao()}
          style={({ pressed }) => [styles.button, styles.kakao, pressed && styles.pressed, isBusy && styles.dimmed]}
        >
          {pendingProvider === 'kakao' ? (
            <ActivityIndicator color="#000000" size="small" />
          ) : (
            <>
              <KakaoMark />
              <Text style={[styles.buttonLabel, styles.kakaoLabel]}>카카오 로그인</Text>
            </>
          )}
        </Pressable>

        <Pressable
          accessibilityLabel="Google로 계속하기"
          accessibilityRole="button"
          accessibilityState={{ busy: pendingProvider === 'google', disabled: isBusy }}
          disabled={isBusy}
          onPress={() => void onLoginWithGoogle()}
          style={({ pressed }) => [styles.button, styles.google, pressed && styles.pressed, isBusy && styles.dimmed]}
        >
          {pendingProvider === 'google' ? (
            <ActivityIndicator color={nd.colors.ink} size="small" />
          ) : (
            <>
              <GoogleMark />
              <Text style={[styles.buttonLabel, styles.googleLabel]}>Google로 계속하기</Text>
            </>
          )}
        </Pressable>

        <Pressable
          accessibilityLabel="Apple로 계속하기"
          accessibilityRole="button"
          accessibilityState={{ disabled: isBusy }}
          disabled={isBusy}
          onPress={isAppleLoginReady ? undefined : handleApple}
          style={({ pressed }) => [styles.button, styles.apple, pressed && styles.pressed, isBusy && styles.dimmed]}
        >
          <AppleMark size={20} />
          <Text style={[styles.buttonLabel, styles.appleLabel]}>Apple로 계속하기</Text>
        </Pressable>
      </View>

      <Text style={styles.legal}>
        계속하면{' '}
        <Text
          onPress={() => Alert.alert('이용약관은 준비 중이에요', '문서가 올라오면 여기서 바로 열려요.')}
          style={styles.legalLink}
        >
          이용약관
        </Text>{' '}
        및{' '}
        <Text onPress={() => openDocument(SUPPORT_PRIVACY_URL)} style={styles.legalLink}>
          개인정보처리방침
        </Text>
        에 동의하게 됩니다.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // 그림의 흰 여백이 배경과 이어져야 해서 바탕은 순백으로 둔다.
  screen: {
    flex: 1,
    backgroundColor: nd.colors.bg,
    paddingHorizontal: 32,
  },
  brand: {
    alignItems: 'center',
    paddingTop: 12,
  },
  // icon.png은 둥근 사각형 바깥에 흰 여백을 물고 있다. 시안의 배지 크기(약 64)에
  // 맞추려면 그 여백만큼 크게 잡아야 한다.
  logo: {
    width: 78,
    height: 78,
  },
  company: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: -0.3,
    color: nd.colors.sub,
  },
  headline: {
    marginTop: 20,
    fontSize: 32,
    lineHeight: 41,
    fontWeight: '800',
    letterSpacing: -1,
    color: nd.colors.ink,
  },
  headlineAccent: {
    color: nd.colors.primary,
  },
  // 그림은 좌우 여백 밖까지 나가야 시안처럼 화면을 가득 채운다.
  heroWrap: {
    flex: 1,
    marginTop: 12,
    marginHorizontal: -32,
  },
  hero: {
    width: '100%',
    height: '100%',
  },
  lead: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.35,
    color: nd.colors.sub,
    textAlign: 'center',
  },
  error: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.3,
    color: theme.colors.danger,
    textAlign: 'center',
  },
  actions: {
    marginTop: 16,
    gap: 9,
  },
  button: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
  },
  kakao: {
    backgroundColor: '#FEE500',
  },
  google: {
    backgroundColor: nd.colors.bg,
    borderWidth: 1,
    borderColor: '#9A9DA5',
  },
  apple: {
    backgroundColor: '#000000',
  },
  buttonLabel: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  kakaoLabel: {
    color: '#000000',
  },
  googleLabel: {
    color: nd.colors.ink,
  },
  appleLabel: {
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.88,
  },
  dimmed: {
    opacity: 0.6,
  },
  legal: {
    marginTop: 20,
    paddingBottom: 4,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: -0.3,
    color: nd.colors.subtle,
    textAlign: 'center',
  },
  legalLink: {
    color: nd.colors.sub,
    textDecorationLine: 'underline',
  },
});
