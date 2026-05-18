import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Region } from '@/shared/types/region';
import { KakaoMapView } from '@/features/map/components/KakaoMapView';
import { theme } from '@/shared/styles/theme';

interface MapScreenProps {
  regions: Region[];
}

export function MapScreen({ regions }: MapScreenProps) {
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(regions[0] ?? null);

  return (
    <View style={styles.screen}>
      <KakaoMapView
        onSelectRegion={setSelectedRegion}
        regions={regions}
        selectedRegionId={selectedRegion?.id ?? null}
        style={styles.fullMap}
      />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>공유 도감 지도</Text>
            <Text style={styles.subtitle}>동네 단위의 공개 발견만 보여줘요. 정확한 위치는 저장하지 않아요.</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>공유 지역</Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomSheet}>
        {selectedRegion ? (
          <View style={styles.selectedRegionSummary}>
            <View style={styles.selectedRegionText}>
              <Text style={styles.regionKicker}>공유 발견 지역</Text>
              <Text numberOfLines={1} style={styles.regionTitle}>
                {selectedRegion.name}
              </Text>
            </View>
            <Text style={styles.regionCount}>공유 {selectedRegion.cats.length}마리</Text>
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
            {regions.map((region) => {
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
                  <Text style={[styles.regionPillCount, isSelected && styles.regionPillTextSelected]}>공유 {region.cats.length}마리</Text>
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
    top: theme.spacing.lg,
    right: theme.spacing.lg,
    left: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.88)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#916B53',
  },
  title: {
    fontSize: 22,
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
    right: theme.spacing.lg,
    bottom: 112,
    left: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.96)',
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
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.mutedText,
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
    backgroundColor: '#FFF7EF',
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
    minWidth: 142,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: '#EAD9C4',
  },
  regionPillSelected: {
    backgroundColor: '#F8ECD9',
    borderColor: '#D8B990',
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
