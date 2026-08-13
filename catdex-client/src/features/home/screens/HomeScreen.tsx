import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronDown, MapPin } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HomeStackParamList, MainTabParamList, RootStackParamList } from '@/app/navigation/types';
import { useTabBarInset } from '@/app/navigation/useTabBarInset';
import { CrewIdCard, MAX_PULL, PULL_TRAVEL } from '@/features/home/components/CrewIdCard';
import { CrewProgressCard } from '@/features/home/components/CrewProgressCard';
import { RankGuideModal } from '@/features/home/components/RankGuideModal';
import { SupportRoomEntryCard } from '@/features/support-room/SupportRoomEntryCard';
import { loadRoom } from '@/features/support-room/support-room.storage';
import type { RoomState } from '@/features/support-room/support-room.domain';
import { NeighborhoodSheet } from '@/shared/neighborhood/NeighborhoodSheet';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { fetchMyProfile } from '@/shared/api/auth.api';
import { checkInAndFetchCrewStatus, defaultCrewStatus, type CrewStatus } from '@/shared/api/crew.api';
import { DEFAULT_PROFILE_NICKNAME } from '@/shared/constants/profile.constants';
import { useActiveNeighborhood } from '@/shared/neighborhood/useActiveNeighborhood';
import { nd } from '@/shared/styles/theme';
import type { AuthUser } from '@/shared/types/auth';
import { CREW_COMPANY_NAME } from '@/shared/constants/crew.constants';

export function HomeScreen() {
  // 홈 스택(출근 현황)과 루트 스택(알림함 등)을 둘 다 부르므로 합쳐서 받는다.
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList & RootStackParamList>>();
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [crewStatus, setCrewStatus] = useState<CrewStatus>(defaultCrewStatus);
  const [isRankGuideOpen, setIsRankGuideOpen] = useState(false);
  const [isNeighborhoodSheetOpen, setIsNeighborhoodSheetOpen] = useState(false);
  // 진입 카드가 무엇을 말할지는 방 상태가 정한다. 여기서는 읽기만 하고 정산하지 않는다.
  const [room, setRoom] = useState<RoomState | null>(null);

  // 위에서 아래로 당긴 양(오버스크롤). 사원증이 끈에 끌려 내려가는 데 쓴다.
  // 손을 놓으면 스크롤뷰가 알아서 제자리로 튕겨 돌아오므로 따로 되돌릴 필요가 없다.
  const scrollY = useRef(new Animated.Value(0)).current;
  const pull = useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [-PULL_TRAVEL, 0],
        outputRange: [MAX_PULL, 0],
        extrapolate: 'clamp',
      }),
    [scrollY],
  );
  const { neighborhood, name: neighborhoodName, isDetecting, redetect, refresh } = useActiveNeighborhood();
  const tabBarInset = useTabBarInset();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      Promise.all([fetchMyProfile(), checkInAndFetchCrewStatus(), loadRoom()])
        .then(([nextProfile, nextCrewStatus, storedRoom]) => {
          if (!isActive) {
            return;
          }

          setProfile(nextProfile);
          setCrewStatus(nextCrewStatus);
          setRoom(storedRoom.room);
        })
        .catch((error: unknown) => {
          console.warn('[home] load failed', error);
        });

      return () => {
        isActive = false;
      };
    }, []),
  );


  // 고객 상담은 고객 탭 안에 있다. 탭을 옮긴 뒤 그 스택의 화면을 연다.
  const openSupportRoom = useCallback(() => {
    navigation
      .getParent<BottomTabNavigationProp<MainTabParamList>>()
      ?.navigate('CollectionTab', { screen: 'ClientSupportRoom' });
  }, [navigation]);



  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityLabel="내 동네 목록 열기"
          accessibilityRole="button"
          onPress={() => setIsNeighborhoodSheetOpen(true)}
          style={({ pressed }) => [styles.locationChip, pressed && styles.pressed]}
        >
          <View style={styles.locationIcon}>
            {isDetecting ? (
              <ActivityIndicator color={nd.colors.ink} size="small" />
            ) : (
              <MapPin color={nd.colors.ink} size={20} strokeWidth={1.8} />
            )}
          </View>
          <Text style={styles.locationText}>{isDetecting ? '동네 확인 중' : neighborhoodName}</Text>
          <ChevronDown color={nd.colors.ink} size={16} strokeWidth={1.8} />
        </Pressable>
        <NotificationBell />
      </View>

      <Animated.ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarInset }]}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{CREW_COMPANY_NAME} 사원증</Text>
          <CrewIdCard
            nickname={profile?.nickname ?? DEFAULT_PROFILE_NICKNAME}
            profileImageUrl={profile?.profileImageUrl}
            city={neighborhood?.city}
            joinedAt={profile?.createdAt}
            pull={pull}
            rank={crewStatus.rank}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>인사고과</Text>
          <View style={styles.sectionBody}>
            <CrewProgressCard
              onPressAttendance={() => navigation.navigate('Attendance')}
              // 수집 마릿수의 실물은 '내 고객' 탭이다. 도감이 들고 있는 필터 상태는
              // 건드리지 않고 탭만 옮긴다.
              onPressCollection={() =>
                navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()?.navigate('CollectionTab')
              }
              onPressPromotion={() => setIsRankGuideOpen(true)}
              status={crewStatus}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘의 고객 상담</Text>
          <View style={styles.sectionBody}>
            <SupportRoomEntryCard onPress={openSupportRoom} room={room} />
          </View>
        </View>
      </Animated.ScrollView>

      <RankGuideModal onClose={() => setIsRankGuideOpen(false)} status={crewStatus} visible={isRankGuideOpen} />

      <NeighborhoodSheet
        activeId={neighborhood?.id}
        isDetecting={isDetecting}
        onAddCurrent={() => {
          void redetect();
        }}
        onChanged={refresh}
        onClose={() => setIsNeighborhoodSheetOpen(false)}
        visible={isNeighborhoodSheetOpen}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nd.colors.bg,
  },
  headerRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: nd.colors.field,
    marginRight: 6,
  },
  locationText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  pressed: {
    opacity: 0.88,
  },
  content: {
  },
  section: {
    marginTop: 16,
    gap: 12,
  },
  sectionTitle: {
    paddingHorizontal: 28,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '500',
    letterSpacing: -0.45,
    color: nd.colors.ink,
  },
  sectionBody: {
    paddingHorizontal: 20,
  },
  row: {
    gap: 8,
    paddingHorizontal: 20,
  },
  emptyText: {
    paddingHorizontal: 28,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.35,
    color: nd.colors.sub,
  },
});
