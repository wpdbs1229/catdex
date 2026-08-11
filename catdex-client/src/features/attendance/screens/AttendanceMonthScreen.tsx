import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, ChevronRight, PawPrint } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGoBackOrHome } from '@/app/navigation/useGoBackOrHome';
import { useTabBarInset } from '@/app/navigation/useTabBarInset';
import { AttendanceHeader } from '@/features/attendance/components/AttendanceHeader';
import { statusOf, STATUS_LABEL, type AttendanceDayStatus } from '@/features/attendance/attendance.model';
import { fetchAttendanceMonth, fetchFirstAttendanceMonth } from '@/shared/api/attendance.api';
import { nd } from '@/shared/styles/theme';
import {
  addMonths,
  compareYearMonth,
  daysInMonth,
  formatKoreanDate,
  kstToday,
  monthOf,
  toYmd,
  weekdayIndex,
  type Ymd,
  type YearMonth,
} from '@/shared/utils/kstDate';

const WEEKDAY_HEADS = ['일', '월', '화', '수', '목', '금', '토'];

/** 그날 무슨 말을 해 줄지. 화면에서 유일하게 상태별로 갈리는 문구다. */
const DAY_MESSAGE: Record<AttendanceDayStatus, { title: string; body: string }> = {
  attended: { title: '출근 완료했다냥!', body: '오늘도 발도장 꾹, 아주 잘했다냥.' },
  overtime: { title: '주말 특근이다냥!', body: '쉬는 날에도 나와 준 건 덤으로 쳐 준다냥.' },
  holiday: { title: '휴무다냥', body: '푹 쉬는 것도 사원의 일이다냥.' },
  upcoming: { title: '아직 오지 않은 날이다냥', body: '그날 또 발도장을 찍으러 오라냥.' },
  none: { title: '기록이 없는 날이다냥', body: '지나간 건 지나간 대로 두면 된다냥.' },
};

interface CellProps {
  date: Ymd | null;
  label: number;
  status: AttendanceDayStatus | null;
  isToday: boolean;
  isSelected: boolean;
  onPress: (date: Ymd) => void;
}

