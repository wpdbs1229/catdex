import { getCurrentUserId } from '@/shared/api/auth.api';
import { throwIfSupabaseError } from '@/shared/api/client';
import { assertSupabaseConfigured, supabase } from '@/shared/supabase/client';
import type { CommunityReportReason } from '@/shared/types/community';
import type { CatReportReason } from '@/shared/types/cat';

/** 내가 접수한 신고 한 건. 고양이 신고와 커뮤니티 신고를 한 목록으로 편다. */
export interface MyReport {
  id: string;
  kind: 'cat' | 'post' | 'comment';
  /** 무엇을 신고했는지. 고양이 이름, 게시글 제목, 댓글 미리보기. */
  targetLabel: string;
  reasonLabel: string;
  detail?: string;
  statusLabel: string;
  createdAt: string;
}

interface CatReportRow {
  id: string;
  reason: CatReportReason;
  memo: string | null;
  status: string | null;
  created_at: string;
  cats: { name: string } | Array<{ name: string }> | null;
}

interface CommunityReportRow {
  id: string;
  target_type: string;
  target_id: string;
  reason: CommunityReportReason;
  detail: string | null;
  created_at: string;
}

const CAT_REPORT_REASON_LABELS: Record<CatReportReason, string> = {
  duplicate_cat: '중복 등록',
  inappropriate_photo: '부적절한 사진',
  location_risk: '위치 노출 위험',
  incorrect_info: '잘못된 정보',
  other: '기타',
};

const COMMUNITY_REPORT_REASON_LABELS: Record<CommunityReportReason, string> = {
  SPAM: '스팸·광고',
  ABUSE: '욕설·괴롭힘',
  INAPPROPRIATE_IMAGE: '부적절한 이미지',
  PRIVACY: '개인정보 노출',
  ANIMAL_ABUSE: '동물 학대',
  LOCATION_EXPOSURE: '민감한 위치 노출',
  ETC: '기타',
};

const REPORT_STATUS_LABELS: Record<string, string> = {
  pending: '접수됨',
  reviewing: '검토 중',
  resolved: '처리 완료',
  dismissed: '처리 완료',
};

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** 신고 대상 글·댓글의 이름표. 지워졌거나 못 읽으면 빈 맵으로 넘어간다. */
async function fetchTargetLabels(table: 'community_posts' | 'community_comments', column: 'title' | 'content', ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const { data } = await supabase.from(table).select(`id, ${column}`).in('id', ids);

  return new Map(
    ((data ?? []) as unknown as Array<{ id: string; title?: string; content?: string }>).map((row) => [
      row.id,
      (row.title ?? row.content ?? '').trim(),
    ]),
  );
}

/**
 * 내가 접수한 신고 전부. 고양이 신고(reports)와 커뮤니티 신고
 * (community_reports)를 합쳐 최신순으로 준다. 두 테이블 모두 본인 것만
 * 읽히는 RLS가 걸려 있어 그대로 조회하면 내 것만 온다.
 */
export async function fetchMyReports(): Promise<MyReport[]> {
  assertSupabaseConfigured();

  const currentUserId = await getCurrentUserId();

  if (!currentUserId) {
    return [];
  }

  const [catReportsResponse, communityReportsResponse] = await Promise.all([
    supabase
      .from('reports')
      .select('id, reason, memo, status, created_at, cats(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('community_reports')
      .select('id, target_type, target_id, reason, detail, created_at')
      .order('created_at', { ascending: false }),
  ]);

  throwIfSupabaseError(catReportsResponse.error);
  throwIfSupabaseError(communityReportsResponse.error);

  const communityRows = (communityReportsResponse.data ?? []) as CommunityReportRow[];
  const postIds = communityRows.filter((row) => row.target_type === 'POST').map((row) => row.target_id);
  const commentIds = communityRows.filter((row) => row.target_type === 'COMMENT').map((row) => row.target_id);
  const [postTitles, commentContents] = await Promise.all([
    fetchTargetLabels('community_posts', 'title', postIds).catch(() => new Map<string, string>()),
    fetchTargetLabels('community_comments', 'content', commentIds).catch(() => new Map<string, string>()),
  ]);

  const catReports = ((catReportsResponse.data ?? []) as unknown as CatReportRow[]).map<MyReport>((row) => ({
    id: row.id,
    kind: 'cat',
    targetLabel: firstRelation(row.cats)?.name ?? '지워진 고양이',
    reasonLabel: CAT_REPORT_REASON_LABELS[row.reason] ?? row.reason,
    detail: row.memo?.trim() || undefined,
    statusLabel: REPORT_STATUS_LABELS[row.status ?? 'pending'] ?? '접수됨',
    createdAt: row.created_at,
  }));

  const communityReports = communityRows.map<MyReport>((row) => {
    const isPost = row.target_type === 'POST';
    const targetLabel = isPost
      ? postTitles.get(row.target_id) || '지워진 게시글'
      : commentContents.get(row.target_id) || '지워진 댓글';

    return {
      id: row.id,
      kind: isPost ? 'post' : 'comment',
      targetLabel,
      reasonLabel: COMMUNITY_REPORT_REASON_LABELS[row.reason] ?? row.reason,
      detail: row.detail?.trim() || undefined,
      // 커뮤니티 신고에는 아직 처리 상태 칸이 없다. 접수 사실만 보여준다.
      statusLabel: '접수됨',
      createdAt: row.created_at,
    };
  });

  return [...catReports, ...communityReports].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}
