import { Footprints, Sparkles, Target } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/shared/components/Card';
import type { HomeSummary } from '@/shared/types/cat';
import { theme } from '@/shared/styles/theme';

interface TodaySummaryCardProps {
  summary: HomeSummary;
}

export function TodaySummaryCard({ summary }: TodaySummaryCardProps) {
  const items = [
    { label: '오늘 동네 기록', value: `${summary.sharedTodayDiscovered}마리`, icon: Target },
    { label: '내 도감 수집', value: `${summary.myTotalCollected}마리`, icon: Footprints },
    { label: '동네 기록 전체', value: `${summary.sharedTotalCats}마리`, icon: Sparkles },
    { label: '내 최근 재발견', value: summary.recentMyRediscovered, icon: Footprints },
  ];

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>오늘의 도감 요약</Text>
          <Text style={styles.title}>내 수집과 동네 기록을 따로 보여줘요</Text>
        </View>
        <View style={styles.pawBadge}>
          <Text style={styles.pawEmoji}>🐾</Text>
        </View>
      </View>
      <View style={styles.grid}>
        {items.map(({ label, value, icon: Icon }) => (
          <View key={label} style={styles.statCard}>
            <Icon color="#9A6A42" size={16} />
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.statValue}>{value}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 253, 246, 0.92)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  headerText: {
    flex: 1,
    paddingRight: theme.spacing.md,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  title: {
    marginTop: 6,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: theme.colors.text,
  },
  pawBadge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(119, 145, 95, 0.2)',
  },
  pawEmoji: {
    fontSize: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  statCard: {
    width: '48%',
    minWidth: 120,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(248, 234, 210, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(232, 211, 183, 0.8)',
  },
  statLabel: {
    marginTop: theme.spacing.sm,
    fontSize: 12,
    color: theme.colors.mutedText,
  },
  statValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
});
