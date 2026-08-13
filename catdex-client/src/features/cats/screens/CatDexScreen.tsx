import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ClipboardList, MapPin, PawPrint, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ClientStackParamList, RootStackParamList } from '@/app/navigation/types';
import { useTabBarBottomGap, useTabBarInset } from '@/app/navigation/useTabBarInset';
import { ClientTabBar } from '@/features/cats/components/ClientTabBar';
import { DexFilterPanel } from '@/features/cats/components/DexFilterPanel';
import { formatMapRegionName } from '@/features/map/map-region-label';
import {
  describeDexFilter,
  emptyDexFilter,
  isDexFilterEmpty,
  matchesDexFilter,
  type DexFilter,
} from '@/features/cats/dex-filter';
import { fetchDexPlaceholders, fetchMyCats } from '@/shared/api/cats.api';
import { PolaroidCatCard } from '@/shared/components/PolaroidCatCard';
import { describeCoat } from '@/shared/coat/coat-label';
import { CREW_COMPANY_NAME } from '@/shared/constants/crew.constants';
import { loadFavoriteCatIds, saveFavoriteCatIds } from '@/shared/favorites/favorites-storage';
import { nd, theme } from '@/shared/styles/theme';
import { deriveCatType } from '@/shared/coat/coat-to-cat-type';
import type { Cat, DexPlaceholder } from '@/shared/types/cat';
import { catPhotoSource } from '@/shared/utils/catImage';
import { formatNyanTagLabel } from '@/shared/utils/catPresentation';

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function catMatchesSearch(cat: Cat, query: string) {
  if (!query) {
    return true;
  }

  return [cat.name, deriveCatType(cat.coatColors, cat.coatPattern), cat.relationshipLevel, cat.memo ?? '', ...cat.tags]
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
  const [placeholders, setPlaceholders] = useState<DexPlaceholder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [likedCatIds, setLikedCatIds] = useState<Set<string>>(() => new Set());
  const [filter, setFilter] = useState<DexFilter>(emptyDexFilter);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const tabBarInset = useTabBarInset();
  const tabBarBottomGap = useTabBarBottomGap();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      Promise.all([fetchMyCats(), fetchDexPlaceholders(), loadFavoriteCatIds()])
        .then(([nextCats, nextPlaceholders, nextFavorites]) => {
          if (isActive) {
            setCats(nextCats);
            setPlaceholders(nextPlaceholders);
            setLikedCatIds(nextFavorites);
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

    return cats.filter(
      (cat) =>
        (!inRegion || inRegion.has(cat.id)) &&
        catMatchesSearch(cat, normalizedSearchQuery) &&
        matchesDexFilter(cat, filter),
    );
  }, [cats, filter, normalizedSearchQuery, regionCatIds]);
  const hasSearchQuery = normalizedSearchQuery.length > 0;
  const hasFilter = !isDexFilterEmpty(filter);
  // 잠금 카드도 목격에 적힌 컬러·패턴으로 함께 걸러진다.
  // 다만 이름이 없어서 검색어에는 걸릴 수 없으니, 검색 중일 때만 통째로 뺀다.
  const lockedPlaceholders = hasSearchQuery
    ? []
    : placeholders.filter((placeholder) => matchesDexFilter(placeholder, filter)).slice(0, 2);
  const filterLabels = describeDexFilter(filter);

  // 패널의 CTA가 초안 기준 마릿수를 보여준다. 검색어가 걸려 있으면 그것까지 반영해야
  // 버튼 숫자와 적용 후 화면이 어긋나지 않는다.
  const countForFilter = useCallback(
    (draft: DexFilter) =>
      cats.filter(
        (cat) => catMatchesSearch(cat, normalizedSearchQuery) && matchesDexFilter(cat, draft),
      ).length,
    [cats, normalizedSearchQuery],
  );

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

  const gridRows = useMemo(() => {
    const entries: Array<{ key: string; cat?: Cat; placeholder?: DexPlaceholder }> = [
      ...visibleCats.map((cat) => ({ key: cat.id, cat })),
      ...lockedPlaceholders.map((placeholder) => ({ key: placeholder.id, placeholder })),
    ];
    const rows: (typeof entries)[] = [];

    for (let index = 0; index < entries.length; index += 2) {
      rows.push(entries.slice(index, index + 2));
    }

    return rows;
  }, [lockedPlaceholders, visibleCats]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.titleBar}>
        <View style={styles.titleTexts}>
          <Text style={styles.title}>내 고객</Text>
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
          placeholder="고객 이름을 검색해보세요"
          placeholderTextColor={nd.colors.sub}
          returnKeyType="search"
          style={styles.searchInput}
          value={searchQuery}
        />
      </View>

      <View style={styles.countRow}>
        <ClipboardList color={theme.colors.primary} size={18} strokeWidth={2} />
        <Text style={styles.countLabel}>
          담당 고객 <Text style={styles.countValue}>{visibleCats.length}마리</Text>
        </Text>
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

      <View style={styles.body}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarInset }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {gridRows.map((row) => (
              <View key={row[0].key} style={styles.gridRow}>
                {row.map((entry) =>
                  entry.cat ? (
                    <PolaroidCatCard
                      imageSource={catPhotoSource(entry.cat.imageUrl)}
                      key={entry.key}
                      liked={likedCatIds.has(entry.cat.id)}
                      onPress={() => navigation.navigate('CatDetail', { catId: entry.cat!.id })}
                      onToggleLike={() => toggleLike(entry.cat!.id)}
                      tagLabel={formatNyanTagLabel(entry.cat.name, entry.cat.firstSeenAt)}
                    />
                  ) : entry.placeholder ? (
                    <PolaroidCatCard
                      imageSource={catPhotoSource(entry.placeholder.imageUrl)}
                      key={entry.key}
                      locked
                      tagLabel={`${describeCoat(entry.placeholder.coatColors, entry.placeholder.coatPattern)}_아직 만나지 못했어요`}
                    />
                  ) : null,
                )}
                {row.length === 1 ? <View style={styles.gridSpacer} /> : null}
              </View>
            ))}
          </View>
  
          {visibleCats.length === 0 && lockedPlaceholders.length === 0 ? (
            <View style={styles.emptyState}>
              <PawPrint color={nd.colors.subtle} size={38} />
              <Text style={styles.emptyTitle}>
                {hasSearchQuery || hasFilter ? '조건에 맞는 고양이가 없어요' : '아직 수집한 고양이가 없어요'}
              </Text>
              <Text style={styles.emptyText}>
                {hasSearchQuery || hasFilter
                  ? '다른 이름이나 털색으로 다시 찾아보세요.'
                  : '첫 고양이를 등록하면 내 도감 페이지가 여기에 채워져요.'}
              </Text>
            </View>
          ) : null}
        </ScrollView>

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
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  countLabel: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.38,
    color: nd.colors.ink,
  },
  countValue: {
    color: theme.colors.primary,
  },
  body: {
    flex: 1,
    // 필터 패널이 이 영역만 덮는다. 검색바는 시안처럼 위에 그대로 남는다.
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
  content: {
    paddingTop: 4,
    // 하단 여백은 useTabBarInset이 준다.
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
  grid: {
    marginTop: 24,
    paddingHorizontal: 16,
    gap: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  gridSpacer: {
    flex: 1,
  },
  emptyState: {
    marginTop: 32,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    borderRadius: nd.radius.input,
    borderWidth: 1,
    borderColor: nd.colors.border,
    padding: 20,
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
