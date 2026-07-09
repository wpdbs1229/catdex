import { useEffect, useRef } from 'react';
import { Animated, Easing, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/shared/styles/theme';

const splashArtwork = require('../../../assets/backgrounds/login-neighborhood-cats-bg-v2.png');

export function SplashScreen() {
  const reveal = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(reveal, {
        toValue: 1,
        duration: 720,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, {
            toValue: 1,
            duration: 920,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(breathe, {
            toValue: 0,
            duration: 920,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ),
    ]).start();
  }, [breathe, reveal]);

  const loadingOpacity = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [0.38, 1],
  });

  return (
    <ImageBackground resizeMode="cover" source={splashArtwork} style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          style={[
            styles.brand,
            {
              opacity: reveal,
              transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
            },
          ]}
        >
          <Text style={styles.title}>냥도감</Text>
          <Text style={styles.subtitle}>오늘 만날 고양이를 기록하는 중</Text>
        </Animated.View>

        <Animated.View style={[styles.loadingCard, { opacity: loadingOpacity }]}>
          <Text style={styles.loadingText}>냥냥단 출근 준비 중</Text>
          <View style={styles.loading}>
            <View style={styles.loadingDot} />
            <View style={[styles.loadingDot, styles.loadingDotActive]} />
            <View style={styles.loadingDot} />
          </View>
        </Animated.View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#FFF1D8',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 56,
    paddingBottom: 34,
  },
  brand: {
    alignItems: 'center',
  },
  title: {
    color: '#5C3926',
    fontSize: 46,
    fontWeight: '900',
    letterSpacing: 0,
    textShadowColor: 'rgba(255, 248, 236, 0.92)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    color: '#7E624C',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 248, 236, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  loadingCard: {
    alignSelf: 'center',
    minWidth: 210,
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  loadingText: {
    color: '#6A4733',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
    textShadowColor: 'rgba(255, 248, 236, 0.92)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  loading: {
    minHeight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(93, 59, 40, 0.32)',
  },
  loadingDotActive: {
    width: 20,
    backgroundColor: theme.colors.primaryDark,
  },
});
