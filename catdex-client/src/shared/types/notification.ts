export interface NotificationSettings {
  dailyReminderEnabled: boolean;
  dailyReminderTime: string;
  sharedCatEnabled: boolean;
  scheduledDailyReminderId: string | null;
}

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined';
