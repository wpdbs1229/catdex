import { ImageBackground, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AuthProvider } from '@/shared/types/auth';
import { createShadow, theme } from '@/shared/styles/theme';

interface LoginScreenProps {
  pendingProvider: AuthProvider | null;
  isRestoring: boolean;
  errorMessage: string | null;
  onLoginWithKakao: () => void;
  onLoginWithGoogle: () => void;
}

const loginArtwork = require('../../../assets/backgrounds/login-nyangparazzi-bg-v1.png') as ImageSourcePropType;

function getButtonLabel(provider: AuthProvider, pendingProvider: AuthProvider | null, label: string) {
  return pendingProvider === provider ? '사원증 발급 중...' : label;
}

export function LoginScreen({
  pendingProvider,
  isRestoring,
  errorMessage,
  onLoginWithKakao,
  onLoginWithGoogle,
}: LoginScreenProps) {
  const isBusy = isRestoring || pendingProvider !== null;

  return (
    <ImageBackground imageStyle={styles.backgroundImage} resizeMode="cover" source={loginArtwork} style={styles.background}>
      <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.brandBlock}>
            <Text style={styles.brand}>냥도감</Text>
            <Text style={styles.brandCaption}>동네 고양이를 기록하는 냥냥단</Text>
          </View>

          <View style={styles.actionPanel}>
            <View>
              <Text style={styles.panelTitle}>냥냥단으로 시작하기</Text>
              <Text style={styles.panelSubtitle}>발견한 고양이를 조용히 기록하고, 정확한 위치는 안전하게 숨겨요.</Text>
            </View>

            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorTitle}>지금은 시작할 수 없어요</Text>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <View style={styles.buttonStack}>
              <Pressable
                accessibilityLabel="카카오로 시작하기"
                accessibilityRole="button"
                disabled={isBusy}
                onPress={onLoginWithKakao}
                style={({ pressed }) => [styles.authButton, styles.kakaoButton, pressed && !isBusy ? styles.pressed : null, isBusy ? styles.disabled : null]}
              >
                <View style={styles.providerButtonLabel}>
                  <Text style={styles.kakaoIcon}>K</Text>
                  <Text style={styles.kakaoText}>{isRestoring ? '사원증 확인 중...' : getButtonLabel('kakao', pendingProvider, '카카오로 시작하기')}</Text>
                </View>
              </Pressable>

              <Pressable
                accessibilityLabel="Google로 시작하기"
                accessibilityRole="button"
                disabled={isBusy}
                onPress={onLoginWithGoogle}
                style={({ pressed }) => [styles.authButton, styles.googleButton, pressed && !isBusy ? styles.pressed : null, isBusy ? styles.disabled : null]}
              >
                <View style={styles.providerButtonLabel}>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleText}>{getButtonLabel('google', pendingProvider, 'Google로 시작하기')}</Text>
                </View>
              </Pressable>
            </View>
            <Text style={styles.providerHelper}>사람과 고양이 모두에게 안전한 기록을 만들어요.</Text>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#FFF1D8',
  },
  backgroundImage: {
    transform: [{ translateY: 0 }, { scale: 1 }],
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 24,
    paddingBottom: 22,
  },
  brandBlock: {
    maxWidth: 230,
    alignItems: 'flex-start',
  },
  brand: {
    color: theme.colors.primaryDark,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: 0,
  },
  brandCaption: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
  actionPanel: {
    gap: 10,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  panelTitle: {
    color: '#7A4B2A',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
    letterSpacing: 0,
    textShadowColor: 'rgba(255, 248, 236, 0.86)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  panelSubtitle: {
    marginTop: 4,
    color: '#8B6A49',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    textShadowColor: 'rgba(255, 248, 236, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  buttonStack: {
    gap: 8,
  },
  authButton: {
    minHeight: 48,
    maxWidth: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    paddingHorizontal: theme.spacing.lg,
    borderWidth: 1,
    ...createShadow(5),
  },
  kakaoButton: {
    backgroundColor: '#FEE500',
    borderColor: 'rgba(47, 36, 29, 0.1)',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(139, 112, 83, 0.18)',
  },
  providerButtonLabel: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  kakaoIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2F241D',
    color: '#FEE500',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 24,
    textAlign: 'center',
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(139, 112, 83, 0.2)',
    color: '#4285F4',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 23,
    textAlign: 'center',
  },
  kakaoText: {
    flexShrink: 1,
    color: '#2F241D',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '900',
    textAlign: 'center',
  },
  googleText: {
    flexShrink: 1,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '900',
    textAlign: 'center',
  },
  providerHelper: {
    color: '#7B654D',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 248, 236, 0.92)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  errorBanner: {
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: '#FFF0EA',
    borderWidth: 1,
    borderColor: '#F1B8A4',
  },
  errorTitle: {
    color: '#6E2F21',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  errorText: {
    marginTop: 2,
    color: '#8A3D2B',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.55,
  },
});
