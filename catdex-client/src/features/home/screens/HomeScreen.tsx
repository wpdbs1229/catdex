import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronDown, MapPin, ShoppingBag } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HomeStackParamList, MainTabParamList, RootStackParamList } from '@/app/navigation/types';
import { useTabBarInset } from '@/app/navigation/useTabBarInset';
import { CrewIdCard, formatBranch, MAX_PULL, PULL_TRAVEL } from '@/features/home/components/CrewIdCard';
import { CrewProgressCard } from '@/features/home/components/CrewProgressCard';
import { RankGuideModal } from '@/features/home/components/RankGuideModal';
import { RookieMissionCard } from '@/features/home/components/RookieMissionCard';
import { SupportRoomEntryCard } from '@/features/support-room/SupportRoomEntryCard';
import { syncRoom } from '@/features/support-room/support-room.service';
import type { RoomState } from '@/features/support-room/support-room.domain';
import { NeighborhoodSheet } from '@/shared/neighborhood/NeighborhoodSheet';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { fetchMyProfile } from '@/shared/api/auth.api';
import { checkInAndFetchCrewStatus, defaultCrewStatus, type CrewStatus } from '@/shared/api/crew.api';
import { DEFAULT_PROFILE_NICKNAME } from '@/shared/constants/profile.constants';
import { useActiveNeighborhood } from '@/shared/neighborhood/useActiveNeighborhood';
import { createNdShadow, nd, theme } from '@/shared/styles/theme';
import type { AuthUser } from '@/shared/types/auth';
import { CREW_COMPANY_NAME } from '@/shared/constants/crew.constants';

export function HomeScreen() {
  // 홈 스택(출근 현황)과 루트 스택(알림함 등)을 둘 다 부르므로 합쳐서 받는다.
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList & RootStackParamList>>();
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [crewStatus, setCrewStatus] = useState<CrewStatus>(defaultCrewStatus);
  // 신입 판정은 서버 응답을 받은 뒤에만 한다. 기본값(0마리)으로 판정하면
  // 기존 사원의 홈에도 로딩 중에 첫 업무 카드가 깜빡인다.
  const [isCrewStatusLoaded, setIsCrewStatusLoaded] = useState(false);
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

      // 홈에서도 정산한다. 방에 들어가야만 장면이 생기면, 들어오게 만들
      // 새 장면 배지가 영영 뜨지 않는다.
      Promise.all([fetchMyProfile(), checkInAndFetchCrewStatus(), syncRoom()])
        .then(([nextProfile, nextCrewStatus, roomSync]) => {
          if (!isActive) {
            return;
          }

          setProfile(nextProfile);
          setCrewStatus(nextCrewStatus);
          setIsCrewStatusLoaded(true);
          setRoom(roomSync.stored.room);
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

  // 아직 고객이 한 마리도 없는 신입. 인사고과 대신 첫 업무(보리 등록)를 보여 준다.
  // '다음에 할게요'를 누르면 이 세션 동안은 접어 두고 인사고과를 돌려준다.
  const [isMissionSnoozed, setIsMissionSnoozed] = useState(false);
  const isRookie = isCrewStatusLoaded && crewStatus.collected === 0;
  const showMission = isRookie && !isMissionSnoozed;

  const startFirstMission = useCallback(() => {
    navigation.navigate('CaptureFlow', { screen: 'Camera', params: { tutorial: true } });
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

      {/* 화면 오른쪽 가장자리에 붙는 탭. 스크롤과 무관하게 항상 같은 자리에
          있어야 눈에 익어 다시 찾기 쉽다 - 그래서 스크롤뷰 밖, 헤더 아래에 둔다. */}
      <Pressable
        accessibilityLabel="냥냥 비품상점 열기"
        accessibilityRole="button"
        // 비품 태그는 문이 두 개다 - 새 비품을 사러 가는 상점과 내 보관함.
        // 어느 쪽인지 물어보고 연다.
        onPress={() =>
          Alert.alert('냥냥 비품', '어디로 갈까요?', [
            { text: '비품상점 구경하기', onPress: () => navigation.navigate('Shop') },
            { text: '비품 보관함 열기', onPress: () => navigation.navigate('Shop', { owned: true }) },
            { text: '닫기', style: 'cancel' },
          ])
        }
        style={({ pressed }) => [styles.shopTag, pressed && styles.pressed]}
      >
        <ShoppingBag color="#FFFFFF" size={14} strokeWidth={2} />
        <Text style={styles.shopTagText}>{'비\n품'}</Text>
      </Pressable>

      <Animated.ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarInset }]}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{CREW_COMPANY_NAME} 사원증</Text>
          <CrewIdCard
            inactive={isRookie}
            nickname={profile?.nickname ?? DEFAULT_PROFILE_NICKNAME}
            profileImageUrl={profile?.profileImageUrl}
            city={neighborhood?.city}
            joinedAt={profile?.createdAt}
            pull={pull}
            rank={isRookie ? '신입 사원' : crewStatus.rank}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘의 고객 상담</Text>
          <View style={styles.sectionBody}>
            <SupportRoomEntryCard onPress={openSupportRoom} room={room} />
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{showMission ? '신입 사원 첫 업무' : '인사고과'}</Text>
          <View style={styles.sectionBody}>
            {showMission ? (
              <RookieMissionCard
                branch={formatBranch(neighborhood?.city)}
                nickname={profile?.nickname ?? DEFAULT_PROFILE_NICKNAME}
                onLater={() => setIsMissionSnoozed(true)}
                onStart={startFirstMission}
              />
            ) : (
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
            )}
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
  // 시안처럼 오른쪽 밖으로 절반쯤 나가 있다가 눌러야 온전히 보이는 탭이
  // 아니라, 화면 안쪽에 딱 붙어 시작하는 탭이다 - 오른쪽만 각지고 왼쪽만
  // 둥글다.
  shopTag: {
    position: 'absolute',
    right: 0,
    // 헤더(56pt)와 겹치지 않을 만큼 넉넉히 떨어뜨린다. 탭이 화면 오른쪽
    // 끝에 딱 붙어 있어 알림벨과 가로로 겹치는 구간이 있으므로, 세로
    // 간격을 좁게 두면 자칫 벨과 부딪혀 보인다.
    top: 140,
    zIndex: 5,
    alignItems: 'center',
    gap: 2,
    width: 34,
    paddingVertical: 8,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    backgroundColor: theme.colors.primary,
    ...createNdShadow(0.18, 10),
  },
  shopTagText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'center',
    color: '#FFFFFF',
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
