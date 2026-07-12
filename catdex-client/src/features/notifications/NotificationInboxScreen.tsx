import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react-native';
import { AlertCircle, BellRing, BookOpen, CheckCheck, ChevronLeft, ChevronRight, Heart, PawPrint, RefreshCw, Settings, Trophy, Users } from 'lucide-react-native';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchNotificationEvents } from '@/shared/api/notifications.api';
import { Button } from '@/shared/components/Button';
import { getUserFacingError, type UserFacingError } from '@/shared/errors/user-facing-error';
import { loadNotificationReadIds, markAllNotificationEventsRead, markNotificationEventRead } from '@/shared/notifications/notification.service';
import { createShadow, theme } from '@/shared/styles/theme';
import type { NotificationEvent, NotificationEventType } from '@/shared/types/notification';

interface NotificationInboxScreenProps {
  currentUserId: string | null;
  onBack: () => void;
  onOpenEvent: (event: NotificationEvent) => void;
  onOpenSettings: () => void;
}

const notificationTypeLabel: Record<NotificationEventType, string> = {
  shared_cat: '동네 발견',
  achievement: '배지',
  collection_like: '기록 반응',
  collection_follow: '기록 반응',
  cat_rediscovery: '내 고양이',
  rare_neighborhood_cat: '동네 발견',
  weekly_summary: '주간 리포트',
};

function getNotificationIcon(type: NotificationEventType): LucideIcon {
  switch (type) {
    case 'achievement':
      return Trophy;
    case 'collection_like':
      return Heart;
    case 'collection_follow':
      return Users;
    case 'cat_rediscovery':
      return PawPrint;
    case 'weekly_summary':
      return BookOpen;
    case 'rare_neighborhood_cat':
    case 'shared_cat':
    default:
      return BellRing;
  }
}

function getNotificationTargetLabel(event: NotificationEvent) {
  if (typeof event.data.catId === 'string') {
    return '고양이 보기';
  }

  if (event.data.screen === 'capture') {
    return '촬영하기';
  }

  if (event.data.screen === 'my') {
    return 'MY 보기';
  }

  if (event.data.screen === 'map') {
    return '동네 보기';
  }

  return '확인하기';
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  const timestamp = date.getTime();

  if (!Number.isFinite(timestamp)) {
    return '';
  }

  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));

  if (diffMinutes < 1) {
    return '방금';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  return `${date.getMonth() + 1}.${date.getDate()}`;
}

