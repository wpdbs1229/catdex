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
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { fetchMyProfile } from '@/shared/api/auth.api';
import { fetchDexPlaceholders, fetchMyCats } from '@/shared/api/cats.api';
import { PolaroidCatCard } from '@/shared/components/PolaroidCatCard';
import { DEFAULT_PROFILE_NICKNAME } from '@/shared/constants/profile.constants';
import { loadFavoriteCatIds, saveFavoriteCatIds } from '@/shared/favorites/favorites-storage';
import { useActiveNeighborhood } from '@/shared/neighborhood/useActiveNeighborhood';
import { nd } from '@/shared/styles/theme';
import type { AuthUser } from '@/shared/types/auth';
import type { Cat, DexPlaceholder } from '@/shared/types/cat';
import { imageForCatType } from '@/shared/utils/catImage';
import { formatNyanTagLabel } from '@/shared/utils/catPresentation';

/**
 * 사원증 직책. 서버에 직책 개념이 없어서 내가 모은 고양이 수로 정한다.
 * 시안의 "대장"은 가장 높은 단계에 해당한다.
 */
function getCrewRank(collectedCount: number) {
  if (collectedCount >= 15) {
    return '대장';
  }

  if (collectedCount >= 5) {
    return '대원';
  }

  return '수습';
}

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
  const [myCats, setMyCats] = useState<Cat[]>([]);
  const [placeholders, setPlaceholders] = useState<DexPlaceholder[]>([]);
  const [favoriteCatIds, setFavoriteCatIds] = useState<Set<string>>(() => new Set());
  const { name: neighborhoodName, isDetecting, redetect } = useActiveNeighborhood();
  const tabBarInset = useTabBarInset();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      Promise.all([fetchMyProfile(), fetchMyCats(), fetchDexPlaceholders(), loadFavoriteCatIds()])
        .then(([nextProfile, nextCats, nextPlaceholders, nextFavorites]) => {
          if (!isActive) {
            return;
          }

          setProfile(nextProfile);
          setMyCats(nextCats);
          setPlaceholders(nextPlaceholders);
          setFavoriteCatIds(nextFavorites);
        })
        .catch((error: unknown) => {
          console.warn('[home] load failed', error);
        });

      return () => {
        isActive = false;
      };
    }, []),
  );

  const favoriteCats = useMemo(() => myCats.filter((cat) => favoriteCatIds.has(cat.id)), [favoriteCatIds, myCats]);
  const chatCats = useMemo(() => myCats.slice(0, 3), [myCats]);

  const toggleFavorite = (catId: string) => {
    setFavoriteCatIds((previous) => {
      const next = new Set(previous);

      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }

      saveFavoriteCatIds(next).catch((error: unknown) => {
        console.warn('[home] favorite save failed', error);
      });

      return next;
    });
  };

  const openCatDetail = (catId: string) => navigation.navigate('CatDetail', { catId });

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
          <Text style={styles.sectionTitle}>냥냥단 사원증</Text>
          <View style={styles.sectionBody}>
            <CrewIdCard
              nickname={profile?.nickname ?? DEFAULT_PROFILE_NICKNAME}
              profileImageUrl={profile?.profileImageUrl}
              rank={getCrewRank(myCats.length)}
            />
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>즐겨찾기한 고양이</Text>
          {favoriteCats.length > 0 ? (
            <ScrollView contentContainerStyle={styles.row} horizontal showsHorizontalScrollIndicator={false}>
              {favoriteCats.map((cat) => (
                <View key={cat.id} style={styles.cardSlot}>
                  <PolaroidCatCard
                    imageSource={imageForCatType(cat.type, cat.imageUrl)}
                    liked
                    onPress={() => openCatDetail(cat.id)}
                    onToggleLike={() => toggleFavorite(cat.id)}
                    tagLabel={formatNyanTagLabel(cat.name, cat.firstSeenAt)}
                  />
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.emptyText}>도감에서 하트를 누르면 여기에 모여요.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>미확인 동네 고양이</Text>
          {placeholders.length > 0 ? (
            <ScrollView contentContainerStyle={styles.row} horizontal showsHorizontalScrollIndicator={false}>
              {placeholders.map((placeholder) => (
                <View key={placeholder.id} style={styles.cardSlot}>
                  <PolaroidCatCard
                    imageSource={imageForCatType(placeholder.type, placeholder.imageUrl)}
                    // 제보 단계라 이름이 없다. 시안의 "이름_날짜" 자리에는 지역명 대신
                    // 길이가 비슷한 털색을 넣는다. (지역명은 "부천시 중동 근처"처럼 길어 잘린다.)
                    tagLabel={
                      placeholder.sightedAt
                        ? formatNyanTagLabel(placeholder.type, placeholder.sightedAt)
                        : placeholder.type
                    }
                    tagTone="muted"
                  />
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.emptyText}>아직 제보된 동네 고양이가 없어요.</Text>
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
  cardSlot: {
    width: 165,
    height: 178,
  },
  emptyText: {
    paddingHorizontal: 28,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.35,
    color: nd.colors.sub,
  },
});
