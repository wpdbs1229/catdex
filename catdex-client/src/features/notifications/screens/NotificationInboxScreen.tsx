import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Bell, Settings } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '@/app/navigation/types';
import { useGoBackOrHome } from '@/app/navigation/useGoBackOrHome';
import { fetchMyNotifications, markNotificationsRead } from '@/shared/api/notifications.api';
import { createNdShadow, nd } from '@/shared/styles/theme';
import type { NotificationItem } from '@/shared/types/notification';

function formatRelativeTime(isoDate: string) {
  const created = new Date(isoDate).getTime();

  if (Number.isNaN(created)) {
    return '';
  }

  const minutes = Math.floor((Date.now() - created) / 60000);

  if (minutes < 1) {
    return '방금';
  }

  if (minutes < 60) {
    return `${minutes}분 전`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}시간 전`;
  }

  const days = Math.floor(hours / 24);

  return days < 7 ? `${days}일 전` : new Date(isoDate).toLocaleDateString('ko-KR');
}

/**
 * 알림함. 시안에는 없는 화면이라 nd 토큰으로 시안 톤에 맞춰 새로 그렸다.
 * 헤더 벨의 빨간 점이 가리키는 곳이 여기다.
 */
export function NotificationInboxScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const goBack = useGoBackOrHome();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      fetchMyNotifications()
        .then((next) => {
          if (!isActive) {
            return;
          }

          setNotifications(next);

          // 목록을 연 시점에 읽음으로 본다. 실패해도 화면은 그대로 둔다.
          if (next.some((item) => !item.readAt)) {
            markNotificationsRead().catch((error: unknown) => {
              console.warn('[notifications] mark read failed', error);
            });
          }
        })
        .catch((error: unknown) => {
          console.warn('[notifications] inbox load failed', error);
        });

      return () => {
        isActive = false;
      };
    }, []),
  );

  const openTarget = (item: NotificationItem) => {
    const catId = typeof item.data.catId === 'string' ? item.data.catId : undefined;

    if (catId) {
      navigation.navigate('CatDetail', { catId });
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="뒤로 가기"
          accessibilityRole="button"
          onPress={goBack}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <ArrowLeft color={nd.colors.ink} size={20} strokeWidth={1.8} />
        </Pressable>
        <Text style={styles.title}>알림</Text>
        <Pressable
          accessibilityLabel="알림 설정"
          accessibilityRole="button"
          onPress={() => navigation.navigate('NotificationSettings')}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Settings color={nd.colors.ink} size={20} strokeWidth={1.8} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {notifications.length > 0 ? (
          notifications.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => openTarget(item)}
              style={({ pressed }) => [styles.card, !item.readAt && styles.cardUnread, pressed && styles.pressed]}
            >
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardTime}>{formatRelativeTime(item.createdAt)}</Text>
              </View>
              <Text style={styles.cardBody}>{item.body}</Text>
            </Pressable>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Bell color={nd.colors.subtle} size={38} strokeWidth={1.6} />
            <Text style={styles.emptyTitle}>아직 받은 알림이 없어요</Text>
            <Text style={styles.emptyText}>동네에 새 고양이가 나타나거나 내 기록에 반응이 오면 여기에 쌓여요.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nd.colors.bgSecondary,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    ...createNdShadow(0.08, 6),
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.5,
    color: nd.colors.ink,
  },
  pressed: {
    opacity: 0.88,
  },
  content: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 8,
  },
  card: {
    borderRadius: 20,
    backgroundColor: nd.colors.bg,
    padding: 20,
    gap: 6,
  },
  cardUnread: {
    borderWidth: 1,
    borderColor: nd.colors.primarySoft,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    letterSpacing: -0.4,
    color: nd.colors.ink,
  },
  cardTime: {
    fontSize: 13,
    lineHeight: 19,
    color: nd.colors.subtle,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.35,
    color: nd.colors.sub,
  },
  emptyState: {
    marginTop: 40,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '600',
    color: nd.colors.ink,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: nd.colors.sub,
  },
});
