import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Filter, PawPrint, Search, X } from 'lucide-react-native';
import { Animated, Image, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Region, RegionCatPreview } from '@/shared/types/region';
import { KakaoMapView } from '@/features/map/components/KakaoMapView';
import { theme } from '@/shared/styles/theme';

const collapsedTabClearance = 124;
const expandedSheetLift = 156;
const filterModes = ['전체', '지역별', '고양이별'] as const;

type MapFilterMode = (typeof filterModes)[number];

interface MapCatOption extends RegionCatPreview {
  key: string;
  regionId: string;
  regionName: string;
}

interface MapScreenProps {
  regions: Region[];
}

function normalizeFilterText(value: string) {
  return value.trim().toLowerCase();
}

function getRegionCatOptions(region: Region): MapCatOption[] {
  const previews = region.catPreviews?.length
    ? region.catPreviews
    : region.cats.map((name, index) => ({
      id: `${region.id}-${index}`,
      name,
    }));

  return previews.map((cat) => ({
    ...cat,
    key: `${region.id}:${cat.id}:${cat.name}`,
    regionId: region.id,
    regionName: region.name,
  }));
}

function regionMatchesQuery(region: Region, query: string, mode: MapFilterMode) {
  if (!query) {
    return true;
  }

  const regionName = region.name.toLowerCase();
  const catNames = getRegionCatOptions(region).map((cat) => cat.name.toLowerCase());

  if (mode === '지역별') {
    return regionName.includes(query);
  }

  if (mode === '고양이별') {
    return catNames.some((name) => name.includes(query));
  }

  return regionName.includes(query) || catNames.some((name) => name.includes(query));
}

function getSearchPlaceholder(mode: MapFilterMode) {
  if (mode === '지역별') {
    return '지역 이름';
  }

  if (mode === '고양이별') {
    return '고양이 이름';
  }

  return '고양이 이름 또는 지역';
}

