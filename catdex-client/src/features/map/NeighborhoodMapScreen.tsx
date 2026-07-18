import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, ChevronDown, ChevronRight, ChevronUp, MapPin, PawPrint } from 'lucide-react-native';
import { NeighborhoodTopTabs } from '@/features/map/components/NeighborhoodTopTabs';
import { KakaoMapView } from '@/features/map/components/KakaoMapView';
import { formatMapRegionName } from '@/features/map/map-region-label';
import { createShadow, theme } from '@/shared/styles/theme';
import type { Cat } from '@/shared/types/cat';
import type { Region } from '@/shared/types/region';

interface NeighborhoodMapScreenProps {
  regions: Region[];
  cats: Cat[];
  neighborhoodName: string;
  onGoCapture: () => void;
  onOpenCat: (catId: string) => void;
  onOpenCommunityBoard: () => void;
  onOpenDex: () => void;
}

function getRegionCatCount(region: Region | null) {
  return region ? (region.catIds.length > 0 ? region.catIds.length : region.cats.length) : 0;
}

function getRegionCatKeys(region: Region) {
  return region.catIds.length > 0 ? region.catIds : region.cats;
}

function getRegionCats(region: Region | null, catById: Map<string, Cat>, catByName: Map<string, Cat>) {
  if (!region) {
    return [];
  }

  if (region.catIds.length > 0) {
    return region.catIds.map((catId) => catById.get(catId)).filter((cat): cat is Cat => Boolean(cat));
  }

  return region.cats.map((catName) => catByName.get(catName)).filter((cat): cat is Cat => Boolean(cat));
}

