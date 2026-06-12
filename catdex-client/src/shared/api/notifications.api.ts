import { throwIfSupabaseError } from '@/shared/api/client';
import { assertSupabaseConfigured, supabase } from '@/shared/supabase/client';
import type { NotificationSettings } from '@/shared/types/notification';

type NotificationPlatform = 'ios' | 'android' | 'web' | 'unknown';

interface NotificationSettingsRow {
  daily_reminder_enabled: boolean;
  daily_reminder_time: string;
  shared_cat_enabled: boolean;
}

function normalizeReminderTime(value: string | null | undefined) {
  return value?.slice(0, 5) ?? '20:00';
}

async function getCurrentUserId() {
  assertSupabaseConfigured();

  const { data, error } = await supabase.auth.getUser();
  throwIfSupabaseError(error);

  return data.user?.id ?? null;
}

export async function fetchRemoteNotificationSettings(): Promise<Partial<NotificationSettings> | null> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from('notification_settings')
    .select('daily_reminder_enabled, daily_reminder_time, shared_cat_enabled')
    .eq('user_id', userId)
    .maybeSingle();

  throwIfSupabaseError(error);

  if (!data) {
    return null;
  }

  const row = data as NotificationSettingsRow;

  return {
    dailyReminderEnabled: row.daily_reminder_enabled,
    dailyReminderTime: normalizeReminderTime(row.daily_reminder_time),
    sharedCatEnabled: row.shared_cat_enabled,
  };
}

export async function saveRemoteNotificationSettings(settings: NotificationSettings) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return;
  }

  const { error } = await supabase.from('notification_settings').upsert(
    {
      user_id: userId,
      daily_reminder_enabled: settings.dailyReminderEnabled,
      daily_reminder_time: settings.dailyReminderTime,
      shared_cat_enabled: settings.sharedCatEnabled,
    },
    {
      onConflict: 'user_id',
    },
  );

  throwIfSupabaseError(error);
}

export async function registerNotificationDevice(expoPushToken: string, platform: NotificationPlatform) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return;
  }

  const { error } = await supabase.from('notification_devices').upsert(
    {
      user_id: userId,
      expo_push_token: expoPushToken,
      platform,
      enabled: true,
      last_seen_at: new Date().toISOString(),
    },
    {
      onConflict: 'expo_push_token',
    },
  );

  throwIfSupabaseError(error);
}
