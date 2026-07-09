import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/shared/components/Card';
import { ProgressBar } from '@/shared/components/ProgressBar';
import type { ExplorerProfile } from '@/shared/types/badge';
import { theme } from '@/shared/styles/theme';

interface UserLevelCardProps {
  profile: ExplorerProfile;
}

export function UserLevelCard({ profile }: UserLevelCardProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.kicker}>냥냥단 직급</Text>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{profile.title}</Text>
          <Text style={styles.rankLabel}>냥냥단 직급</Text>
        </View>
        <View style={styles.rediscoveryCard}>
          <Text style={styles.rediscoveryLabel}>이번 달 재발견</Text>
          <Text style={styles.rediscoveryValue}>{profile.rediscoveries}회</Text>
        </View>
      </View>
      <ProgressBar indicatorColor="#E7B956" trackColor="rgba(255,253,246,0.22)" value={profile.nextLevelProgress} />
      <Text style={styles.footer}>{profile.nextLevelLabel}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: '#765640',
  },
  kicker: {
    fontSize: 14,
    color: '#F1DFD0',
  },
  header: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFF7EF',
  },
  rankLabel: {
    marginTop: 4,
    fontSize: 16,
    color: '#F6E7DA',
  },
  rediscoveryCard: {
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,253,246,0.12)',
  },
  rediscoveryLabel: {
    fontSize: 12,
    color: '#F4E6D8',
  },
  rediscoveryValue: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF7EF',
  },
  footer: {
    marginTop: theme.spacing.sm,
    fontSize: 13,
    color: '#F5E8DD',
  },
});
