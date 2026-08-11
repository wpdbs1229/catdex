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
 * 이 만남을 어디서 기록할지.
 *
 * 활성 동네는 '내가 활동하는 근거지'(지부·발견 알림 대상)이지, '이 고양이를 만난
 * 곳'이 아니다. 둘을 같은 값으로 쓰면 부천 사는 사람이 서울에서 찍은 고양이가
 * 부천에 등록된다 — 지도에 엉뚱한 자리에 찍히고, 동일 개체 후보를 부천에서만
 * 찾으니 서울에 이미 있는 그 고양이와 영영 매칭되지 않아 중복이 생긴다.
 *
 * 그래서 지금 서 있는 곳을 쓰되 **활성 동네로 저장하지 않는다.** 출장지에서
 * 한 장 찍었다고 근거지가 따라 옮겨 가면 안 된다.
 *
 * 위치를 못 읽으면(권한 거부·실내 오차) 근거지로 대신한다. 대개 집 근처에서
 * 찍으므로 '동네 미지정'으로 버리는 것보다 맞을 확률이 높다.
 */
export async function detectEncounterNeighborhood(): Promise<SavedNeighborhood | null> {
  try {
    const { neighborhood } = await detectCurrentNeighborhood();

    return neighborhood;
  } catch (error) {
    console.warn('[neighborhood] encounter detect failed, falling back to active', error);

    return getActiveNeighborhood();
  }
}

