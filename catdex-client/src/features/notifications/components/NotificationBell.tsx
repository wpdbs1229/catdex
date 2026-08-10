import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bell } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { RootStackParamList } from '@/app/navigation/types';
import { fetchUnreadNotificationCount } from '@/shared/api/notifications.api';
import { nd } from '@/shared/styles/theme';

/** 홈·동네 헤더의 알림 벨. 빨간 점은 읽지 않은 알림이 있을 때만 켜진다. */
export function NotificationBell() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      fetchUnreadNotificationCount()
        .then((count) => {
          if (isActive) {
            setUnreadCount(count);
          }
        })
        .catch((error: unknown) => {
          console.warn('[notifications] unread count failed', error);
        });

      return () => {
        isActive = false;
      };
    }, []),
  );

  return (
    <Pressable
      accessibilityLabel={unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}개` : '알림 보기'}
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => navigation.navigate('NotificationInbox')}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Bell color={nd.colors.ink} size={24} strokeWidth={1.8} />
      {unreadCount > 0 ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 2,
  },
  pressed: {
    opacity: 0.88,
  },
  dot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ED1C24',
  },
});
