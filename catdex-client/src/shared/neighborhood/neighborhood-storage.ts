import AsyncStorage from '@react-native-async-storage/async-storage';
import { MAX_SAVED_NEIGHBORHOODS, type SavedNeighborhood } from '@/shared/types/neighborhood';

const STORAGE_KEY = 'catdex.neighborhoods.v1';

// 같은 기기에서 계정을 전환해도 이전 사용자의 동네 목록이 보이지 않도록
// 사용자별 키로 분리한다. 기존(전역) 키는 최초 1회 마이그레이션으로 읽는다.
function getStorageKey(userId?: string | null) {
  return userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
}

interface StoredNeighborhoodState {
  activeNeighborhoodId: string;
  savedNeighborhoods: SavedNeighborhood[];
}

function sanitizeNeighborhoods(value: SavedNeighborhood[]) {
  const seen = new Set<string>();
  const neighborhoods: SavedNeighborhood[] = [];

  for (const neighborhood of value) {
    if (!neighborhood.id || seen.has(neighborhood.id)) {
      continue;
    }

    seen.add(neighborhood.id);
    neighborhoods.push({
      ...neighborhood,
      cats: [],
    });

    if (neighborhoods.length >= MAX_SAVED_NEIGHBORHOODS) {
      break;
    }
  }

  return neighborhoods;
}

export async function loadNeighborhoodState(userId?: string | null): Promise<StoredNeighborhoodState> {
  let rawValue = await AsyncStorage.getItem(getStorageKey(userId));

  // 사용자별 키가 비어 있으면 구버전 전역 키에서 마이그레이션한다.
  if (!rawValue && userId) {
    const legacyValue = await AsyncStorage.getItem(STORAGE_KEY);

    if (legacyValue) {
      rawValue = legacyValue;
      await AsyncStorage.setItem(getStorageKey(userId), legacyValue).catch(() => undefined);
      await AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
    }
  }

  if (!rawValue) {
    return {
      activeNeighborhoodId: '',
      savedNeighborhoods: [],
    };
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<StoredNeighborhoodState>;
    const savedNeighborhoods = sanitizeNeighborhoods(parsed.savedNeighborhoods ?? []);
    const activeNeighborhoodId = savedNeighborhoods.some((neighborhood) => neighborhood.id === parsed.activeNeighborhoodId)
      ? (parsed.activeNeighborhoodId as string)
      : (savedNeighborhoods[0]?.id ?? '');

    return {
      activeNeighborhoodId,
      savedNeighborhoods,
    };
  } catch {
    return {
      activeNeighborhoodId: '',
      savedNeighborhoods: [],
    };
  }
}

export async function saveNeighborhoodState(state: StoredNeighborhoodState, userId?: string | null) {
  await AsyncStorage.setItem(
    getStorageKey(userId),
    JSON.stringify({
      activeNeighborhoodId: state.activeNeighborhoodId,
      savedNeighborhoods: sanitizeNeighborhoods(state.savedNeighborhoods),
    }),
  );
}
