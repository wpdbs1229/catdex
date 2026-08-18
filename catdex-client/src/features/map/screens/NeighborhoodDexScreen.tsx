import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronDown, MapPin, PawPrint, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MapStackParamList, RootStackParamList } from '@/app/navigation/types';
import { useTabBarBottomGap, useTabBarInset } from '@/app/navigation/useTabBarInset';
import { BinderCatCard } from '@/features/cats/components/BinderCatCard';
import { BinderFrame } from '@/features/cats/components/BinderFrame';
import { DexFilterPanel } from '@/features/cats/components/DexFilterPanel';
import { HabitatTabs } from '@/features/cats/components/HabitatTabs';
import {
  describeDexFilter,
  emptyDexFilter,
  isDexFilterEmpty,
  matchesDexFilter,
  type DexFilter,
} from '@/features/cats/dex-filter';
import { NeighborhoodTabBar } from '@/features/map/components/NeighborhoodTabBar';
import { useNeighborhoodData } from '@/features/map/hooks/useNeighborhoodData';
import { NeighborhoodSheet } from '@/shared/neighborhood/NeighborhoodSheet';
import { CAT_HABITAT_LABELS, DEFAULT_CAT_HABITAT, type CatHabitat } from '@/shared/cats/habitat';
import { loadFavoriteCatIds, saveFavoriteCatIds } from '@/shared/favorites/favorites-storage';
import { nd, theme } from '@/shared/styles/theme';
import { deriveCatType } from '@/shared/coat/coat-to-cat-type';
import type { Cat } from '@/shared/types/cat';
import { catPhotoSource } from '@/shared/utils/catImage';

