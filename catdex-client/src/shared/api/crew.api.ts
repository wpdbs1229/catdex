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
}

interface CrewStatusRow {
  collected: number | null;
  peak: number | null;
  rank: string | null;
  next_rank: string | null;
  next_threshold: number | null;
}

export const defaultCrewStatus: CrewStatus = {
  collected: 0,
  peak: 0,
  rank: '사원',
  nextRank: '주임',
  nextThreshold: 1,
};

/**
 * 사원증 직책과 승급 진행도.
 *
 * 직책은 중복 개체 병합으로 마릿수가 줄어도 내려가지 않도록 최고 기록(peak)으로
 * 정한다. 화면에는 현재 마릿수(collected)를 보여준다.
 */
export async function fetchMyCrewStatus(): Promise<CrewStatus> {
  assertSupabaseConfigured();

  const { data, error } = await supabase.rpc('get_my_crew_status');

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
  };
}
