import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserId } from '@/shared/api/auth.api';
import { validateObservationLayout, type ObservationPlacement } from './support-room-v3.layout';

// ponytail: 기기 로컬 전용, 서버 동기화 없음. support_room_placements.grid_x가
// integer라 V3의 0.5칸 좌표를 못 담는다 - 여러 기기 동기화가 필요해지면
// V3 전용 좌표 컬럼(numeric) 마이그레이션부터 해야 한다.
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
