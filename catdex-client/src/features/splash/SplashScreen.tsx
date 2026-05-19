import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createShadow, theme } from '@/shared/styles/theme';

export function SplashScreen() {
  const reveal = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(reveal, {
        toValue: 1,
        duration: 680,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 860,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 860,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ),
    ]).start();
  }, [pulse, reveal]);

  const cardScale = reveal.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });
  const pawOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.36, 1],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <View style={styles.paperWashTop} />
        <View style={styles.paperWashSide} />
        <View style={styles.lowHill} />
        <Text style={[styles.backgroundPaw, styles.backgroundPawOne]}>🐾</Text>
        <Text style={[styles.backgroundPaw, styles.backgroundPawTwo]}>🐾</Text>
        <Text style={[styles.backgroundPaw, styles.backgroundPawThree]}>🐾</Text>
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: reveal,
            transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
          },
        ]}
      >
        <Animated.View style={[styles.dexCard, { transform: [{ scale: cardScale }] }]}>
          <View style={styles.dexCardHeader}>
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotMuted]} />
            <View style={[styles.dot, styles.dotMuted]} />
          </View>
          <View style={styles.catBadge}>
            <Text style={styles.catSilhouette}>🐈‍⬛</Text>
          </View>
          <Text style={styles.dexNumber}>No.???</Text>
          <Text style={styles.dexHint}>새로운 동네 친구 탐색 중</Text>
        </Animated.View>

        <View style={styles.titleGroup}>
          <Text style={styles.title}>냥도감</Text>
          <Text style={styles.subtitle}>오늘 만날 고양이를 기록하는 중</Text>
        </View>

        <Animated.View style={[styles.loadingPaws, { opacity: pawOpacity }]}>
          <Text style={styles.loadingPaw}>🐾</Text>
          <Text style={[styles.loadingPaw, styles.loadingPawRaised]}>🐾</Text>
          <Text style={styles.loadingPaw}>🐾</Text>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: theme.colors.background,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  paperWashTop: {
    position: 'absolute',
    top: -72,
    right: -50,
    left: -50,
    height: 210,
    borderBottomLeftRadius: 150,
    borderBottomRightRadius: 150,
    backgroundColor: 'rgba(255, 244, 220, 0.8)',
  },
  paperWashSide: {
    position: 'absolute',
    top: 172,
    right: -30,
    width: 86,
    height: 410,
    borderRadius: 28,
    backgroundColor: 'rgba(201, 121, 73, 0.08)',
    transform: [{ rotate: '-9deg' }],
  },
  lowHill: {
    position: 'absolute',
    right: -80,
    bottom: -34,
    left: -80,
    height: 168,
    borderTopLeftRadius: 150,
    borderTopRightRadius: 150,
    backgroundColor: 'rgba(221, 229, 200, 0.52)',
  },
  backgroundPaw: {
    position: 'absolute',
    color: theme.colors.border,
    fontSize: 24,
    opacity: 0.32,
    transform: [{ rotate: '-18deg' }],
  },
  backgroundPawOne: {
    top: 130,
    right: 58,
  },
  backgroundPawTwo: {
    top: 172,
    right: 112,
    fontSize: 18,
  },
  backgroundPawThree: {
    bottom: 178,
    left: 56,
    fontSize: 20,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  dexCard: {
    width: 220,
    minHeight: 258,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 112, 83, 0.16)',
    borderRadius: 34,
    backgroundColor: 'rgba(255, 253, 246, 0.94)',
    padding: theme.spacing.lg,
    ...createShadow(18),
  },
  dexCardHeader: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    marginBottom: theme.spacing.lg,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  dotMuted: {
    backgroundColor: '#E9D4BD',
  },
  catBadge: {
    width: 118,
    height: 118,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 34,
    backgroundColor: theme.colors.primaryDark,
  },
  catSilhouette: {
    color: theme.colors.surface,
    fontSize: 58,
  },
  dexNumber: {
    marginTop: theme.spacing.lg,
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  dexHint: {
    marginTop: theme.spacing.xs,
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
  },
  titleGroup: {
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
  },
  title: {
    color: theme.colors.text,
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedText,
    fontSize: 15,
    fontWeight: '700',
  },
  loadingPaws: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xl,
  },
  loadingPaw: {
    color: theme.colors.primaryDark,
    fontSize: 17,
  },
  loadingPawRaised: {
    marginTop: -12,
  },
});
