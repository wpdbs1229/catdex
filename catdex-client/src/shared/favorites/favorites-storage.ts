import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/shared/supabase/client';

const STORAGE_KEY = 'catdex.favorites.v1';

// 서버에 즐겨찾기 테이블이 아직 없어서 기기에만 보관한다.
// 같은 기기에서 계정을 바꿔도 이전 사용자의 목록이 보이지 않도록
// 동네 목록(neighborhood-storage)과 같은 방식으로 사용자별 키를 쓴다.
async function getStorageKey() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  return userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
}

function parseCatIds(rawValue: string | null) {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((catId): catId is string => typeof catId === 'string' && catId.length > 0);
  } catch {
    return [];
  }
}

export async function loadFavoriteCatIds(): Promise<Set<string>> {
  const rawValue = await AsyncStorage.getItem(await getStorageKey());

  return new Set(parseCatIds(rawValue));
}

export async function saveFavoriteCatIds(catIds: Set<string>): Promise<void> {
  await AsyncStorage.setItem(await getStorageKey(), JSON.stringify([...catIds]));
}
