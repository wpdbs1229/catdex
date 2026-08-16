import {
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  ChevronRight,
  Heart,
  PawPrint,
  Plane,
  Vote,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  PanResponder,
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
import { CatNameVoteSheet } from '@/features/cats/components/CatNameVoteSheet';
import {
  CUSTOMER_DOSSIER_ASPECT_RATIO,
  CustomerDossierCard,
  CustomerDossierPeekCard,
} from '@/features/cats/components/CustomerDossierCard';
import { getCurrentUserId } from '@/shared/api/auth.api';
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
import { fetchMyEquipment } from '@/shared/api/shop.api';
import { createNdShadow, nd, theme } from '@/shared/styles/theme';
import type { Cat, CatEncounter } from '@/shared/types/cat';
import type { UserEquipment } from '@/shared/types/shop';
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
  const { catId: initialCatId, entryPoint, siblingIds } = route.params;
  const isNeighborhoodDexDetail = entryPoint === 'neighborhoodDex';
  // 옆으로 넘겨도 화면은 그대로 두고 보고 있는 개체만 바꾼다.
  const [catId, setCatId] = useState(initialCatId);
  const [roster, setRoster] = useState<{ all: Cat[]; mine: Cat[] }>({ all: [], mine: [] });
  const [encounters, setEncounters] = useState<CatEncounter[]>([]);
  const [liked, setLiked] = useState(false);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [draftMemo, setDraftMemo] = useState('');
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const [homeRegionNames, setHomeRegionNames] = useState<Set<string>>(new Set());
  // 기록 목록이 동네 사람들과 공유라, 내 것만 길게 눌러 지울 수 있어야 한다.
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isNameVoteOpen, setIsNameVoteOpen] = useState(false);
  const [equipment, setEquipment] = useState<UserEquipment>({});

  const cat = useMemo(
    () =>
      roster.mine.find((candidate) => candidate.id === catId) ??
      roster.all.find((candidate) => candidate.id === catId) ??
      null,
    [roster, catId],
  );
  const isMyCat = useMemo(
    () => roster.mine.some((candidate) => candidate.id === catId),
    [roster, catId],
  );
  const availableCats = roster.mine.length > 0 ? roster.mine : roster.all;

  /** 목록. 화면에 들어올 때 한 번만 받는다. 카드를 넘길 때마다 받으면 버벅인다. */
  const loadRoster = useCallback(async () => {
    const [all, mine] = await Promise.all([fetchCats(), fetchMyCats()]);

    setRoster({ all, mine });
  }, []);

  /** 보고 있는 개체에만 딸린 것. 카드를 넘길 때마다 이것만 새로 받는다. */
  const loadSelected = useCallback(async (id: string) => {
    const [nextEncounters, favoriteIds] = await Promise.all([
      fetchCatEncounters(id),
      loadFavoriteCatIds(),
    ]);

    setEncounters(nextEncounters);
    setLiked(favoriteIds.has(id));
  }, []);

  const reload = useCallback(
    () => Promise.all([loadRoster(), loadSelected(catId)]).then(() => undefined),
    [catId, loadRoster, loadSelected],
  );

  useFocusEffect(
    useCallback(() => {
      getHomeRegionNames()
        .then(setHomeRegionNames)
        .catch(() => setHomeRegionNames(new Set()));

      loadRoster().catch((error: unknown) => {
        console.warn('[cat-detail] roster load failed', error);
      });

      // 상점에서 장착하고 돌아왔을 수 있으니 화면에 들어올 때마다 새로 읽는다.
      fetchMyEquipment()
        .then(setEquipment)
        .catch((error: unknown) => {
          console.warn('[cat-detail] equipment load failed', error);
        });

      getCurrentUserId()
        .then(setCurrentUserId)
        .catch(() => setCurrentUserId(null));
    }, [loadRoster]),
  );

  useEffect(() => {
    // 앞 카드의 일기가 새 카드 이름 아래 남아 있으면 남의 기록으로 읽힌다.
    setEncounters([]);
    loadSelected(catId).catch((error: unknown) => {
      console.warn('[cat-detail] load failed', error);
    });
  }, [catId, loadSelected]);

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

  /**
   * 옆으로 넘길 때 따라갈 순서.
   *
   * 도감에서 들어왔으면 그 화면이 늘어놓고 있던 목록을 그대로 쓴다. 필터를
   * 걸고 들어왔는데 넘기니 걸러냈던 고양이가 나오면 방금 본 화면과 어긋난다.
   * 지도·알림처럼 목록 없이 들어온 경우에만 같은 거처 전체로 채운다.
   */
  const siblings = useMemo(() => {
    if (!cat) {
      return [];
    }

    if (siblingIds && siblingIds.length > 0) {
      const byId = new Map(availableCats.map((candidate) => [candidate.id, candidate]));
      // 넘겨받은 뒤 지워진 고양이가 있을 수 있으므로 실재하는 것만 남긴다.
      const ordered = siblingIds
        .map((id) => byId.get(id))
        .filter((candidate): candidate is Cat => Boolean(candidate));

      if (ordered.some((candidate) => candidate.id === cat.id)) {
        return ordered;
      }
    }

    return availableCats
      .filter((candidate) => candidate.habitat === cat.habitat)
      .sort((left, right) => left.number - right.number);
  }, [availableCats, cat, siblingIds]);
  const selectedIndex = siblings.findIndex((candidate) => candidate.id === cat?.id);
  const previousCat = selectedIndex > 0 ? siblings[selectedIndex - 1] : null;
  const nextCat = selectedIndex >= 0 && selectedIndex < siblings.length - 1
    ? siblings[selectedIndex + 1]
    : null;

  /**
   * 카드를 바꾼다. 화면을 새로 띄우지 않고 이 화면 안에서 갈아끼운다 -
   * navigation.replace를 쓰면 넘길 때마다 화면이 통째로 다시 마운트돼서
   * 손을 따라 움직이던 카드가 툭 끊긴다. 뒤로가기는 그대로 도감으로 간다.
   */
  const openCat = useCallback(
    (next: Cat) => {
      if (next.id === catId) {
        return;
      }

      Keyboard.dismiss();
      setShowAllEntries(false);
      setCatId(next.id);
    },
    [catId],
  );

  /**
   * 카드 넘김 제스처.
   *
   * 카드 무대에서만 가로 손짓을 받는다. 아래 기록은 세로로 넘겨 읽는 자리라
   * 거기까지 가로를 먹으면 스크롤과 싸운다.
   *
   * 메모를 쓰던 중이면 넘기지 않는다. 넘기는 순간 초안이 다른 고양이의 기록이
   * 되거나 그대로 사라진다 - 눌러서 저장하거나 지우는 건 사용자가 정할 일이다.
   */
  const dragX = useRef(new Animated.Value(0)).current;
  const isSwitchingCard = useRef(false);
  const hasDraftMemo = draftMemo.trim().length > 0;
  const swipeStride = dossierWidth + peekWidth * 0.38;

  const canSwipeTo = useCallback(
    (dx: number) => Boolean(dx < 0 ? nextCat : previousCat),
    [nextCat, previousCat],
  );

  const settleSwipe = useCallback(
    (target: Cat | null, direction: number) => {
      if (!target) {
        Animated.spring(dragX, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start(() => {
          isSwitchingCard.current = false;
        });
        return;
      }

      Animated.timing(dragX, {
        toValue: direction * swipeStride,
        duration: 190,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        openCat(target);
        // 새 카드는 반대편에서 들어와 제자리에 앉는다.
        dragX.setValue(-direction * swipeStride * 0.5);
        Animated.spring(dragX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start(() => {
          isSwitchingCard.current = false;
        });
      });
    },
    [dragX, openCat, swipeStride],
  );

  const cardPan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          !isSwitchingCard.current &&
          !hasDraftMemo &&
          !isSavingMemo &&
          Math.abs(gesture.dx) > 12 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4 &&
          canSwipeTo(gesture.dx),
        onPanResponderMove: (_, gesture) => {
          // 끝 카드에서는 뻑뻑하게 끌려 더 갈 곳이 없음을 손으로 알린다.
          dragX.setValue(canSwipeTo(gesture.dx) ? gesture.dx : gesture.dx * 0.22);
        },
        onPanResponderRelease: (_, gesture) => {
          const goingNext = gesture.dx < 0;
          const target = goingNext ? nextCat : previousCat;
          const committed =
            Math.abs(gesture.dx) > dossierWidth * 0.24 || Math.abs(gesture.vx) > 0.5;

          isSwitchingCard.current = true;
          settleSwipe(committed ? target : null, goingNext ? -1 : 1);
        },
        onPanResponderTerminate: () => {
          isSwitchingCard.current = true;
          settleSwipe(null, 0);
        },
      }),
    [canSwipeTo, dossierWidth, dragX, hasDraftMemo, isSavingMemo, nextCat, previousCat, settleSwipe],
  );

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
          style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}
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
            <Animated.View
              style={[
                styles.caseStage,
                { height: dossierHeight + 12, transform: [{ translateX: dragX }] },
              ]}
              {...cardPan.panHandlers}
            >
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
                  equipment={equipment}
                  width={dossierWidth}
                />
              </View>
            </Animated.View>

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
                <Text numberOfLines={1} style={styles.recordsTitle}>{cat.name}의 기록을 펼쳐볼냥?</Text>
                {isNeighborhoodDexDetail ? (
                  <Pressable
                    accessibilityLabel="이름 투표 열기"
                    accessibilityRole="button"
                    hitSlop={6}
                    onPress={() => setIsNameVoteOpen(true)}
                    style={({ pressed }) => [styles.nameVoteButton, pressed && styles.pressed]}
                  >
                    <Vote color={theme.colors.primary} size={13} strokeWidth={2.2} />
                    <Text style={styles.nameVoteButtonText}>이름 투표</Text>
                  </Pressable>
                ) : (
                  <PawPrint color={theme.colors.primary} size={17} strokeWidth={2} />
                )}
              </View>

              {visibleEncounters.length === 0 ? (
                <View style={styles.recordsEmpty}>
                  <PawPrint color={nd.colors.subtle} size={24} strokeWidth={1.6} />
                  <Text style={styles.recordsEmptyText}>아직 기록이 없어요. 첫 만남을 남겨보세요.</Text>
                </View>
              ) : (
                <View style={styles.recordsCard}>
                  {visibleEncounters.map((encounter, index) => {
                    // 기록은 동네 사람들과 공유라, 남의 기록까지 길게 눌러 지울 수
                    // 있으면 안 된다.
                    const isOwnEncounter = Boolean(currentUserId) && encounter.userId === currentUserId;

                    return (
                    <View key={encounter.id}>
                      {index > 0 ? <View style={styles.recordDivider} /> : null}
                      <Pressable
                        accessibilityHint={isOwnEncounter ? '길게 누르면 이 기록을 삭제할 수 있어요' : undefined}
                        delayLongPress={450}
                        onLongPress={isOwnEncounter ? () => handleRemoveEncounter(encounter) : undefined}
                        style={({ pressed }) => [styles.recordRow, pressed && styles.recordPressed]}
                      >
                        <View style={styles.recordIcon}>
                          <PawPrint color={theme.colors.primary} size={14} strokeWidth={2} />
                        </View>
                        <View style={styles.recordContent}>
                          <Text numberOfLines={1} style={styles.recordText}>{encounter.memo}</Text>
                          <View style={styles.recordMetaRow}>
                            {!isOwnEncounter && encounter.authorNickname ? (
                              <Text numberOfLines={1} style={styles.recordAuthor}>{encounter.authorNickname}님이 남김</Text>
                            ) : null}
                            {isAwayEncounter(encounter) ? (
                              <View style={styles.awayChip}>
                                <Plane color={nd.colors.accent} size={9} strokeWidth={2.2} />
                                <Text numberOfLines={1} style={styles.awayChipText}>출장 · {encounter.regionName}</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                        <Text style={styles.recordDate}>{formatShortDate(encounter.seenAt)}</Text>
                        <ChevronRight color={nd.colors.subtle} size={18} strokeWidth={1.8} />
                      </Pressable>
                    </View>
                    );
                  })}
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

      {cat && isNeighborhoodDexDetail ? (
        <CatNameVoteSheet
          canParticipate={isMyCat}
          catId={cat.id}
          catName={cat.name}
          onChanged={() => {
            // 표가 3표 이상 앞섰으면 서버가 이미 이름을 바꿨을 수 있다.
            reload().catch((error: unknown) => {
              console.warn('[cat-detail] reload after vote failed', error);
            });
          }}
          onClose={() => setIsNameVoteOpen(false)}
          visible={isNameVoteOpen}
        />
      ) : null}
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
  headerAction: {
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
    justifyContent: 'space-between',
    gap: 7,
    marginBottom: 13,
  },
  nameVoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: nd.radius.pill,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  nameVoteButtonText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.28,
    color: theme.colors.primary,
  },
  recordsTitle: {
    flexShrink: 1,
    fontSize: 18,
    lineHeight: 34,
    // 시뮬레이터에서 "기록"·"의" 같은 받침·겹모음 글자가 겹쳐 잘려 보이는
    // 문제가 있었다. letterSpacing 제거, fontWeight 800→700, fontSize·
    // lineHeight 조정을 다 시도했지만 재현이 그대로였다 - 시뮬레이터
    // 폰트 렌더링 자체의 문제일 수 있다. 실기기에서 다시 확인이 필요하다.
    fontWeight: '700',
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
  recordMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  recordAuthor: {
    fontSize: 11,
    letterSpacing: -0.22,
    color: nd.colors.subtle,
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
