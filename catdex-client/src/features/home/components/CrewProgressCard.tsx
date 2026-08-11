import { CheckCircle2, ChevronRight, PawPrint, Plane, RefreshCw } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CrewStatus } from '@/shared/api/crew.api';
import { nd } from '@/shared/styles/theme';

interface CrewProgressCardProps {
  status: CrewStatus;
  /** 출근 칸을 누르면 출근 현황으로. 나머지 칸도 갈 곳이 생기면 같은 모양으로 붙인다. */
  onPressAttendance: () => void;
  /** 승진 진행 줄을 누르면 승진 규칙 안내로 */
  onPressPromotion: () => void;
  /** 수집 칸을 누르면 그 마릿수의 실물인 '내 고객' 목록으로 */
  onPressCollection: () => void;
}

// 주황은 사원증·하단바와 같은 토큰을 쓴다(nd.colors.accent).
const colors = {
  accent: nd.colors.accent,
  accentSoft: nd.colors.primarySoft,
  divider: '#EDEBE8',
};

/**
 * 출장 줄에 쓸 한 줄.
 *
 * 위치를 믿을 수 있게 된 뒤의 기록만 세므로, 시작 직후에는 비어 있는 게 정상이다.
 * 그때 '0회'라고 쓰면 실패처럼 읽히니 아직 없다고만 말한다.
 */
function formatAway(status: CrewStatus) {
  if (status.awayEncounters === 0 || !status.awayLatestRegion) {
    return '아직 출장 기록이 없어요';
  }

  const others = status.awayRegionCount - 1;
  const place = others > 0 ? `${status.awayLatestRegion} 외 ${others}곳` : status.awayLatestRegion;

  return `${place} ${status.awayEncounters}회`;
}

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
export function CrewProgressCard({
  status,
  onPressAttendance,
  onPressPromotion,
  onPressCollection,
}: CrewProgressCardProps) {
  const remaining = status.nextThreshold ? Math.max(0, status.nextThreshold - status.peak) : 0;
  const progress = getProgress(status);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityLabel="출근 현황 보기"
          accessibilityRole="button"
          onPress={onPressAttendance}
          style={({ pressed }) => [styles.topCell, pressed && styles.pressed]}
        >
          <RowLabel icon={<PawPrint color={colors.accent} size={13} strokeWidth={2.4} />} text="출근" />
          <View style={styles.metricRow}>
            <Text style={styles.metric}>{status.attendanceDays}</Text>
            <Text style={styles.metricUnit}>일</Text>
            <ChevronRight color={nd.colors.subtle} size={16} strokeWidth={2.2} style={styles.cellChevron} />
          </View>
          <View style={styles.checkRow}>
            <CheckCircle2 color={colors.accent} size={14} strokeWidth={2.4} />
            <Text style={styles.checkText}>오늘 출근 완료</Text>
          </View>
        </Pressable>

        <View style={styles.topDivider} />

        <Pressable
          accessibilityLabel="담당 고객 목록 보기"
          accessibilityRole="button"
          onPress={onPressCollection}
          style={({ pressed }) => [styles.topCell, pressed && styles.pressed]}
        >
          <RowLabel icon={<PawPrint color={colors.accent} size={13} strokeWidth={2.4} />} text="수집" />
          <View style={styles.metricRow}>
            <Text style={styles.metric}>{status.collected}</Text>
            <Text style={styles.metricUnit}>마리</Text>
            <View style={styles.rankChip}>
              <Text style={styles.rankChipText}>{status.rank}</Text>
            </View>
            <ChevronRight color={nd.colors.subtle} size={16} strokeWidth={2.2} />
          </View>
        </Pressable>
      </View>

      <View style={styles.divider} />

      <Pressable
        accessibilityLabel="승진 규칙 보기"
        accessibilityRole="button"
        onPress={onPressPromotion}
        style={({ pressed }) => [styles.section, pressed && styles.pressed]}
      >
        <View style={styles.sectionHead}>
          <RowLabel icon={<PawPrint color={colors.accent} size={13} strokeWidth={2.4} />} text="승진 진행" />
          <View style={styles.ruleHint}>
            <Text style={styles.ruleHintText}>승진 규칙</Text>
            <ChevronRight color={nd.colors.subtle} size={14} strokeWidth={2.2} />
          </View>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Text style={styles.caption}>
          {status.nextRank
            ? `${status.nextRank} 승진까지 ${remaining}마리 남았어요.`
            : '더 오를 곳이 없습니다. 축하드립니다, 대표님.'}
        </Text>
      </Pressable>

      <View style={styles.divider} />

      <View style={styles.reunionRow}>
        <RowLabel icon={<RefreshCw color={colors.accent} size={13} strokeWidth={2.4} />} text="재회 관리" />
        <Text numberOfLines={1} style={styles.reunionText}>
          {status.topReunionCat
            ? `${status.topReunionCat} 고객 ${status.topReunionCount}회 재회`
            : '아직 다시 만난 고객이 없어요'}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.reunionRow}>
        <RowLabel icon={<Plane color={colors.accent} size={13} strokeWidth={2.4} />} text="출장 기록" />
        <Text numberOfLines={1} style={styles.reunionText}>
          {formatAway(status)}
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
  cellChevron: {
    marginLeft: 'auto',
  },
  pressed: {
    opacity: 0.6,
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
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ruleHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  ruleHintText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: nd.colors.subtle,
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
