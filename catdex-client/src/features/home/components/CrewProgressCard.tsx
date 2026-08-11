import { PawPrint } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { nd, theme } from '@/shared/styles/theme';
import type { CrewStatus } from '@/shared/api/crew.api';

interface CrewProgressCardProps {
  status: CrewStatus;
}

/** 다음 직책까지의 진행률. 최고 직책이면 1. */
function getProgress(status: CrewStatus) {
  if (!status.nextThreshold) {
    return 1;
  }

  return Math.min(1, Math.max(0, status.peak / status.nextThreshold));
}

/** 승급 진행도. 지금 몇 마리인지와 다음 직책까지 몇 마리 남았는지를 보여준다. */
export function CrewProgressCard({ status }: CrewProgressCardProps) {
  const remaining = status.nextThreshold ? Math.max(0, status.nextThreshold - status.peak) : 0;
  const progress = getProgress(status);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.countRow}>
          <PawPrint color={theme.colors.accent} size={20} strokeWidth={2} />
          <Text style={styles.count}>{status.collected}</Text>
          <Text style={styles.countUnit}>마리</Text>
        </View>
        <View style={styles.rankChip}>
          <Text style={styles.rankChipText}>{status.rank}</Text>
        </View>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>

      <Text style={styles.caption}>
        {status.nextRank
          ? `${status.nextRank}까지 ${remaining}마리 남았어요.`
          : '최고 직책이에요. 계속 모아 보세요!'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: nd.colors.bgSecondary,
    padding: 20,
    gap: 12,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // 발바닥은 텍스트 베이스라인이 없어 baseline 정렬을 쓰면 아래로 처진다.
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  count: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.7,
    color: nd.colors.ink,
  },
  countUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: nd.colors.sub,
  },
  rankChip: {
    borderRadius: nd.radius.pill,
    backgroundColor: theme.colors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rankChipText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.325,
    color: theme.colors.accent,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: nd.colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
  },
  caption: {
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.325,
    color: nd.colors.sub,
  },
});
