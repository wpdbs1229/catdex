import { throwIfSupabaseError } from '@/shared/api/client';
import { assertSupabaseConfigured, supabase } from '@/shared/supabase/client';
import {
  defaultNotificationSettings,
  type NotificationCategory,
  type NotificationItem,
  type NotificationSettings,
  type NotificationType,
} from '@/shared/types/notification';

interface NotificationSettingsRow {
  discovery_enabled: boolean;
  activity_enabled: boolean;
  marketing_enabled: boolean;
}

interface NotificationEventRow {
  id: string;
  category: NotificationCategory;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

function mapSettings(row: NotificationSettingsRow): NotificationSettings {
  return {
    discoveryEnabled: row.discovery_enabled,
    activityEnabled: row.activity_enabled,
    marketingEnabled: row.marketing_enabled,
  };
}

function mapNotification(row: NotificationEventRow): NotificationItem {
  return {
    id: row.id,
    category: row.category,
    type: row.type,
    title: row.title,
    body: row.body,
    data: row.data ?? {},
    readAt: row.read_at ?? undefined,
    createdAt: row.created_at,
  };
}

/** 설정 행은 첫 저장 때 만들어지므로, 없으면 기본값으로 본다. */
export async function fetchMyNotificationSettings(): Promise<NotificationSettings> {
  assertSupabaseConfigured();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return defaultNotificationSettings;
  }

  const { data, error } = await supabase
    .from('notification_settings')
    .select('discovery_enabled, activity_enabled, marketing_enabled')
    .eq('user_id', session.user.id)
    .maybeSingle();

  throwIfSupabaseError(error);

  return data ? mapSettings(data as NotificationSettingsRow) : defaultNotificationSettings;
}

export async function updateMyNotificationSettings(next: NotificationSettings): Promise<NotificationSettings> {
  assertSupabaseConfigured();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error('알림 설정에는 로그인이 필요합니다.');
  }

  const { data, error } = await supabase
    .from('notification_settings')
    .upsert(
      {
        user_id: session.user.id,
        discovery_enabled: next.discoveryEnabled,
        activity_enabled: next.activityEnabled,
        marketing_enabled: next.marketingEnabled,
        // 광고성 수신 동의 시각. 끄면 지운다.
        marketing_agreed_at: next.marketingEnabled ? new Date().toISOString() : null,
      },
      { onConflict: 'user_id' },
    )
    .select('discovery_enabled, activity_enabled, marketing_enabled')
    .single();

  throwIfSupabaseError(error);

  return mapSettings(data as NotificationSettingsRow);
}

export async function registerPushDevice(expoPushToken: string, platform: 'ios' | 'android' | 'web') {
  assertSupabaseConfigured();

  const { error } = await supabase.rpc('register_notification_device', {
    p_expo_push_token: expoPushToken,
    p_platform: platform,
  });

  throwIfSupabaseError(error);
}

export async function fetchMyNotifications(limit = 50): Promise<NotificationItem[]> {
  assertSupabaseConfigured();

  const { data, error } = await supabase
    .from('notification_events')
    .select('id, category, type, title, body, data, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  throwIfSupabaseError(error);

  return ((data ?? []) as NotificationEventRow[]).map(mapNotification);
}

/** 헤더 벨의 빨간 점에 쓴다. */
export async function fetchUnreadNotificationCount(): Promise<number> {
  assertSupabaseConfigured();

  const { count, error } = await supabase
    .from('notification_events')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);

  throwIfSupabaseError(error);

  return count ?? 0;
}

/** eventIds를 비우면 읽지 않은 알림을 모두 읽음 처리한다. */
export async function markNotificationsRead(eventIds?: string[]) {
  assertSupabaseConfigured();

  const { error } = await supabase.rpc('mark_my_notifications_read', {
    p_event_ids: eventIds ?? null,
  });

  throwIfSupabaseError(error);
}

/**
 * 앱이 감지한 동네를 서버에 올린다. 발견 알림의 발송 대상이 여기서 정해진다.
 * 좌표는 보내지 않고 동네 이름만 보낸다.
 */
export async function syncMyNeighborhoods(names: string[], activeName?: string) {
  assertSupabaseConfigured();

  const { error } = await supabase.rpc('sync_my_neighborhoods', {
    p_names: names,
    p_active_name: activeName ?? null,
  });

  throwIfSupabaseError(error);
}
