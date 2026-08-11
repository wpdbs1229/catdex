import { throwIfSupabaseError } from '@/shared/api/client';
import { assertSupabaseConfigured, supabase } from '@/shared/supabase/client';

export interface CrewStatus {
  /** 지금 도감에 있는 마릿수 */
  collected: number;
  /** 지금까지의 최고 기록. 직책은 이 값으로 정한다. */
  peak: number;
  rank: string;
  /** 최고 직책이면 undefined */
  nextRank?: string;
  nextThreshold?: number;
  /** 앱을 연 날의 누적 수. 연속이 아니라 끊겨도 줄지 않는다. */
  attendanceDays: number;
  /** 가장 많이 다시 만난 고양이. 재회가 없으면 undefined */
  topReunionCat?: string;
  topReunionCount?: number;
}

interface CrewStatusRow {
  collected: number | null;
  peak: number | null;
  rank: string | null;
  next_rank: string | null;
  next_threshold: number | null;
  attendance_days: number | null;
  top_reunion_cat: string | null;
  top_reunion_count: number | null;
}

export const defaultCrewStatus: CrewStatus = {
  collected: 0,
  peak: 0,
  rank: '사원',
  nextRank: '주임',
  nextThreshold: 1,
  attendanceDays: 0,
};

/**
 * 오늘 출근을 남기고 인사고과 지표를 함께 받아온다.
 *
 * 직책은 중복 개체 병합으로 마릿수가 줄어도 내려가지 않도록 최고 기록(peak)으로
 * 정한다. 화면에는 현재 마릿수(collected)를 보여준다.
 */
export async function checkInAndFetchCrewStatus(): Promise<CrewStatus> {
  assertSupabaseConfigured();

  const { data, error } = await supabase.rpc('check_in_and_get_status');

  throwIfSupabaseError(error);

  const row = (Array.isArray(data) ? data[0] : data) as CrewStatusRow | null;

  if (!row) {
    return defaultCrewStatus;
  }

  return {
    collected: row.collected ?? 0,
    peak: row.peak ?? 0,
    rank: row.rank ?? '사원',
    nextRank: row.next_rank ?? undefined,
    nextThreshold: row.next_threshold ?? undefined,
    attendanceDays: row.attendance_days ?? 0,
    topReunionCat: row.top_reunion_cat ?? undefined,
    topReunionCount: row.top_reunion_count ?? undefined,
  };
}
