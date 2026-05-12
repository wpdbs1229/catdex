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
    { label: '오늘 발견', value: `${summary.todayDiscovered}마리`, icon: Target },
    { label: '전체 수집', value: `${summary.totalCollected}마리`, icon: Sparkles },
    { label: '최근 다시 만남', value: summary.recentRediscovered, icon: Footprints },
  ];

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>오늘의 탐험 요약</Text>
          <Text style={styles.title}>산책 기록이 차곡차곡 쌓이고 있어요</Text>
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
    backgroundColor: '#FFF7EE',
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
    color: '#966F56',
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
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  pawEmoji: {
    fontSize: 24,
  },
  grid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,255,255,0.82)',
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
