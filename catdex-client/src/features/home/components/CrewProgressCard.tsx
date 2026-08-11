import { CheckCircle2, PawPrint, RefreshCw } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CrewStatus } from '@/shared/api/crew.api';
import { nd } from '@/shared/styles/theme';

interface CrewProgressCardProps {
  status: CrewStatus;
}

const colors = {
  accent: '#E07C33',
  accentSoft: '#FBEADC',
  divider: '#EDEBE8',
};

/** 다음 직책까지의 진행률. 최고 직책이면 1. */
function getProgress(status: CrewStatus) {
  if (!status.nextThreshold) {
    return 1;
  }

  return Math.min(1, Math.max(0, status.peak / status.nextThreshold));
}

/** 항목 제목 앞에 붙는 동그란 발바닥 배지 */
function RowLabel({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <View style={styles.rowLabel}>
      <View style={styles.badge}>{icon}</View>
      <Text style={styles.rowLabelText}>{text}</Text>
    </View>
  );
}

/**
 * 인사고과 카드.
 *
 * 사용자를 회사원, 고양이를 고객으로 두는 은유를 따른다. 출근은 연속이 아니라
 * 누적이라 하루 걸러도 줄지 않는다(길고양이는 매일 만날 수 있는 대상이 아니다).
 */
export function CrewProgressCard({ status }: CrewProgressCardProps) {
  const remaining = status.nextThreshold ? Math.max(0, status.nextThreshold - status.peak) : 0;
  const progress = getProgress(status);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.topCell}>
          <RowLabel icon={<PawPrint color={colors.accent} size={13} strokeWidth={2.4} />} text="출근" />
          <View style={styles.metricRow}>
            <Text style={styles.metric}>{status.attendanceDays}</Text>
            <Text style={styles.metricUnit}>일</Text>
          </View>
          <View style={styles.checkRow}>
            <CheckCircle2 color={colors.accent} size={14} strokeWidth={2.4} />
            <Text style={styles.checkText}>오늘 출근 완료</Text>
          </View>
        </View>

        <View style={styles.topDivider} />

        <View style={styles.topCell}>
          <RowLabel icon={<PawPrint color={colors.accent} size={13} strokeWidth={2.4} />} text="수집" />
          <View style={styles.metricRow}>
            <Text style={styles.metric}>{status.collected}</Text>
            <Text style={styles.metricUnit}>마리</Text>
            <View style={styles.rankChip}>
              <Text style={styles.rankChipText}>{status.rank}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <RowLabel icon={<PawPrint color={colors.accent} size={13} strokeWidth={2.4} />} text="승진 진행" />
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Text style={styles.caption}>
          {status.nextRank
            ? `${status.nextRank} 승진까지 ${remaining}마리 남았어요.`
            : '더 오를 곳이 없습니다. 축하드립니다, 대표님.'}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.reunionRow}>
        <RowLabel icon={<RefreshCw color={colors.accent} size={13} strokeWidth={2.4} />} text="재회 관리" />
        <Text numberOfLines={1} style={styles.reunionText}>
          {status.topReunionCat
            ? `${status.topReunionCat} 고객 ${status.topReunionCount}회 재회`
            : '아직 다시 만난 고객이 없어요'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: nd.colors.bgSecondary,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  topCell: {
    flex: 1,
    gap: 6,
  },
  topDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: 14,
    backgroundColor: colors.divider,
  },
  rowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  badge: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
  },
  rowLabelText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metric: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.7,
    color: nd.colors.ink,
  },
  metricUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: nd.colors.sub,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  checkText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.325,
    color: colors.accent,
  },
  rankChip: {
    marginLeft: 'auto',
    borderRadius: nd.radius.pill,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rankChipText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.accent,
  },
  divider: {
    height: 1,
    marginVertical: 14,
    backgroundColor: colors.divider,
  },
  section: {
    gap: 9,
  },
  track: {
    height: 9,
    borderRadius: 5,
    backgroundColor: '#E6E3DF',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  caption: {
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.325,
    color: nd.colors.sub,
  },
  reunionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  reunionText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.325,
    color: nd.colors.ink,
  },
});
