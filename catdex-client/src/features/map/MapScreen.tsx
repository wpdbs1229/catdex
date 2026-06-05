import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Region } from '@/shared/types/region';
import { KakaoMapView } from '@/features/map/components/KakaoMapView';
import { theme } from '@/shared/styles/theme';

interface MapScreenProps {
  regions: Region[];
}

export function MapScreen({ regions }: MapScreenProps) {
  const displayRegions = useMemo(() => regions, [regions]);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(displayRegions[0] ?? null);

  useEffect(() => {
    if (!selectedRegion && displayRegions[0]) {
      setSelectedRegion(displayRegions[0]);
      return;
    }

    if (selectedRegion && !displayRegions.some((region) => region.id === selectedRegion.id)) {
      setSelectedRegion(displayRegions[0] ?? null);
    }
  }, [displayRegions, selectedRegion]);

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
          <View style={styles.badge}>
            <Text style={styles.badgeText}>내 기록</Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomSheet}>
        {displayRegions.length === 0 ? (
          <View style={styles.emptyRegion}>
            <Text style={styles.emptyRegionTitle}>아직 내 발견 지역이 없어요</Text>
            <Text style={styles.emptyRegionText}>고양이를 등록하거나 다시 만나면 내 발견 지도가 채워져요.</Text>
          </View>
        ) : selectedRegion ? (
          <View style={styles.selectedRegionSummary}>
            <View style={styles.selectedRegionText}>
              <Text style={styles.regionKicker}>내 발견 지역</Text>
              <Text numberOfLines={1} style={styles.regionTitle}>
                {selectedRegion.name}
              </Text>
            </View>
            <View style={styles.regionCountPill}>
              <Text style={styles.regionCount}>내 기록 {selectedRegion.cats.length}마리</Text>
            </View>
          </View>
        ) : null}

        {selectedRegion?.cats.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.regionList}>
              {selectedRegion.cats.map((cat) => (
                <View key={`${selectedRegion.id}-${cat}`} style={styles.regionTag}>
                  <Text style={styles.regionTagText}>{cat}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : null}

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
      </View>
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
    bottom: 104,
    left: theme.spacing.md,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255, 253, 246, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(139, 112, 83, 0.16)',
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
