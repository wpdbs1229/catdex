import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { registerPushDevice } from '@/shared/api/notifications.api';

export type PushPermissionState = 'granted' | 'denied' | 'undetermined';

function currentPlatform(): 'ios' | 'android' | 'web' {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return Platform.OS;
  }

  return 'web';
}

export async function getPushPermissionState(): Promise<PushPermissionState> {
  const { status } = await Notifications.getPermissionsAsync();

  if (status === 'granted') {
    return 'granted';
  }

  return status === 'denied' ? 'denied' : 'undetermined';
}

/**
 * 권한을 묻고 토큰을 등록한다.
 * 시스템 권한 창은 한 번 거부하면 다시 띄울 수 없으므로, 앱 진입이 아니라
 * 사용자가 알림 스위치를 처음 켤 때만 부른다.
 */
export async function requestPushPermissionAndRegister(): Promise<PushPermissionState> {
  const existing = await getPushPermissionState();
  let state = existing;

  if (existing === 'undetermined') {
    const { status } = await Notifications.requestPermissionsAsync();
    state = status === 'granted' ? 'granted' : 'denied';
  }

  if (state !== 'granted') {
    return state;
  }

  await syncPushToken();

  return 'granted';
}

/** 이미 권한이 있을 때 토큰만 갱신한다(포그라운드 복귀 등). */
export async function syncPushToken() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '기본 알림',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync();

  if (!token) {
    return;
  }

  await registerPushDevice(token, currentPlatform());
}
