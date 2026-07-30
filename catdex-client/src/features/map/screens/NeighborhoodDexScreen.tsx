import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bell, ChevronDown, MapPin, PawPrint, Search, SlidersHorizontal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MapStackParamList, RootStackParamList } from '@/app/navigation/types';
import { NeighborhoodTabBar } from '@/features/map/components/NeighborhoodTabBar';
import { useNeighborhoodData } from '@/features/map/hooks/useNeighborhoodData';
import { PolaroidCatCard } from '@/shared/components/PolaroidCatCard';
import { catFilters } from '@/shared/constants/cat.constants';
import { nd } from '@/shared/styles/theme';
import type { Cat, CatFilter } from '@/shared/types/cat';
import { imageForCatType } from '@/shared/utils/catImage';
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

  return [cat.name, cat.type, cat.relationshipLevel, cat.memo ?? '', ...cat.tags]
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

export function NeighborhoodDexScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MapStackParamList & RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { cats, myCatIds, regions, neighborhoodName } = useNeighborhoodData();
  const [selectedScope, setSelectedScope] = useState<NeighborhoodScope>('all');
  const [selectedFilter, setSelectedFilter] = useState<CatFilter>('전체');
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
    () => scopedCats.filter((cat) => matchesCatFilter(cat, selectedFilter) && catMatchesSearch(cat, normalizedSearchQuery)),
    [normalizedSearchQuery, scopedCats, selectedFilter],
  );
  const gridRows = useMemo(() => {
    const rows: Cat[][] = [];

    for (let index = 0; index < visibleCats.length; index += 2) {
      rows.push(visibleCats.slice(index, index + 2));
    }

    return rows;
  }, [visibleCats]);
  const hasSearchQuery = normalizedSearchQuery.length > 0;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.headerRow}>
        <View style={styles.locationChip}>
          <View style={styles.locationIcon}>
            <MapPin color={nd.colors.ink} size={20} strokeWidth={1.8} />
          </View>
          <Text style={styles.locationText}>{neighborhoodName}</Text>
          <ChevronDown color={nd.colors.ink} size={16} strokeWidth={1.8} />
        </View>
        <Pressable
          accessibilityLabel="알림 보기"
          hitSlop={8}
          onPress={() => Alert.alert('알림은 준비 중이에요', '알림함은 다음 단계에서 추가될 예정이에요.')}
          style={({ pressed }) => [styles.bellButton, pressed && styles.pressed]}
        >
          <Bell color={nd.colors.ink} size={24} strokeWidth={1.8} />
          <View style={styles.bellDot} />
        </Pressable>
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
          <SlidersHorizontal color={nd.colors.ink} size={20} strokeWidth={1.8} />
        </View>

        <ScrollView contentContainerStyle={styles.filterRow} horizontal showsHorizontalScrollIndicator={false}>
          {catFilters.map((filter) => {
            const isSelected = selectedFilter === filter;

            return (
              <Pressable key={filter} onPress={() => setSelectedFilter(filter)} style={[styles.filterChip, isSelected && styles.filterChipActive]}>
                <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>{filter}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.grid}>
          {gridRows.map((row) => (
            <View key={row[0].id} style={styles.gridRow}>
              {row.map((cat) => (
                <PolaroidCatCard
                  imageSource={imageForCatType(cat.type, cat.imageUrl)}
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
            <Text style={styles.emptyTitle}>{hasSearchQuery ? '검색 결과가 없어요' : '아직 동네에 기록된 고양이가 없어요'}</Text>
            <Text style={styles.emptyText}>
              {hasSearchQuery ? '다른 이름이나 특징으로 다시 찾아보세요.' : '첫 고양이를 기록하면 동네 도감이 채워져요.'}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.tabBarWrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
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
  bellButton: {
    padding: 2,
  },
  bellDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ED1C24',
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
  filterRow: {
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
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
