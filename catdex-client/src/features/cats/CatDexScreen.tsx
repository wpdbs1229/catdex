import { useMemo, useState } from 'react';
import { Filter, PawPrint, Search } from 'lucide-react-native';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ImageSourcePropType } from 'react-native';
import { CollectionCoverHeader } from '@/features/cats/components/CollectionCoverHeader';
import { createShadow, theme } from '@/shared/styles/theme';
import type { Cat, CatFilter, CatType, DexPlaceholder, DexProgress } from '@/shared/types/cat';
import type { CollectionProfile, CollectionSummary, CollectionTheme } from '@/shared/types/collection';

interface CatDexScreenProps {
  cats: Cat[];
  collectionProfile: CollectionProfile;
  collectionSummary: CollectionSummary;
  collectionTheme?: CollectionTheme;
  placeholders: DexPlaceholder[];
  progress: DexProgress;
  onOpenCollectionRankings: () => void;
  onOpenCollectionDrawer: () => void;
  onOpenCat: (catId: string) => void;
}

const filters: CatFilter[] = ['전체', '치즈냥', '삼색이', '턱시도', '흰냥'];

const illustrations = {
  orange: require('../../../assets/illustrations/cat-orange-clean.png'),
  dark: require('../../../assets/illustrations/cat-dark-clean.png'),
  tuxedo: require('../../../assets/illustrations/cat-tuxedo-clean.png'),
  gray: require('../../../assets/illustrations/cat-gray-clean.png'),
} satisfies Record<string, ImageSourcePropType>;