export function NeighborhoodMapScreen({
  regions,
  cats,
  neighborhoodName,
  onGoCapture,
  onOpenCat,
  onOpenCommunityBoard,
  onOpenDex,
}: NeighborhoodMapScreenProps) {
  const displayRegions = useMemo(() => regions, [regions]);
  const catById = useMemo(() => new Map(cats.map((cat) => [cat.id, cat])), [cats]);
  const catByName = useMemo(() => new Map(cats.map((cat) => [cat.name, cat])), [cats]);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(displayRegions[0] ?? null);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);

  useEffect(() => {
    if (!selectedRegion && displayRegions[0]) {
      setSelectedRegion(displayRegions[0]);
      return;
    }

    if (!selectedRegion) {
      return;
    }

    const refreshedRegion = displayRegions.find((region) => region.id === selectedRegion.id);

    if (!refreshedRegion) {
      setSelectedRegion(displayRegions[0] ?? null);
      return;
    }

    // 같은 구역이라도 데이터가 새로 로드되면 시트 내용(고양이 수/목록)이
    // 낡은 객체를 계속 보여주지 않도록 최신 객체로 교체한다.
    if (refreshedRegion !== selectedRegion) {
      setSelectedRegion(refreshedRegion);
    }
  }, [displayRegions, selectedRegion]);

  useEffect(() => {
    setIsSheetExpanded(false);
  }, [selectedRegion?.id]);

  const selectedRegionCats = useMemo(() => getRegionCats(selectedRegion, catById, catByName), [catById, catByName, selectedRegion]);
  const activeRegions = displayRegions.filter((region) => getRegionCatCount(region) > 0).length;
  const totalRegionCats = useMemo(() => new Set(displayRegions.flatMap(getRegionCatKeys)).size, [displayRegions]);
  const visibleRegionCats = selectedRegionCats.slice(0, 3);
  const hiddenRegionCatCount = Math.max(selectedRegionCats.length - visibleRegionCats.length, 0);

  return (
    <View style={styles.mapScreen}>
      <KakaoMapView
        onSelectRegion={setSelectedRegion}
        regions={displayRegions}
        selectedRegionId={selectedRegion?.id ?? null}
        style={styles.fullMap}
      />

      <View pointerEvents="box-none" style={styles.mapTopChrome}>
        <View style={styles.floatingTabs}>
          <NeighborhoodTopTabs
            activeTab="map"
            onOpenBoard={onOpenCommunityBoard}
            onOpenDex={onOpenDex}
            onOpenMap={() => undefined}
          />
        </View>

        <View style={styles.mapContextRow}>
          <View style={styles.locationBadge}>
            <MapPin color={theme.colors.accent} size={15} />
            <Text numberOfLines={1} style={styles.locationBadgeText}>
              {neighborhoodName}
            </Text>
          </View>
          <View style={styles.mapCountBadge}>
            <Text style={styles.mapCountText}>{activeRegions}구역</Text>
            <Text style={styles.mapCountDot}>·</Text>
            <Text style={styles.mapCountText}>{totalRegionCats}마리</Text>
          </View>
        </View>
      </View>

      <View style={[styles.mapInfoPanel, !isSheetExpanded && styles.mapInfoPanelCollapsed]}>
        <View style={styles.sheetHandle} />
        <Pressable
          accessibilityLabel={isSheetExpanded ? '선택 구역 접기' : '선택 구역 펼치기'}
          accessibilityRole="button"
          accessibilityState={{ expanded: isSheetExpanded }}
          onPress={() => setIsSheetExpanded((current) => !current)}
          style={({ pressed }) => [styles.mapInfoHeaderButton, pressed && styles.pressed]}
        >
          <View style={styles.mapInfoHeader}>
            <View style={styles.mapInfoCopy}>
              <Text style={styles.mapInfoKicker}>선택 구역</Text>
              <Text numberOfLines={1} style={styles.mapInfoTitle}>
                {selectedRegion ? formatMapRegionName(selectedRegion.name) : '구역 없음'}
              </Text>
            </View>
            <View style={styles.regionHeaderActions}>
              <View style={styles.regionCountBadge}>
                <Text style={styles.regionCountText}>{getRegionCatCount(selectedRegion)}마리</Text>
              </View>
              <View style={styles.sheetToggleIcon}>
                {isSheetExpanded ? (
                  <ChevronDown color={theme.colors.primaryDark} size={17} />
                ) : (
                  <ChevronUp color={theme.colors.primaryDark} size={17} />
                )}
              </View>
            </View>
          </View>
        </Pressable>

        {isSheetExpanded ? (
          <>
            <Text style={styles.mapInfoText}>
              {selectedRegion
                ? '정확한 좌표 대신 자주 보이는 구역만 흐리게 보여줘요.'
                : '지도에서 냥이 구역을 선택하면 이곳에 고양이 목록이 떠요.'}
            </Text>

            <View style={styles.regionCatList}>
              {visibleRegionCats.length > 0 ? (
                visibleRegionCats.map((cat) => (
                  <Pressable
                    accessibilityLabel={`${cat.name} 도감 보기`}
                    accessibilityRole="button"
                    key={cat.id}
                    onPress={() => onOpenCat(cat.id)}
                    style={({ pressed }) => [styles.regionCatChip, pressed && styles.pressed]}
                  >
                    <View style={styles.regionCatIcon}>
                      <PawPrint color={theme.colors.primaryDark} size={14} />
                    </View>
                    <View style={styles.regionCatCopy}>
                      <Text numberOfLines={1} style={styles.regionCatName}>
                        {cat.name}
                      </Text>
                      <Text numberOfLines={1} style={styles.regionCatMeta}>
                        {cat.relationshipLevel} · 최근 {cat.lastSeenAt}
                      </Text>
                    </View>
                    <ChevronRight color={theme.colors.primaryDark} size={14} />
                  </Pressable>
                ))
              ) : (
                <View style={styles.emptyRegionChip}>
                  <PawPrint color="#CDB58F" size={14} />
                  <Text style={styles.emptyRegionChipText}>아직 확인된 고양이가 없어요</Text>
                </View>
              )}

              {hiddenRegionCatCount > 0 ? (
                <Text style={styles.moreCatsText}>외 {hiddenRegionCatCount}마리는 동네 도감에서 이어서 확인할 수 있어요.</Text>
              ) : null}
            </View>

            <Pressable accessibilityLabel="고양이 기록하기" accessibilityRole="button" onPress={onGoCapture} style={({ pressed }) => [styles.captureButton, pressed && styles.pressed]}>
              <Camera color="#FFF8F0" size={17} />
              <Text style={styles.captureButtonText}>고양이 기록하기</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapScreen: {
    flex: 1,
    backgroundColor: theme.colors.mapBase,
  },
  fullMap: {
    flex: 1,
  },
  mapTopChrome: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.lg,
    left: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  floatingTabs: {
    borderRadius: 22,
    ...createShadow(7),
  },
  mapContextRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  locationBadge: {
    minWidth: 0,
    maxWidth: '54%',
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 19,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.13)',
    ...createShadow(3),
  },
  locationBadgeText: {
    flexShrink: 1,
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  mapCountBadge: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 19,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.13)',
    ...createShadow(3),
  },
  mapCountText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  mapCountDot: {
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '900',
  },
  mapInfoPanel: {
    position: 'absolute',
    right: theme.spacing.lg,
    bottom: 112,
    left: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
    ...createShadow(9),
  },
  mapInfoPanelCollapsed: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    marginBottom: theme.spacing.md,
    backgroundColor: 'rgba(139,112,83,0.24)',
  },
  mapInfoHeaderButton: {
    borderRadius: theme.radius.lg,
  },
  mapInfoHeader: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  mapInfoCopy: {
    flex: 1,
    minWidth: 0,
  },
  mapInfoKicker: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  mapInfoTitle: {
    marginTop: 3,
    color: theme.colors.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
  },
  regionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  regionCountBadge: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.accentSoft,
  },
  regionCountText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  sheetToggleIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: 'rgba(248,234,210,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  mapInfoText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
  regionCatList: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  regionCatChip: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(248,234,210,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
  },
  regionCatIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: 'rgba(255,253,246,0.72)',
  },
  regionCatCopy: {
    flex: 1,
    minWidth: 0,
  },
  regionCatName: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  regionCatMeta: {
    marginTop: 2,
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
  },
  emptyRegionChip: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  emptyRegionChipText: {
    flex: 1,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
  },
  moreCatsText: {
    color: theme.colors.mutedText,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  captureButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: 24,
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primaryDark,
    ...createShadow(4),
  },
  captureButtonText: {
    color: '#FFF8F0',
    fontSize: 13,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
  },
});
