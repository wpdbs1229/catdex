import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import type { AuthProvider } from '@/shared/types/auth';
import { createShadow, theme } from '@/shared/styles/theme';

interface LoginScreenProps {
  pendingProvider: AuthProvider | null;
  isRestoring: boolean;
  errorMessage: string | null;
  onLoginWithKakao: () => void;
  onLoginWithGoogle: () => void;
  onLoginAsGuest: () => void;
}

function getButtonLabel(provider: AuthProvider, pendingProvider: AuthProvider | null, label: string) {
  return pendingProvider === provider ? '로그인 중...' : label;
}

export function LoginScreen({
  pendingProvider,
  isRestoring,
  errorMessage,
  onLoginWithKakao,
  onLoginWithGoogle,
  onLoginAsGuest,
}: LoginScreenProps) {
  const isBusy = isRestoring || pendingProvider !== null;

  return (
    <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.safeArea}>
      <View style={styles.backgroundLayer}>
        <View style={styles.topShape} />
        <View style={styles.bottomShape} />
      </View>

      <View style={styles.container}>
        <View style={styles.brandBlock}>
          <View style={styles.kicker}>
            <Text style={styles.kickerText}>골목 탐험 시작</Text>
          </View>
          <Text style={styles.title}>냥도감</Text>
          <Text style={styles.subtitle}>동네 고양이를 발견하고 도감처럼 수집해보세요.</Text>
        </View>

        <Card style={styles.loginCard}>
          <Text style={styles.cardTitle}>로그인</Text>
          <Text style={styles.cardSubtitle}>기록을 안전하게 이어가려면 계정으로 시작하세요.</Text>
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.buttonStack}>
            <Button disabled={isBusy} onPress={onLoginWithKakao} variant="secondary">
              <View style={[styles.providerButtonLabel, styles.kakaoLabel]}>
                <Text style={styles.providerIcon}>K</Text>
                <Text style={styles.kakaoText}>{isRestoring ? '로그인 상태 확인 중...' : getButtonLabel('kakao', pendingProvider, '카카오로 시작하기')}</Text>
              </View>
            </Button>

            <Button disabled={isBusy} onPress={onLoginWithGoogle} variant="secondary">
              <View style={styles.providerButtonLabel}>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.providerText}>{getButtonLabel('google', pendingProvider, '구글로 시작하기')}</Text>
              </View>
            </Button>

            <Button disabled={isBusy} onPress={onLoginAsGuest} variant="ghost">
              <Text style={styles.guestText}>{getButtonLabel('guest', pendingProvider, '비회원 둘러보기')}</Text>
            </Button>
          </View>
        </Card>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  topShape: {
    position: 'absolute',
    top: 120,
    right: -48,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#F8E5CA',
  },
  bottomShape: {
    position: 'absolute',
    bottom: 72,
    left: -42,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#F7ECD9',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  brandBlock: {
    marginBottom: theme.spacing.xxl,
  },
  kicker: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
  kickerText: {
    color: '#916B53',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    marginTop: theme.spacing.lg,
    color: theme.colors.text,
    fontSize: 48,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: theme.spacing.md,
    maxWidth: 280,
    color: theme.colors.mutedText,
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '600',
  },
  loginCard: {
    padding: theme.spacing.xl,
    borderRadius: theme.radius.xl,
    ...createShadow(16),
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  cardSubtitle: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedText,
    fontSize: 14,
    lineHeight: 22,
  },
  buttonStack: {
    marginTop: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  errorBanner: {
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: '#FFF0EA',
    borderWidth: 1,
    borderColor: '#F1B8A4',
  },
  errorText: {
    color: '#8A3D2B',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  providerButtonLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  kakaoLabel: {
    minWidth: 180,
  },
  providerIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FEE500',
    color: '#2F241D',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 26,
    textAlign: 'center',
  },
  googleIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: '#4285F4',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 25,
    textAlign: 'center',
  },
  kakaoText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  providerText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  guestText: {
    color: theme.colors.mutedText,
    fontSize: 15,
    fontWeight: '700',
  },
});