function imageForType(type: CatType, imageUrl?: string): ImageSourcePropType {
  if (imageUrl) {
    return { uri: imageUrl };
  }

  if (type === '턱시도') {
    return illustrations.tuxedo;
  }

  if (type === '흰냥') {
    return illustrations.gray;
  }

  if (type === '삼색이' || type === '검은냥') {
    return illustrations.dark;
  }

  return illustrations.orange;
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function catMatchesSearch(cat: Cat, query: string) {
  if (!query) {
    return true;
  }

  return [
    cat.name,
    cat.type,
    cat.relationshipLevel,
    cat.memo ?? '',
    `no.${String(cat.number).padStart(3, '0')}`,
    String(cat.number),
    ...cat.tags,
  ]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

function placeholderMatchesSearch(placeholder: DexPlaceholder, query: string) {
  if (!query) {
    return true;
  }

  return [
    placeholder.type,
    placeholder.regionHint,
    placeholder.behaviorHint,
    placeholder.clueTitle,
    placeholder.clue,
  ]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

export function CatDexScreen({
  cats,
  collectionProfile,
  collectionSummary,
  collectionTheme,
  placeholders,
  progress,
  onOpenCollectionRankings,
  onOpenCollectionDrawer,
  onOpenCat,
}: CatDexScreenProps) {
  const [selectedFilter, setSelectedFilter] = useState<CatFilter>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const normalizedSearchQuery = normalizeSearchText(searchQuery);
  const visibleCats = useMemo(
    () =>
      cats.filter((cat) => {
        const matchesFilter = selectedFilter === '전체' || cat.type === selectedFilter;

        return matchesFilter && catMatchesSearch(cat, normalizedSearchQuery);
      }),
    [cats, normalizedSearchQuery, selectedFilter],
  );
  const visiblePlaceholders = useMemo(
    () =>
      placeholders.filter((placeholder) => {
        const matchesFilter = selectedFilter === '전체' || placeholder.type === selectedFilter;

        return matchesFilter && placeholderMatchesSearch(placeholder, normalizedSearchQuery);
      }),
    [normalizedSearchQuery, placeholders, selectedFilter],
  );
  const lockedCount = Math.max(0, Math.min(visiblePlaceholders.length, 1));
  const hasSearchQuery = normalizedSearchQuery.length > 0;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <CollectionCoverHeader
        collectionTheme={collectionTheme}
        onCustomize={onOpenCollectionDrawer}
        onExplore={onOpenCollectionRankings}
        profile={collectionProfile}
        progress={progress}
        summary={collectionSummary}
      />

      <View style={styles.searchBar}>
        <Search color={theme.colors.mutedText} size={18} />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setSearchQuery}
          placeholder="고양이 이름, 특징으로 검색"
          placeholderTextColor={theme.colors.mutedText}
          returnKeyType="search"
          style={styles.searchInput}
          value={searchQuery}
        />
        <Filter color={theme.colors.primaryDark} size={17} />
      </View>

      <ScrollView contentContainerStyle={styles.filterRow} horizontal showsHorizontalScrollIndicator={false}>
        {filters.map((filter) => {
          const isSelected = selectedFilter === filter;

          return (
            <Pressable key={filter} onPress={() => setSelectedFilter(filter)} style={[styles.filterChip, isSelected && styles.filterChipActive]}>
              <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>{filter}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {hasSearchQuery ? '검색 결과' : '전체'} {visibleCats.length}마리
        </Text>
      </View>

      <View style={styles.grid}>
        {visibleCats.map((cat) => (
          <Pressable key={cat.id} onPress={() => onOpenCat(cat.id)} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
            <View pointerEvents="none" style={styles.tileWash} />
            <View style={styles.tileImageFrame}>
              <Image resizeMode="cover" source={imageForType(cat.type, cat.imageUrl)} style={styles.tileImage} />
            </View>
            <Text style={styles.tileNumber}>No.{String(cat.number).padStart(3, '0')}</Text>
            <Text numberOfLines={1} style={styles.tileName}>
              {cat.name}
            </Text>
            <Text numberOfLines={1} style={styles.tileMeta}>
              {cat.relationshipLevel}
            </Text>
          </Pressable>
        ))}

        {Array.from({ length: lockedCount }).map((_, index) => (
          <View key={`locked-${index}`} style={[styles.tile, styles.lockedTile]}>
            <PawPrint color="#D4B989" size={44} />
            <Text style={styles.lockedText}>새로운 고양이 기다리는 중</Text>
          </View>
        ))}
      </View>

      {visibleCats.length === 0 && lockedCount === 0 ? (
        <View style={styles.emptyState}>
          <PawPrint color="#D4B989" size={38} />
          <Text style={styles.emptyTitle}>{hasSearchQuery ? '검색 결과가 없어요' : '아직 수집한 고양이가 없어요'}</Text>
          <Text style={styles.emptyText}>
            {hasSearchQuery ? '다른 이름, 특징, 태그로 다시 찾아보세요.' : '첫 고양이를 등록하면 도감 카드가 여기에 채워져요.'}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 132,
  },
  searchBar: {
    height: 46,
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: 23,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.86)',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  filterRow: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 9,
    backgroundColor: 'rgba(255,253,246,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.86)',
  },
  filterChipActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.mutedText,
  },
  filterTextActive: {
    color: '#FFF8F0',
  },
  countRow: {
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  countText: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
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
    borderRadius: theme.radius.md,
    padding: 10,
    backgroundColor: 'rgba(255,253,246,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
    overflow: 'hidden',
    ...createShadow(5),
  },
  tileWash: {
    position: 'absolute',
    right: -34,
    bottom: 46,
    width: 78,
    height: 50,
    borderRadius: 40,
    backgroundColor: 'rgba(221, 232, 200, 0.34)',
    transform: [{ rotate: '-18deg' }],
  },
  pressed: {
    opacity: 0.86,
  },
  tileImageFrame: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: 'hidden',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileNumber: {
    marginTop: 10,
    color: '#9B734D',
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
  },
  tileName: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
    color: theme.colors.text,
  },
  tileMeta: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.mutedText,
  },
  lockedTile: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244,231,209,0.8)',
  },
  lockedText: {
    marginTop: theme.spacing.sm,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    textAlign: 'center',
    color: '#A88C78',
  },
  emptyState: {
    marginTop: theme.spacing.lg,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
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
});