/** 한 장에 들어가는 카드 수. 고객 명단 바인더와 같은 2열 3행. */
const CARDS_PER_PAGE = 6;

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function catMatchesSearch(cat: Cat, query: string, dexNumber: number) {
  if (!query) {
    return true;
  }

  // 카드에 번호가 #001로 찍히므로 "1", "001", "#001" 모두 걸려야 한다.
  // 번호는 전역 번호가 아니라 이 지부 안에서의 번호다.
  const paddedNumber = String(dexNumber).padStart(3, '0');

  return [
    cat.name,
    String(dexNumber),
    paddedNumber,
    `#${paddedNumber}`,
    deriveCatType(cat.coatColors, cat.coatPattern),
    cat.memo ?? '',
    ...cat.tags,
  ]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

/**
 * 지부 도감. 고객 명단과 같은 바인더 꼴이지만, 내 고객만이 아니라 이 동네에
 * 기록된 모든 고양이를 넘겨 본다. 그래서 전체/내 도감 구분 없이 한 목록이다.
 */
export function NeighborhoodDexScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MapStackParamList & RootStackParamList>>();
  const tabBarInset = useTabBarInset();
  const tabBarBottomGap = useTabBarBottomGap();
  const {
    cats,
    myCatIds,
    regions,
    neighborhood,
    neighborhoodName,
    hasNeighborhood,
    hasLoaded,
    isDetectingNeighborhood,
    redetectNeighborhood,
    refreshNeighborhood,
  } = useNeighborhoodData();
  const [isNeighborhoodSheetOpen, setIsNeighborhoodSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // 검색은 평소에 아이콘으로 접혀 있다. 공책이 그만큼 높아진다.
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [likedCatIds, setLikedCatIds] = useState<Set<string>>(() => new Set());
  const [filter, setFilter] = useState<DexFilter>(emptyDexFilter);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [habitat, setHabitat] = useState<CatHabitat>(DEFAULT_CAT_HABITAT);
  const [pageIndex, setPageIndex] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      loadFavoriteCatIds()
        .then((nextFavorites) => {
          if (isActive) {
            setLikedCatIds(nextFavorites);
          }
        })
        .catch((error: unknown) => {
          console.warn('[neighborhood-dex] favorites load failed', error);
        });

      return () => {
        isActive = false;
      };
    }, []),
  );

  const normalizedSearchQuery = normalizeSearchText(searchQuery);
  const regionCatIds = useMemo(() => new Set(regions.flatMap((region) => region.catIds)), [regions]);
  const regionCatNames = useMemo(() => new Set(regions.flatMap((region) => region.cats)), [regions]);
  const neighborhoodCats = useMemo(
    () => cats.filter((cat) => regionCatIds.has(cat.id) || regionCatNames.has(cat.name)),
    [cats, regionCatIds, regionCatNames],
  );
  // 지부 안에서의 도감 번호. 구역 병합 후에는 대부분 구역 하나에서 오지만,
  // 혹시 여러 구역에 걸쳐 있으면 먼저 받은(작은) 번호를 쓴다. 구역 기록이
  // 없는 고양이(이름 매칭으로만 걸린 옛 데이터)는 전역 번호로 물러난다.
  const dexNumberByCatId = useMemo(() => {
    const numbers = new Map<string, number>();

    for (const region of regions) {
      for (const [catId, dexNumber] of Object.entries(region.catDexNumbers)) {
        const existing = numbers.get(catId);

        if (existing === undefined || dexNumber < existing) {
          numbers.set(catId, dexNumber);
        }
      }
    }

    return numbers;
  }, [regions]);
  const dexNumberOf = useCallback(
    (cat: Cat) => dexNumberByCatId.get(cat.id) ?? cat.number,
    [dexNumberByCatId],
  );
  const visibleCats = useMemo(
    () =>
      neighborhoodCats
        .filter(
          (cat) =>
            cat.habitat === habitat &&
            catMatchesSearch(cat, normalizedSearchQuery, dexNumberOf(cat)) &&
            matchesDexFilter(cat, filter),
        )
        // 카드에 #001이 찍혀 있으므로 번호 순으로 꽂는다.
        .sort((left, right) => dexNumberOf(left) - dexNumberOf(right)),
    [dexNumberOf, filter, habitat, neighborhoodCats, normalizedSearchQuery],
  );
  const hasSearchQuery = normalizedSearchQuery.length > 0;
  const hasFilter = !isDexFilterEmpty(filter);
  const filterLabels = describeDexFilter(filter);

  // 패널의 CTA가 초안 기준 마릿수를 보여준다. 지금 보고 있는 탭과 검색어까지
  // 반영해야 버튼 숫자와 적용 후 화면이 어긋나지 않는다.
  const countForFilter = useCallback(
    (draft: DexFilter) =>
      neighborhoodCats.filter(
        (cat) =>
          cat.habitat === habitat &&
          catMatchesSearch(cat, normalizedSearchQuery, dexNumberOf(cat)) &&
          matchesDexFilter(cat, draft),
      ).length,
    [dexNumberOf, habitat, neighborhoodCats, normalizedSearchQuery],
  );

  const pages = useMemo(() => {
    const chunks: Cat[][] = [];

    for (let index = 0; index < visibleCats.length; index += CARDS_PER_PAGE) {
      chunks.push(visibleCats.slice(index, index + CARDS_PER_PAGE));
    }

    return chunks;
  }, [visibleCats]);

  // 탭이나 검색을 바꾸면 남은 장수가 줄어든다. 보던 장이 사라진 채로 빈 화면이
  // 남지 않게 첫 장으로 되돌린다.
  useEffect(() => {
    setPageIndex(0);
  }, [habitat, normalizedSearchQuery, filter]);

  // 닫을 때 검색어도 지운다. 입력창이 사라졌는데 목록만 계속 걸러져 있으면
  // 왜 카드가 몇 장 없는지 알 길이 없다.
  const toggleSearch = () => {
    setIsSearchOpen((open) => {
      if (open) {
        setSearchQuery('');
      }

      return !open;
    });
  };

  const toggleLike = (catId: string) => {
    setLikedCatIds((prev) => {
      const next = new Set(prev);

      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }

      // 홈의 "즐겨찾기한 고양이"가 같은 목록을 읽으므로 기기에 남긴다.
      saveFavoriteCatIds(next).catch((error: unknown) => {
        console.warn('[neighborhood-dex] favorite save failed', error);
      });

      return next;
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.titleBar}>
        <View style={styles.titleTexts}>
          <Text style={styles.title}>지부 도감</Text>
          {/* 고객 명단의 회사명 자리에 동네 칩이 온다. 눌러서 지부를 바꾼다. */}
          <Pressable
            accessibilityLabel="내 동네 목록 열기"
            accessibilityRole="button"
            onPress={() => setIsNeighborhoodSheetOpen(true)}
            style={({ pressed }) => [styles.locationChip, pressed && styles.pressed]}
          >
            {isDetectingNeighborhood ? (
              <ActivityIndicator color={nd.colors.sub} size="small" />
            ) : (
              <MapPin color={nd.colors.sub} size={14} strokeWidth={1.8} />
            )}
            <Text style={styles.locationText}>
              {isDetectingNeighborhood ? '동네 확인 중' : neighborhoodName}
            </Text>
            <ChevronDown color={nd.colors.sub} size={14} strokeWidth={1.8} />
          </Pressable>
        </View>
        <View style={styles.titleActions}>
          <Pressable
            accessibilityLabel={isSearchOpen ? '검색 닫기' : '검색 열기'}
            accessibilityRole="button"
            accessibilityState={{ expanded: isSearchOpen }}
            hitSlop={8}
            onPress={toggleSearch}
            style={({ pressed }) => [
              styles.iconButton,
              isSearchOpen && styles.iconButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <Search color={isSearchOpen ? theme.colors.accent : nd.colors.ink} size={20} strokeWidth={2} />
          </Pressable>
          <Pressable
            accessibilityLabel={isFilterOpen ? '필터 닫기' : '필터 열기'}
            accessibilityRole="button"
            accessibilityState={{ expanded: isFilterOpen }}
            hitSlop={8}
            onPress={() => setIsFilterOpen((previous) => !previous)}
            style={({ pressed }) => [
              styles.iconButton,
              hasFilter && styles.iconButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <SlidersHorizontal
              color={hasFilter ? theme.colors.accent : nd.colors.ink}
              size={20}
              strokeWidth={2}
            />
          </Pressable>
        </View>
      </View>

      {isSearchOpen ? (
        <View style={styles.searchBar}>
          <Search color={nd.colors.ink} size={20} strokeWidth={1.8} />
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            onChangeText={setSearchQuery}
            placeholder="지부 도감에서 이름이나 번호를 검색해보세요"
            placeholderTextColor={nd.colors.sub}
            returnKeyType="search"
            style={styles.searchInput}
            value={searchQuery}
          />
        </View>
      ) : null}

      {hasFilter && !isFilterOpen ? (
        <View style={styles.appliedRow}>
          {filterLabels.map((label) => (
            <View key={label} style={styles.appliedChip}>
              <Text style={styles.appliedChipLabel}>{label}</Text>
            </View>
          ))}
          <Pressable
            accessibilityLabel="필터 해제"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => setFilter(emptyDexFilter)}
            style={styles.appliedClear}
          >
            <X color={nd.colors.sub} size={14} strokeWidth={2} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.tabsRow}>
        <HabitatTabs onChange={setHabitat} value={habitat} />
      </View>

      {/* 바인더는 화면 아래까지 내려가고 하단바가 그 위에 뜬다. 아래를 비워두면
          바인더가 잘린 자리에 흰 띠가 남는다. */}
      <View style={styles.body}>
        <BinderFrame
          bottomInset={tabBarInset}
          emptyContent={
            pages.length === 0 && hasLoaded ? (
              <View style={styles.emptyState}>
                <PawPrint color={nd.colors.subtle} size={38} />
                <Text style={styles.emptyTitle}>
                  {hasSearchQuery || hasFilter
                    ? '조건에 맞는 고양이가 없어요'
                    : hasNeighborhood
                      ? `아직 지부에 ${CAT_HABITAT_LABELS[habitat]}가 없어요`
                      : '동네를 아직 못 찾았어요'}
                </Text>
                <Text style={styles.emptyText}>
                  {hasSearchQuery || hasFilter
                    ? '다른 이름이나 번호로 다시 찾아보세요.'
                    : hasNeighborhood
                      ? '지부에 첫 고양이가 기록되면 이 장부터 채워져요.'
                      : '위쪽 동네 이름을 눌러 지부로 삼을 동네를 정해 주세요.'}
                </Text>
              </View>
            ) : null
          }
          onPageChange={setPageIndex}
          pageIndex={pageIndex}
          pages={pages.map((pageCats) =>
            pageCats.map((cat) => (
              <BinderCatCard
                habitat={cat.habitat}
                imageSource={catPhotoSource(cat.imageUrl)}
                key={cat.id}
                liked={likedCatIds.has(cat.id)}
                name={cat.name}
                number={dexNumberOf(cat)}
                rarity={cat.rarity}
                collected={myCatIds.has(cat.id)}
                onPress={() =>
                  navigation.navigate('CatDetail', {
                    catId: cat.id,
                    entryPoint: 'neighborhoodDex',
                    // 지금 화면에 늘어놓은 순서 그대로 넘겨준다. 상세에서 옆으로
                    // 넘길 때 탭·검색·필터가 그대로 이어진다.
                    siblingIds: visibleCats.map((visible) => visible.id),
                  })
                }
                onToggleLike={() => toggleLike(cat.id)}
              />
            )),
          )}
        />

        {isFilterOpen ? (
          <View style={StyleSheet.absoluteFill}>
            <Pressable
              accessibilityLabel="필터 닫기"
              accessibilityRole="button"
              onPress={() => setIsFilterOpen(false)}
              style={styles.scrim}
            />
            <DexFilterPanel
              countFor={countForFilter}
              filter={filter}
              onApply={(next) => {
                setFilter(next);
                setIsFilterOpen(false);
              }}
            />
          </View>
        ) : null}
      </View>

      <View style={[styles.tabBarWrap, { paddingBottom: tabBarBottomGap }]}>
        <NeighborhoodTabBar
          active="dex"
          onHome={() => navigation.getParent()?.navigate('HomeTab' as never)}
          onOpenBoard={() => navigation.navigate('NeighborhoodCommunity')}
          onOpenDex={() => undefined}
          onOpenMap={() => navigation.navigate('NeighborhoodMap')}
        />
      </View>

      {/* 홈의 동네 칩과 같은 시트. 여기서 고른 동네가 곧 이 도감의 지부다. */}
      <NeighborhoodSheet
        activeId={neighborhood?.id}
        isDetecting={isDetectingNeighborhood}
        onAddCurrent={() => {
          void redetectNeighborhood();
        }}
        onChanged={refreshNeighborhood}
        onClose={() => setIsNeighborhoodSheetOpen(false)}
        visible={isNeighborhoodSheetOpen}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  screen: {
    flex: 1,
    backgroundColor: nd.colors.bg,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  titleTexts: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
    color: nd.colors.ink,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
  },
  locationText: {
    fontSize: 15,
    letterSpacing: -0.38,
    color: nd.colors.sub,
  },
  titleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  /** 검색·필터 모두 제목 오른쪽의 원형 아이콘 버튼이다. */
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: nd.colors.border,
    backgroundColor: nd.colors.bg,
  },
  iconButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  pressed: {
    opacity: 0.7,
  },
  body: {
    flex: 1,
    // 필터 패널이 이 영역만 덮는다. 검색바와 탭은 시안처럼 위에 그대로 남는다.
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: nd.colors.scrim,
  },
  appliedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  appliedChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: nd.radius.pill,
    backgroundColor: nd.colors.field,
  },
  appliedChipLabel: {
    fontSize: 13,
    letterSpacing: -0.33,
    color: nd.colors.ink,
  },
  appliedClear: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    height: 48,
    marginHorizontal: 16,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: nd.radius.input,
    borderWidth: 1,
    borderColor: nd.colors.border,
    backgroundColor: nd.colors.bg,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    fontSize: 14,
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  tabsRow: {
    paddingTop: 12,
    // 탭이 바인더 가죽 위에 얹혀야 하므로 바인더보다 위 레이어에 둔다.
    zIndex: 2,
    // 탭 밑단을 가죽 위로 살짝 겹쳐 붙인다.
    marginBottom: -2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    marginTop: 12,
    color: nd.colors.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    marginTop: 5,
    color: nd.colors.sub,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
