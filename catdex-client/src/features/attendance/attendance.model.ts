import {
  isWeekend,
  kstToday,
  monthDates,
  workdayCount,
  type Ymd,
  type YearMonth,
} from '@/shared/utils/kstDate';

/**
 * 하루의 상태.
 *
 * '결근'이 없는 것이 이 모델의 요점이다. 출근은 연속이 아니라 누적이고, 앱을 열지
 * 못한 평일을 실패로 이름 붙이는 순간 복귀가 아니라 이탈을 부른다. 그래서 안 나온
 * 평일은 라벨 없이 비워 둔다(`none`).
 */
export type AttendanceDayStatus =
  /** 평일에 출근 */
  | 'attended'
  /** 주말에 출근. 근무일 분모에 들어가지 않아 이득만 된다 */
  | 'overtime'
  /** 주말인데 안 나온 날 */
  | 'holiday'
  /** 오늘 이후 */
  | 'upcoming'
  /** 평일인데 안 나온 날. 화면에는 아무 라벨도 붙이지 않는다 */
  | 'none';

export function statusOf(date: Ymd, attended: Set<Ymd>, today: Ymd = kstToday()): AttendanceDayStatus {
  if (date > today) {
    return 'upcoming';
  }

  if (attended.has(date)) {
    return isWeekend(date) ? 'overtime' : 'attended';
  }

  return isWeekend(date) ? 'holiday' : 'none';
}

export interface MonthSummary {
  /** 평일·주말을 가리지 않은 실제 출근 일수. 큰 숫자로 보여 준다 */
  attendedDays: number;
  /** 그중 평일 출근. 진행바의 분자 */
  workdaysAttended: number;
  /** 주말 출근 */
  overtimeDays: number;
  /** 그 달의 평일 수. 진행바의 분모 */
  workdaysTotal: number;
  /** 오늘 이후로 남은 평일 수 */
  workdaysLeft: number;
  /** 0-1. 분자가 분모를 넘지 않게 자른다 */
  progress: number;
}

export function summarizeMonth(target: YearMonth, attended: Set<Ymd>, today: Ymd = kstToday()): MonthSummary {
  const dates = monthDates(target);

  let attendedDays = 0;
  let workdaysAttended = 0;
  let overtimeDays = 0;
  let workdaysLeft = 0;

  for (const date of dates) {
    const status = statusOf(date, attended, today);

    if (status === 'attended') {
      attendedDays += 1;
      workdaysAttended += 1;
    } else if (status === 'overtime') {
      attendedDays += 1;
      overtimeDays += 1;
    } else if (status === 'upcoming' && !isWeekend(date)) {
      workdaysLeft += 1;
    }
  }

  const workdaysTotal = workdayCount(target);

  return {
    attendedDays,
    workdaysAttended,
    overtimeDays,
    workdaysTotal,
    workdaysLeft,
    progress: workdaysTotal === 0 ? 0 : Math.min(1, workdaysAttended / workdaysTotal),
  };
}

/** 진행바 아래에 붙는 문구. 특근이 있으면 덤이라고 덧붙인다. */
export function progressCaption(summary: MonthSummary): string {
  const base =
    summary.workdaysLeft > 0
      ? `이번 달 근무일은 ${summary.workdaysLeft}일 남았다냥.`
      : '이번 달 근무일은 다 지나갔다냥.';

  if (summary.overtimeDays > 0) {
    return `${base} 주말 특근 ${summary.overtimeDays}일은 덤이다냥.`;
  }

  return base;
}

export const STATUS_LABEL: Record<AttendanceDayStatus, string | null> = {
  attended: '출근 완료',
  overtime: '특근',
  holiday: '휴무',
  upcoming: '예정',
  // 안 나온 평일에는 이름을 붙이지 않는다.
  none: null,
};
