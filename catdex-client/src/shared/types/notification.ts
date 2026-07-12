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

export type NotificationEventType =
  | 'shared_cat'
  | 'achievement'
  | 'collection_like'
  | 'collection_follow'
  | 'cat_rediscovery'
  | 'rare_neighborhood_cat'
  | 'weekly_summary';

export type NotificationEventStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'skipped';

export interface NotificationEvent {
  id: string;
  type: NotificationEventType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  status: NotificationEventStatus;
  createdAt: string;
  sentAt?: string;
}
