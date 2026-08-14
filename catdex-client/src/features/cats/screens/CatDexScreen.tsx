import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MapPin, PawPrint, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ClientStackParamList, RootStackParamList } from '@/app/navigation/types';
import { useTabBarBottomGap, useTabBarInset } from '@/app/navigation/useTabBarInset';
import { BinderCatCard } from '@/features/cats/components/BinderCatCard';
import { BinderFrame } from '@/features/cats/components/BinderFrame';
import { ClientTabBar } from '@/features/cats/components/ClientTabBar';
import { DexFilterPanel } from '@/features/cats/components/DexFilterPanel';
import { HabitatTabs } from '@/features/cats/components/HabitatTabs';
import { formatMapRegionName } from '@/features/map/map-region-label';
import {
  describeDexFilter,
  emptyDexFilter,
  isDexFilterEmpty,
  matchesDexFilter,
  type DexFilter,
} from '@/features/cats/dex-filter';
import { fetchMyCats } from '@/shared/api/cats.api';
import { CAT_HABITAT_LABELS, DEFAULT_CAT_HABITAT, type CatHabitat } from '@/shared/cats/habitat';
import { CREW_COMPANY_NAME } from '@/shared/constants/crew.constants';
import { loadFavoriteCatIds, saveFavoriteCatIds } from '@/shared/favorites/favorites-storage';
import { nd, theme } from '@/shared/styles/theme';
import { deriveCatType } from '@/shared/coat/coat-to-cat-type';
import type { Cat } from '@/shared/types/cat';
import { catPhotoSource } from '@/shared/utils/catImage';

