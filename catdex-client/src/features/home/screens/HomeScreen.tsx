import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronDown, MapPin } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '@/app/navigation/types';
import { useTabBarInset } from '@/app/navigation/useTabBarInset';
import { CatChatCard } from '@/features/home/components/CatChatCard';
import { CrewIdCard } from '@/features/home/components/CrewIdCard';
import { CrewProgressCard } from '@/features/home/components/CrewProgressCard';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { fetchMyProfile } from '@/shared/api/auth.api';
import { defaultCrewStatus, fetchMyCrewStatus, type CrewStatus } from '@/shared/api/crew.api';
import { fetchMyCats } from '@/shared/api/cats.api';
import { DEFAULT_PROFILE_NICKNAME } from '@/shared/constants/profile.constants';
import { useActiveNeighborhood } from '@/shared/neighborhood/useActiveNeighborhood';
import { nd } from '@/shared/styles/theme';
import type { AuthUser } from '@/shared/types/auth';
import type { Cat } from '@/shared/types/cat';
import { imageForCatType } from '@/shared/utils/catImage';

/** 받침이 있으면 "과", 없으면 "와". */
function withParticle(name: string) {
  const lastCharacter = name.at(-1) ?? '';
  const code = lastCharacter.charCodeAt(0);

  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) {
    return '와';
  }

  return (code - 0xac00) % 28 === 0 ? '와' : '과';
}

/** 시안의 세 가지 안내 문구를 카드 순서대로 돌려쓴다. */
function getChatMessage(name: string, index: number) {
  const messages = [
    `${name}의 이야기를 들어보세요.`,
    `${name}${withParticle(name)} 특별한 대화를 시작해 보세요.`,
    `${name}${withParticle(name)} 언제든 대화해 보세요.`,
  ];

  return messages[index % messages.length];
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [crewStatus, setCrewStatus] = useState<CrewStatus>(defaultCrewStatus);
  const [myCats, setMyCats] = useState<Cat[]>([]);
  const { neighborhood, name: neighborhoodName, isDetecting, redetect } = useActiveNeighborhood();
  const tabBarInset = useTabBarInset();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      Promise.all([fetchMyProfile(), fetchMyCats(), fetchMyCrewStatus()])
        .then(([nextProfile, nextCats, nextCrewStatus]) => {
          if (!isActive) {
            return;
          }

          setProfile(nextProfile);
          setMyCats(nextCats);
          setCrewStatus(nextCrewStatus);
        })
        .catch((error: unknown) => {
          console.warn('[home] load failed', error);
        });

      return () => {
        isActive = false;
      };
    }, []),
  );

  const chatCats = useMemo(() => myCats.slice(0, 3), [myCats]);



  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityLabel="현재 위치로 동네 다시 확인"
          accessibilityRole="button"
          disabled={isDetecting}
          onPress={redetect}
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

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarInset }]} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>대한냥냥공사 사원증</Text>
          <CrewIdCard
            nickname={profile?.nickname ?? DEFAULT_PROFILE_NICKNAME}
            profileImageUrl={profile?.profileImageUrl}
            city={neighborhood?.city}
            joinedAt={profile?.createdAt}
            rank={crewStatus.rank}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>인사고과</Text>
          <View style={styles.sectionBody}>
            <CrewProgressCard status={crewStatus} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>고양이랑 대화 하실래요?</Text>
          {chatCats.length > 0 ? (
            <ScrollView contentContainerStyle={styles.row} horizontal showsHorizontalScrollIndicator={false}>
              {chatCats.map((cat, index) => (
                <CatChatCard
                  imageSource={imageForCatType(cat.type, cat.imageUrl)}
                  key={cat.id}
                  message={getChatMessage(cat.name, index)}
                  onPress={() => Alert.alert('대화는 준비 중이에요', '고양이와의 채팅은 다음 단계에서 열려요.')}
                />
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.emptyText}>도감에 고양이를 등록하면 대화 상대가 생겨요.</Text>
          )}
        </View>
      </ScrollView>
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
