import { throwIfSupabaseError } from '@/shared/api/client';
import { assertSupabaseConfigured, supabase } from '@/shared/supabase/client';
import { daysInMonth, toYmd, type Ymd, type YearMonth } from '@/shared/utils/kstDate';

interface AttendanceRow {
  attended_on: string;
}

/**
 * 한 달치 출근 날짜.
 *
 * 출근을 남기는 건 홈이 부르는 check_in_and_get_status가 하고, 여기서는 읽기만 한다.
 * user_attendance의 select 정책이 본인 행만 내주므로 별도 RPC 없이 직접 조회한다.
 * 한 달이 최대 31행이라 월을 넘길 때마다 그 달만 가져오면 된다.
 */
export async function fetchAttendanceMonth(target: YearMonth): Promise<Set<Ymd>> {
  assertSupabaseConfigured();

  const first = toYmd(target.year, target.month, 1);
  const last = toYmd(target.year, target.month, daysInMonth(target));

  const { data, error } = await supabase
    .from('user_attendance')
    .select('attended_on')
    .gte('attended_on', first)
    .lte('attended_on', last);

  throwIfSupabaseError(error);

  return new Set((data as AttendanceRow[] | null)?.map((row) => row.attended_on) ?? []);
}

/**
 * 가입 이후로 출근 기록이 있는 가장 이른 달. 월 이동의 하한이다.
 * 기록이 하나도 없으면 null을 준다(이번 달보다 앞으로 못 가게 한다).
 */
export async function fetchFirstAttendanceMonth(): Promise<Ymd | null> {
  assertSupabaseConfigured();

  const { data, error } = await supabase
    .from('user_attendance')
    .select('attended_on')
    .order('attended_on', { ascending: true })
    .limit(1);

  throwIfSupabaseError(error);

  return (data as AttendanceRow[] | null)?.[0]?.attended_on ?? null;
}
