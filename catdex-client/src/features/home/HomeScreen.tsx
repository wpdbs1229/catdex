import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/shared/components/Button';
import { SectionHeader } from '@/shared/components/SectionHeader';
import { TodaySummaryCard } from '@/features/home/components/TodaySummaryCard';
import { RecentCatCard } from '@/features/home/components/RecentCatCard';
import type { Cat, HomeSummary } from '@/shared/types/cat';
import { theme } from '@/shared/styles/theme';

interface HomeScreenProps {
  summary: HomeSummary;
  recentCats: Cat[];
  onOpenCat: (catId: string) => void;
  onGoCapture: () => void;
}

export function HomeScreen({ summary, recentCats, onOpenCat, onGoCapture }: HomeScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>오늘도 수집 중</Text>
          </View>
          <Text style={styles.title}>냥도감</Text>
          <Text style={styles.subtitle}>산책길에서 만난 고양이를 기록하고 나만의 도감을 완성해 보세요.</Text>
        </View>
        <View style={styles.weekCard}>
          <Text style={styles.weekLabel}>이번 주 수집</Text>
          <Text style={styles.weekValue}>+{summary.weeklyCollected}</Text>
        </View>
      </View>

      <TodaySummaryCard summary={summary} />

      <Button onPress={onGoCapture}>고양이 촬영하기</Button>

      <View style={styles.section}>
        <SectionHeader subtitle="오늘 산책에서 기록한 고양이들" title="최근 발견한 고양이" />
        {recentCats.map((cat) => (
          <RecentCatCard cat={cat} key={cat.id} onPress={() => onOpenCat(cat.id)} />
        ))}
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
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#916B53',
  },
  title: {
    marginTop: theme.spacing.md,
    fontSize: 34,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    maxWidth: 220,
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.mutedText,
  },
  weekCard: {
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: 'rgba(255,255,255,0.72)',
    minWidth: 92,
  },
  weekLabel: {
    fontSize: 12,
    color: theme.colors.mutedText,
  },
  weekValue: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  section: {
    marginTop: theme.spacing.xl,
  },
});
