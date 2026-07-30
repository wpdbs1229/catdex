import { useMemo, useState } from 'react';
import { Bell, ChevronDown, MapPin, PawPrint, Search, SlidersHorizontal } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ImageSourcePropType } from 'react-native';
import { formatMapRegionName } from '@/features/map/map-region-label';
import { PolaroidCatCard } from '@/shared/components/PolaroidCatCard';
import { catFilters } from '@/shared/constants/cat.constants';
import { nd } from '@/shared/styles/theme';
import type { Cat, CatFilter, CatType, DexPlaceholder } from '@/shared/types/cat';
import type { Region } from '@/shared/types/region';
import { formatNyanTagLabel, getCatIllustrationKey, type CatIllustrationKey } from '@/shared/utils/catPresentation';

interface NeighborhoodDexScreenProps {
  cats: Cat[];
  myCatIds: string[];
  neighborhoodName: string;
  onGoCapture: () => void;
  onOpenCat: (catId: string) => void;
  onOpenCommunityBoard: () => void;
  onOpenCommunityPost: (postId: string) => void;
  onOpenMap: () => void;
  onOpenNotifications?: () => void;
  regions: Region[];
  regionNames: string[];
  sightings: DexPlaceholder[];
}

type NeighborhoodScope = 'all' | 'mine';

const scopeOptions: Array<{ id: NeighborhoodScope; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'mine', label: '내 도감' },
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

  return [cat.name, cat.type, cat.relationshipLevel, cat.memo ?? '', regionLabel, ...cat.tags]
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
  const names = regionNamesByCatId[cat.id] ?? regionNamesByCatName[cat.name] ?? [];

  if (names.length === 0) {
    return fallbackNeighborhoodName;
  }

  return names.slice(0, 2).join(', ');
}

export function NeighborhoodDexScreen({
  cats,
  myCatIds,
  neighborhoodName,
  onOpenCat,
  onOpenNotifications,
  regions,
}: NeighborhoodDexScreenProps) {
  const [selectedScope, setSelectedScope] = useState<NeighborhoodScope>('all');
  const [selectedFilter, setSelectedFilter] = useState<CatFilter>('전체');
  const [searchQuery, setSearchQuery] = useState('');

  const normalizedSearchQuery = normalizeSearchText(searchQuery);
  const myCatIdSet = useMemo(() => new Set(myCatIds), [myCatIds]);
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
  const gridRows = useMemo(() => {
    const rows: Cat[][] = [];

    for (let index = 0; index < visibleCats.length; index += 2) {
      rows.push(visibleCats.slice(index, index + 2));
    }

    return rows;
  }, [visibleCats]);
  const hasSearchQuery = normalizedSearchQuery.length > 0;

  return (
    <View style={styles.screen}>
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
          disabled={!onOpenNotifications}
          hitSlop={8}
          onPress={onOpenNotifications}
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
                  imageSource={imageForType(cat.type, cat.imageUrl)}
                  key={cat.id}
                  onPress={() => onOpenCat(cat.id)}
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
    </View>
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
  pressed: {
    opacity: 0.84,
  },
});
