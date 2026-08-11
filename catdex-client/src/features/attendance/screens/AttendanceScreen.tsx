import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight, PawPrint } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HomeStackParamList } from '@/app/navigation/types';
import { useGoBackOrHome } from '@/app/navigation/useGoBackOrHome';
import { useTabBarInset } from '@/app/navigation/useTabBarInset';
import { AttendanceHeader } from '@/features/attendance/components/AttendanceHeader';
import {
  progressCaption,
  statusOf,
  STATUS_LABEL,
  summarizeMonth,
  type AttendanceDayStatus,
} from '@/features/attendance/attendance.model';
import { fetchAttendanceMonth } from '@/shared/api/attendance.api';
import { nd } from '@/shared/styles/theme';
import {
  addDays,
  formatKoreanDate,
  kstToday,
  monthOf,
  type Ymd,
} from '@/shared/utils/kstDate';

/** 최근 기록에 보여 줄 날짜 수 */
const RECENT_DAYS = 3;

const CHIP_STYLE: Record<Exclude<AttendanceDayStatus, 'none'>, { bg: string; fg: string }> = {
  attended: { bg: nd.colors.primarySoft, fg: nd.colors.accent },
  overtime: { bg: nd.colors.primarySoft, fg: nd.colors.accent },
  holiday: { bg: nd.colors.field, fg: nd.colors.sub },
  upcoming: { bg: nd.colors.field, fg: nd.colors.subtle },
};

function RecentRow({ date, status }: { date: Ymd; status: AttendanceDayStatus }) {
  const label = STATUS_LABEL[status];
  const chip = status === 'none' ? null : CHIP_STYLE[status];

  return (
    <View style={styles.recentRow}>
      <Text style={styles.recentDate}>{formatKoreanDate(date)}</Text>
      {label && chip ? (
        <View style={[styles.chip, { backgroundColor: chip.bg }]}>
          {status === 'attended' || status === 'overtime' ? (
            <PawPrint color={chip.fg} size={12} strokeWidth={2.4} />
          ) : null}
          <Text style={[styles.chipText, { color: chip.fg }]}>{label}</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * 출근 현황 (시안 A. 한눈에 보기).
 *
 * 오늘 출근은 홈이 이미 남긴 뒤라서 히어로는 늘 '출근 완료'다. 이 화면은 홈을 거쳐야만
 * 열리므로 아직 출근 전인 상태가 존재하지 않는다.
 */
export function AttendanceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const goBack = useGoBackOrHome();
  const tabBarInset = useTabBarInset();
  const [attended, setAttended] = useState<Set<Ymd>>(new Set());
  const [hasFailed, setHasFailed] = useState(false);

  const today = kstToday();
  const thisMonth = useMemo(() => monthOf(today), [today]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      fetchAttendanceMonth(thisMonth)
        .then((next) => {
          if (isActive) {
            setAttended(next);
            setHasFailed(false);
          }
        })
        .catch((error: unknown) => {
          console.warn('[attendance] month load failed', error);

          if (isActive) {
            setHasFailed(true);
          }
        });

      return () => {
        isActive = false;
      };
    }, [thisMonth]),
  );

  const summary = useMemo(() => summarizeMonth(thisMonth, attended, today), [thisMonth, attended, today]);

  const recent = useMemo(
    () => Array.from({ length: RECENT_DAYS }, (_, index) => addDays(today, -index)),
    [today],
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <AttendanceHeader onBack={goBack} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarInset }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <PawPrint color={nd.colors.accent} size={34} strokeWidth={2.2} />
          </View>
          <Text style={styles.heroTitle}>오늘도 출근 완료했다냥!</Text>
          <Text style={styles.heroSub}>오늘의 출근 발도장을 꾹 남겼다냥</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={styles.badge}>
              <PawPrint color={nd.colors.accent} size={13} strokeWidth={2.4} />
            </View>
            <Text style={styles.cardHeadText}>이번 달 출근</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metric}>{summary.attendedDays}</Text>
            <Text style={styles.metricUnit}>일</Text>
          </View>

          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(summary.progress * 100)}%` }]} />
          </View>

          <Text style={styles.caption}>{progressCaption(summary)}</Text>
        </View>

        <View style={styles.listHead}>
          <View style={styles.badge}>
            <PawPrint color={nd.colors.accent} size={13} strokeWidth={2.4} />
          </View>
          <Text style={styles.listHeadText}>최근 출근 기록</Text>
        </View>

        <View style={styles.list}>
          {recent.map((date, index) => (
            <View key={date}>
              {index > 0 ? <View style={styles.rowDivider} /> : null}
              <RecentRow date={date} status={statusOf(date, attended, today)} />
            </View>
          ))}
        </View>

        <Text style={styles.footnote}>
          {hasFailed ? '기록을 불러오지 못했다냥. 잠시 뒤 다시 열어 달라냥.' : '성실한 발자국이 차곡차곡 쌓이는 중'}
        </Text>

        <Pressable
          accessibilityLabel="전체 출근 기록 보기"
          accessibilityRole="button"
          onPress={() => navigation.navigate('AttendanceMonth')}
          style={({ pressed }) => [styles.moreRow, pressed && styles.pressed]}
        >
          <Text style={styles.moreText}>전체 기록 보기</Text>
          <ChevronRight color={nd.colors.accent} size={16} strokeWidth={2.2} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nd.colors.bg,
  },
  content: {
    paddingHorizontal: 20,
  },
  hero: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    paddingBottom: 22,
  },
  heroBadge: {
    width: 74,
    height: 74,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 37,
    backgroundColor: nd.colors.primarySoft,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: nd.colors.ink,
  },
  heroSub: {
    fontSize: 13,
    letterSpacing: -0.325,
    color: nd.colors.sub,
  },
  card: {
    gap: 10,
    borderRadius: 20,
    backgroundColor: nd.colors.bgSecondary,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  cardHead: {
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
    backgroundColor: nd.colors.primarySoft,
  },
  cardHeadText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  metric: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: nd.colors.ink,
  },
  metricUnit: {
    fontSize: 15,
    fontWeight: '500',
    color: nd.colors.sub,
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
    backgroundColor: nd.colors.accent,
  },
  caption: {
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.325,
    color: nd.colors.sub,
  },
  listHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 26,
    marginBottom: 10,
  },
  listHeadText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: nd.colors.ink,
  },
  list: {
    borderRadius: 16,
    backgroundColor: nd.colors.bgSecondary,
    paddingHorizontal: 16,
  },
  recentRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowDivider: {
    height: 1,
    backgroundColor: nd.colors.border,
  },
  recentDate: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: nd.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  footnote: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 13,
    letterSpacing: -0.325,
    color: nd.colors.sub,
  },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginTop: 12,
    paddingVertical: 10,
  },
  moreText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.35,
    color: nd.colors.accent,
  },
  pressed: {
    opacity: 0.7,
  },
});
