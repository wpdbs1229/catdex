import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/shared/styles/theme';

interface AppShellProps {
  children: ReactNode;
  bottomBar: ReactNode;
}

export function AppShell({ children, bottomBar }: AppShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <View pointerEvents="none" style={styles.backgroundLayer}>
          <View style={styles.blobTop} />
          <View style={styles.blobRight} />
          <View style={styles.blobBottom} />
        </View>
        <View style={styles.content}>{children}</View>
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, theme.spacing.md) }]}>
          {bottomBar}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  blobTop: {
    position: 'absolute',
    top: 24,
    left: -36,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FFF5E9',
  },
  blobRight: {
    position: 'absolute',
    top: 220,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#F9E6CE',
  },
  blobBottom: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F8ECD9',
  },
  content: {
    flex: 1,
  },
  bottomBar: {
    position: 'absolute',
    right: theme.spacing.lg,
    bottom: 0,
    left: theme.spacing.lg,
  },
});
