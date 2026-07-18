import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { NotificationPermissionState, NotificationSettings } from '@/shared/types/notification';

const notificationSettingsKey = 'catdex.notificationSettings.v1';
const notificationReadIdsKeyPrefix = 'catdex.notificationReadIds.v1';
const dailyReminderChannelId = 'catdex-daily-reminder';

export const defaultNotificationSettings: NotificationSettings = {
  dailyReminderEnabled: false,
  dailyReminderTime: '20:00',
  sharedCatEnabled: true,
  catUpdateEnabled: true,
  achievementEnabled: true,
  socialEnabled: true,
  weeklySummaryEnabled: true,
  scheduledDailyReminderId: null,
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function normalizeReminderTime(value: string) {
  const [hourText = '20', minuteText = '00'] = value.split(':');
  const hour = Math.min(23, Math.max(0, Number(hourText)));
  const minute = Math.min(59, Math.max(0, Number(minuteText)));

  return {
    hour: Number.isFinite(hour) ? hour : 20,
    minute: Number.isFinite(minute) ? minute : 0,
  };
}

async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(dailyReminderChannelId, {
    name: '탐험 리마인더',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 220, 160, 220],
    lightColor: '#8BA070',
  });
}

export async function loadNotificationSettings(): Promise<NotificationSettings> {
  const storedValue = await AsyncStorage.getItem(notificationSettingsKey);

  if (!storedValue) {
    return defaultNotificationSettings;
  }

  try {
    return {
      ...defaultNotificationSettings,
      ...(JSON.parse(storedValue) as Partial<NotificationSettings>),
    };
  } catch {
    return defaultNotificationSettings;
  }
}

export async function saveNotificationSettings(settings: NotificationSettings) {
  await AsyncStorage.setItem(notificationSettingsKey, JSON.stringify(settings));
}

function getNotificationReadIdsKey(userId: string | null | undefined) {
  return `${notificationReadIdsKeyPrefix}.${userId ?? 'anonymous'}`;
}

export async function loadNotificationReadIds(userId: string | null | undefined): Promise<string[]> {
  const storedValue = await AsyncStorage.getItem(getNotificationReadIdsKey(userId));

  if (!storedValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    return Array.isArray(parsedValue) ? parsedValue.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

async function saveNotificationReadIds(userId: string | null | undefined, ids: string[]) {
  await AsyncStorage.setItem(getNotificationReadIdsKey(userId), JSON.stringify(Array.from(new Set(ids))));
}

export async function markNotificationEventRead(userId: string | null | undefined, eventId: string) {
  const currentIds = await loadNotificationReadIds(userId);
  const nextIds = Array.from(new Set([...currentIds, eventId]));
  await saveNotificationReadIds(userId, nextIds);

  return nextIds;
}

export async function markAllNotificationEventsRead(userId: string | null | undefined, eventIds: string[]) {
  const currentIds = await loadNotificationReadIds(userId);
  const nextIds = Array.from(new Set([...currentIds, ...eventIds]));
  await saveNotificationReadIds(userId, nextIds);

  return nextIds;
}

export function mergeNotificationSettings(
  settings: NotificationSettings,
  remoteSettings: Partial<NotificationSettings> | null,
): NotificationSettings {
  return {
    ...settings,
    ...(remoteSettings ?? {}),
    scheduledDailyReminderId: settings.scheduledDailyReminderId,
  };
}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  const permissions = await Notifications.getPermissionsAsync();

  if (permissions.granted) {
    return 'granted';
  }

  return permissions.canAskAgain ? 'undetermined' : 'denied';
}

export async function requestNotificationPermissions(): Promise<NotificationPermissionState> {
  await ensureAndroidNotificationChannel();
  const permissions = await Notifications.requestPermissionsAsync();

  if (permissions.granted) {
    return 'granted';
  }

  return permissions.canAskAgain ? 'undetermined' : 'denied';
}

export async function getExpoPushTokenForDevice() {
  const easConfig = Constants.easConfig as { projectId?: string } | null | undefined;
  const projectId = easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

  return token.data;
}

export function getNotificationDevicePlatform() {
  if (Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web') {
    return Platform.OS;
  }

  return 'unknown';
}

export async function cancelDailyReminder(settings: NotificationSettings): Promise<NotificationSettings> {
  if (settings.scheduledDailyReminderId) {
    await Notifications.cancelScheduledNotificationAsync(settings.scheduledDailyReminderId);
  }

  return {
    ...settings,
    scheduledDailyReminderId: null,
  };
}

export async function scheduleDailyReminder(settings: NotificationSettings): Promise<NotificationSettings> {
  await ensureAndroidNotificationChannel();

  const nextSettings = await cancelDailyReminder(settings);
  const { hour, minute } = normalizeReminderTime(nextSettings.dailyReminderTime);
  const scheduledDailyReminderId = await Notifications.scheduleNotificationAsync({
    content: {
      title: '오늘의 냥도감 산책',
      body: '동네에서 만난 고양이를 도감에 기록해보세요.',
      data: {
        screen: 'capture',
        notificationType: 'dailyReminder',
      },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: dailyReminderChannelId,
    },
  });

  return {
    ...nextSettings,
    dailyReminderEnabled: true,
    scheduledDailyReminderId,
  };
}

export async function applyNotificationSettings(settings: NotificationSettings): Promise<NotificationSettings> {
  const nextSettings = settings.dailyReminderEnabled ? await scheduleDailyReminder(settings) : await cancelDailyReminder(settings);
  await saveNotificationSettings(nextSettings);

  return nextSettings;
}

export async function sendAchievementPreviewNotification() {
  await ensureAndroidNotificationChannel();

  return Notifications.scheduleNotificationAsync({
    content: {
      title: '새 배지를 획득했어요',
      body: '냥도감 사원증에서 새 배지를 확인해보세요.',
      data: {
        screen: 'my',
        notificationType: 'achievementPreview',
      },
      sound: true,
    },
    trigger: null,
  });
}

export interface NotificationTapPayload {
  screen: string | null;
  catId: string | null;
}

function toNotificationTapPayload(response: Notifications.NotificationResponse | null): NotificationTapPayload | null {
  const data = response?.notification.request.content.data;

  if (!data || typeof data !== 'object') {
    return null;
  }

  const record = data as Record<string, unknown>;

  return {
    screen: typeof record.screen === 'string' ? record.screen : null,
    catId: typeof record.catId === 'string' ? record.catId : null,
  };
}

// 알림을 탭해 앱이 열렸을 때 원하는 화면으로 이동시키기 위한 리스너.
// (콜드 스타트로 열린 경우는 getInitialNotificationTap으로 처리한다.)
export function addNotificationTapListener(handler: (payload: NotificationTapPayload) => void) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const payload = toNotificationTapPayload(response);

    if (payload) {
      handler(payload);
    }
  });

  return () => subscription.remove();
}

export async function getInitialNotificationTap(): Promise<NotificationTapPayload | null> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    return toNotificationTapPayload(response);
  } catch {
    return null;
  }
}
