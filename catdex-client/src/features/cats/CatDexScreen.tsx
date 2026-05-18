import { useMemo, useState } from 'react';
import { Filter } from 'lucide-react-native';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CatGrid } from '@/features/cats/components/CatGrid';
import { Chip } from '@/shared/components/Chip';
import { ProgressBar } from '@/shared/components/ProgressBar';
import { SectionHeader } from '@/shared/components/SectionHeader';
import { catFilters } from '@/shared/data/cats.mock';
import type { Cat, CatFilter, DexPlaceholder, DexProgress } from '@/shared/types/cat';
import { theme } from '@/shared/styles/theme';

interface CatDexScreenProps {
  cats: Cat[];
  placeholders: DexPlaceholder[];
  progress: DexProgress;
  onOpenCat: (catId: string) => void;
}

export function CatDexScreen({ cats, placeholders, progress, onOpenCat }: CatDexScreenProps) {
  const [selectedFilter, setSelectedFilter] = useState<CatFilter>('전체');

  const items = useMemo(() => {
    const discoveredItems = cats.map((cat) => ({
      id: cat.id,
      catId: cat.id,
      number: cat.number,
      name: cat.name,
      type: cat.type,
      rarity: cat.rarity,
      encounterCount: cat.encounterCount,
      imageUrl: cat.imageUrl,
      discovered: true,
    }));
    const lockedItems = placeholders.map((placeholder) => ({
      id: placeholder.id,
      number: placeholder.number,
      name: placeholder.clueTitle,
      type: placeholder.type,
      rarity: placeholder.rarity,
      encounterCount: 0,
      clue: placeholder.clue,
      regionHint: placeholder.regionHint,
      timeHint: placeholder.timeHint,
      unlockHint: placeholder.unlockHint,
      discovered: false,
    }));

    return [...discoveredItems, ...lockedItems]
      .sort((left, right) => left.number - right.number)
      .filter((item) => {
        if (selectedFilter === '전체') {
          return true;
        }

        if (selectedFilter === '희귀') {
          return item.rarity >= 4;
        }

        return item.type === selectedFilter;
      });
  }, [cats, placeholders, selectedFilter]);

  return (
    <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>수집 진행률</Text>
          </View>
          <Text style={styles.title}>고양이 도감</Text>
          <Text style={styles.subtitle}>발견한 고양이를 카드처럼 모아보세요.</Text>
        </View>
        <View style={styles.progressCard}>
          <Text style={styles.progressLabel}>수집 현황</Text>
          <Text style={styles.progressValue}>
            {progress.collected} / {progress.total}
          </Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>도감 완성도</Text>
          <Text style={styles.progressMeta}>희귀 냥이 {cats.filter((cat) => cat.rarity >= 4).length}마리 발견</Text>
        </View>
        <ProgressBar indicatorColor="#C9804C" value={(progress.collected / progress.total) * 100} />
      </View>

      <View style={styles.section}>
        <SectionHeader action={<Filter color={theme.colors.mutedText} size={16} />} title="필터" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {catFilters.map((filter) => (
              <Chip key={filter} onPress={() => setSelectedFilter(filter)} selected={selectedFilter === filter}>
                {filter}
              </Chip>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <SectionHeader subtitle={`${items.length}장의 카드`} title={selectedFilter === '전체' ? '전체 도감' : `${selectedFilter} 필터`} />
        <CatGrid
          items={items}
          onOpenCat={onOpenCat}
          onOpenSightingLocation={(item) => {
            Alert.alert('목격 정보', `출몰 위치: ${item.regionName}\n털 색상: ${item.type} 계열`);
          }}
        />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
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
    color: theme.colors.mutedText,
  },
  progressCard: {
    minWidth: 96,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: '#4B3426',
  },
  progressLabel: {
    fontSize: 12,
    color: '#F0DCC9',
  },
  progressValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF6ED',
  },
  progressSection: {
    marginTop: theme.spacing.xl,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  progressHeader: {
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8C6A58',
  },
  progressMeta: {
    fontSize: 12,
    color: '#A66C41',
  },
  section: {
    marginTop: theme.spacing.xl,
  },
  filterRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.lg,
  },
});
