import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ImageSourcePropType } from 'react-native';
import { AlertCircle, BookOpen, Camera, ChevronRight, Filter, Map, MessageCircle, PawPrint, Search, ShieldCheck } from 'lucide-react-native';
import { CommunityPostCard } from '@/features/community/components/CommunityPostCard';
import { NeighborhoodLeaderboardCard } from '@/features/map/components/NeighborhoodLeaderboardCard';
import { NeighborhoodTopTabs } from '@/features/map/components/NeighborhoodTopTabs';
import { formatMapRegionName } from '@/features/map/map-region-label';
import { fetchCommunityPosts } from '@/shared/api/community.api';
import { fetchNeighborhoodLeaderboard } from '@/shared/api/leaderboard.api';
import { catFilters } from '@/shared/constants/cat.constants';
import { getUserFacingError, type UserFacingError } from '@/shared/errors/user-facing-error';
import { isMatchingNeighborhoodName, uniqueNeighborhoodRegionNames } from '@/shared/neighborhood/neighborhood-match';
import { createShadow, theme } from '@/shared/styles/theme';
import type { Cat, CatFilter, CatType, DexPlaceholder } from '@/shared/types/cat';
import type { CommunityPost } from '@/shared/types/community';
import type { NeighborhoodLeaderboardEntry } from '@/shared/types/leaderboard';
import type { Region } from '@/shared/types/region';
import { getCatIllustrationKey, type CatIllustrationKey } from '@/shared/utils/catPresentation';

interface NeighborhoodDexScreenProps {
  cats: Cat[];
  myCatIds: string[];
  neighborhoodName: string;
  onGoCapture: () => void;
  onOpenCat: (catId: string) => void;
  onOpenCommunityBoard: () => void;
  onOpenCommunityPost: (postId: string) => void;
  onOpenMap: () => void;
  regions: Region[];
  regionNames: string[];
  sightings: DexPlaceholder[];
}

const filters = catFilters;
type NeighborhoodScope = 'all' | 'mine' | 'sightings';

const scopeOptions: Array<{ id: NeighborhoodScope; label: string; helper: string }> = [
  { id: 'all', label: '전체', helper: '동네 기록' },
  { id: 'mine', label: '내 도감', helper: '내가 수집' },
  { id: 'sightings', label: '확인 필요', helper: '목격 제보' },
];

const illustrations = {
  orange: require('../../../assets/illustrations/cat-orange-clean.png'),
  dark: require('../../../assets/illustrations/cat-dark-clean.png'),
  tuxedo: require('../../../assets/illustrations/cat-tuxedo-clean.png'),
  gray: require('../../../assets/illustrations/cat-gray-clean.png'),
} satisfies Record<CatIllustrationKey, ImageSourcePropType>;

