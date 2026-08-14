import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MapPin, PawPrint, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
  // 검색은 평소에 아이콘으로 접혀 있다. 공책이 그만큼 높아진다.
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [likedCatIds, setLikedCatIds] = useState<Set<string>>(() => new Set());
  const [filter, setFilter] = useState<DexFilter>(emptyDexFilter);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [habitat, setHabitat] = useState<CatHabitat>(DEFAULT_CAT_HABITAT);
  const [pageIndex, setPageIndex] = useState(0);
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
  }, [habitat, normalizedSearchQuery, filter, regionCatIds]);

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
            placeholder="고객 이름이나 번호를 검색해보세요"
            placeholderTextColor={nd.colors.sub}
            returnKeyType="search"
            style={styles.searchInput}
            value={searchQuery}
          />
        </View>
      ) : null}

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
                    ? '조건에 맞는 고객이 없어요'
                    : `아직 ${CAT_HABITAT_LABELS[habitat]} 고객이 없어요`}
                </Text>
                <Text style={styles.emptyText}>
                  {hasSearchQuery || hasFilter
                    ? '다른 이름이나 번호로 다시 찾아보세요.'
                    : '고객을 등록하면 이 장부터 채워져요.'}
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
                number={cat.number}
                onPress={() =>
                  navigation.navigate('CatDetail', {
                    catId: cat.id,
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
  subtitle: {
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
