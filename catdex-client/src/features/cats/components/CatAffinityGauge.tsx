import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/shared/components/Card';
import { ProgressBar } from '@/shared/components/ProgressBar';
import { theme } from '@/shared/styles/theme';

interface CatAffinityGaugeProps {
  value: number;
}

export function CatAffinityGauge({ value }: CatAffinityGaugeProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>친밀도</Text>
          <Text style={styles.value}>{value}%</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>간식 기대 중</Text>
        </View>
      </View>
      <ProgressBar value={value} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: theme.colors.mutedText,
  },
  value: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    backgroundColor: '#FFF4EA',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#99674D',
  },
});
