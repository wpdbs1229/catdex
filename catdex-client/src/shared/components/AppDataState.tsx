import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, RefreshCw } from 'lucide-react-native';
import { Button } from '@/shared/components/Button';
import { createShadow, theme } from '@/shared/styles/theme';
import type { UserFacingError } from '@/shared/errors/user-facing-error';

interface AppLoadFailureScreenProps {
  error: UserFacingError;
  isRetrying: boolean;
  onRetry: () => void;
}

export function AppLoadFailureScreen({ error, isRetrying, onRetry }: AppLoadFailureScreenProps) {
  return (
    <View style={styles.failureScreen}>
      <View style={styles.failureIcon}>
        <AlertCircle color={theme.colors.primary} size={28} />
      </View>
      <Text style={styles.failureTitle}>{error.title}</Text>
      <Text style={styles.failureText}>{error.message}</Text>
      <Button accessibilityLabel="앱 데이터 다시 불러오기" disabled={isRetrying} onPress={onRetry}>
        {isRetrying ? (
          <View style={styles.retryContent}>
            <ActivityIndicator color="#FFF8F0" size="small" />
            <Text style={styles.retryPrimaryText}>다시 불러오는 중</Text>
          </View>
        ) : (
          <View style={styles.retryContent}>
            <RefreshCw color="#FFF8F0" size={17} />
            <Text style={styles.retryPrimaryText}>다시 불러오기</Text>
          </View>
        )}
      </Button>
    </View>
  );
}

interface AppStatusBannerProps {
  error: UserFacingError;
  isRetrying: boolean;
  onRetry: () => void;
}

export function AppStatusBanner({ error, isRetrying, onRetry }: AppStatusBannerProps) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.banner}>
      <AlertCircle color={theme.colors.primary} size={18} />
      <View style={styles.bannerCopy}>
        <Text numberOfLines={1} style={styles.bannerTitle}>{error.title}</Text>
        <Text numberOfLines={1} style={styles.bannerText}>{error.message}</Text>
      </View>
      <Pressable
        accessibilityLabel="앱 데이터 다시 불러오기"
        accessibilityRole="button"
        disabled={isRetrying}
        onPress={onRetry}
        style={({ pressed }) => [styles.bannerRetry, pressed && styles.pressed, isRetrying && styles.disabled]}
      >
        {isRetrying ? <ActivityIndicator color={theme.colors.primaryDark} size="small" /> : <RefreshCw color={theme.colors.primaryDark} size={16} />}
        <Text style={styles.bannerRetryText}>{isRetrying ? '불러오는 중' : '다시'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  failureScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  failureIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    backgroundColor: 'rgba(255,239,221,0.9)',
  },
  failureTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  failureText: {
    maxWidth: 320,
    color: theme.colors.mutedText,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    textAlign: 'center',
  },
  retryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  retryPrimaryText: {
    color: '#FFF8F0',
    fontSize: 15,
    fontWeight: '900',
  },
  banner: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: '#FFF0DD',
    borderWidth: 1,
    borderColor: 'rgba(196,122,66,0.22)',
    ...createShadow(5),
  },
  bannerCopy: {
    flex: 1,
    minWidth: 0,
  },
  bannerTitle: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  bannerText: {
    marginTop: 2,
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '700',
  },
  bannerRetry: {
    minWidth: 58,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 18,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: 'rgba(255,253,246,0.88)',
  },
  bannerRetryText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.58,
  },
});