/** 한 장에 들어가는 카드 수. 2열 3행. */
const CARDS_PER_PAGE = 6;
const CARDS_PER_ROW = 2;

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function catMatchesSearch(cat: Cat, query: string) {
  if (!query) {
    return true;
  }

  // 카드에 번호가 #001로 찍히므로 "1", "001", "#001" 모두 걸려야 한다.
  const paddedNumber = String(cat.number).padStart(3, '0');

  return [
    cat.name,
    String(cat.number),
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

export function CatDexScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ClientStackParamList & RootStackParamList>>();
  // 지도에서 구역을 골라 들어오면 그 구역 고객만 남긴다.
  const route = useRoute<RouteProp<ClientStackParamList, 'ClientRoster'>>();
  const regionName = route.params?.regionName;
  const regionCatIds = route.params?.catIds;
  const [cats, setCats] = useState<Cat[]>([]);
  // 첫 응답이 오기 전에는 빈 장을 보여주지 않는다. 목록이 곧 뜨는데도
  // "아직 고객이 없어요"가 한 번 스치고 지나간다.
  const [hasLoaded, setHasLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [likedCatIds, setLikedCatIds] = useState<Set<string>>(() => new Set());
  const [filter, setFilter] = useState<DexFilter>(emptyDexFilter);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [habitat, setHabitat] = useState<CatHabitat>(DEFAULT_CAT_HABITAT);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const pagerRef = useRef<ScrollView>(null);
  const tabBarInset = useTabBarInset();
  const tabBarBottomGap = useTabBarBottomGap();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      Promise.all([fetchMyCats(), loadFavoriteCatIds()])
        .then(([nextCats, nextFavorites]) => {
          if (isActive) {
            setCats(nextCats);
            setLikedCatIds(nextFavorites);
            setHasLoaded(true);
          }
        })
        .catch((error: unknown) => {
          console.warn('[dex] load failed', error);
        });

      return () => {
        isActive = false;
      };
    }, []),
  );

  const normalizedSearchQuery = normalizeSearchText(searchQuery);
  const visibleCats = useMemo(() => {
    const inRegion = regionCatIds ? new Set(regionCatIds) : null;

    return cats
      .filter(
        (cat) =>
          cat.habitat === habitat &&
          (!inRegion || inRegion.has(cat.id)) &&
          catMatchesSearch(cat, normalizedSearchQuery) &&
          matchesDexFilter(cat, filter),
      )
      // 도감은 번호 순이다. 카드에 #001이 찍혀 있는데 순서가 최근 만난 순이면
      // 몇 장을 넘겨야 원하는 번호가 나오는지 알 수 없다.
      .sort((left, right) => left.number - right.number);
  }, [cats, filter, habitat, normalizedSearchQuery, regionCatIds]);
  const hasSearchQuery = normalizedSearchQuery.length > 0;
  const hasFilter = !isDexFilterEmpty(filter);
  const filterLabels = describeDexFilter(filter);

  // 패널의 CTA가 초안 기준 마릿수를 보여준다. 지금 보고 있는 탭과 검색어까지
  // 반영해야 버튼 숫자와 적용 후 화면이 어긋나지 않는다.
  const countForFilter = useCallback(
    (draft: DexFilter) =>
      cats.filter(
        (cat) =>
          cat.habitat === habitat &&
          catMatchesSearch(cat, normalizedSearchQuery) &&
          matchesDexFilter(cat, draft),
      ).length,
    [cats, habitat, normalizedSearchQuery],
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
    pagerRef.current?.scrollTo({ x: 0, animated: false });
  }, [habitat, normalizedSearchQuery, filter, regionCatIds]);

  const goToPage = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(nextIndex, pages.length - 1));

    setPageIndex(clamped);
    pagerRef.current?.scrollTo({ x: clamped * pageWidth, animated: true });
  };

  const handlePagerScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pageWidth <= 0) {
      return;
    }

    setPageIndex(Math.round(event.nativeEvent.contentOffset.x / pageWidth));
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
        console.warn('[dex] favorite save failed', error);
      });

      return next;
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.titleBar}>
        <View style={styles.titleTexts}>
          <Text style={styles.title}>고객 도감</Text>
          <Text style={styles.subtitle}>{CREW_COMPANY_NAME}</Text>
        </View>
        <Pressable
          accessibilityLabel={isFilterOpen ? '필터 닫기' : '필터 열기'}
          accessibilityRole="button"
          accessibilityState={{ expanded: isFilterOpen }}
          hitSlop={8}
          onPress={() => setIsFilterOpen((previous) => !previous)}
          style={({ pressed }) => [
            styles.filterButton,
            hasFilter && styles.filterButtonActive,
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

      <View style={styles.searchBar}>
        <Search color={nd.colors.ink} size={20} strokeWidth={1.8} />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setSearchQuery}
          placeholder="고객 이름이나 번호를 검색해보세요"
          placeholderTextColor={nd.colors.sub}
          returnKeyType="search"
          style={styles.searchInput}
          value={searchQuery}
        />
      </View>

      {regionName ? (
        <View style={styles.appliedRow}>
          <View style={[styles.appliedChip, styles.regionChip]}>
            <MapPin color={theme.colors.primary} size={13} strokeWidth={2} />
            <Text style={styles.appliedChipLabel}>{formatMapRegionName(regionName)}</Text>
          </View>
          <Pressable
            accessibilityLabel="구역 해제"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => navigation.setParams({ regionName: undefined, catIds: undefined })}
            style={styles.appliedClear}
          >
            <X color={nd.colors.sub} size={14} strokeWidth={2} />
          </Pressable>
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

      <View style={[styles.body, { paddingBottom: tabBarInset }]}>
        <BinderFrame hasNextPage={pageIndex < pages.length - 1} onNextPage={() => goToPage(pageIndex + 1)}>
          <View onLayout={(event) => setPageWidth(event.nativeEvent.layout.width)} style={styles.pager}>
            {pages.length > 0 ? (
              <ScrollView
                horizontal
                onMomentumScrollEnd={handlePagerScrollEnd}
                pagingEnabled
                ref={pagerRef}
                showsHorizontalScrollIndicator={false}
              >
                {pages.map((pageCats, index) => (
                  <View key={index} style={[styles.page, { width: pageWidth }]}>
                    {Array.from({ length: Math.ceil(pageCats.length / CARDS_PER_ROW) }, (_, rowIndex) => {
                      const row = pageCats.slice(rowIndex * CARDS_PER_ROW, rowIndex * CARDS_PER_ROW + CARDS_PER_ROW);

                      return (
                        <View key={row[0].id} style={styles.pageRow}>
                          {row.map((cat) => (
                            <BinderCatCard
                              habitat={cat.habitat}
                              imageSource={catPhotoSource(cat.imageUrl)}
                              key={cat.id}
                              liked={likedCatIds.has(cat.id)}
                              name={cat.name}
                              number={cat.number}
                              onPress={() => navigation.navigate('CatDetail', { catId: cat.id })}
                              onToggleLike={() => toggleLike(cat.id)}
                            />
                          ))}
                          {row.length < CARDS_PER_ROW ? <View style={styles.rowSpacer} /> : null}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </ScrollView>
            ) : hasLoaded ? (
              <View style={styles.emptyState}>
                <PawPrint color={nd.colors.subtle} size={38} />
                <Text style={styles.emptyTitle}>
                  {hasSearchQuery || hasFilter
                    ? '조건에 맞는 고객이 없어요'
                    : `아직 ${CAT_HABITAT_LABELS[habitat]} 고객이 없어요`}
                </Text>
                <Text style={styles.emptyText}>
                  {hasSearchQuery || hasFilter
                    ? '다른 이름이나 번호로 다시 찾아보세요.'
                    : '고객을 등록하면 이 장부터 채워져요.'}
                </Text>
              </View>
            ) : null}
          </View>
        </BinderFrame>

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
        <ClientTabBar
          active="roster"
          onHome={() => navigation.getParent()?.navigate('HomeTab' as never)}
          onOpenConsult={() => navigation.navigate('ClientSupportRoom')}
          onOpenMap={() => navigation.navigate('ClientMap')}
          onOpenRoster={() => undefined}
        />
      </View>
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
    paddingBottom: 16,
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
  subtitle: {
    fontSize: 15,
    letterSpacing: -0.38,
    color: nd.colors.sub,
  },
  /** 시안에서 필터는 검색바 안이 아니라 제목 오른쪽의 원형 버튼이다. */
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: nd.colors.border,
    backgroundColor: nd.colors.bg,
  },
  filterButtonActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSoft,
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
  regionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.primarySoft,
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
    paddingTop: 18,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
    padding: 10,
    gap: 10,
  },
  pageRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  rowSpacer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
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
