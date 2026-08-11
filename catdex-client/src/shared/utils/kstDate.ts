/**
 * 한국 시간 기준 날짜 계산.
 *
 * 출근 기록은 서버가 `Asia/Seoul`로 하루를 끊는다(check_in_and_get_status).
 * 클라이언트가 기기 시간대로 '오늘'이나 월 경계를 계산하면 자정 직후나 해외에서
 * 서버와 하루씩 어긋나므로, 화면 쪽 날짜 계산은 전부 이 파일을 거친다.
 *
 * KST는 서머타임이 없어 고정 +9시간으로 계산해도 안전하다. 날짜는 'YYYY-MM-DD'
 * 문자열로 다루고, 산술은 UTC 기준 Date로만 해서 기기 시간대가 끼어들지 않게 한다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** 'YYYY-MM-DD' */
export type Ymd = string;

export interface YearMonth {
  year: number;
  /** 1-12 */
  month: number;
}

export function kstToday(): Ymd {
  return new Date(Date.now() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export function toYmd(year: number, month: number, day: number): Ymd {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseYmd(value: Ymd) {
  const [year, month, day] = value.split('-').map(Number);

  return { year, month, day };
}

/** 0=일요일 … 6=토요일 */
export function weekdayIndex(value: Ymd): number {
  const { year, month, day } = parseYmd(value);

  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function isWeekend(value: Ymd): boolean {
  const index = weekdayIndex(value);

  return index === 0 || index === 6;
}

export function weekdayName(value: Ymd): string {
  return WEEKDAY_NAMES[weekdayIndex(value)];
}

export function daysInMonth({ year, month }: YearMonth): number {
  // 다음 달 0일 = 이번 달 마지막 날
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthOf(value: Ymd): YearMonth {
  const { year, month } = parseYmd(value);

  return { year, month };
}

export function addMonths({ year, month }: YearMonth, delta: number): YearMonth {
  const zeroBased = year * 12 + (month - 1) + delta;

  return { year: Math.floor(zeroBased / 12), month: (zeroBased % 12) + 1 };
}

export function addDays(value: Ymd, delta: number): Ymd {
  const { year, month, day } = parseYmd(value);
  const shifted = new Date(Date.UTC(year, month - 1, day + delta));

  return shifted.toISOString().slice(0, 10);
}

/** 그 달의 모든 날짜를 1일부터 차례로 */
export function monthDates(target: YearMonth): Ymd[] {
  const total = daysInMonth(target);

  return Array.from({ length: total }, (_, index) => toYmd(target.year, target.month, index + 1));
}

/** 그 달의 평일(월~금) 수. 진행바의 분모다. */
export function workdayCount(target: YearMonth): number {
  return monthDates(target).filter((date) => !isWeekend(date)).length;
}

export function compareYearMonth(a: YearMonth, b: YearMonth): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

/** "8월 11일 화요일" */
export function formatKoreanDate(value: Ymd): string {
  const { month, day } = parseYmd(value);

  return `${month}월 ${day}일 ${weekdayName(value)}요일`;
}

/** "8월 11일" */
export function formatKoreanDateShort(value: Ymd): string {
  const { month, day } = parseYmd(value);

  return `${month}월 ${day}일`;
}
