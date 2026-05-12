import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/shared/components/Card';
import { SectionHeader } from '@/shared/components/SectionHeader';
import type { Region } from '@/shared/types/region';
import { KakaoMapView } from '@/features/map/components/KakaoMapView';
import { RegionCatList } from '@/features/map/components/RegionCatList';
import { theme } from '@/shared/styles/theme';

interface MapScreenProps {
  regions: Region[];
}

export function MapScreen({ regions }: MapScreenProps) {
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(regions[0] ?? null);

  return (
    <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>발견 지역</Text>
        </View>
        <Text style={styles.title}>지도 기록</Text>
        <Text style={styles.subtitle}>길고양이 보호를 위해 정확한 위치는 공개하지 않아요.</Text>
      </View>

      <KakaoMapView onSelectRegion={setSelectedRegion} regions={regions} selectedRegionId={selectedRegion?.id ?? null} />

      {selectedRegion ? (
        <Card style={styles.selectedRegionCard}>
          <Text style={styles.regionKicker}>선택된 지역</Text>
          <View style={styles.regionHeader}>
            <Text style={styles.regionTitle}>{selectedRegion.name}</Text>
            <Text style={styles.regionCount}>{selectedRegion.cats.length}마리</Text>
          </View>
          <View style={styles.regionList}>
            {selectedRegion.cats.map((cat) => (
              <View key={`${selectedRegion.id}-${cat}`} style={styles.regionTag}>
                <Text style={styles.regionTagText}>{cat}</Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="지역별 고양이 리스트" />
        <RegionCatList onSelectRegion={setSelectedRegion} regions={regions} selectedRegionId={selectedRegion?.id ?? null} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: 140,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#916B53',
  },
  title: {
    marginTop: theme.spacing.md,
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.mutedText,
  },
  selectedRegionCard: {
    marginTop: theme.spacing.lg,
  },
  regionKicker: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B6956',
  },
  regionHeader: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  regionTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
  regionCount: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.mutedText,
  },
  regionList: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  section: {
    marginTop: theme.spacing.xl,
  },
});
