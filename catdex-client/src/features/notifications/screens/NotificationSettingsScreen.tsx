import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getPushPermissionState, requestPushPermissionAndRegister } from '@/features/notifications/push';
import { fetchMyNotificationSettings, updateMyNotificationSettings } from '@/shared/api/notifications.api';
import { getUserFacingErrorMessage } from '@/shared/errors/user-facing-error';
import { createNdShadow, nd } from '@/shared/styles/theme';
import {
  defaultNotificationSettings,
  notificationCategoryLabels,
  type NotificationCategory,
  type NotificationSettings,
} from '@/shared/types/notification';

const rows: NotificationCategory[] = ['discovery', 'activity', 'marketing'];

const settingKeys: Record<NotificationCategory, keyof NotificationSettings> = {
  discovery: 'discoveryEnabled',
  activity: 'activityEnabled',
  marketing: 'marketingEnabled',
};

/** 피그마 마이페이지_알림 (199:3364) */
export function NotificationSettingsScreen() {
  const navigation = useNavigation();
  const [settings, setSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isActive = true;

    fetchMyNotificationSettings()
      .then((next) => {
        if (isActive) {
          setSettings(next);
        }
      })
      .catch((error: unknown) => {
        console.warn('[notifications] settings load failed', error);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const anyEnabled = (value: NotificationSettings) =>
    value.discoveryEnabled || value.activityEnabled || value.marketingEnabled;

  const toggle = async (category: NotificationCategory, nextValue: boolean) => {
    const previous = settings;
    const next = { ...settings, [settingKeys[category]]: nextValue };

    // 서버 응답을 기다리면 스위치가 굼떠 보이므로 먼저 바꾸고, 실패하면 되돌린다.
    setSettings(next);
    setIsSaving(true);

    try {
      // 하나라도 켜는 순간이 권한을 묻기 좋은 시점이다. 켤 때만 묻는다.
      if (nextValue && !anyEnabled(previous)) {
        const state = await requestPushPermissionAndRegister();

        if (state === 'denied') {
          Alert.alert(
            '알림이 꺼져 있어요',
            '기기 설정에서 냥도감 알림을 허용해야 받을 수 있어요.',
            [
              { text: '나중에', style: 'cancel' },
              { text: '설정 열기', onPress: () => void Linking.openSettings() },
            ],
          );
        }
      }

      const saved = await updateMyNotificationSettings(next);
      setSettings(saved);
    } catch (error) {
      setSettings(previous);
      Alert.alert('알림 설정 저장 실패', getUserFacingErrorMessage(error, 'notification.save'));
    } finally {
      setIsSaving(false);
    }
  };

  // 권한이 이미 있으면 토큰이 최신인지 조용히 확인한다.
  useEffect(() => {
    getPushPermissionState()
      .then((state) => {
        if (state === 'granted') {
          return requestPushPermissionAndRegister();
        }

        return undefined;
      })
      .catch((error: unknown) => {
        console.warn('[notifications] token sync failed', error);
      });
  }, []);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="뒤로 가기"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <ArrowLeft color={nd.colors.ink} size={20} strokeWidth={1.8} />
        </Pressable>
        <Text style={styles.title}>알림 설정</Text>
        {/* 시안에서 오른쪽 버튼은 자리만 잡는 투명 요소다. */}
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.card}>
        {rows.map((category) => {
          const label = notificationCategoryLabels[category];
          const value = settings[settingKeys[category]];

          return (
            <View key={category} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{label.title}</Text>
                <Text style={styles.rowDescription}>{label.description}</Text>
              </View>
              <Switch
                accessibilityLabel={label.title}
                disabled={isSaving}
                ios_backgroundColor={nd.colors.tagMuted}
                onValueChange={(next) => void toggle(category, next)}
                style={styles.switch}
                thumbColor="#FFFFFF"
                trackColor={{ false: nd.colors.tagMuted, true: nd.colors.switchOn }}
                value={value}
              />
            </View>
          );
        })}
      </View>

      <Text style={styles.notice}>
        이벤트 혜택 알림은 광고성 정보 수신 동의에 해당해요. 언제든 여기서 끌 수 있어요.
      </Text>
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
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    ...createNdShadow(0.08, 6),
  },
  headerSpacer: {
    width: 44,
    height: 44,
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
  card: {
    marginTop: 16,
    marginHorizontal: 20,
    borderRadius: 20,
    backgroundColor: nd.colors.bg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  rowTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    letterSpacing: -0.4,
    color: nd.colors.ink,
  },
  rowDescription: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.35,
    color: nd.colors.sub,
  },
  // 시안 스위치는 40x24이고 RN 기본은 51x31이라 줄여 맞춘다.
  switch: {
    transform: [{ scale: 0.78 }],
  },
  notice: {
    marginTop: 16,
    paddingHorizontal: 28,
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.325,
    color: nd.colors.subtle,
  },
});
