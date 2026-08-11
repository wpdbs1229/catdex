import { getCurrentUserId } from '@/shared/api/auth.api';
import { syncMyNeighborhoods } from '@/shared/api/notifications.api';
import { detectCurrentNeighborhood } from '@/shared/neighborhood/neighborhood-location';
import { loadNeighborhoodState, saveNeighborhoodState } from '@/shared/neighborhood/neighborhood-storage';
import { MAX_SAVED_NEIGHBORHOODS, type SavedNeighborhood } from '@/shared/types/neighborhood';

/** 아직 동네를 못 정했을 때 헤더에 쓰는 이름. */
export const UNSET_NEIGHBORHOOD_NAME = '내 동네';

/** 촬영·만남 기록을 남길 때 동네가 없으면 서버에 넣는 값. */
export const UNSET_REGION_NAME = '동네 미지정';

/**
 * 지금 선택된 동네. 저장된 목록이 비어 있으면 null이다.
 * 홈·지도·촬영·도감 상세가 모두 같은 판단을 하도록 여기로 모았다.
 */
export async function getActiveNeighborhood(): Promise<SavedNeighborhood | null> {
  const userId = await getCurrentUserId();
  const state = await loadNeighborhoodState(userId).catch(() => null);

  if (!state) {
    return null;
  }

  return (
    state.savedNeighborhoods.find((neighborhood) => neighborhood.id === state.activeNeighborhoodId) ??
    state.savedNeighborhoods[0] ??
    null
  );
}

/**
 * 동네를 선택 상태로 만든다. 이미 있던 동네면 위치만 갱신하고 맨 앞으로 올린다.
 * 목록은 최근 순으로 MAX_SAVED_NEIGHBORHOODS개까지만 남는다.
 */
export async function setActiveNeighborhood(neighborhood: SavedNeighborhood) {
  const userId = await getCurrentUserId();
  const state = await loadNeighborhoodState(userId).catch(() => null);
  const others = (state?.savedNeighborhoods ?? []).filter((saved) => saved.id !== neighborhood.id);
  const saved = [neighborhood, ...others].slice(0, MAX_SAVED_NEIGHBORHOODS);

  await saveNeighborhoodState(
    {
      activeNeighborhoodId: neighborhood.id,
      savedNeighborhoods: saved,
    },
    userId,
  );

  // 발견 알림을 누구에게 보낼지 서버가 알아야 한다. 좌표는 보내지 않고 이름만 올린다.
  // 실패해도 동네 자체는 기기에 저장됐으므로 화면 흐름은 막지 않는다.
  if (userId) {
    syncMyNeighborhoods(
      saved.map((item) => item.name),
      neighborhood.name,
      neighborhood.city,
    ).catch((error: unknown) => {
      console.warn('[neighborhood] server sync failed', error);
    });
  }

  return neighborhood;
}

/**
 * 기록을 남기기 직전에 동네가 비어 있을 때 쓰는 마지막 시도.
 * 권한이 없거나 행정동을 못 읽으면 흐름을 막지 않고 null을 돌려준다.
 */
export async function detectAndSaveNeighborhood(): Promise<SavedNeighborhood | null> {
  try {
    const { neighborhood } = await detectCurrentNeighborhood();

    return await setActiveNeighborhood(neighborhood);
  } catch (error) {
    console.warn('[neighborhood] detect failed', error);

    return null;
  }
}