function DayCell({ date, label, status, isToday, isSelected, onPress }: CellProps) {
  // 앞뒤 달에서 넘어온 칸은 숫자만 흐리게 두고 누르지 못하게 한다.
  if (!date || !status) {
    return (
      <View style={styles.cell}>
        <Text style={styles.cellOutside}>{label}</Text>
      </View>
    );
  }

  const showsPaw = status === 'attended' || status === 'overtime';

  return (
    <Pressable
      accessibilityLabel={`${label}일 ${STATUS_LABEL[status] ?? '기록 없음'}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={() => onPress(date)}
      style={styles.cell}
    >
      <View
        style={[
          styles.cellInner,
          status === 'holiday' && styles.cellHoliday,
          status === 'overtime' && styles.cellOvertime,
          isSelected && styles.cellSelected,
          isToday && styles.cellToday,
        ]}
      >
        {showsPaw ? (
          <PawPrint color={nd.colors.accent} size={18} strokeWidth={2.3} />
        ) : (
          <Text
            style={[
              styles.cellText,
              status === 'upcoming' && styles.cellTextUpcoming,
              status === 'holiday' && styles.cellTextHoliday,
            ]}
          >
            {label}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function Legend({ status }: { status: Exclude<AttendanceDayStatus, 'none'> }) {
  const showsPaw = status === 'attended' || status === 'overtime';

  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendDot,
          status === 'holiday' && styles.cellHoliday,
          status === 'overtime' && styles.cellOvertime,
          // 예정은 달력에서도 흐린 숫자뿐이라 범례에도 빈 동그라미로 둔다.
          status === 'upcoming' && styles.legendDotUpcoming,
        ]}
      >
        {showsPaw ? <PawPrint color={nd.colors.accent} size={12} strokeWidth={2.4} /> : null}
      </View>
      <Text style={styles.legendText}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

/**
 * 월별 출근 기록 (시안 B).
 *
 * 시안에 월 이동 장치가 없어 제목 좌우에 화살표를 두었다. 첫 출근이 있는 달보다
 * 앞이나 이번 달보다 뒤로는 갈 수 없다 — 볼 것이 없는 달을 넘겨 보게 두면
 * 기록이 사라진 것처럼 읽힌다.
 */
export function AttendanceMonthScreen() {
  const goBack = useGoBackOrHome();
  const tabBarInset = useTabBarInset();

  const today = kstToday();
  const thisMonth = useMemo(() => monthOf(today), [today]);

  const [target, setTarget] = useState<YearMonth>(thisMonth);
  const [attended, setAttended] = useState<Set<Ymd>>(new Set());
  const [selected, setSelected] = useState<Ymd>(today);
  const [earliestMonth, setEarliestMonth] = useState<YearMonth | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      fetchFirstAttendanceMonth()
        .then((first) => {
          if (isActive && first) {
            setEarliestMonth(monthOf(first));
          }
        })
        .catch((error: unknown) => {
          console.warn('[attendance] first month load failed', error);
        });

      return () => {
        isActive = false;
      };
    }, []),
  );

  useEffect(() => {
    let isActive = true;

    fetchAttendanceMonth(target)
      .then((next) => {
        if (isActive) {
          setAttended(next);
        }
      })
      .catch((error: unknown) => {
        console.warn('[attendance] month load failed', error);
      });

    return () => {
      isActive = false;
    };
  }, [target]);

  // 달을 옮기면 그 달 안의 날짜를 고른 상태로 둔다. 이번 달이면 오늘로 돌아간다.
  const goMonth = useCallback(
    (delta: number) => {
      const next = addMonths(target, delta);

      setTarget(next);
      setSelected(
        compareYearMonth(next, thisMonth) === 0 ? today : toYmd(next.year, next.month, 1),
      );
    },
    [target, thisMonth, today],
  );

  const canGoBack = earliestMonth === null || compareYearMonth(target, earliestMonth) > 0;
  const canGoForward = compareYearMonth(target, thisMonth) < 0;

  const grid = useMemo(() => {
    const total = daysInMonth(target);
    const leading = weekdayIndex(toYmd(target.year, target.month, 1));
    const previousTotal = daysInMonth(addMonths(target, -1));
    const cells: { date: Ymd | null; label: number }[] = [];

    for (let index = 0; index < leading; index += 1) {
      cells.push({ date: null, label: previousTotal - leading + index + 1 });
    }

    for (let day = 1; day <= total; day += 1) {
      cells.push({ date: toYmd(target.year, target.month, day), label: day });
    }

    // 마지막 주를 7칸으로 채운다.
    let trailing = 1;

    while (cells.length % 7 !== 0) {
      cells.push({ date: null, label: trailing });
      trailing += 1;
    }

    return cells;
  }, [target]);

  const selectedStatus = statusOf(selected, attended, today);
  const message = DAY_MESSAGE[selectedStatus];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <AttendanceHeader onBack={goBack} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarInset }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Pressable
            accessibilityLabel="이전 달"
            accessibilityRole="button"
            disabled={!canGoBack}
            hitSlop={8}
            onPress={() => goMonth(-1)}
            style={({ pressed }) => [styles.monthArrow, pressed && styles.pressed]}
          >
            <ChevronLeft color={canGoBack ? nd.colors.ink : nd.colors.border} size={20} strokeWidth={2.2} />
          </Pressable>

          <Text style={styles.title}>{target.month}월 출근 기록이다냥</Text>

          <Pressable
            accessibilityLabel="다음 달"
            accessibilityRole="button"
            disabled={!canGoForward}
            hitSlop={8}
            onPress={() => goMonth(1)}
            style={({ pressed }) => [styles.monthArrow, pressed && styles.pressed]}
          >
            <ChevronRight color={canGoForward ? nd.colors.ink : nd.colors.border} size={20} strokeWidth={2.2} />
          </Pressable>
        </View>

        <View style={styles.calendar}>
          <View style={styles.week}>
            {WEEKDAY_HEADS.map((head) => (
              <View key={head} style={styles.cell}>
                <Text style={styles.weekHead}>{head}</Text>
              </View>
            ))}
          </View>

          <View style={styles.grid}>
            {grid.map((cell, index) => (
              <DayCell
                date={cell.date}
                isSelected={cell.date === selected}
                isToday={cell.date === today}
                key={cell.date ?? `blank-${index}`}
                label={cell.label}
                onPress={setSelected}
                status={cell.date ? statusOf(cell.date, attended, today) : null}
              />
            ))}
          </View>
        </View>

        <Text style={styles.selectedDate}>{formatKoreanDate(selected)}</Text>

        <View style={styles.messageCard}>
          <View style={styles.messageBadge}>
            <PawPrint color={nd.colors.accent} size={16} strokeWidth={2.4} />
          </View>
          <View style={styles.messageBody}>
            <Text style={styles.messageTitle}>{message.title}</Text>
            <Text style={styles.messageText}>{message.body}</Text>
          </View>
        </View>

        <View style={styles.legendRow}>
          <Legend status="attended" />
          <Legend status="overtime" />
          <Legend status="holiday" />
          <Legend status="upcoming" />
        </View>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  monthArrow: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.48,
    color: nd.colors.ink,
  },
  calendar: {
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: nd.colors.bgSecondary,
    paddingHorizontal: 6,
    paddingVertical: 12,
  },
  week: {
    flexDirection: 'row',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellInner: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cellHoliday: {
    backgroundColor: nd.colors.field,
  },
  cellOvertime: {
    backgroundColor: nd.colors.primarySoft,
  },
  cellSelected: {
    backgroundColor: nd.colors.scrim,
  },
  cellToday: {
    borderColor: nd.colors.accent,
  },
  weekHead: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: nd.colors.sub,
  },
  cellText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  cellTextUpcoming: {
    color: nd.colors.subtle,
  },
  cellTextHoliday: {
    color: nd.colors.sub,
  },
  cellOutside: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.35,
    color: nd.colors.border,
  },
  selectedDate: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.38,
    color: nd.colors.ink,
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 16,
    backgroundColor: nd.colors.bgSecondary,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  messageBadge: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: nd.colors.primarySoft,
  },
  messageBody: {
    flexShrink: 1,
    gap: 3,
  },
  messageTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.325,
    color: nd.colors.sub,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    marginTop: 18,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  legendDotUpcoming: {
    borderWidth: 1.5,
    borderColor: nd.colors.border,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.3,
    color: nd.colors.sub,
  },
  pressed: {
    opacity: 0.6,
  },
});
