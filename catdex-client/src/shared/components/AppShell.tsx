import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/shared/styles/theme';

interface AppShellProps {
  children: ReactNode;
  bottomBar: ReactNode;
  bottomBarVariant?: 'floating' | 'docked';
}

export function AppShell({ children, bottomBar, bottomBarVariant = 'floating' }: AppShellProps) {
  const insets = useSafeAreaInsets();
  const isDocked = bottomBarVariant === 'docked';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <View pointerEvents="none" style={styles.backgroundLayer}>
          <View style={styles.paperWashTop} />
          <View style={styles.paperTextureOne} />
          <View style={styles.paperTextureTwo} />
          <View style={styles.distantHill} />
          <View style={styles.nearHill} />
        </View>
        <View style={styles.content}>{children}</View>
        <View style={[styles.bottomBar, isDocked && styles.bottomBarDocked, { paddingBottom: Math.max(insets.bottom, theme.spacing.md) }]}>
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
    zIndex: 0,
  },
  paperWashTop: {
    position: 'absolute',
    top: -72,
    right: -60,
    left: -60,
    height: 190,
    borderBottomLeftRadius: 140,
    borderBottomRightRadius: 140,
    backgroundColor: 'rgba(255, 244, 220, 0.78)',
  },
  paperTextureOne: {
    position: 'absolute',
    top: 146,
    right: -28,
    width: 88,
    height: 520,
    borderRadius: 28,
    backgroundColor: 'rgba(211, 164, 103, 0.08)',
    transform: [{ rotate: '-9deg' }],
  },
  paperTextureTwo: {
    position: 'absolute',
    top: 294,
    left: -32,
    width: 74,
    height: 440,
    borderRadius: 26,
    backgroundColor: 'rgba(139, 160, 112, 0.08)',
    transform: [{ rotate: '8deg' }],
  },
  distantHill: {
    position: 'absolute',
    right: -80,
    bottom: 104,
    left: -80,
    height: 172,
    borderTopLeftRadius: 160,
    borderTopRightRadius: 160,
    backgroundColor: 'rgba(221, 229, 200, 0.48)',
  },
  nearHill: {
    position: 'absolute',
    right: -72,
    bottom: 64,
    left: -72,
    height: 122,
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    backgroundColor: 'rgba(248, 234, 210, 0.7)',
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  bottomBar: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: 0,
    left: theme.spacing.md,
    zIndex: 2,
  },
  bottomBarDocked: {
    right: 0,
    left: 0,
    backgroundColor: 'rgba(255, 248, 236, 0.97)',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: 'rgba(139, 112, 83, 0.16)',
    borderBottomLeftRadius: theme.radius.xl,
    borderBottomRightRadius: theme.radius.xl,
  },
});
