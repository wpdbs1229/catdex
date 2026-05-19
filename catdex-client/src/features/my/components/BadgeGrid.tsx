import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/shared/components/Card';
import type { Badge } from '@/shared/types/badge';
import { theme } from '@/shared/styles/theme';

const badgeIconMap: Record<string, string> = {
  'first-cat': '🐾',
  'cheese-five': '🧀',
  'rediscovery-five': '🔁',
  'night-walk': '🌙',
};

interface BadgeGridProps {
  badges: Badge[];
}

export function BadgeGrid({ badges }: BadgeGridProps) {
  return (
    <View style={styles.grid}>
      {badges.map((badge) => (
        <Card key={badge.id} style={styles.card}>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>{badgeIconMap[badge.id] ?? '🏅'}</Text>
          </View>
          <Text style={styles.name}>{badge.name}</Text>
          <Text style={styles.description}>{badge.description}</Text>
          {badge.achievedAt ? <Text style={styles.date}>{badge.achievedAt}</Text> : null}
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48.5%',
    marginBottom: theme.spacing.md,
    backgroundColor: 'rgba(255, 253, 246, 0.9)',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.badge,
    borderWidth: 1,
    borderColor: 'rgba(201, 121, 73, 0.14)',
  },
  icon: {
    fontSize: 28,
  },
  name: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  description: {
    marginTop: theme.spacing.sm,
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.mutedText,
  },
  date: {
    marginTop: theme.spacing.md,
    fontSize: 12,
    color: theme.colors.mutedText,
  },
});
