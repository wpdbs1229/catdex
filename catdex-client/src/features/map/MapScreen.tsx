import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, CreditCard, Filter, Lock, MapPin, PawPrint, Search, ShieldCheck, SlidersHorizontal, Users, X } from 'lucide-react-native';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Region, RegionCatPreview } from '@/shared/types/region';
import { KakaoMapView } from '@/features/map/components/KakaoMapView';
import { theme } from '@/shared/styles/theme';

const mapDockSurface = 'rgba(255, 248, 236, 0.97)';
const bottomSheetTabClearance = 90;
const collapsedSheetHeight = 252;
const minExpandedSheetHeight = 420;
const maxExpandedSheetHeight = 540;
const filterModes = ['전체', '지역별', '고양이별'] as const;
const mapModes = ['private', 'shared'] as const;
const detailFilterOptions = ['photo', 'named', 'multiCatRegion'] as const;

type MapFilterMode = (typeof filterModes)[number];
type MapMode = (typeof mapModes)[number];
type DetailFilterOption = (typeof detailFilterOptions)[number];

interface MapCatOption extends RegionCatPreview {
  key: string;
  regionId: string;
  regionName: string;
  regionCatCount: number;
}

interface MapScreenProps {
  regions: Region[];
  sharedRegions?: Region[];
  hasSharedMapAccess?: boolean;
  isSharedMapPurchasePending?: boolean;
  sharedMapPriceLabel?: string;
  onOpenCat?: (catId: string) => void;
  onRestoreSharedMapPurchase?: () => void;
  onStartSharedMapPurchase?: () => void;
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
    regionCatCount: previews.length,
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

function getMapModeLabel(mode: MapMode) {
  return mode === 'shared' ? '공유지도' : '개인지도';
}

function getDetailFilterLabel(option: DetailFilterOption) {
  if (option === 'photo') {
    return '사진 있는 기록';
  }

  if (option === 'named') {
    return '이름 등록됨';
  }

  return '2마리 이상 지역';
}

export function MapScreen({
  regions,
  sharedRegions = [],
  hasSharedMapAccess = false,
  isSharedMapPurchasePending = false,
  sharedMapPriceLabel = '15,900원',
  onOpenCat,
  onRestoreSharedMapPurchase,
  onStartSharedMapPurchase,
}: MapScreenProps) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const sheetProgress = useRef(new Animated.Value(0)).current;
  const [mapMode, setMapMode] = useState<MapMode>('private');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<MapFilterMode>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [detailFilters, setDetailFilters] = useState<DetailFilterOption[]>([]);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const isSharedMode = mapMode === 'shared';
  const shouldShowSharedPaywall = isSharedMode && !hasSharedMapAccess;
  const activeRegions = isSharedMode && hasSharedMapAccess ? sharedRegions : regions;
  const recordLabel = isSharedMode ? '공유 기록' : '내 기록';
  const headerTitle = isSharedMode ? '공유지도' : '내 발견 지도';
  const headerSubtitle = isSharedMode ? '동네 사람들이 만난 고양이를 지역 단위로 보여줘요.' : '내가 발견한 고양이만 동네 단위로 보여줘요.';
  const expandedSheetHeight = Math.min(maxExpandedSheetHeight, Math.max(minExpandedSheetHeight, screenHeight * 0.44));
  const sheetTravel = Math.max(1, expandedSheetHeight - collapsedSheetHeight);
  const animatedSheetHeight = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [collapsedSheetHeight, expandedSheetHeight],
  });
  const normalizedSearchQuery = normalizeFilterText(searchQuery);
  const allCatOptions = useMemo(() => activeRegions.flatMap(getRegionCatOptions), [activeRegions]);
  const catMatchesDetailFilters = useCallback(
    (cat: MapCatOption) => {
      if (detailFilters.includes('photo') && !cat.imageUrl) {
        return false;
      }

      if (detailFilters.includes('named') && cat.name.trim().length === 0) {
        return false;
      }

      if (detailFilters.includes('multiCatRegion') && cat.regionCatCount < 2) {
        return false;
      }

      return true;
    },
    [detailFilters],
  );
  const selectedCat = useMemo(
    () => allCatOptions.find((cat) => cat.id === selectedCatId) ?? null,
    [allCatOptions, selectedCatId],
  );
  const displayRegions = useMemo(
    () =>
      activeRegions.filter((region) => {
        const matchesSelectedCat = selectedCatId
          ? getRegionCatOptions(region).some((cat) => cat.id === selectedCatId)
          : true;
        const matchesDetailFilters = getRegionCatOptions(region).some(catMatchesDetailFilters);

        return matchesSelectedCat && matchesDetailFilters && regionMatchesQuery(region, normalizedSearchQuery, filterMode);
      }),
    [activeRegions, catMatchesDetailFilters, filterMode, normalizedSearchQuery, selectedCatId],
  );
  const visibleCatOptions = useMemo(
    () =>
      allCatOptions.filter((cat) => {
        if (!catMatchesDetailFilters(cat)) {
          return false;
        }

        if (selectedCatId && cat.id !== selectedCatId) {
          return false;
        }

        if (normalizedSearchQuery) {
          return cat.name.toLowerCase().includes(normalizedSearchQuery) || cat.regionName.toLowerCase().includes(normalizedSearchQuery);
        }

        return true;
      }),
    [allCatOptions, catMatchesDetailFilters, normalizedSearchQuery, selectedCatId],
  );
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(displayRegions[0] ?? null);
  const selectedRegionCats = useMemo(() => {
    if (!selectedRegion) {
      return [];
    }

    const cats = getRegionCatOptions(selectedRegion).filter(catMatchesDetailFilters);

    if (selectedCatId) {
      return cats.filter((cat) => cat.id === selectedCatId);
    }

    if (filterMode === '고양이별' && normalizedSearchQuery) {
      return cats.filter((cat) => cat.name.toLowerCase().includes(normalizedSearchQuery));
    }

    return cats;
  }, [catMatchesDetailFilters, filterMode, normalizedSearchQuery, selectedCatId, selectedRegion]);
  const sheetCats = filterMode === '고양이별' ? visibleCatOptions : selectedRegionCats;
  const previewCats = isSheetExpanded ? sheetCats : sheetCats.slice(0, 1);
  const hasActiveFilters = normalizedSearchQuery.length > 0 || selectedCatId !== null || detailFilters.length > 0;
  const activeFilterCount = Number(normalizedSearchQuery.length > 0) + Number(selectedCatId !== null) + detailFilters.length;
  const searchPlaceholder = getSearchPlaceholder(filterMode);
  const emptyRegionTitle =
    activeRegions.length === 0
      ? isSharedMode
        ? '아직 공유 기록이 없어요'
        : '아직 내 발견 지역이 없어요'
      : '조건에 맞는 기록이 없어요';
  const emptyRegionText =
    activeRegions.length === 0
      ? isSharedMode
        ? '공개 가능한 고양이 기록이 쌓이면 동네 단위로 표시돼요.'
        : '고양이를 등록하거나 다시 만나면 내 발견 지도가 채워져요.'
      : '다른 지역이나 고양이 이름으로 다시 찾아보세요.';

  const snapSheet = useCallback(
    (expanded: boolean) => {
      setIsSheetExpanded(expanded);
      Animated.spring(sheetProgress, {
        toValue: expanded ? 1 : 0,
        damping: 22,
        stiffness: 220,
        mass: 0.8,
        useNativeDriver: false,
      }).start();
    },
    [sheetProgress],
  );

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderGrant: () => {
          sheetProgress.stopAnimation();
        },
        onPanResponderMove: (_, gesture) => {
          const baseProgress = isSheetExpanded ? 1 : 0;
          const nextProgress = Math.min(1, Math.max(0, baseProgress - gesture.dy / sheetTravel));

          sheetProgress.setValue(nextProgress);
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

          const baseProgress = isSheetExpanded ? 1 : 0;
          const nextProgress = Math.min(1, Math.max(0, baseProgress - gesture.dy / sheetTravel));

          snapSheet(nextProgress > 0.45);
        },
        onPanResponderTerminate: () => {
          snapSheet(isSheetExpanded);
        },
      }),
    [isSheetExpanded, sheetProgress, sheetTravel, snapSheet],
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

  useEffect(() => {
    setFilterMode('전체');
    setSearchQuery('');
    setSelectedCatId(null);
    setDetailFilters([]);
    setIsFilterSheetOpen(false);
    setSelectedRegion(null);
    snapSheet(false);
  }, [mapMode, snapSheet]);

  const handleResetFilters = () => {
    setFilterMode('전체');
    setSearchQuery('');
    setSelectedCatId(null);
    setDetailFilters([]);
  };

  const handleToggleDetailFilter = (option: DetailFilterOption) => {
    setDetailFilters((current) =>
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option],
    );
  };

  const handleSelectCat = (cat: MapCatOption) => {
    setFilterMode('고양이별');
    setSelectedCatId(cat.id);
    setSelectedRegion(activeRegions.find((region) => region.id === cat.regionId) ?? null);
    snapSheet(true);
  };

  const handleOpenCat = (cat: MapCatOption) => {
    if (isSharedMode || !onOpenCat) {
      handleSelectCat(cat);
      return;
    }

    onOpenCat(cat.id);
  };

  return (
    <View style={styles.screen}>
      <KakaoMapView
        onSelectRegion={setSelectedRegion}
        regions={shouldShowSharedPaywall ? regions : displayRegions}
        selectedRegionId={shouldShowSharedPaywall ? null : selectedRegion?.id ?? null}
        style={styles.fullMap}
      />
      {shouldShowSharedPaywall ? <View style={styles.mapDim} /> : null}

      <View style={styles.header}>
        <View style={styles.mapModeSwitch}>
          {mapModes.map((mode) => {
            const isSelected = mapMode === mode;
            const Icon = mode === 'shared' ? Users : PawPrint;

            return (
              <Pressable
                key={mode}
                accessibilityLabel={`${getMapModeLabel(mode)} 보기`}
                onPress={() => setMapMode(mode)}
                style={({ pressed }) => [styles.mapModeButton, isSelected && styles.mapModeButtonActive, pressed && styles.pressed]}
              >
                <Icon color={isSelected ? theme.colors.surface : theme.colors.primaryDark} size={15} />
                <Text style={[styles.mapModeButtonText, isSelected && styles.mapModeButtonTextActive]}>{getMapModeLabel(mode)}</Text>
                {mode === 'shared' && !hasSharedMapAccess ? <Lock color={isSelected ? theme.colors.surface : theme.colors.mutedText} size={13} /> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{headerTitle}</Text>
            <Text style={styles.subtitle}>{headerSubtitle}</Text>
          </View>
          <View style={styles.headerActions}>
            {shouldShowSharedPaywall ? null : (
              <Pressable
                accessibilityLabel="지도 필터 열기"
                onPress={() => setIsFilterSheetOpen(true)}
                style={({ pressed }) => [
                  styles.filterButton,
                  isFilterSheetOpen || hasActiveFilters ? styles.filterButtonActive : null,
                  pressed && styles.pressed,
                ]}
              >
                <Filter color={isFilterSheetOpen || hasActiveFilters ? '#FFF8F0' : theme.colors.primaryDark} size={18} />
                {activeFilterCount > 0 ? (
                  <View style={styles.filterCountBadge}>
                    <Text style={styles.filterCountText}>{activeFilterCount}</Text>
                  </View>
                ) : null}
              </Pressable>
            )}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{shouldShowSharedPaywall ? sharedMapPriceLabel : recordLabel}</Text>
            </View>
          </View>
        </View>
      </View>

      {shouldShowSharedPaywall ? (
        <View
          style={[
            styles.paywallPanel,
            {
              bottom: Math.max(insets.bottom, theme.spacing.md) + bottomSheetTabClearance,
            },
          ]}
        >
          <ScrollView contentContainerStyle={styles.paywallContent} showsVerticalScrollIndicator={false}>
            <View style={styles.paywallIcon}>
              <Lock color={theme.colors.primaryDark} size={24} />
            </View>
            <Text style={styles.paywallKicker}>공유지도 평생 이용권</Text>
            <Text style={styles.paywallTitle}>동네 사람들이 만난 고양이까지 한 지도에서 보기</Text>
            <Text style={styles.paywallText}>정확한 위치는 공개하지 않고, 지역 단위 기록과 고양이 목록만 보여줘요.</Text>

            <View style={styles.paywallFeatureList}>
              <View style={styles.paywallFeature}>
                <Users color={theme.colors.accent} size={18} />
                <Text style={styles.paywallFeatureText}>다른 사용자들의 공개 수집 기록</Text>
              </View>
              <View style={styles.paywallFeature}>
                <ShieldCheck color={theme.colors.accent} size={18} />
                <Text style={styles.paywallFeatureText}>동네 단위로 흐린 위치 표시</Text>
              </View>
              <View style={styles.paywallFeature}>
                <CreditCard color={theme.colors.accent} size={18} />
                <Text style={styles.paywallFeatureText}>평생 이용권 {sharedMapPriceLabel}</Text>
              </View>
            </View>

            <Pressable
              accessibilityLabel="공유지도 평생 이용권 구매"
              disabled={isSharedMapPurchasePending}
              onPress={onStartSharedMapPurchase}
              style={({ pressed }) => [
                styles.purchaseButton,
                isSharedMapPurchasePending && styles.purchaseButtonDisabled,
                pressed && styles.pressed,
              ]}
            >
              {isSharedMapPurchasePending ? <ActivityIndicator color={theme.colors.surface} size="small" /> : <CreditCard color={theme.colors.surface} size={18} />}
              <Text style={styles.purchaseButtonText}>{isSharedMapPurchasePending ? '결제 연결 중' : '평생 이용권 구매하기'}</Text>
            </Pressable>

            {onRestoreSharedMapPurchase ? (
              <Pressable
                accessibilityLabel="공유지도 구매 복원"
                disabled={isSharedMapPurchasePending}
                onPress={onRestoreSharedMapPurchase}
                style={({ pressed }) => [styles.restorePurchaseButton, isSharedMapPurchasePending && styles.purchaseButtonDisabled, pressed && styles.pressed]}
              >
                <Text style={styles.restorePurchaseButtonText}>구매 복원</Text>
              </Pressable>
            ) : null}

            <Pressable accessibilityLabel="개인지도로 돌아가기" onPress={() => setMapMode('private')} style={({ pressed }) => [styles.secondaryMapButton, pressed && styles.pressed]}>
              <Text style={styles.secondaryMapButtonText}>개인지도로 돌아가기</Text>
            </Pressable>
          </ScrollView>
        </View>
      ) : null}

      {!shouldShowSharedPaywall ? (
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              bottom: Math.max(insets.bottom, theme.spacing.md) + bottomSheetTabClearance,
              height: animatedSheetHeight,
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

          <View style={styles.filterModeRow}>
            {filterModes.map((mode) => {
              const isSelected = filterMode === mode;

              return (
                <Pressable
                  key={mode}
                  accessibilityLabel={`${mode} 보기`}
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

          {displayRegions.length === 0 ? (
            <View style={styles.emptyRegion}>
              <Text style={styles.emptyRegionTitle}>{emptyRegionTitle}</Text>
              <Text style={styles.emptyRegionText}>{emptyRegionText}</Text>
            </View>
          ) : (
            <>
              <View style={styles.selectedRegionSummary}>
                <View style={styles.selectedRegionText}>
                  <Text style={styles.regionKicker}>{filterMode === '고양이별' ? '고양이별 보기' : isSharedMode ? '공유 발견 지역' : '내 발견 지역'}</Text>
                  <Text numberOfLines={1} style={styles.regionTitle}>
                    {filterMode === '고양이별' ? `${sheetCats.length}마리 고양이` : selectedRegion?.name ?? '선택된 지역'}
                  </Text>
                </View>
                <View style={styles.regionCountPill}>
                  <Text style={styles.regionCount}>
                    {recordLabel} {sheetCats.length}마리
                  </Text>
                </View>
              </View>

              {sheetCats.length ? (
                <ScrollView
                  contentContainerStyle={styles.catList}
                  showsVerticalScrollIndicator={false}
                  style={styles.catListScroll}
                >
                  {previewCats.map((cat) => {
                    const isSelected = cat.id === selectedCatId;

                    return (
                      <Pressable
                        key={cat.key}
                        accessibilityLabel={`${cat.name} 상세 보기`}
                        onPress={() => handleOpenCat(cat)}
                        style={({ pressed }) => [styles.catListItem, isSelected && styles.catListItemSelected, pressed && styles.pressed]}
                      >
                        <View style={styles.catListAvatar}>
                          {cat.imageUrl ? (
                            <Image resizeMode="cover" source={{ uri: cat.imageUrl }} style={styles.catAvatarImage} />
                          ) : (
                            <PawPrint color={theme.colors.primaryDark} size={20} />
                          )}
                        </View>
                        <View style={styles.catListCopy}>
                          <Text numberOfLines={1} style={styles.catListName}>{cat.name}</Text>
                          <View style={styles.catMetaRow}>
                            <MapPin color={theme.colors.mutedText} size={13} />
                            <Text numberOfLines={1} style={styles.catMetaText}>{cat.regionName}</Text>
                          </View>
                        </View>
                        <View style={styles.catStatusPill}>
                          <Text style={styles.catStatusText}>{cat.imageUrl ? '사진 있음' : '기록 있음'}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={styles.emptyCatList}>
                  <Text style={styles.emptyRegionTitle}>조건에 맞는 고양이가 없어요</Text>
                  <Text style={styles.emptyRegionText}>상세 필터를 줄이거나 다른 지역을 선택해보세요.</Text>
                </View>
              )}
            </>
          )}
        </Animated.View>
      ) : null}

      <Modal
        animationType="fade"
        onRequestClose={() => setIsFilterSheetOpen(false)}
        transparent
        visible={isFilterSheetOpen}
      >
        <View style={styles.filterModal}>
          <Pressable accessibilityLabel="지도 필터 닫기" onPress={() => setIsFilterSheetOpen(false)} style={styles.filterBackdrop} />
          <View style={[styles.filterSheetModal, { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.filterSheetHeader}>
              <View style={styles.filterHeaderIcon}>
                <SlidersHorizontal color={theme.colors.primaryDark} size={18} />
              </View>
              <Text style={styles.filterSheetTitle}>지도 필터</Text>
              <Pressable accessibilityLabel="지도 필터 초기화" onPress={handleResetFilters} style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}>
                <Text style={styles.resetButtonText}>초기화</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.filterSheetContent} showsVerticalScrollIndicator={false}>
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
                {searchQuery ? (
                  <Pressable accessibilityLabel="검색어 지우기" onPress={() => setSearchQuery('')} style={styles.clearFilterButton}>
                    <X color={theme.colors.primaryDark} size={16} />
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>지역</Text>
                <View style={styles.filterChipGrid}>
                  {displayRegions.map((region) => {
                    const isSelected = region.id === selectedRegion?.id;

                    return (
                      <Pressable
                        key={region.id}
                        onPress={() => {
                          setFilterMode('지역별');
                          setSelectedCatId(null);
                          setSelectedRegion(region);
                        }}
                        style={({ pressed }) => [styles.filterOptionChip, isSelected && styles.filterOptionChipActive, pressed && styles.pressed]}
                      >
                        {isSelected ? <Check color={theme.colors.surface} size={14} /> : null}
                        <Text numberOfLines={1} style={[styles.filterOptionText, isSelected && styles.filterOptionTextActive]}>
                          {region.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>고양이</Text>
                <View style={styles.filterChipGrid}>
                  {allCatOptions.slice(0, 10).map((cat) => {
                    const isSelected = cat.id === selectedCatId;

                    return (
                      <Pressable
                        key={cat.key}
                        onPress={() => handleSelectCat(cat)}
                        style={({ pressed }) => [styles.filterCatChip, isSelected && styles.filterOptionChipActive, pressed && styles.pressed]}
                      >
                        <View style={styles.filterCatAvatar}>
                          {cat.imageUrl ? (
                            <Image resizeMode="cover" source={{ uri: cat.imageUrl }} style={styles.catAvatarImage} />
                          ) : (
                            <PawPrint color={isSelected ? theme.colors.surface : theme.colors.primaryDark} size={14} />
                          )}
                        </View>
                        <Text numberOfLines={1} style={[styles.filterOptionText, isSelected && styles.filterOptionTextActive]}>
                          {cat.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>기록 조건</Text>
                <View style={styles.filterChipGrid}>
                  {detailFilterOptions.map((option) => {
                    const isSelected = detailFilters.includes(option);

                    return (
                      <Pressable
                        key={option}
                        onPress={() => handleToggleDetailFilter(option)}
                        style={({ pressed }) => [styles.filterOptionChip, isSelected && styles.filterOptionChipActive, pressed && styles.pressed]}
                      >
                        {isSelected ? <Check color={theme.colors.surface} size={14} /> : null}
                        <Text style={[styles.filterOptionText, isSelected && styles.filterOptionTextActive]}>{getDetailFilterLabel(option)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <Pressable
              accessibilityLabel="지도 필터 결과 보기"
              onPress={() => {
                setIsFilterSheetOpen(false);
                snapSheet(true);
              }}
              style={({ pressed }) => [styles.filterApplyButton, pressed && styles.pressed]}
            >
              <Text style={styles.filterApplyButtonText}>결과 보기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  mapDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(74, 52, 40, 0.28)',
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
    gap: theme.spacing.sm,
  },
  mapModeSwitch: {
    minHeight: 38,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    borderRadius: 19,
    padding: 3,
    backgroundColor: 'rgba(255, 248, 236, 0.86)',
    borderWidth: 1,
    borderColor: '#EAD9C4',
  },
  mapModeButton: {
    flex: 1,
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 16,
    paddingHorizontal: theme.spacing.sm,
  },
  mapModeButtonActive: {
    backgroundColor: theme.colors.primaryDark,
  },
  mapModeButtonText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  mapModeButtonTextActive: {
    color: theme.colors.surface,
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
  paywallPanel: {
    position: 'absolute',
    top: 158,
    right: 0,
    left: 0,
    alignItems: 'stretch',
    overflow: 'hidden',
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    backgroundColor: mapDockSurface,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(139, 112, 83, 0.18)',
  },
  paywallContent: {
    padding: theme.spacing.xl,
  },
  paywallIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: '#B9C59A',
  },
  paywallKicker: {
    marginTop: theme.spacing.md,
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '900',
  },
  paywallTitle: {
    marginTop: theme.spacing.xs,
    color: theme.colors.text,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '900',
  },
  paywallText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  paywallFeatureList: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  paywallFeature: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  paywallFeatureText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  purchaseButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primaryDark,
  },
  purchaseButtonDisabled: {
    opacity: 0.72,
  },
  purchaseButtonText: {
    color: theme.colors.surface,
    fontSize: 15,
    fontWeight: '900',
  },
  restorePurchaseButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(255, 253, 246, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(139, 112, 83, 0.18)',
  },
  restorePurchaseButtonText: {
    color: theme.colors.primaryDark,
    fontSize: 14,
    fontWeight: '900',
  },
  secondaryMapButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.accentSoft,
  },
  secondaryMapButtonText: {
    color: theme.colors.primaryDark,
    fontSize: 14,
    fontWeight: '900',
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
    right: 0,
    left: 0,
    overflow: 'hidden',
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingTop: theme.spacing.md,
    paddingRight: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    paddingLeft: theme.spacing.lg,
    backgroundColor: mapDockSurface,
    borderWidth: 1,
    borderBottomWidth: 0,
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
    alignSelf: 'center',
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
    marginBottom: theme.spacing.md,
  },
  filterModeChip: {
    flex: 1,
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
    minHeight: 118,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  emptyCatList: {
    minHeight: 88,
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
    marginBottom: theme.spacing.sm,
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
  catListScroll: {
    flex: 1,
    minHeight: 78,
  },
  catList: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
  },
  catListItem: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(255, 253, 246, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(230, 211, 183, 0.92)',
  },
  catListItemSelected: {
    backgroundColor: 'rgba(221, 232, 200, 0.74)',
    borderColor: '#B9C59A',
  },
  catListAvatar: {
    width: 50,
    height: 50,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 25,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  catListCopy: {
    flex: 1,
    minWidth: 0,
  },
  catListName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  catMetaRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  catMetaText: {
    flex: 1,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
  },
  catStatusPill: {
    flexShrink: 0,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    backgroundColor: theme.colors.badge,
    borderWidth: 1,
    borderColor: 'rgba(191,120,72,0.18)',
  },
  catStatusText: {
    color: theme.colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
  },
  filterModal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  filterBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(45, 36, 27, 0.48)',
  },
  filterSheetModal: {
    maxHeight: '78%',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    backgroundColor: 'rgba(255, 248, 236, 0.99)',
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(139, 112, 83, 0.18)',
  },
  filterSheetHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  filterHeaderIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: theme.colors.badge,
    borderWidth: 1,
    borderColor: 'rgba(191,120,72,0.2)',
  },
  filterSheetTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  resetButton: {
    minWidth: 54,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  resetButtonText: {
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '800',
  },
  filterSheetContent: {
    gap: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
  },
  filterSection: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(230, 211, 183, 0.82)',
  },
  filterSectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  filterChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  filterOptionChip: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 21,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255, 253, 246, 0.74)',
    borderWidth: 1,
    borderColor: '#EAD9C4',
  },
  filterCatChip: {
    maxWidth: '48%',
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderRadius: 21,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: 'rgba(255, 253, 246, 0.74)',
    borderWidth: 1,
    borderColor: '#EAD9C4',
  },
  filterOptionChipActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  filterOptionText: {
    minWidth: 0,
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  filterOptionTextActive: {
    color: theme.colors.surface,
  },
  filterCatAvatar: {
    width: 26,
    height: 26,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 13,
    backgroundColor: theme.colors.accentSoft,
  },
  filterApplyButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primaryDark,
  },
  filterApplyButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '900',
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
