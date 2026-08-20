import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserId } from '@/shared/api/auth.api';
import { validateObservationLayout, type ObservationPlacement } from './support-room-v3.layout';

// 서버(support_room_v3_placements)가 정본이다. 여기는 오프라인 표시용
// 캐시일 뿐 - 화면이 뜨자마자 보여줄 값을 담아두고, 서버 응답이 오면
// 덮어쓴다. support-room-v3.api.ts의 fetch/save와 짝을 이룬다.
const KEY_PREFIX = 'catdex.supportRoomV3.placements';

export async function loadV3Placements(): Promise<ObservationPlacement[] | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  try {
    const raw = await AsyncStorage.getItem(`${KEY_PREFIX}:${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ObservationPlacement[];
    return validateObservationLayout(parsed).length === 0 ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveV3Placements(placements: readonly ObservationPlacement[]): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  try {
    await AsyncStorage.setItem(`${KEY_PREFIX}:${userId}`, JSON.stringify(placements));
  } catch (error) {
    console.warn('[support-room-v3] save placements failed', error);
  }
}

const ONBOARDING_KEY = 'catdex.supportRoomV3.onboarded';

/** 첫 진입 안내를 이미 봤는지. 사용자별로 한 번만 띄운다. */
export async function hasSeenRoomOnboarding(): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return true;
  try {
    return (await AsyncStorage.getItem(`${ONBOARDING_KEY}:${userId}`)) === 'true';
  } catch {
    return true;
  }
}

export async function markRoomOnboardingSeen(): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  try {
    await AsyncStorage.setItem(`${ONBOARDING_KEY}:${userId}`, 'true');
  } catch (error) {
    console.warn('[support-room-v3] onboarding flag save failed', error);
  }
}
