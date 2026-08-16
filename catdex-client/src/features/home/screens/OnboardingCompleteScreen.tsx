import { useFocusEffect } from '@react-navigation/native';
import { PawPrint } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HomeStackScreenProps } from '@/app/navigation/types';
import { useTabBarInset } from '@/app/navigation/useTabBarInset';
import { CrewIdCard } from '@/features/home/components/CrewIdCard';
import { MissionSteps } from '@/features/home/components/RookieMissionCard';
import { fetchMyProfile } from '@/shared/api/auth.api';
import { checkInAndFetchCrewStatus, defaultCrewStatus, type CrewStatus } from '@/shared/api/crew.api';
import { CREW_COMPANY_NAME } from '@/shared/constants/crew.constants';
import { DEFAULT_PROFILE_NICKNAME } from '@/shared/constants/profile.constants';
import { useActiveNeighborhood } from '@/shared/neighborhood/useActiveNeighborhood';
import { nd } from '@/shared/styles/theme';
import type { AuthUser } from '@/shared/types/auth';

/**
 * 첫 업무 완료 = 사원증 발급.
 *
 * 교육용 고객(보리) 등록 직후에 열린다. 홈 스택 위라 하단바가 남는다 -
 * 시안(첫 업무 완료)이 하단바를 그대로 보여 준다.
 */
export function OnboardingCompleteScreen({ navigation }: HomeStackScreenProps<'OnboardingComplete'>) {
  const tabBarInset = useTabBarInset();
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [crewStatus, setCrewStatus] = useState<CrewStatus>(defaultCrewStatus);
  const { neighborhood } = useActiveNeighborhood();

  // 도장이 위에서 쾅 찍히는 연출. 크게 시작해 제자리로 줄어든다.
  const stamp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(stamp, { toValue: 1, useNativeDriver: true, friction: 5, tension: 80 }).start();
  }, [stamp]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      Promise.all([fetchMyProfile(), checkInAndFetchCrewStatus()])
        .then(([nextProfile, nextCrewStatus]) => {
          if (!isActive) {
            return;
          }

          setProfile(nextProfile);
          setCrewStatus(nextCrewStatus);
        })
        .catch((error: unknown) => {
          console.warn('[onboarding-complete] load failed', error);
        });

      return () => {
        isActive = false;
      };
    }, []),
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarInset }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>첫 업무 완료</Text>

        <View style={styles.cardArea}>
          <CrewIdCard
            nickname={profile?.nickname ?? DEFAULT_PROFILE_NICKNAME}
            profileImageUrl={profile?.profileImageUrl}
            city={neighborhood?.city}
            joinedAt={profile?.createdAt}
            rank={crewStatus.rank}
          />

          <Animated.View
            pointerEvents="none"
            style={[
              styles.stamp,
              {
                opacity: stamp,
                transform: [
                  { rotate: '-14deg' },
                  { scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [2.2, 1] }) },
                ],
              },
            ]}
          >
            <View style={styles.stampInner}>
              <Text style={styles.stampText}>발급 완료</Text>
              <PawPrint color={nd.colors.accent} size={26} strokeWidth={2.2} />
            </View>
          </Animated.View>
        </View>

        <MissionSteps done />

        <Text style={styles.heading}>사원증 발급 완료!</Text>
        <Text style={styles.body}>이제 {CREW_COMPANY_NAME}의 정식 사원이에요.</Text>

        <Pressable
          accessibilityLabel="홈으로 돌아가기"
          accessibilityRole="button"
          onPress={() => navigation.navigate('Home')}
          style={({ pressed }) => [styles.homeButton, pressed && styles.pressed]}
        >
          <Text style={styles.homeButtonText}>홈으로 돌아가기</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nd.colors.bg,
  },
  content: {
    paddingTop: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: nd.colors.ink,
  },
  cardArea: {
    alignSelf: 'stretch',
    marginTop: 8,
  },
  stamp: {
    position: 'absolute',
    right: 18,
    bottom: -6,
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 48,
    borderWidth: 2.5,
    borderColor: nd.colors.accent,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  stampInner: {
    alignItems: 'center',
    gap: 2,
  },
  stampText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    color: nd.colors.accent,
  },
  heading: {
    marginTop: 22,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: nd.colors.ink,
  },
  body: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.35,
    color: nd.colors.sub,
  },
  homeButton: {
    marginTop: 24,
    alignSelf: 'stretch',
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: nd.radius.input,
    backgroundColor: nd.colors.primary,
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.88,
  },
});