function imageForType(type: CatType, imageUrl?: string): ImageSourcePropType {
  if (imageUrl) {
    return { uri: imageUrl };
  }

  return illustrations[getCatIllustrationKey(type)];
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function catMatchesSearch(cat: Cat, query: string, regionLabel: string) {
  if (!query) {
    return true;
  }

  return [
    cat.name,
    cat.type,
    cat.relationshipLevel,
    cat.memo ?? '',
    regionLabel,
    `no.${String(cat.number).padStart(3, '0')}`,
    String(cat.number),
    ...cat.tags,
  ]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

function matchesCatFilter(cat: Cat, selectedFilter: CatFilter) {
  if (selectedFilter === '전체') {
    return true;
  }

  if (selectedFilter === '희귀') {
    return cat.rarity >= 4;
  }

  return cat.type === selectedFilter;
}

function matchesSightingFilter(sighting: DexPlaceholder, selectedFilter: CatFilter) {
  if (selectedFilter === '전체') {
    return true;
  }

  if (selectedFilter === '희귀') {
    return sighting.rarity >= 4;
  }

  return sighting.type === selectedFilter;
}

function sightingMatchesSearch(sighting: DexPlaceholder, query: string) {
  if (!query) {
    return true;
  }

  return [
    sighting.type,
    sighting.regionHint,
    sighting.timeHint ?? '',
    sighting.unlockHint ?? '',
    sighting.behaviorHint ?? '',
    `no.${String(sighting.number).padStart(3, '0')}`,
    String(sighting.number),
  ]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

function getRegionNamesByCatName(regions: Region[]) {
  return regions.reduce<Record<string, string[]>>((acc, region) => {
    region.cats.forEach((catName) => {
      acc[catName] = [...(acc[catName] ?? []), formatMapRegionName(region.name)];
    });

    return acc;
  }, {});
}

function getRegionNamesByCatId(regions: Region[]) {
  return regions.reduce<Record<string, string[]>>((acc, region) => {
    region.catIds.forEach((catId) => {
      acc[catId] = [...(acc[catId] ?? []), formatMapRegionName(region.name)];
    });

    return acc;
  }, {});
}

function getRegionLabel(
  cat: Cat,
  regionNamesByCatId: Record<string, string[]>,
  regionNamesByCatName: Record<string, string[]>,
  fallbackNeighborhoodName: string,
) {
  const regionNames = regionNamesByCatId[cat.id] ?? regionNamesByCatName[cat.name] ?? [];

  if (regionNames.length === 0) {
    return fallbackNeighborhoodName;
  }

  return regionNames.slice(0, 2).join(', ');
}

function getLastSeenLabel(cats: Cat[]) {
  return cats[0]?.lastSeenAt ?? '아직 기록 없음';
}

export function NeighborhoodDexScreen({
  cats,
  myCatIds,
  neighborhoodName,
  onGoCapture,
  onOpenCat,
  onOpenCommunityBoard,
  onOpenCommunityPost,
  onOpenMap,
  regions,
  regionNames,
  sightings,
}: NeighborhoodDexScreenProps) {
  const [selectedScope, setSelectedScope] = useState<NeighborhoodScope>('all');
  const [selectedFilter, setSelectedFilter] = useState<CatFilter>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewPosts, setPreviewPosts] = useState<CommunityPost[]>([]);
  const [previewError, setPreviewError] = useState<UserFacingError | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<NeighborhoodLeaderboardEntry[]>([]);
  const [leaderboardError, setLeaderboardError] = useState<UserFacingError | null>(null);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);

  const normalizedSearchQuery = normalizeSearchText(searchQuery);
  const myCatIdSet = useMemo(() => new Set(myCatIds), [myCatIds]);
  const neighborhoodRegionNames = useMemo(
    () => uniqueNeighborhoodRegionNames(neighborhoodName, [...regionNames, ...regions.map((region) => region.name)]),
    [neighborhoodName, regionNames, regions],
  );
  const regionNamesByCatId = useMemo(() => getRegionNamesByCatId(regions), [regions]);
  const regionNamesByCatName = useMemo(() => getRegionNamesByCatName(regions), [regions]);
  const regionCatIds = useMemo(() => new Set(regions.flatMap((region) => region.catIds)), [regions]);
  const regionCatNames = useMemo(() => new Set(regions.flatMap((region) => region.cats)), [regions]);
  const neighborhoodCats = useMemo(
    () => cats.filter((cat) => regionCatIds.has(cat.id) || regionCatNames.has(cat.name)),
    [cats, regionCatIds, regionCatNames],
  );
  const scopedNeighborhoodCats = useMemo(
    () => (selectedScope === 'mine' ? neighborhoodCats.filter((cat) => myCatIdSet.has(cat.id)) : neighborhoodCats),
    [myCatIdSet, neighborhoodCats, selectedScope],
  );
  const visibleCats = useMemo(
    () =>
      scopedNeighborhoodCats.filter((cat) => {
        const regionLabel = getRegionLabel(cat, regionNamesByCatId, regionNamesByCatName, neighborhoodName);

        return matchesCatFilter(cat, selectedFilter) && catMatchesSearch(cat, normalizedSearchQuery, regionLabel);
      }),
    [neighborhoodName, normalizedSearchQuery, regionNamesByCatId, regionNamesByCatName, scopedNeighborhoodCats, selectedFilter],
  );
  const neighborhoodSightings = useMemo(
    () =>
      sightings.filter((sighting) =>
        neighborhoodRegionNames.some((regionName) => isMatchingNeighborhoodName(sighting.regionHint, regionName)),
      ),
    [neighborhoodRegionNames, sightings],
  );
  const visibleSightings = useMemo(
    () =>
      neighborhoodSightings.filter(
        (sighting) => matchesSightingFilter(sighting, selectedFilter) && sightingMatchesSearch(sighting, normalizedSearchQuery),
      ),
    [neighborhoodSightings, normalizedSearchQuery, selectedFilter],
  );
  const totalRegionCats = useMemo(
    () => new Set(regions.flatMap((region) => (region.catIds.length > 0 ? region.catIds : region.cats))).size,
    [regions],
  );
  const activeRegions = regions.filter((region) => region.catIds.length > 0 || region.cats.length > 0).length;
  const hasSearchQuery = normalizedSearchQuery.length > 0;
  const neighborhoodCatCount = totalRegionCats;
  const visibleRecordCount = selectedScope === 'sightings' ? visibleSightings.length : visibleCats.length;

  const refreshPreviewPosts = useCallback(async () => {
    setIsPreviewLoading(true);
    setPreviewError(null);

    try {
      const nextPosts = await fetchCommunityPosts({
        regionName: neighborhoodName,
        regionNames: neighborhoodRegionNames,
        topic: 'ALL',
        limit: 3,
      });
      setPreviewPosts(nextPosts);
    } catch (error) {
      console.warn('[community] neighborhood dex preview load failed', error);
      setPreviewPosts([]);
      setPreviewError(getUserFacingError(error, 'community.load'));
    } finally {
      setIsPreviewLoading(false);
    }
  }, [neighborhoodName, neighborhoodRegionNames]);

  const refreshLeaderboard = useCallback(async () => {
    setIsLeaderboardLoading(true);
    setLeaderboardError(null);

    try {
      const nextLeaderboard = await fetchNeighborhoodLeaderboard(neighborhoodName, 30, 5);
      setLeaderboard(nextLeaderboard);
    } catch (error) {
      console.warn('[leaderboard] neighborhood dex load failed', error);
      setLeaderboard([]);
      setLeaderboardError(getUserFacingError(error, 'leaderboard.load'));
    } finally {
      setIsLeaderboardLoading(false);
    }
  }, [neighborhoodName]);

  useEffect(() => {
    void refreshPreviewPosts();
  }, [refreshPreviewPosts]);

  useEffect(() => {
    void refreshLeaderboard();
  }, [refreshLeaderboard]);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <NeighborhoodTopTabs
        activeTab="dex"
        onOpenBoard={onOpenCommunityBoard}
        onOpenDex={() => undefined}
        onOpenMap={onOpenMap}
      />

      <View style={styles.bookHeader}>
        <View style={styles.bookHeaderCopy}>
          <Text style={styles.bookKicker}>동네 도감</Text>
          <Text style={styles.bookTitle}>{hasSearchQuery ? '동네 도감 검색' : `${neighborhoodName} 같이 모은 고양이`}</Text>
          <Text style={styles.bookDescription}>이웃들이 남긴 기록을 도감처럼 모아보고, 궁금한 고양이는 바로 자세히 확인해요.</Text>
        </View>
        <View style={styles.bookCountBadge}>
          <BookOpen color={theme.colors.primaryDark} size={15} />
          <Text style={styles.countText}>{selectedScope === 'sightings' ? `${visibleRecordCount}건` : `${visibleRecordCount}마리`}</Text>
        </View>
      </View>

      <View style={styles.statusGrid}>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>동네 도감</Text>
          <Text style={styles.statusValue}>{neighborhoodCatCount}마리</Text>
        </View>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>냥이 구역</Text>
          <Text style={styles.statusValue}>{activeRegions}곳</Text>
        </View>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>확인 필요</Text>
          <Text style={styles.statusValue}>{neighborhoodSightings.length}건</Text>
        </View>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>최근 기록</Text>
          <Text numberOfLines={1} style={styles.statusValueSmall}>
            {getLastSeenLabel(neighborhoodCats)}
          </Text>
        </View>
      </View>

      <NeighborhoodLeaderboardCard
        entries={leaderboard}
        errorMessage={leaderboardError?.message}
        isLoading={isLeaderboardLoading}
        onRetry={refreshLeaderboard}
      />

      <View style={styles.scopeTabs}>
        {scopeOptions.map((scope) => {
          const isSelected = selectedScope === scope.id;

          return (
            <Pressable
              accessibilityLabel={`동네 도감 범위 ${scope.label}`}
              accessibilityRole="button"
              key={scope.id}
              onPress={() => setSelectedScope(scope.id)}
              style={({ pressed }) => [styles.scopeTab, isSelected && styles.scopeTabActive, pressed && styles.pressed]}
            >
              <Text style={[styles.scopeLabel, isSelected && styles.scopeLabelActive]}>{scope.label}</Text>
              <Text style={[styles.scopeHelper, isSelected && styles.scopeHelperActive]}>{scope.helper}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.searchBar}>
        <Search color={theme.colors.mutedText} size={18} />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setSearchQuery}
          placeholder="동네 도감에서 이름이나 특징 찾기"
          placeholderTextColor={theme.colors.mutedText}
          returnKeyType="search"
          style={styles.searchInput}
          value={searchQuery}
        />
        <Filter color={theme.colors.primaryDark} size={17} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {filters.map((filter) => {
          const isSelected = selectedFilter === filter;

          return (
            <Pressable
              accessibilityLabel={`동네 도감 필터 ${filter}`}
              accessibilityRole="button"
              key={filter}
              onPress={() => setSelectedFilter(filter)}
              style={({ pressed }) => [styles.filterChip, isSelected && styles.filterChipActive, pressed && styles.pressed]}
            >
              <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>{filter}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {selectedScope === 'sightings' ? (
        <View style={styles.grid}>
          {visibleSightings.map((sighting, index) => (
            <Pressable
              accessibilityLabel={`${sighting.type} 목격 제보 기록하기`}
              accessibilityRole="button"
              key={sighting.id}
              onPress={onGoCapture}
              style={({ pressed }) => [styles.sightingTile, index % 2 === 0 ? styles.tileTiltLeft : styles.tileTiltRight, pressed && styles.pressed]}
            >
              <View style={styles.sightingImageFrame}>
                <Image resizeMode="contain" source={imageForType(sighting.type, sighting.imageUrl)} style={styles.tileImage} />
              </View>
              <View style={styles.tileNumberPill}>
                <Text style={styles.tileNumber}>제보 {sighting.reportCount ?? 1}건</Text>
              </View>
              <Text numberOfLines={1} style={styles.tileName}>
                {sighting.type}
              </Text>
              <Text numberOfLines={1} style={styles.tileMeta}>
                {sighting.sightedAt ? `목격 ${sighting.sightedAt}` : '목격 시간 미상'}
              </Text>
              <Text numberOfLines={2} style={styles.tileRegion}>
                {sighting.regionHint}
              </Text>
              <View style={styles.sightingAction}>
                <Camera color="#FFF8F0" size={14} />
                <Text style={styles.sightingActionText}>기록으로 확인</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.grid}>
          {visibleCats.map((cat, index) => {
            const regionLabel = getRegionLabel(cat, regionNamesByCatId, regionNamesByCatName, neighborhoodName);

            return (
              <Pressable
                accessibilityLabel={`${cat.name} 도감 보기`}
                accessibilityRole="button"
                key={cat.id}
                onPress={() => onOpenCat(cat.id)}
                style={({ pressed }) => [styles.tile, index % 2 === 0 ? styles.tileTiltLeft : styles.tileTiltRight, pressed && styles.pressed]}
              >
                <View pointerEvents="none" style={styles.tileWash} />
                <View style={styles.tileImageFrame}>
                  <Image resizeMode="contain" source={imageForType(cat.type, cat.imageUrl)} style={styles.tileImage} />
                </View>
                <View style={styles.tileNumberPill}>
                  <Text style={styles.tileNumber}>No.{String(cat.number).padStart(3, '0')}</Text>
                </View>
                <Text numberOfLines={1} style={styles.tileName}>
                  {cat.name}
                </Text>
                <Text numberOfLines={1} style={styles.tileMeta}>
                  {cat.relationshipLevel} · 최근 {cat.lastSeenAt}
                </Text>
                <Text numberOfLines={1} style={styles.tileRegion}>
                  {regionLabel}
                </Text>
                <View style={styles.tileFooter}>
                  <Text numberOfLines={1} style={styles.tileType}>
                    {cat.type}
                  </Text>
                  <Text numberOfLines={1} style={styles.tileCount}>
                    제보 {cat.encounterCount}회
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {visibleRecordCount === 0 ? (
        <View style={styles.emptyState}>
          <PawPrint color="#D4B989" size={38} />
          <Text style={styles.emptyTitle}>
            {hasSearchQuery ? '검색 결과가 없어요' : selectedScope === 'mine' ? '내 도감 기록이 없어요' : selectedScope === 'sightings' ? '확인할 제보가 없어요' : '아직 동네 도감이 비어 있어요'}
          </Text>
          <Text style={styles.emptyText}>
            {hasSearchQuery
              ? '다른 이름, 특징, 구역으로 다시 찾아보세요.'
              : selectedScope === 'mine'
                ? '촬영으로 수집한 고양이는 내 도감 범위에 따로 모여요.'
                : selectedScope === 'sightings'
                  ? '새로운 미확인 목격이 생기면 이곳에서 촬영 확인으로 이어갈 수 있어요.'
                  : '첫 기록이 쌓이면 이곳에 동네 고양이 카드가 채워져요.'}
          </Text>
          {!hasSearchQuery ? (
            <Pressable accessibilityLabel="고양이 기록하기" accessibilityRole="button" onPress={onGoCapture} style={({ pressed }) => [styles.emptyCaptureButton, pressed && styles.pressed]}>
              <Camera color="#FFF8F0" size={16} />
              <Text style={styles.emptyCaptureText}>고양이 기록하기</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.quickNavRow}>
        <Pressable accessibilityLabel="동네 지도 보기" accessibilityRole="button" onPress={onOpenMap} style={({ pressed }) => [styles.quickNavCard, pressed && styles.pressed]}>
          <View style={styles.quickNavIcon}>
            <Map color={theme.colors.primaryDark} size={18} />
          </View>
          <View style={styles.quickNavCopy}>
            <Text style={styles.quickNavTitle}>지도에서 보기</Text>
            <Text numberOfLines={2} style={styles.quickNavText}>고양이들이 모인 구역을 원으로 확인해요.</Text>
          </View>
          <ChevronRight color={theme.colors.primaryDark} size={16} />
        </Pressable>

        <Pressable accessibilityLabel="동네 게시판 보기" accessibilityRole="button" onPress={onOpenCommunityBoard} style={({ pressed }) => [styles.quickNavCard, pressed && styles.pressed]}>
          <View style={styles.quickNavIcon}>
            <MessageCircle color={theme.colors.primaryDark} size={18} />
          </View>
          <View style={styles.quickNavCopy}>
            <Text style={styles.quickNavTitle}>게시판 보기</Text>
            <Text numberOfLines={2} style={styles.quickNavText}>목격담과 질문을 이어서 확인해요.</Text>
          </View>
          <ChevronRight color={theme.colors.primaryDark} size={16} />
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionKicker}>동네 게시판</Text>
          <Text style={styles.sectionTitle}>최근 이야기</Text>
        </View>
        <Pressable accessibilityLabel="게시판 전체 보기" accessibilityRole="button" onPress={onOpenCommunityBoard} style={({ pressed }) => [styles.headerLink, pressed && styles.pressed]}>
          <Text style={styles.headerLinkText}>전체 보기</Text>
          <ChevronRight color={theme.colors.primaryDark} size={15} />
        </Pressable>
      </View>

      {previewError ? (
        <View style={styles.errorCard}>
          <AlertCircle color={theme.colors.primary} size={18} />
          <View style={styles.errorCopy}>
            <Text style={styles.errorTitle}>{previewError.title}</Text>
            <Text style={styles.errorText}>{previewError.message}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.postStack}>
        {previewPosts.map((post) => (
          <CommunityPostCard compact key={post.id} onPress={onOpenCommunityPost} post={post} />
        ))}
      </View>

      {isPreviewLoading ? (
        <View style={styles.loadingStrip}>
          <ActivityIndicator color={theme.colors.primaryDark} size="small" />
          <Text style={styles.loadingText}>최근 게시글을 불러오는 중</Text>
        </View>
      ) : null}

      {!isPreviewLoading && previewPosts.length === 0 ? (
        <View style={styles.emptyBoardCard}>
          <MessageCircle color="#CDB58F" size={26} />
          <Text style={styles.emptyBoardTitle}>아직 게시글이 없어요</Text>
          <Text style={styles.emptyBoardText}>게시판에서 첫 목격담이나 질문을 남겨보세요.</Text>
        </View>
      ) : null}

      <View style={styles.safetyStrip}>
        <ShieldCheck color={theme.colors.accent} size={17} />
        <Text style={styles.safetyText}>동네 도감과 게시판 모두 정확한 좌표는 노출하지 않고 동네 단위로만 공유해요.</Text>
      </View>

      <Pressable accessibilityLabel="고양이 기록하기" accessibilityRole="button" onPress={onGoCapture} style={({ pressed }) => [styles.captureButton, pressed && styles.pressed]}>
        <Camera color="#FFF8F0" size={17} />
        <Text style={styles.captureButtonText}>고양이 기록하기</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 132,
  },
  bookHeader: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  bookHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  bookKicker: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  bookTitle: {
    marginTop: 4,
    color: theme.colors.text,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '900',
  },
  bookDescription: {
    marginTop: 6,
    maxWidth: 280,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  bookCountBadge: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 17,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.13)',
  },
  countText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  statusCard: {
    width: '48.7%',
    minHeight: 94,
    justifyContent: 'center',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
    ...createShadow(3),
  },
  statusLabel: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  statusValue: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  statusValueSmall: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
  },
  searchBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: 24,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.13)',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  scopeTabs: {
    minHeight: 74,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  scopeTab: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(255,253,246,0.66)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
  },
  scopeTabActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  scopeLabel: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  scopeLabelActive: {
    color: '#FFF8F0',
  },
  scopeHelper: {
    marginTop: 3,
    color: theme.colors.mutedText,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  scopeHelperActive: {
    color: 'rgba(255,248,240,0.72)',
  },
  filterRow: {
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.lg,
  },
  filterChip: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
  },
  filterChipActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  filterText: {
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
  },
  filterTextActive: {
    color: '#FFF8F0',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: theme.spacing.sm,
    rowGap: theme.spacing.md,
  },
  tile: {
    flexBasis: '48%',
    flexGrow: 0,
    maxWidth: '48%',
    overflow: 'hidden',
    borderRadius: theme.radius.xl,
    padding: 10,
    backgroundColor: 'rgba(255,253,246,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
    ...createShadow(4),
  },
  tileTiltLeft: {
    transform: [{ rotate: '-0.8deg' }],
  },
  tileTiltRight: {
    transform: [{ rotate: '0.7deg' }],
  },
  tileWash: {
    position: 'absolute',
    right: -34,
    bottom: 64,
    width: 84,
    height: 56,
    borderRadius: 42,
    backgroundColor: 'rgba(221,232,200,0.34)',
    transform: [{ rotate: '-18deg' }],
  },
  tileImageFrame: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(248,234,210,0.56)',
  },
  tileImage: {
    width: '92%',
    height: '92%',
  },
  tileNumberPill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(245,227,191,0.68)',
  },
  tileNumber: {
    color: '#9B734D',
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 14,
  },
  tileName: {
    marginTop: 6,
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
  },
  tileMeta: {
    marginTop: 2,
    color: theme.colors.mutedText,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
  },
  tileRegion: {
    marginTop: 2,
    color: theme.colors.primaryDark,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
  },
  tileFooter: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  tileType: {
    maxWidth: '52%',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: theme.colors.primaryDark,
    fontSize: 10,
    fontWeight: '900',
    backgroundColor: theme.colors.accentSoft,
  },
  tileCount: {
    flexShrink: 1,
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
  },
  sightingTile: {
    flexBasis: '48%',
    flexGrow: 0,
    maxWidth: '48%',
    overflow: 'hidden',
    borderRadius: theme.radius.xl,
    padding: 10,
    backgroundColor: 'rgba(255,247,236,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(196,122,66,0.16)',
    ...createShadow(4),
  },
  sightingImageFrame: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(255,239,221,0.7)',
  },
  sightingAction: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 17,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.primaryDark,
  },
  sightingActionText: {
    color: '#FFF8F0',
    fontSize: 11,
    fontWeight: '900',
  },
  emptyState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
  },
  emptyTitle: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 5,
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  emptyCaptureButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: 19,
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primaryDark,
  },
  emptyCaptureText: {
    color: '#FFF8F0',
    fontSize: 12,
    fontWeight: '900',
  },
  quickNavRow: {
    gap: theme.spacing.sm,
  },
  quickNavCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(255,253,246,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  quickNavIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: theme.colors.accentSoft,
  },
  quickNavCopy: {
    flex: 1,
    minWidth: 0,
  },
  quickNavTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  quickNavText: {
    marginTop: 3,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  sectionHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  sectionKicker: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  sectionTitle: {
    marginTop: 3,
    color: theme.colors.text,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '900',
  },
  headerLink: {
    minWidth: 88,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 18,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.sm,
    backgroundColor: 'rgba(255,253,246,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.13)',
  },
  headerLinkText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  errorCard: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(255,239,221,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(196,122,66,0.18)',
  },
  errorCopy: {
    flex: 1,
    minWidth: 0,
  },
  errorTitle: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  errorText: {
    marginTop: 2,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  postStack: {
    gap: theme.spacing.md,
  },
  loadingStrip: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: 21,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  loadingText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  emptyBoardCard: {
    minHeight: 128,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  emptyBoardTitle: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  emptyBoardText: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  safetyStrip: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(221,232,200,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(111,131,77,0.12)',
  },
  safetyText: {
    flex: 1,
    color: theme.colors.primaryDark,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
  captureButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: 25,
    backgroundColor: theme.colors.primaryDark,
    ...createShadow(5),
  },
  captureButtonText: {
    color: '#FFF8F0',
    fontSize: 14,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
  },
});
