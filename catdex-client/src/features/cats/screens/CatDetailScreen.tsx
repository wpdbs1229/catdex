import {
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  ChevronRight,
  Heart,
  PawPrint,
  Plane,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/app/navigation/types';
import {
  CUSTOMER_DOSSIER_ASPECT_RATIO,
  CustomerDossierCard,
  CustomerDossierPeekCard,
} from '@/features/cats/components/CustomerDossierCard';
import {
  fetchCatEncounters,
  fetchCats,
  fetchMyCats,
  recordCatEncounter,
  removeMyCatEncounter,
} from '@/shared/api/cats.api';
import { getUserFacingError } from '@/shared/errors/user-facing-error';
import { loadFavoriteCatIds, saveFavoriteCatIds } from '@/shared/favorites/favorites-storage';
import {
  detectEncounterNeighborhood,
  getHomeRegionNames,
  isEncounterLocationTrusted,
  UNSET_REGION_NAME,
} from '@/shared/neighborhood/active-neighborhood';
import { createNdShadow, nd, theme } from '@/shared/styles/theme';
import type { Cat, CatEncounter } from '@/shared/types/cat';
import { getAffinity, sortEncountersByDateAsc } from '@/shared/utils/catPresentation';

function formatShortDate(value: string) {
  const dateMatch = /^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/.exec(value.trim());

  if (dateMatch) {
    return `${dateMatch[1].slice(2)}.${dateMatch[2].padStart(2, '0')}.${dateMatch[3].padStart(2, '0')}`;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value.replace(/-/g, '.');
  }

  return [
    String(parsed.getFullYear()).slice(2),
    String(parsed.getMonth() + 1).padStart(2, '0'),
    String(parsed.getDate()).padStart(2, '0'),
  ].join('.');
}

function getAffinityLabel(affinity: number) {
  if (affinity >= 67) {
    return '단짝';
  }

  if (affinity >= 34) {
    return '친구';
  }

  return '첫인사';
}

export function CatDetailScreen({ navigation, route }: RootStackScreenProps<'CatDetail'>) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { catId } = route.params;
  const [cat, setCat] = useState<Cat | null>(null);
  const [availableCats, setAvailableCats] = useState<Cat[]>([]);
  const [isMyCat, setIsMyCat] = useState(false);
  const [encounters, setEncounters] = useState<CatEncounter[]>([]);
  const [liked, setLiked] = useState(false);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [draftMemo, setDraftMemo] = useState('');
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const [homeRegionNames, setHomeRegionNames] = useState<Set<string>>(new Set());

  const reload = useCallback(async () => {
    const [allCats, myCats, nextEncounters, favoriteIds] = await Promise.all([
      fetchCats(),
      fetchMyCats(),
      fetchCatEncounters(catId),
      loadFavoriteCatIds(),
    ]);
    const mine = myCats.find((candidate) => candidate.id === catId) ?? null;
    const nextCat = mine ?? allCats.find((candidate) => candidate.id === catId) ?? null;

    setCat(nextCat);
    setAvailableCats(myCats.length > 0 ? myCats : allCats);
    setIsMyCat(Boolean(mine));
    setEncounters(nextEncounters);
    setLiked(favoriteIds.has(catId));
  }, [catId]);

  useFocusEffect(
    useCallback(() => {
      getHomeRegionNames()
        .then(setHomeRegionNames)
        .catch(() => setHomeRegionNames(new Set()));

      reload().catch((error: unknown) => {
        console.warn('[cat-detail] load failed', error);
      });
    }, [reload]),
  );

  const sortedEncounters = useMemo(
    () => sortEncountersByDateAsc(encounters.filter((encounter) => encounter.memo.trim().length > 0)),
    [encounters],
  );
  const visibleEncounters = showAllEntries ? sortedEncounters : sortedEncounters.slice(-2);
  const hasMoreEntries = sortedEncounters.length > visibleEncounters.length;
  const affinity = cat && isMyCat ? getAffinity(cat) : 0;
  const affinityLabel = getAffinityLabel(affinity);
  const dossierWidth = Math.min(318, windowWidth - 50);
  const dossierHeight = dossierWidth * CUSTOMER_DOSSIER_ASPECT_RATIO;
  const peekWidth = dossierWidth * 0.76;

  const sameHabitatCats = useMemo(() => {
    if (!cat) {
      return [];
    }

    return availableCats
      .filter((candidate) => candidate.habitat === cat.habitat)
      .sort((left, right) => left.number - right.number);
  }, [availableCats, cat]);
  const selectedIndex = sameHabitatCats.findIndex((candidate) => candidate.id === cat?.id);
  const previousCat = selectedIndex > 0 ? sameHabitatCats[selectedIndex - 1] : null;
  const nextCat = selectedIndex >= 0 && selectedIndex < sameHabitatCats.length - 1
    ? sameHabitatCats[selectedIndex + 1]
    : null;

  const openCat = (next: Cat) => {
    navigation.replace('CatDetail', { catId: next.id });
  };

  const handleToggleLike = async () => {
    const favoriteIds = await loadFavoriteCatIds();

    if (favoriteIds.has(catId)) {
      favoriteIds.delete(catId);
    } else {
      favoriteIds.add(catId);
    }

    setLiked(favoriteIds.has(catId));
    await saveFavoriteCatIds(favoriteIds);
  };

  const handleSubmitMemo = async () => {
    const memo = draftMemo.trim();

    if (!memo || !cat || isSavingMemo) {
      return;
    }

    setIsSavingMemo(true);

    try {
      const encounterNeighborhood = await detectEncounterNeighborhood();

      await recordCatEncounter(cat.id, {
        regionName:
          encounterNeighborhood?.name ?? encounters[encounters.length - 1]?.regionName ?? UNSET_REGION_NAME,
        memo,
      });
      setDraftMemo('');
      await reload();
    } catch (error) {
      Alert.alert('기록 저장 실패', getUserFacingError(error, 'generic').message);
    } finally {
      setIsSavingMemo(false);
    }
  };

  const isAwayEncounter = (encounter: CatEncounter) =>
    homeRegionNames.size > 0 &&
    isEncounterLocationTrusted(encounter.seenAt) &&
    encounter.regionName !== UNSET_REGION_NAME &&
    !homeRegionNames.has(encounter.regionName);

  const handleRemoveEncounter = (encounter: CatEncounter) => {
    Alert.alert('기록 삭제', '이 만남 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          removeMyCatEncounter(encounter.id)
            .then((result) => {
              if (result.catRemoved) {
                navigation.goBack();
                return;
              }

              return reload();
            })
            .catch((error: unknown) => {
              Alert.alert('삭제 실패', getUserFacingError(error, 'generic').message);
            });
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <View style={[styles.headerRow, { marginTop: insets.top }]}>
        <Pressable
          accessibilityLabel="뒤로 가기"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.circleButton, pressed && styles.pressed]}
        >
          <ArrowLeft color={nd.colors.ink} size={23} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>고객 도감</Text>
        <Pressable
          accessibilityLabel={liked ? '즐겨찾기 해제' : '즐겨찾기'}
          onPress={() => {
            handleToggleLike().catch((error: unknown) => {
              console.warn('[cat-detail] favorite save failed', error);
            });
          }}
          style={({ pressed }) => [styles.headerHeart, pressed && styles.pressed]}
        >
          <Heart
            color={theme.colors.primary}
            fill={liked ? theme.colors.primary : 'transparent'}
            size={31}
            strokeWidth={2}
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 112 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {cat ? (
          <>
            <View style={[styles.caseStage, { height: dossierHeight + 12 }]}>
              {previousCat ? (
                <Pressable
                  accessibilityLabel={`이전 고객 ${previousCat.name}`}
                  onPress={() => openCat(previousCat)}
                  style={[
                    styles.peekButton,
                    styles.peekButtonLeft,
                    { left: -peekWidth * 0.62, top: 30, width: peekWidth },
                  ]}
                >
                  <CustomerDossierPeekCard cat={previousCat} side="left" width={peekWidth} />
                </Pressable>
              ) : null}

              {nextCat ? (
                <Pressable
                  accessibilityLabel={`다음 고객 ${nextCat.name}`}
                  onPress={() => openCat(nextCat)}
                  style={[
                    styles.peekButton,
                    styles.peekButtonRight,
                    { right: -peekWidth * 0.62, top: 30, width: peekWidth },
                  ]}
                >
                  <CustomerDossierPeekCard cat={nextCat} side="right" width={peekWidth} />
                </Pressable>
              ) : null}

              <View style={styles.selectedCase}>
                <CustomerDossierCard
                  affinityLabel={affinityLabel}
                  cat={cat}
                  encounters={encounters}
                  width={dossierWidth}
                />
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryChip}>
                <CalendarDays color={theme.colors.primary} size={16} strokeWidth={2} />
                <Text numberOfLines={1} style={styles.summaryText}>
                  첫 만남 <Text style={styles.summaryStrong}>{formatShortDate(cat.firstSeenAt)}</Text>
                </Text>
              </View>
              <View style={styles.summaryChip}>
                <CalendarDays color={theme.colors.primary} size={16} strokeWidth={2} />
                <Text numberOfLines={1} style={styles.summaryText}>
                  최근 <Text style={styles.summaryStrong}>{formatShortDate(cat.lastSeenAt)}</Text>
                </Text>
              </View>
              <View style={styles.summaryChip}>
                <Heart color={theme.colors.primary} size={16} strokeWidth={2} />
                <Text numberOfLines={1} style={styles.summaryText}>
                  친밀도 <Text style={styles.affinityStrong}>{affinityLabel}</Text>
                </Text>
              </View>
            </View>

            <View style={styles.recordsSection}>
              <View style={styles.recordsTitleRow}>
                <Text style={styles.recordsTitle}>{cat.name}의 기록을 펼쳐볼냥?</Text>
                <PawPrint color={theme.colors.primary} size={17} strokeWidth={2} />
              </View>

              {visibleEncounters.length === 0 ? (
                <View style={styles.recordsEmpty}>
                  <PawPrint color={nd.colors.subtle} size={24} strokeWidth={1.6} />
                  <Text style={styles.recordsEmptyText}>아직 기록이 없어요. 첫 만남을 남겨보세요.</Text>
                </View>
              ) : (
                <View style={styles.recordsCard}>
                  {visibleEncounters.map((encounter, index) => (
                    <View key={encounter.id}>
                      {index > 0 ? <View style={styles.recordDivider} /> : null}
                      <Pressable
                        accessibilityHint="길게 누르면 이 기록을 삭제할 수 있어요"
                        delayLongPress={450}
                        onLongPress={() => handleRemoveEncounter(encounter)}
                        style={({ pressed }) => [styles.recordRow, pressed && styles.recordPressed]}
                      >
                        <View style={styles.recordIcon}>
                          <PawPrint color={theme.colors.primary} size={14} strokeWidth={2} />
                        </View>
                        <View style={styles.recordContent}>
                          <Text numberOfLines={1} style={styles.recordText}>{encounter.memo}</Text>
                          {isAwayEncounter(encounter) ? (
                            <View style={styles.awayChip}>
                              <Plane color={nd.colors.accent} size={9} strokeWidth={2.2} />
                              <Text numberOfLines={1} style={styles.awayChipText}>출장 · {encounter.regionName}</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.recordDate}>{formatShortDate(encounter.seenAt)}</Text>
                        <ChevronRight color={nd.colors.subtle} size={18} strokeWidth={1.8} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {hasMoreEntries || showAllEntries ? (
                <Pressable
                  onPress={() => setShowAllEntries((previous) => !previous)}
                  style={({ pressed }) => [styles.recordsMore, pressed && styles.pressed]}
                >
                  <Text style={styles.recordsMoreText}>{showAllEntries ? '기록 접기' : '전체 기록보기'}</Text>
                  <ChevronRight
                    color={theme.colors.primary}
                    size={18}
                    strokeWidth={2}
                    style={showAllEntries ? styles.chevronUp : undefined}
                  />
                </Pressable>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.inputBarWrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.inputBar}>
          <TextInput
            editable={!isSavingMemo}
            onChangeText={setDraftMemo}
            onSubmitEditing={handleSubmitMemo}
            placeholder="오늘의 만남을 기록해볼까요?"
            placeholderTextColor={nd.colors.subtle}
            returnKeyType="send"
            style={styles.input}
            value={draftMemo}
          />
          <Pressable
            accessibilityLabel="기록 남기기"
            disabled={isSavingMemo || !draftMemo.trim()}
            onPress={handleSubmitMemo}
            style={({ pressed }) => [
              styles.sendButton,
              (!draftMemo.trim() || isSavingMemo) && styles.sendButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            <ArrowUp color="#FFFFFF" size={24} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  headerTitle: {
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.7,
    color: nd.colors.ink,
  },
  circleButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    ...createNdShadow(0.08, 7),
  },
  headerHeart: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingTop: 2,
  },
  caseStage: {
    position: 'relative',
    alignItems: 'center',
    overflow: 'hidden',
  },
  selectedCase: {
    zIndex: 3,
  },
  peekButton: {
    position: 'absolute',
    zIndex: 1,
  },
  peekButtonLeft: {
    alignItems: 'flex-end',
  },
  peekButtonRight: {
    alignItems: 'flex-start',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 14,
    marginTop: 2,
  },
  summaryChip: {
    flex: 1,
    minWidth: 0,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(229, 229, 236, 0.85)',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 7,
    ...createNdShadow(0.05, 6),
  },
  summaryText: {
    flexShrink: 1,
    fontSize: 10,
    letterSpacing: -0.3,
    color: nd.colors.sub,
  },
  summaryStrong: {
    fontWeight: '700',
    color: nd.colors.ink,
  },
  affinityStrong: {
    fontWeight: '800',
    color: theme.colors.primary,
  },
  recordsSection: {
    marginTop: 26,
    paddingHorizontal: 20,
  },
  recordsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 13,
  },
  recordsTitle: {
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.55,
    color: nd.colors.ink,
  },
  recordsCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: nd.colors.border,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  recordsEmpty: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: nd.colors.border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
  },
  recordsEmptyText: {
    fontSize: 13,
    letterSpacing: -0.3,
    color: nd.colors.sub,
  },
  recordRow: {
    minHeight: 63,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  recordPressed: {
    backgroundColor: nd.colors.field,
  },
  recordIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
  },
  recordContent: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  recordText: {
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.32,
    color: nd.colors.ink,
  },
  recordDate: {
    fontSize: 11,
    letterSpacing: -0.2,
    color: nd.colors.subtle,
  },
  recordDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
    marginRight: 12,
    backgroundColor: nd.colors.border,
  },
  awayChip: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: nd.radius.pill,
    backgroundColor: nd.colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  awayChipText: {
    maxWidth: 120,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: nd.colors.accent,
  },
  recordsMore: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  recordsMoreText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  chevronUp: {
    transform: [{ rotate: '-90deg' }],
  },
  inputBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
  },
  inputBar: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 29,
    borderWidth: 1,
    borderColor: nd.colors.border,
    backgroundColor: '#FFFFFF',
    paddingLeft: 20,
    paddingRight: 6,
    ...createNdShadow(0.1, 12),
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    fontSize: 14,
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  sendButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: theme.colors.primary,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.76,
  },
});
