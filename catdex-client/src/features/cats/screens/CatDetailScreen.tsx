import { ArrowLeft, ArrowUp, Heart, Mic, PawPrint, Plane } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { RootStackScreenProps } from '@/app/navigation/types';
import { fetchCatEncounters, fetchCats, fetchMyCats, recordCatEncounter, removeMyCatEncounter } from '@/shared/api/cats.api';
import { deriveCatType } from '@/shared/coat/coat-to-cat-type';
import { getUserFacingError } from '@/shared/errors/user-facing-error';
import {
  detectEncounterNeighborhood,
  isEncounterLocationTrusted,
  getHomeRegionNames,
  UNSET_REGION_NAME,
} from '@/shared/neighborhood/active-neighborhood';
import { createNdShadow, nd } from '@/shared/styles/theme';
import type { Cat, CatEncounter } from '@/shared/types/cat';
import { catPhotoSource } from '@/shared/utils/catImage';
import { getAffinity, sortEncountersByDateAsc } from '@/shared/utils/catPresentation';

const paperTexture = require('../../../../assets/textures/crumpled-paper.jpg');

function formatShortDate(value: string) {
  // "2026.05.13" / "2026-05-13"처럼 구분자가 섞여 Date 파싱이 실패해도
  // 연도를 두 자리로 줄여 카드 셀 안에서 줄바꿈되지 않게 한다.
  const dateMatch = /^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/.exec(value.trim());

  if (dateMatch) {
    return `${dateMatch[1].slice(2)}.${dateMatch[2].padStart(2, '0')}.${dateMatch[3].padStart(2, '0')}`;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value.replace(/-/g, '.');
  }

  const year = String(parsed.getFullYear()).slice(2);
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');

  return `${year}.${month}.${day}`;
}

function getBreedLabel(tags: string[], fallback: string) {
  const breedTag = tags.find((tag) => tag.startsWith('품종:'));

  return breedTag ? breedTag.slice('품종:'.length) : fallback;
}

function getGenderSymbol(tags: string[]) {
  if (tags.includes('수컷')) {
    return '♂';
  }

  if (tags.includes('암컷')) {
    return '♀';
  }

  return '-';
}

const AFFINITY_TRACK_WIDTH = 120;
const AFFINITY_KNOB_SIZE = 32;

