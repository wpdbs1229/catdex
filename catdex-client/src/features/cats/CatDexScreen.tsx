import { useMemo, useState } from 'react';
import { BookOpen, Filter, PawPrint, Search } from 'lucide-react-native';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ImageSourcePropType } from 'react-native';
import { catFilters } from '@/shared/constants/cat.constants';
import { createShadow, theme } from '@/shared/styles/theme';
import type { Cat, CatFilter, CatType, DexPlaceholder } from '@/shared/types/cat';
import { getCatIllustrationKey, type CatIllustrationKey } from '@/shared/utils/catPresentation';

interface CatDexScreenProps {
  cats: Cat[];
  placeholders: DexPlaceholder[];
  onOpenCat: (catId: string) => void;
}

const filters = catFilters;

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

function getPlaceholderMeta(placeholder: DexPlaceholder) {
  if (placeholder.reportCount && placeholder.reportCount > 0) {
    return `${placeholder.regionHint} · ${placeholder.reportCount}건 제보`;
  }

  return `${placeholder.regionHint} · ${placeholder.timeHint ?? '관찰 대기'}`;
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

function matchesPlaceholderFilter(placeholder: DexPlaceholder, selectedFilter: CatFilter) {
  if (selectedFilter === '전체') {
    return true;
  }

  if (selectedFilter === '희귀') {
    return placeholder.rarity >= 4;
  }

  return placeholder.type === selectedFilter;
}

export function CatDexScreen({
  cats,
  placeholders,
  onOpenCat,
}: CatDexScreenProps) {
  const [selectedFilter, setSelectedFilter] = useState<CatFilter>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const normalizedSearchQuery = normalizeSearchText(searchQuery);
  const visibleCats = useMemo(
    () =>
      cats.filter((cat) => {
        const matchesFilter = matchesCatFilter(cat, selectedFilter);

        return matchesFilter && catMatchesSearch(cat, normalizedSearchQuery);
      }),
    [cats, normalizedSearchQuery, selectedFilter],
  );
  const visiblePlaceholders = useMemo(
    () =>
      placeholders.filter((placeholder) => {
        const matchesFilter = matchesPlaceholderFilter(placeholder, selectedFilter);

        return matchesFilter && placeholderMatchesSearch(placeholder, normalizedSearchQuery);
      }),
    [normalizedSearchQuery, placeholders, selectedFilter],
  );
  const lockedPlaceholders = visiblePlaceholders.slice(0, Math.min(visiblePlaceholders.length, 2));
  const hasSearchQuery = normalizedSearchQuery.length > 0;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.bookHeader}>
        <View>
          <Text style={styles.bookKicker}>스티커북</Text>
          <Text style={styles.bookTitle}>{hasSearchQuery ? '찾은 고양이' : '모아둔 고양이'}</Text>
        </View>
        <View style={styles.bookCountBadge}>
          <BookOpen color={theme.colors.primaryDark} size={15} />
          <Text style={styles.countText}>{visibleCats.length}마리</Text>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Search color={theme.colors.mutedText} size={18} />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setSearchQuery}
          placeholder="이름이나 특징으로 찾기"
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

      <View style={styles.grid}>
        {visibleCats.map((cat, index) => (
          <Pressable
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
              {cat.relationshipLevel}
            </Text>
          </Pressable>
        ))}

        {lockedPlaceholders.map((placeholder, index) => (
          <View key={placeholder.id} style={[styles.tile, styles.lockedTile, index % 2 === 0 ? styles.tileTiltRight : styles.tileTiltLeft]}>
            <View pointerEvents="none" style={styles.tileWash} />
            <View style={[styles.tileImageFrame, styles.lockedImageFrame]}>
              <Image resizeMode="contain" source={imageForType(placeholder.type, placeholder.imageUrl)} style={[styles.tileImage, styles.lockedImage]} />
              <View style={styles.lockedImageOverlay}>
                <View style={styles.lockedPawBadge}>
                  <PawPrint color="#C9A66A" size={28} />
                </View>
              </View>
            </View>
            <View style={styles.tileNumberPill}>
              <Text style={styles.tileNumber}>No.{String(placeholder.number).padStart(3, '0')}</Text>
            </View>
            <Text numberOfLines={1} style={styles.tileName}>
              비어있는 페이지
            </Text>
            <Text numberOfLines={1} style={styles.tileMeta}>
              {getPlaceholderMeta(placeholder)}
            </Text>
          </View>
        ))}
      </View>

      {visibleCats.length === 0 && lockedPlaceholders.length === 0 ? (
        <View style={styles.emptyState}>
          <PawPrint color="#D4B989" size={38} />
          <Text style={styles.emptyTitle}>{hasSearchQuery ? '검색 결과가 없어요' : '아직 수집한 고양이가 없어요'}</Text>
          <Text style={styles.emptyText}>
            {hasSearchQuery ? '다른 이름, 특징, 태그로 다시 찾아보세요.' : '첫 고양이를 등록하면 도감 페이지가 여기에 채워져요.'}
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
  bookHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  bookKicker: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  bookTitle: {
    marginTop: 3,
    color: theme.colors.text,
    fontSize: 23,
    fontWeight: '900',
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
    fontSize: 12,
    fontWeight: '900',
    color: theme.colors.primaryDark,
  },
  searchBar: {
    height: 48,
    marginTop: theme.spacing.md,
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
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  filterRow: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 9,
    backgroundColor: 'rgba(255,253,246,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
  },
  filterChipActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.mutedText,
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
    borderRadius: theme.radius.xl,
    padding: 10,
    backgroundColor: 'rgba(255,253,246,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
    overflow: 'hidden',
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
    bottom: 46,
    width: 84,
    height: 56,
    borderRadius: 42,
    backgroundColor: 'rgba(221,232,200,0.34)',
    transform: [{ rotate: '-18deg' }],
  },
  pressed: {
    opacity: 0.86,
  },
  tileImageFrame: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(248,234,210,0.56)',
    overflow: 'hidden',
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
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
    color: theme.colors.text,
  },
  tileMeta: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.mutedText,
  },
  lockedTile: {
    backgroundColor: 'rgba(255,253,246,0.58)',
  },
  lockedImageFrame: {
    borderWidth: 1,
    borderColor: 'rgba(212,185,137,0.4)',
    backgroundColor: 'rgba(248,234,210,0.66)',
  },
  lockedImage: {
    opacity: 0.18,
  },
  lockedImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248,234,210,0.36)',
  },
  lockedPawBadge: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 27,
    backgroundColor: 'rgba(255,253,246,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(212,185,137,0.45)',
  },
  emptyState: {
    marginTop: theme.spacing.lg,
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
});
