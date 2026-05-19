import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { NotificationPermissionState, NotificationSettings } from '@/shared/types/notification';

const notificationSettingsKey = 'catdex.notificationSettings.v1';
const dailyReminderChannelId = 'catdex-daily-reminder';

export const defaultNotificationSettings: NotificationSettings = {
  dailyReminderEnabled: false,
  dailyReminderTime: '20:00',
  sharedCatEnabled: true,
  achievementEnabled: true,
  socialEnabled: true,
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
      body: '냥도감 MY 페이지에서 새 배지를 확인해보세요.',
      data: {
        screen: 'my',
        notificationType: 'achievementPreview',
      },
      sound: true,
    },
    trigger: null,
  });
}