export function CatDetailScreen({ navigation, route }: RootStackScreenProps<'CatDetail'>) {
  const insets = useSafeAreaInsets();
  const { catId } = route.params;
  const [cat, setCat] = useState<Cat | null>(null);
  const [encounters, setEncounters] = useState<CatEncounter[]>([]);
  const [liked, setLiked] = useState(false);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [draftMemo, setDraftMemo] = useState('');
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  // 어떤 만남이 출장인지 가르는 기준. 근거지를 모르면 아무 표시도 하지 않는다.
  const [homeRegionNames, setHomeRegionNames] = useState<Set<string>>(new Set());

  const reload = useCallback(async () => {
    const [allCats, myCats, nextEncounters] = await Promise.all([
      fetchCats(),
      fetchMyCats(),
      fetchCatEncounters(catId),
    ]);
    const nextCat = [...myCats, ...allCats].find((candidate) => candidate.id === catId) ?? null;

    setCat(nextCat);
    setEncounters(nextEncounters);
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

  // 메모가 없는 만남(사진만 있는 기록 등)은 빈 말풍선이 되므로 일기장에서 제외한다.
  const sortedEncounters = useMemo(
    () => sortEncountersByDateAsc(encounters.filter((encounter) => encounter.memo.trim().length > 0)),
    [encounters],
  );
  const visibleEncounters = showAllEntries ? sortedEncounters : sortedEncounters.slice(-3);
  const hasMoreEntries = sortedEncounters.length > visibleEncounters.length;
  const affinity = cat ? getAffinity(cat) : 0;
  const knobOffset = Math.min(
    AFFINITY_TRACK_WIDTH - AFFINITY_KNOB_SIZE / 2,
    Math.max(-AFFINITY_KNOB_SIZE / 2, (affinity / 100) * AFFINITY_TRACK_WIDTH - AFFINITY_KNOB_SIZE / 2),
  );

  const handleSubmitMemo = async () => {
    const memo = draftMemo.trim();

    if (!memo || !cat || isSavingMemo) {
      return;
    }

    setIsSavingMemo(true);

    try {
      // 재회도 만난 곳 기준이다. 지난번과 다른 동네에서 다시 만날 수 있다.
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

  /**
   * 이 만남이 출장인지.
   *
   * 근거지 밖에서 만난 건을 출장으로 본다. 근거지를 아직 모르거나 만난 곳이
   * '동네 미지정'이면 판단할 수 없으므로 아무 표시도 하지 않는다 - 모르는 것을
   * 출장이라고 부르면 실제 출장과 구분이 안 된다.
   */
  const isAwayEncounter = (encounter: CatEncounter) =>
    homeRegionNames.size > 0 &&
    // 위치를 믿을 수 있게 된 뒤의 기록만 판정한다.
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
      <View pointerEvents="none" style={styles.backgroundWash}>
        <View style={styles.washPink} />
        <View style={styles.washYellow} />
        <View style={styles.washPeach} />
      </View>

      <View style={[styles.headerRow, { marginTop: insets.top }]}>
        <Pressable accessibilityLabel="뒤로 가기" onPress={() => navigation.goBack()} style={({ pressed }) => [styles.circleButton, pressed && styles.pressed]}>
          <ArrowLeft color={nd.colors.ink} size={20} strokeWidth={1.8} />
        </Pressable>
        <Text style={styles.headerTitle}>도감</Text>
        <Pressable
          accessibilityLabel={liked ? '찜 해제' : '찜하기'}
          onPress={() => setLiked((prev) => !prev)}
          style={({ pressed }) => [styles.circleButton, pressed && styles.pressed]}
        >
          <Heart color={liked ? '#FF4D6D' : nd.colors.ink} fill={liked ? '#FF4D6D' : 'transparent'} size={20} strokeWidth={1.8} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {cat ? (
          <>
            <View style={styles.catCard}>
              <Image resizeMode="cover" source={paperTexture} style={styles.cardPaper} />

              {catPhotoSource(cat.imageUrl) ? (
                <Image resizeMode="contain" source={catPhotoSource(cat.imageUrl)!} style={styles.catPhoto} />
              ) : (
                <View style={[styles.catPhoto, styles.catPhotoFallback]}>
                  <PawPrint color={nd.colors.subtle} size={44} />
                </View>
              )}

              <View style={styles.affinityRow}>
                <View style={styles.affinityTrack}>
                  <View style={[styles.affinityFill, { width: Math.max(8, (affinity / 100) * AFFINITY_TRACK_WIDTH) }]} />
                </View>
                <View style={[styles.affinityKnob, { left: knobOffset }]}>
                  <PawPrint color="#FF4D6D" size={15} style={styles.affinityPaw} />
                </View>
              </View>

              <View style={styles.coatDots}>
                {['#FFFDD0', '#FFFFFF'].map((dotColor, index) => (
                  <View key={`${dotColor}-${index}`} style={[styles.coatDot, { backgroundColor: dotColor }]} />
                ))}
              </View>

              <View style={styles.cardInfo}>
                <View style={styles.cardInfoText}>
                  <Text style={styles.catName}>{cat.name}</Text>
                  <Text numberOfLines={2} style={styles.catDescription}>
                    {cat.memo?.trim() || '아직 소개가 없는 고양이예요.'}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <View style={styles.metaCell}>
                    <Text style={styles.metaLabel}>품종</Text>
                    <Text numberOfLines={1} style={styles.metaValue}>
                      {getBreedLabel(cat.tags, deriveCatType(cat.coatColors, cat.coatPattern))}
                    </Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaCell}>
                    <Text style={styles.metaLabel}>성별</Text>
                    <Text style={styles.metaValue}>{getGenderSymbol(cat.tags)}</Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={[styles.metaCell, styles.metaCellWide]}>
                    <Text style={styles.metaLabel}>첫 만남</Text>
                    <Text numberOfLines={1} style={styles.metaValue}>
                      {formatShortDate(cat.firstSeenAt)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.diarySection}>
              <View style={styles.diaryHeader}>
                <Text style={styles.diaryTitle}>일기장</Text>
              </View>

              {visibleEncounters.length === 0 ? (
                <View style={styles.diaryEmpty}>
                  <Text style={styles.diaryEmptyText}>아직 기록이 없어요. 아래에서 첫 만남을 남겨보세요.</Text>
                </View>
              ) : (
                visibleEncounters.map((encounter) => (
                  <View key={encounter.id} style={styles.diaryEntry}>
                    <Pressable delayLongPress={450} onLongPress={() => handleRemoveEncounter(encounter)} style={styles.diaryBubble}>
                      <Text style={styles.diaryText}>{encounter.memo}</Text>
                    </Pressable>
                    <View style={styles.diaryMeta}>
                      <Text style={styles.diaryDate}>{formatShortDate(encounter.seenAt)}</Text>
                      {isAwayEncounter(encounter) ? (
                        <View style={styles.awayChip}>
                          <Plane color={nd.colors.accent} size={10} strokeWidth={2.4} />
                          <Text style={styles.awayChipText}>출장 · {encounter.regionName}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))
              )}

              {hasMoreEntries || showAllEntries ? (
                <Pressable onPress={() => setShowAllEntries((prev) => !prev)} style={({ pressed }) => [styles.diaryMore, pressed && styles.pressed]}>
                  <Text style={styles.diaryMoreText}>{showAllEntries ? '기록 접기' : '전체 기록보기'}</Text>
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
            placeholder="만남을 기록하고 친밀도를 쌓아보세요"
            placeholderTextColor={nd.colors.sub}
            returnKeyType="send"
            style={styles.input}
            value={draftMemo}
          />
          <Pressable
            accessibilityLabel="기록 남기기"
            disabled={isSavingMemo || !draftMemo.trim()}
            onPress={handleSubmitMemo}
            style={({ pressed }) => [styles.micButton, pressed && styles.pressed]}
          >
            {draftMemo.trim() ? (
              <ArrowUp color={nd.colors.primary} size={20} strokeWidth={2} />
            ) : (
              <Mic color="#2A2A37" size={20} strokeWidth={1.6} />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nd.colors.bg,
  },
  backgroundWash: {
    ...StyleSheet.absoluteFillObject,
  },
  washPink: {
    position: 'absolute',
    top: -120,
    left: -80,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(255, 90, 205, 0.13)',
  },
  washYellow: {
    position: 'absolute',
    top: 200,
    right: -120,
    width: 430,
    height: 430,
    borderRadius: 215,
    backgroundColor: 'rgba(250, 218, 97, 0.14)',
  },
  washPeach: {
    position: 'absolute',
    bottom: -100,
    left: -60,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(255, 145, 136, 0.14)',
  },
  headerRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.5,
    color: nd.colors.ink,
  },
  circleButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    ...createNdShadow(0.08, 6),
  },
  content: {
    paddingTop: 4,
  },
  catCard: {
    alignSelf: 'center',
    width: 330,
    height: 482,
    borderRadius: 16,
    borderWidth: 8,
    borderColor: '#FFA830',
    backgroundColor: nd.colors.bg,
    overflow: 'hidden',
  },
  cardPaper: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  catPhotoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  affinityRow: {
    position: 'absolute',
    top: 8,
    left: 16,
    width: AFFINITY_TRACK_WIDTH,
    height: 32,
  },
  affinityTrack: {
    position: 'absolute',
    top: 14,
    left: 0,
    width: AFFINITY_TRACK_WIDTH,
    height: 4,
    borderRadius: 88,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    ...createNdShadow(0.06, 7),
  },
  affinityFill: {
    height: 4,
    borderRadius: 88,
    backgroundColor: '#FF4D6D',
  },
  affinityKnob: {
    position: 'absolute',
    top: 0,
    width: AFFINITY_KNOB_SIZE,
    height: AFFINITY_KNOB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AFFINITY_KNOB_SIZE / 2,
    borderWidth: 1,
    borderColor: '#FF4D6D',
    backgroundColor: '#FFFFFF',
  },
  affinityPaw: {
    transform: [{ rotate: '10deg' }],
  },
  coatDots: {
    position: 'absolute',
    top: 8,
    right: 16,
    flexDirection: 'row',
    gap: 6,
  },
  coatDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(17, 17, 17, 0.1)',
  },
  catPhoto: {
    position: 'absolute',
    top: 52,
    alignSelf: 'center',
    width: 220,
    height: 220,
  },
  cardInfo: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: nd.colors.bg,
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  cardInfoText: {
    paddingHorizontal: 8,
    gap: 4,
  },
  catName: {
    fontSize: 24,
    lineHeight: 34,
    fontWeight: '600',
    letterSpacing: -0.6,
    color: '#000000',
  },
  catDescription: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.35,
    color: nd.colors.sub,
    minHeight: 40,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
  },
  metaCell: {
    width: 96,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  metaCellWide: {
    flex: 1,
    width: 'auto',
  },
  metaLabel: {
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.325,
    color: nd.colors.sub,
  },
  metaValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  metaDivider: {
    width: StyleSheet.hairlineWidth,
    height: 16,
    backgroundColor: nd.colors.border,
  },
  diarySection: {
    marginTop: 16,
  },
  diaryHeader: {
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  diaryTitle: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '600',
    letterSpacing: -0.45,
    color: nd.colors.ink,
  },
  diaryEmpty: {
    paddingHorizontal: 28,
    paddingVertical: 6,
  },
  diaryEmptyText: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.35,
    color: nd.colors.sub,
  },
  diaryEntry: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    paddingHorizontal: 28,
    paddingVertical: 6,
  },
  diaryMeta: {
    alignItems: 'flex-start',
    gap: 4,
  },
  awayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: nd.radius.pill,
    backgroundColor: nd.colors.primarySoft,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  awayChipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -0.25,
    color: nd.colors.accent,
  },
  diaryBubble: {
    flexShrink: 1,
    backgroundColor: nd.colors.bg,
    padding: 16,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  diaryText: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.375,
    color: nd.colors.ink,
  },
  diaryDate: {
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: -0.3,
    color: nd.colors.subtle,
  },
  diaryMore: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  diaryMoreText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  inputBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  inputBar: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: nd.radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    paddingLeft: 20,
    paddingRight: 7,
    ...createNdShadow(0.16, 16),
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    fontSize: 14,
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  micButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    ...createNdShadow(0.06, 4),
  },
  pressed: {
    opacity: 0.86,
  },
});
