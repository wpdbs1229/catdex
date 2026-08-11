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
 * 이 날짜부터의 만남만 '어디서 만났는지'를 믿을 수 있다. (YYYY-MM-DD)
 *
 * 그전 기록에는 만난 곳이 아니라 근거지가 찍혔고(detectEncounterNeighborhood
 * 이전), 동네 이름 형식도 제각각이다 - '부천시 중동 근처', '성수동', '태평로1가'가
 * 섞여 있어 저장된 근거지와 글자가 맞을 일이 없다. 그런 기록을 근거지와 대조하면
 * 전부 출장이 되어 실제 출장과 구분이 사라진다. 그래서 그 이전 것에는 아무
 * 표시도 하지 않는다.
 */
const ENCOUNTER_LOCATION_TRUSTED_SINCE = '2026-08-11';

/**
 * 이 만남의 기록된 장소를 믿어도 되는가.
 *
 * 날짜 문자열은 화면을 거치며 '2026.06.03'처럼 점으로 바뀌어 오기도 한다.
 * 그대로 문자열 비교를 하면 '.'(46)이 '-'(45)보다 커서 옛 날짜가 기준일보다
 * 크다고 나온다 - 전부 통과해 버린다. 그래서 구분자를 맞춘 뒤 비교한다.
 * 읽어 낼 수 없는 값은 믿지 않는다.
 */
export function isEncounterLocationTrusted(seenAt: string): boolean {
  const match = /^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/.exec(seenAt.trim());

  if (!match) {
    return false;
  }

  const isoDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;

  return isoDate >= ENCOUNTER_LOCATION_TRUSTED_SINCE;
}

/** 저장된 동네 목록. 최근에 활성으로 만든 순서다. */
export async function getSavedNeighborhoods(): Promise<SavedNeighborhood[]> {
  const userId = await getCurrentUserId();
  const state = await loadNeighborhoodState(userId).catch(() => null);

  return state?.savedNeighborhoods ?? [];
}

/**
 * 이미 저장된 동네를 다시 활성으로 만든다.
 *
 * 위치를 다시 읽지 않는다 - 서울에 앉아서 '성수동'을 고르는 것도 유효한 선택이고,
 * 그때마다 GPS로 덮어쓰면 목록을 두는 의미가 없다.
 */
export async function selectSavedNeighborhood(neighborhoodId: string): Promise<SavedNeighborhood | null> {
  const saved = await getSavedNeighborhoods();
  const target = saved.find((neighborhood) => neighborhood.id === neighborhoodId);

  if (!target) {
    return null;
  }

  return setActiveNeighborhood(target);
}

/**
 * 동네를 목록에서 뺀다. 마지막 하나는 지우지 않는다 - 근거지가 없으면 기록이
 * 전부 '동네 미지정'으로 쌓이고 출장 판정도 불가능해진다.
 */
export async function removeSavedNeighborhood(neighborhoodId: string): Promise<SavedNeighborhood[]> {
  const userId = await getCurrentUserId();
  const state = await loadNeighborhoodState(userId).catch(() => null);
  const saved = state?.savedNeighborhoods ?? [];

  if (saved.length <= 1) {
    return saved;
  }

  const remaining = saved.filter((neighborhood) => neighborhood.id !== neighborhoodId);
  const wasActive = state?.activeNeighborhoodId === neighborhoodId;
  const nextActive = wasActive ? remaining[0] : saved.find((n) => n.id === state?.activeNeighborhoodId);

  await saveNeighborhoodState(
    {
      activeNeighborhoodId: nextActive?.id ?? remaining[0]?.id ?? '',
      savedNeighborhoods: remaining,
    },
    userId,
  );

  if (userId) {
    syncMyNeighborhoods(
      remaining.map((item) => item.name),
      nextActive?.name ?? remaining[0]?.name,
      nextActive?.city ?? remaining[0]?.city,
    ).catch((error: unknown) => {
      console.warn('[neighborhood] server sync failed', error);
    });
  }

  return remaining;
}

/**
 * 내 근거지로 치는 동네 이름들.
 *
 * 출장인지 가를 때 활성 동네 하나만 보면 안 된다. 동네는 5개까지 저장되고,
 * 이사하거나 생활권이 둘인 사람은 활성 동네가 수시로 바뀐다. 그때마다 예전
 * 기록이 통째로 출장으로 뒤집히면 표시가 아니라 소음이 된다.
 */
export async function getHomeRegionNames(): Promise<Set<string>> {
  const userId = await getCurrentUserId();
  const state = await loadNeighborhoodState(userId).catch(() => null);

  return new Set((state?.savedNeighborhoods ?? []).map((neighborhood) => neighborhood.name));
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

