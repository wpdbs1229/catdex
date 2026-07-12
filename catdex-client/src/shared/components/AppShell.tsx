import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/shared/styles/theme';

interface AppShellProps {
  children: ReactNode;
  bottomBar?: ReactNode;
  statusBanner?: ReactNode;
}

export function AppShell({ children, bottomBar, statusBanner }: AppShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <View pointerEvents="none" style={styles.backgroundLayer}>
          <View style={styles.paperWashTop} />
          <View style={styles.paperGlow} />
          <View style={styles.paperTextureOne} />
          <View style={styles.paperTextureTwo} />
          <View style={styles.distantHill} />
          <View style={styles.nearHill} />
        </View>
        <View style={styles.content}>
          {statusBanner}
          <View style={styles.screenContent}>{children}</View>
        </View>
        {bottomBar ? (
          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, theme.spacing.md) }]}>
            {bottomBar}
          </View>
        ) : null}
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
    top: -96,
    right: -80,
    left: -80,
    height: 260,
    borderBottomLeftRadius: 190,
    borderBottomRightRadius: 190,
    backgroundColor: 'rgba(255, 244, 220, 0.82)',
  },
  paperGlow: {
    position: 'absolute',
    top: 116,
    right: -34,
    left: -34,
    height: 210,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 253, 246, 0.34)',
    transform: [{ rotate: '-8deg' }],
  },
  paperTextureOne: {
    position: 'absolute',
    top: 170,
    right: -30,
    width: 98,
    height: 500,
    borderRadius: 34,
    backgroundColor: 'rgba(211, 164, 103, 0.06)',
    transform: [{ rotate: '-10deg' }],
  },
  paperTextureTwo: {
    position: 'absolute',
    top: 316,
    left: -34,
    width: 84,
    height: 430,
    borderRadius: 30,
    backgroundColor: 'rgba(139, 160, 112, 0.07)',
    transform: [{ rotate: '8deg' }],
  },
  distantHill: {
    position: 'absolute',
    right: -92,
    bottom: 100,
    left: -92,
    height: 188,
    borderTopLeftRadius: 180,
    borderTopRightRadius: 180,
    backgroundColor: 'rgba(221, 229, 200, 0.46)',
  },
  nearHill: {
    position: 'absolute',
    right: -86,
    bottom: 54,
    left: -86,
    height: 136,
    borderTopLeftRadius: 142,
    borderTopRightRadius: 142,
    backgroundColor: 'rgba(248, 234, 210, 0.74)',
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  screenContent: {
    flex: 1,
  },
  bottomBar: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: 0,
    left: theme.spacing.md,
    zIndex: 2,
  },
});
