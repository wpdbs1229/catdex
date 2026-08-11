/** 시안(마이페이지_알림)의 스위치 세 개. 세부 이벤트가 늘어도 이 셋은 그대로다. */
export type NotificationCategory = 'discovery' | 'activity' | 'marketing';

export type NotificationType =
  | 'neighborhood_sighting'
  | 'neighborhood_new_cat'
  | 'cat_rediscovery'
  | 'rank_promoted'
  | 'post_reaction'
  | 'campaign';

export interface NotificationSettings {
  discoveryEnabled: boolean;
  activityEnabled: boolean;
  marketingEnabled: boolean;
}

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt?: string;
  createdAt: string;
}

/**
 * 광고성 정보는 사전 수신 동의가 원칙이라 기본값이 꺼짐이다.
 * 서버 기본값(20260810090100_notification_v2.sql)과 반드시 같아야 한다.
 */
export const defaultNotificationSettings: NotificationSettings = {
  discoveryEnabled: true,
  activityEnabled: true,
  marketingEnabled: false,
};

export const notificationCategoryLabels: Record<
  NotificationCategory,
  { title: string; description: string }
> = {
  discovery: {
    title: '고양이 발견 알림',
    description: '내 주변·관심 지역 새 고양이에 대한 알림',
  },
  activity: {
    title: '내 활동 알림',
    description: '내 활동에 새로운 반응이 있으면 알림',
  },
  marketing: {
    title: '이벤트 혜택 알림',
    description: '이벤트, 프로모션, 새로운 소식에 대한 알림',
  },
};
