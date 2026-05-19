export interface NotificationSettings {
  dailyReminderEnabled: boolean;
  dailyReminderTime: string;
  sharedCatEnabled: boolean;
  achievementEnabled: boolean;
  socialEnabled: boolean;
  scheduledDailyReminderId: string | null;
}

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined';