export function NotificationInboxScreen({ currentUserId, onBack, onOpenEvent, onOpenSettings }: NotificationInboxScreenProps) {
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [readEventIds, setReadEventIds] = useState<string[]>([]);
  const [error, setError] = useState<UserFacingError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const readEventIdSet = useMemo(() => new Set(readEventIds), [readEventIds]);
  const unreadCount = events.filter((event) => !readEventIdSet.has(event.id)).length;

  const refreshEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [nextEvents, nextReadIds] = await Promise.all([
        fetchNotificationEvents(40),
        loadNotificationReadIds(currentUserId),
      ]);

      setEvents(nextEvents);
      setReadEventIds(nextReadIds);
    } catch (nextError) {
      console.warn('[notifications] inbox load failed', nextError);
      setError(getUserFacingError(nextError, 'notification.load'));
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    void refreshEvents();
  }, [refreshEvents]);

  const handleOpenEvent = async (event: NotificationEvent) => {
    if (!readEventIdSet.has(event.id)) {
      setReadEventIds((current) => Array.from(new Set([...current, event.id])));
      markNotificationEventRead(currentUserId, event.id).catch((nextError) => {
        console.warn('[notifications] mark read failed', nextError);
      });
    }

    onOpenEvent(event);
  };

  const handleMarkAllRead = async () => {
    const nextIds = events.map((event) => event.id);

    setReadEventIds((current) => Array.from(new Set([...current, ...nextIds])));

    try {
      await markAllNotificationEventsRead(currentUserId, nextIds);
    } catch (nextError) {
      console.warn('[notifications] mark all read failed', nextError);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refreshEvents} tintColor={theme.colors.primaryDark} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable accessibilityLabel="알림함 뒤로가기" accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <ChevronLeft color={theme.colors.primaryDark} size={22} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>알림함</Text>
          <Text style={styles.subtitle}>{unreadCount > 0 ? `새 알림 ${unreadCount}개가 있어요.` : '확인하지 않은 알림이 없어요.'}</Text>
        </View>
        <Pressable accessibilityLabel="알림 설정 열기" accessibilityRole="button" onPress={onOpenSettings} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Settings color={theme.colors.primaryDark} size={20} />
        </Pressable>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <BellRing color={theme.colors.primaryDark} size={22} />
        </View>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryTitle}>최근 도감 활동</Text>
          <Text style={styles.summaryText}>내 고양이 소식, 동네 발견, 배지와 주간 리포트를 모아봐요.</Text>
        </View>
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Button disabled={unreadCount === 0 || isLoading} onPress={handleMarkAllRead} variant="secondary">
          <View style={styles.buttonContent}>
            <CheckCheck color={theme.colors.primaryDark} size={17} />
            <Text style={styles.secondaryButtonText}>전체 읽음</Text>
          </View>
        </Button>
        <Button disabled={isLoading} onPress={refreshEvents} variant="secondary">
          <View style={styles.buttonContent}>
            <RefreshCw color={theme.colors.primaryDark} size={16} />
            <Text style={styles.secondaryButtonText}>새로고침</Text>
          </View>
        </Button>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <AlertCircle color={theme.colors.primary} size={18} />
          <View style={styles.errorCopy}>
            <Text style={styles.errorTitle}>{error.title}</Text>
            <Text style={styles.errorText}>{error.message}</Text>
          </View>
        </View>
      ) : null}

      {isLoading && events.length === 0 ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={theme.colors.primaryDark} size="small" />
          <Text style={styles.loadingText}>알림을 불러오는 중</Text>
        </View>
      ) : null}

      <View style={styles.eventStack}>
        {events.map((event) => {
          const Icon = getNotificationIcon(event.type);
          const isRead = readEventIdSet.has(event.id);

          return (
            <Pressable
              accessibilityLabel={`${event.title} 알림 열기`}
              accessibilityRole="button"
              key={event.id}
              onPress={() => handleOpenEvent(event)}
              style={({ pressed }) => [styles.eventCard, !isRead && styles.eventCardUnread, pressed && styles.pressed]}
            >
              <View style={[styles.eventIcon, !isRead && styles.eventIconUnread]}>
                <Icon color={theme.colors.primaryDark} size={18} />
              </View>
              <View style={styles.eventCopy}>
                <View style={styles.eventMetaRow}>
                  <Text style={styles.eventType}>{notificationTypeLabel[event.type]}</Text>
                  <Text style={styles.eventTime}>{formatNotificationTime(event.createdAt)}</Text>
                </View>
                <Text numberOfLines={2} style={styles.eventTitle}>
                  {event.title}
                </Text>
                <Text numberOfLines={2} style={styles.eventBody}>
                  {event.body}
                </Text>
                <Text style={styles.targetText}>{getNotificationTargetLabel(event)}</Text>
              </View>
              {!isRead ? <View style={styles.unreadDot} /> : null}
              <ChevronRight color={theme.colors.primaryDark} size={16} />
            </Pressable>
          );
        })}
      </View>

      {!isLoading && events.length === 0 ? (
        <View style={styles.emptyCard}>
          <BellRing color="#CDB58F" size={32} />
          <Text style={styles.emptyTitle}>아직 알림이 없어요</Text>
          <Text style={styles.emptyText}>동네 기록과 도감 활동이 쌓이면 이곳에서 다시 확인할 수 있어요.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 132,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: 'rgba(255,253,246,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.82)',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: theme.colors.text,
    fontSize: 25,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  summaryCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.86)',
    ...createShadow(6),
  },
  summaryIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: theme.colors.accentSoft,
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  summaryTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  summaryText: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  unreadBadge: {
    minWidth: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: theme.colors.primaryDark,
  },
  unreadBadgeText: {
    color: '#FFF8F0',
    fontSize: 13,
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  secondaryButtonText: {
    color: theme.colors.primaryDark,
    fontSize: 14,
    fontWeight: '900',
  },
  errorCard: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(255,239,221,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(196,122,66,0.18)',
  },
  errorCopy: {
    flex: 1,
    minWidth: 0,
  },
  errorTitle: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  errorText: {
    marginTop: 2,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  loadingCard: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(255,253,246,0.68)',
  },
  loadingText: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  eventStack: {
    gap: theme.spacing.md,
  },
  eventCard: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.74)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  eventCardUnread: {
    backgroundColor: 'rgba(255,247,236,0.94)',
    borderColor: 'rgba(196,122,66,0.18)',
    ...createShadow(4),
  },
  eventIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: 'rgba(248,234,210,0.72)',
  },
  eventIconUnread: {
    backgroundColor: theme.colors.accentSoft,
  },
  eventCopy: {
    flex: 1,
    minWidth: 0,
  },
  eventMetaRow: {
    minHeight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  eventType: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  eventTime: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
  },
  eventTitle: {
    marginTop: 5,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '900',
  },
  eventBody: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  targetText: {
    marginTop: 6,
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  emptyCard: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  emptyTitle: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 5,
    maxWidth: 260,
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.82,
  },
});
