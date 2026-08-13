import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronDown, MapPin, PawPrint, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MapStackParamList, RootStackParamList } from '@/app/navigation/types';
import { useTabBarBottomGap } from '@/app/navigation/useTabBarInset';
import { DexFilterPanel } from '@/features/cats/components/DexFilterPanel';
import {
  describeDexFilter,
  emptyDexFilter,
  isDexFilterEmpty,
  matchesDexFilter,
  type DexFilter,
} from '@/features/cats/dex-filter';
import { NeighborhoodTabBar } from '@/features/map/components/NeighborhoodTabBar';
import { useNeighborhoodData } from '@/features/map/hooks/useNeighborhoodData';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { PolaroidCatCard } from '@/shared/components/PolaroidCatCard';
import { nd, theme } from '@/shared/styles/theme';
import { deriveCatType } from '@/shared/coat/coat-to-cat-type';
import type { Cat } from '@/shared/types/cat';
import { catPhotoSource } from '@/shared/utils/catImage';
import { formatNyanTagLabel } from '@/shared/utils/catPresentation';

type NeighborhoodScope = 'all' | 'mine';

const scopeOptions: Array<{ id: NeighborhoodScope; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'mine', label: '내 도감' },
];

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function catMatchesSearch(cat: Cat, query: string) {
  if (!query) {
    return true;
  }

  return [cat.name, deriveCatType(cat.coatColors, cat.coatPattern), cat.memo ?? '', ...cat.tags]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

/** 시안의 "희귀" 칩. 컬러·패턴과 달리 별 개수로 거르므로 필터 패널 밖에 둔다. */
const RARE_RARITY_THRESHOLD = 4;

export function NeighborhoodDexScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MapStackParamList & RootStackParamList>>();
  const tabBarBottomGap = useTabBarBottomGap();
  const { cats, myCatIds, regions, neighborhoodName, hasNeighborhood, isDetectingNeighborhood, redetectNeighborhood } =
    useNeighborhoodData();
  const [selectedScope, setSelectedScope] = useState<NeighborhoodScope>('all');
  const [filter, setFilter] = useState<DexFilter>(emptyDexFilter);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [rareOnly, setRareOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const normalizedSearchQuery = normalizeSearchText(searchQuery);
  const regionCatIds = useMemo(() => new Set(regions.flatMap((region) => region.catIds)), [regions]);
  const regionCatNames = useMemo(() => new Set(regions.flatMap((region) => region.cats)), [regions]);
  const neighborhoodCats = useMemo(
    () => cats.filter((cat) => regionCatIds.has(cat.id) || regionCatNames.has(cat.name)),
    [cats, regionCatIds, regionCatNames],
  );
  const scopedCats = useMemo(
    () => (selectedScope === 'mine' ? neighborhoodCats.filter((cat) => myCatIds.has(cat.id)) : neighborhoodCats),
    [myCatIds, neighborhoodCats, selectedScope],
  );
  const visibleCats = useMemo(
    () =>
      scopedCats.filter(
        (cat) =>
          matchesDexFilter(cat, filter) &&
          (!rareOnly || cat.rarity >= RARE_RARITY_THRESHOLD) &&
          catMatchesSearch(cat, normalizedSearchQuery),
      ),
    [filter, normalizedSearchQuery, rareOnly, scopedCats],
  );
  // 패널 CTA의 마릿수는 지금 화면에 걸린 조건(범위·검색어·희귀)까지 반영해야
  // 버튼 숫자와 적용 후 화면이 어긋나지 않는다.
  const countForFilter = useCallback(
    (draft: DexFilter) =>
      scopedCats.filter(
        (cat) =>
          matchesDexFilter(cat, draft) &&
          (!rareOnly || cat.rarity >= RARE_RARITY_THRESHOLD) &&
          catMatchesSearch(cat, normalizedSearchQuery),
      ).length,
    [normalizedSearchQuery, rareOnly, scopedCats],
  );
  const gridRows = useMemo(() => {
    const rows: Cat[][] = [];

    for (let index = 0; index < visibleCats.length; index += 2) {
      rows.push(visibleCats.slice(index, index + 2));
    }

    return rows;
  }, [visibleCats]);
  const hasSearchQuery = normalizedSearchQuery.length > 0;
  const hasCoatFilter = !isDexFilterEmpty(filter);
  const hasFilter = hasCoatFilter || rareOnly;
  const filterLabels = describeDexFilter(filter);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityLabel="현재 위치로 동네 다시 확인"
          accessibilityRole="button"
          disabled={isDetectingNeighborhood}
          onPress={redetectNeighborhood}
          style={({ pressed }) => [styles.locationChip, pressed && styles.pressed]}
        >
          <View style={styles.locationIcon}>
            {isDetectingNeighborhood ? (
              <ActivityIndicator color={nd.colors.ink} size="small" />
            ) : (
              <MapPin color={nd.colors.ink} size={20} strokeWidth={1.8} />
            )}
          </View>
          <Text style={styles.locationText}>{isDetectingNeighborhood ? '동네 확인 중' : neighborhoodName}</Text>
          <ChevronDown color={nd.colors.ink} size={16} strokeWidth={1.8} />
        </Pressable>
        <NotificationBell />
      </View>

      <View style={styles.scopeTabs}>
        {scopeOptions.map(({ id, label }) => {
          const isActive = selectedScope === id;

          return (
            <Pressable key={id} onPress={() => setSelectedScope(id)} style={[styles.scopeTab, isActive && styles.scopeTabActive]}>
              <Text style={[styles.scopeTabText, isActive && styles.scopeTabTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.body}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>동네 고양이 도감</Text>

          <View style={styles.searchBar}>
            <Search color={nd.colors.ink} size={20} strokeWidth={1.8} />
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setSearchQuery}
              placeholder="동네 도감에서 이름이나 특징 찾기"
              placeholderTextColor={nd.colors.sub}
              returnKeyType="search"
              style={styles.searchInput}
              value={searchQuery}
            />
            <Pressable
              accessibilityLabel={isFilterOpen ? '필터 닫기' : '컬러·패턴 필터 열기'}
              accessibilityRole="button"
              accessibilityState={{ expanded: isFilterOpen }}
              hitSlop={8}
              onPress={() => setIsFilterOpen((previous) => !previous)}
            >
              <SlidersHorizontal
                color={hasCoatFilter ? theme.colors.accent : nd.colors.ink}
                size={20}
                strokeWidth={1.8}
              />
            </Pressable>
          </View>

          <View style={styles.filterRow}>
            <Pressable
              accessibilityLabel="희귀한 고양이만 보기"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rareOnly }}
              onPress={() => setRareOnly((previous) => !previous)}
              style={[styles.filterChip, rareOnly && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, rareOnly && styles.filterTextActive]}>희귀</Text>
            </Pressable>

            {filterLabels.map((label) => (
              <View key={label} style={styles.appliedChip}>
                <Text style={styles.appliedChipLabel}>{label}</Text>
              </View>
            ))}

            {hasFilter ? (
              <Pressable
                accessibilityLabel="필터 해제"
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => {
                  setFilter(emptyDexFilter);
                  setRareOnly(false);
                }}
                style={styles.appliedClear}
              >
                <X color={nd.colors.sub} size={14} strokeWidth={2} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.grid}>
            {gridRows.map((row) => (
              <View key={row[0].id} style={styles.gridRow}>
                {row.map((cat) => (
                  <PolaroidCatCard
                    imageSource={catPhotoSource(cat.imageUrl)}
                    key={cat.id}
                    onPress={() => navigation.navigate('CatDetail', { catId: cat.id })}
                    tagLabel={formatNyanTagLabel(cat.name, cat.firstSeenAt)}
                  />
                ))}
                {row.length === 1 ? <View style={styles.gridSpacer} /> : null}
              </View>
            ))}
          </View>

          {visibleCats.length === 0 ? (
            <View style={styles.emptyState}>
              <PawPrint color={nd.colors.subtle} size={38} />
              <Text style={styles.emptyTitle}>
                {hasSearchQuery || hasFilter
                  ? '조건에 맞는 고양이가 없어요'
                  : hasNeighborhood
                    ? '아직 동네에 기록된 고양이가 없어요'
                    : '동네를 아직 못 찾았어요'}
              </Text>
              <Text style={styles.emptyText}>
                {hasSearchQuery || hasFilter
                  ? '다른 이름이나 털색으로 다시 찾아보세요.'
                  : hasNeighborhood
                    ? '첫 고양이를 기록하면 동네 도감이 채워져요.'
                    : '위쪽 동네 칩을 눌러 현재 위치로 동네를 확인해 주세요.'}
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
        <NeighborhoodTabBar
          active="dex"
          onHome={() => navigation.getParent()?.navigate('HomeTab' as never)}
          onOpenBoard={() => Alert.alert('커뮤니티는 준비 중이에요', '동네 게시판은 다음 단계에서 추가될 예정이에요.')}
          onOpenDex={() => undefined}
          onOpenMap={() => navigation.navigate('NeighborhoodMap')}
        />
      </View>
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
  scopeTabs: {
    height: 56,
    flexDirection: 'row',
  },
  scopeTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  scopeTabActive: {
    borderBottomColor: '#000000',
  },
  scopeTabText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: nd.colors.sub,
  },
  scopeTabTextActive: {
    color: nd.colors.ink,
  },
  content: {
    paddingTop: 32,
    paddingBottom: 152,
  },
  sectionTitle: {
    paddingHorizontal: 20,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
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
  body: {
    flex: 1,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: nd.colors.scrim,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  appliedChip: {
    height: 28,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: nd.colors.field,
  },
  appliedChipLabel: {
    fontSize: 12,
    letterSpacing: -0.3,
    color: nd.colors.ink,
  },
  appliedClear: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChip: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: '#FDF8F2',
    borderColor: nd.colors.primary,
  },
  filterText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.35,
    color: '#555555',
  },
  filterTextActive: {
    color: nd.colors.primary,
  },
  grid: {
    marginTop: 20,
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
  tabBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  pressed: {
    opacity: 0.84,
  },
});
