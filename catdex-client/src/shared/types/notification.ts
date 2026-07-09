export interface NotificationSettings {
  dailyReminderEnabled: boolean;
  dailyReminderTime: string;
  sharedCatEnabled: boolean;
  catUpdateEnabled: boolean;
  achievementEnabled: boolean;
  socialEnabled: boolean;
  weeklySummaryEnabled: boolean;
  scheduledDailyReminderId: string | null;
}

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined';