export function MapScreen({ regions }: MapScreenProps) {
  const insets = useSafeAreaInsets();
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<MapFilterMode>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const normalizedSearchQuery = normalizeFilterText(searchQuery);
  const allCatOptions = useMemo(() => regions.flatMap(getRegionCatOptions), [regions]);
  const selectedCat = useMemo(
    () => allCatOptions.find((cat) => cat.id === selectedCatId) ?? null,
    [allCatOptions, selectedCatId],
  );
  const displayRegions = useMemo(
    () =>
      regions.filter((region) => {
        const matchesSelectedCat = selectedCatId
          ? getRegionCatOptions(region).some((cat) => cat.id === selectedCatId)
          : true;

        return matchesSelectedCat && regionMatchesQuery(region, normalizedSearchQuery, filterMode);
      }),
    [filterMode, normalizedSearchQuery, regions, selectedCatId],
  );
  const visibleCatOptions = useMemo(
    () =>
      allCatOptions.filter((cat) => {
        if (!normalizedSearchQuery) {
          return true;
        }

        return cat.name.toLowerCase().includes(normalizedSearchQuery);
      }),
    [allCatOptions, normalizedSearchQuery],
  );
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(displayRegions[0] ?? null);
  const selectedRegionCats = useMemo(() => {
    if (!selectedRegion) {
      return [];
    }

    const cats = getRegionCatOptions(selectedRegion);

    if (selectedCatId) {
      return cats.filter((cat) => cat.id === selectedCatId);
    }

    if (filterMode === '고양이별' && normalizedSearchQuery) {
      return cats.filter((cat) => cat.name.toLowerCase().includes(normalizedSearchQuery));
    }

    return cats;
  }, [filterMode, normalizedSearchQuery, selectedCatId, selectedRegion]);
  const hasActiveFilters = filterMode !== '전체' || normalizedSearchQuery.length > 0 || selectedCatId !== null;
  const activeFilterCount = Number(filterMode !== '전체') + Number(normalizedSearchQuery.length > 0) + Number(selectedCatId !== null);
  const searchPlaceholder = getSearchPlaceholder(filterMode);

  const snapSheet = useCallback(
    (expanded: boolean) => {
      if (!expanded) {
        setIsFilterOpen(false);
      }

      setIsSheetExpanded(expanded);
      Animated.spring(sheetTranslateY, {
        toValue: expanded ? -expandedSheetLift : 0,
        damping: 22,
        stiffness: 220,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
    },
    [sheetTranslateY],
  );

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) => {
          const baseOffset = isSheetExpanded ? -expandedSheetLift : 0;
          const nextOffset = Math.min(0, Math.max(-expandedSheetLift, baseOffset + gesture.dy));

          sheetTranslateY.setValue(nextOffset);
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.vy > 0.35) {
            snapSheet(false);
            return;
          }

          if (gesture.vy < -0.35) {
            snapSheet(true);
            return;
          }

          const baseOffset = isSheetExpanded ? -expandedSheetLift : 0;
          snapSheet(baseOffset + gesture.dy < -expandedSheetLift / 2);
        },
        onPanResponderTerminate: () => {
          snapSheet(isSheetExpanded);
        },
      }),
    [isSheetExpanded, sheetTranslateY, snapSheet],
  );

  useEffect(() => {
    if (!selectedRegion && displayRegions[0]) {
      setSelectedRegion(displayRegions[0]);
      return;
    }

    if (selectedRegion && !displayRegions.some((region) => region.id === selectedRegion.id)) {
      setSelectedRegion(displayRegions[0] ?? null);
    }
  }, [displayRegions, selectedRegion]);

  const handleResetFilters = () => {
    setFilterMode('전체');
    setSearchQuery('');
    setSelectedCatId(null);
  };

  const handleSelectCat = (cat: MapCatOption) => {
    setFilterMode('고양이별');
    setSelectedCatId(cat.id);
    setSelectedRegion(regions.find((region) => region.id === cat.regionId) ?? null);
    snapSheet(true);
  };

  return (
    <View style={styles.screen}>
      <KakaoMapView
        onSelectRegion={setSelectedRegion}
        regions={displayRegions}
        selectedRegionId={selectedRegion?.id ?? null}
        style={styles.fullMap}
      />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>내 발견 지도</Text>
            <Text style={styles.subtitle}>내가 발견한 고양이만 동네 단위로 보여줘요.</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="지도 필터 열기"
              onPress={() => {
                setIsFilterOpen((value) => {
                  const nextValue = !value;

                  if (nextValue) {
                    snapSheet(true);
                  }

                  return nextValue;
                });
              }}
              style={({ pressed }) => [
                styles.filterButton,
                isFilterOpen || hasActiveFilters ? styles.filterButtonActive : null,
                pressed && styles.pressed,
              ]}
            >
              <Filter color={isFilterOpen || hasActiveFilters ? '#FFF8F0' : theme.colors.primaryDark} size={18} />
              {activeFilterCount > 0 ? (
                <View style={styles.filterCountBadge}>
                  <Text style={styles.filterCountText}>{activeFilterCount}</Text>
                </View>
              ) : null}
            </Pressable>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>내 기록</Text>
            </View>
          </View>
        </View>
      </View>

      <Animated.View
        style={[
          styles.bottomSheet,
          {
            bottom: Math.max(insets.bottom, theme.spacing.md) + collapsedTabClearance,
            transform: [{ translateY: sheetTranslateY }],
          },
        ]}
      >
        <Pressable
          onPress={() => snapSheet(!isSheetExpanded)}
          style={({ pressed }) => [styles.sheetHandleArea, pressed && styles.pressed]}
          {...sheetPanResponder.panHandlers}
        >
          <View style={styles.sheetHandle} />
        </Pressable>

        {isFilterOpen ? (
          <View style={styles.filterPanel}>
            <View style={styles.searchBar}>
              <Search color={theme.colors.mutedText} size={17} />
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setSearchQuery}
                placeholder={searchPlaceholder}
                placeholderTextColor={theme.colors.mutedText}
                returnKeyType="search"
                style={styles.searchInput}
                value={searchQuery}
              />
              {hasActiveFilters ? (
                <Pressable accessibilityLabel="지도 필터 초기화" onPress={handleResetFilters} style={styles.clearFilterButton}>
                  <X color={theme.colors.primaryDark} size={16} />
                </Pressable>
              ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterModeRow}>
                {filterModes.map((mode) => {
                  const isSelected = filterMode === mode;

                  return (
                    <Pressable
                      key={mode}
                      onPress={() => {
                        setFilterMode(mode);

                        if (mode !== '고양이별') {
                          setSelectedCatId(null);
                        }
                      }}
                      style={({ pressed }) => [styles.filterModeChip, isSelected && styles.filterModeChipActive, pressed && styles.pressed]}
                    >
                      <Text style={[styles.filterModeText, isSelected && styles.filterModeTextActive]}>{mode}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        ) : null}

        {displayRegions.length === 0 ? (
          <View style={styles.emptyRegion}>
            <Text style={styles.emptyRegionTitle}>
              {regions.length === 0 ? '아직 내 발견 지역이 없어요' : '조건에 맞는 기록이 없어요'}
            </Text>
            <Text style={styles.emptyRegionText}>
              {regions.length === 0 ? '고양이를 등록하거나 다시 만나면 내 발견 지도가 채워져요.' : '다른 지역이나 고양이 이름으로 다시 찾아보세요.'}
            </Text>
          </View>
        ) : selectedRegion ? (
          <View style={styles.selectedRegionSummary}>
            <View style={styles.selectedRegionText}>
              <Text style={styles.regionKicker}>{selectedCat ? selectedCat.name : '내 발견 지역'}</Text>
              <Text numberOfLines={1} style={styles.regionTitle}>
                {selectedRegion.name}
              </Text>
            </View>
            <View style={styles.regionCountPill}>
              <Text style={styles.regionCount}>내 기록 {selectedRegionCats.length}마리</Text>
            </View>
          </View>
        ) : null}

        {isSheetExpanded && selectedRegionCats.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.regionList}>
              {selectedRegionCats.map((cat) => (
                <View key={`${selectedRegion?.id}-${cat.id}`} style={styles.regionTag}>
                  <Text style={styles.regionTagText}>{cat.name}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : null}

        {isSheetExpanded && filterMode === '고양이별' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.catSelector}>
              {visibleCatOptions.map((cat) => {
                const isSelected = cat.id === selectedCatId;

                return (
                  <Pressable
                    key={cat.key}
                    onPress={() => handleSelectCat(cat)}
                    style={({ pressed }) => [styles.catPill, isSelected && styles.catPillSelected, pressed && styles.pressed]}
                  >
                    <View style={[styles.catAvatar, isSelected && styles.catAvatarSelected]}>
                      {cat.imageUrl ? (
                        <Image resizeMode="cover" source={{ uri: cat.imageUrl }} style={styles.catAvatarImage} />
                      ) : (
                        <PawPrint color={isSelected ? '#FFF8F0' : theme.colors.primaryDark} size={17} />
                      )}
                    </View>
                    <View style={styles.catPillCopy}>
                      <Text numberOfLines={1} style={[styles.catPillText, isSelected && styles.catPillTextSelected]}>
                        {cat.name}
                      </Text>
                      <Text numberOfLines={1} style={[styles.catPillRegion, isSelected && styles.catPillTextSelected]}>
                        {cat.regionName}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        ) : isSheetExpanded ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.regionSelector}>
              {displayRegions.map((region) => {
                const isSelected = region.id === selectedRegion?.id;

                return (
                  <Pressable
                    key={region.id}
                    onPress={() => setSelectedRegion(region)}
                    style={({ pressed }) => [styles.regionPill, isSelected && styles.regionPillSelected, pressed && styles.pressed]}
                  >
                    <Text numberOfLines={1} style={[styles.regionPillText, isSelected && styles.regionPillTextSelected]}>
                      {region.name}
                    </Text>
                    <Text style={[styles.regionPillCount, isSelected && styles.regionPillTextSelected]}>
                      내 기록 {region.cats.length}마리
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.mapBase,
  },
  fullMap: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    left: theme.spacing.md,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: 'rgba(255, 253, 246, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(139, 112, 83, 0.16)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerActions: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  filterButton: {
    position: 'relative',
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: 'rgba(255, 253, 246, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(139, 112, 83, 0.16)',
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  filterCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: theme.colors.success,
    borderWidth: 1,
    borderColor: theme.colors.surface,
  },
  filterCountText: {
    color: theme.colors.surface,
    fontSize: 10,
    fontWeight: '900',
  },
  badge: {
    flexShrink: 0,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    backgroundColor: theme.colors.accentSoft,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#536845',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.mutedText,
  },
  bottomSheet: {
    position: 'absolute',
    right: theme.spacing.md,
    left: theme.spacing.md,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255, 253, 246, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(139, 112, 83, 0.16)',
  },
  sheetHandleArea: {
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
  },
  sheetHandle: {
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(117,101,83,0.32)',
  },
  filterPanel: {
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  searchBar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255, 248, 236, 0.92)',
    borderWidth: 1,
    borderColor: '#EAD9C4',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 0,
  },
  clearFilterButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: theme.colors.accentSoft,
  },
  filterModeRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  filterModeChip: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255, 253, 246, 0.78)',
    borderWidth: 1,
    borderColor: '#EAD9C4',
  },
  filterModeChipActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  filterModeText: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
  },
  filterModeTextActive: {
    color: '#FFF8F0',
  },
  emptyRegion: {
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  emptyRegionTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  emptyRegionText: {
    marginTop: 5,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  selectedRegionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  selectedRegionText: {
    flex: 1,
  },
  regionKicker: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B6956',
  },
  regionTitle: {
    marginTop: 3,
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  regionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  regionCountPill: {
    flexShrink: 0,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    backgroundColor: theme.colors.badge,
    borderWidth: 1,
    borderColor: 'rgba(191,120,72,0.18)',
  },
  regionList: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  regionTag: {
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: '#EAD9C4',
  },
  regionTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6F5444',
  },
  catSelector: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  catPill: {
    width: 154,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(255, 253, 246, 0.82)',
    borderWidth: 1,
    borderColor: '#EAD9C4',
  },
  catPillSelected: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  catAvatar: {
    width: 38,
    height: 38,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 19,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  catAvatarSelected: {
    backgroundColor: theme.colors.primary,
  },
  catAvatarImage: {
    width: '100%',
    height: '100%',
  },
  catPillCopy: {
    flex: 1,
    minWidth: 0,
  },
  catPillText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  catPillRegion: {
    marginTop: 3,
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '700',
  },
  catPillTextSelected: {
    color: '#FFF8F0',
  },
  regionSelector: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  regionPill: {
    minWidth: 132,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 253, 246, 0.82)',
    borderWidth: 1,
    borderColor: '#EAD9C4',
  },
  regionPillSelected: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: '#B9C59A',
  },
  pressed: {
    opacity: 0.88,
  },
  regionPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.text,
  },
  regionPillCount: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.mutedText,
  },
  regionPillTextSelected: {
    color: '#6F5444',
  },
});
