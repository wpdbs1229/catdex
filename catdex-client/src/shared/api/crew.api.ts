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

/** 승진 사다리 한 칸. 지부 정원 현황 모달이 쓴다. */
export interface CrewRankStep {
  rank: string;
  /** 이 직책이 되는 최소 마릿수 */
  threshold: number;
  /** 내 지부에서 이 직책인 사람 수 */
  memberCount: number;
  isMine: boolean;
}

export interface CrewRankDirectory {
  /** 시·도를 아직 못 올린 사용자는 undefined */
  branchCity?: string;
  steps: CrewRankStep[];
}

interface CrewRankRow {
  rank: string | null;
  threshold: number | null;
  member_count: number | null;
  is_my_rank: boolean | null;
  branch_city: string | null;
}

/**
 * 승진 규칙과 내 지부의 직책별 인원수.
 *
 * 서버는 직책별 '수'만 돌려준다. 누가 무슨 직책인지는 나가지 않는다.
 */
export async function fetchCrewRankDirectory(): Promise<CrewRankDirectory> {
  assertSupabaseConfigured();

  const { data, error } = await supabase.rpc('crew_rank_directory');

  throwIfSupabaseError(error);

  const rows = (data as CrewRankRow[] | null) ?? [];

  return {
    branchCity: rows.find((row) => row.branch_city)?.branch_city ?? undefined,
    steps: rows.map((row) => ({
      rank: row.rank ?? '',
      threshold: row.threshold ?? 0,
      memberCount: row.member_count ?? 0,
      isMine: row.is_my_rank ?? false,
    })),
  };
}
