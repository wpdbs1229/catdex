import { throwIfSupabaseError } from '@/shared/api/client';
import { assertSupabaseConfigured, supabase } from '@/shared/supabase/client';
import type { Announcement } from '@/shared/types/announcement';

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  published_at: string;
  pinned: boolean;
}

function mapAnnouncement(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    publishedAt: row.published_at,
    pinned: row.pinned,
  };
}

/**
 * 열린 공지만 받는다. 초안과 예약분은 RLS가 막으므로 여기서 거르지 않아도
 * 되지만, 서버 시계와 어긋나는 순간이 있어 정렬 기준은 명시해둔다.
 *
 * 고정 공지가 위로, 그다음은 최신순이다.
 */
export async function fetchAnnouncements() {
  assertSupabaseConfigured();

  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, body, published_at, pinned')
    .order('pinned', { ascending: false })
    .order('published_at', { ascending: false });

  throwIfSupabaseError(error);

  return ((data ?? []) as AnnouncementRow[]).map(mapAnnouncement);
}
