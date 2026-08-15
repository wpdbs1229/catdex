import type { CatMapPoint } from '@/features/map/components/KakaoMapView';
import type { Cat } from '@/shared/types/cat';

/** 고양이별 흩뿌림 반경. 닻(실제 지점 또는 구역 중심)에서 이 안쪽에 찍힌다. */
export const CAT_SCATTER_RADIUS_M = 100;

/** 문자열을 0~1 사이 값으로 접는다. FNV-1a. */
function hashToUnit(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967296;
}

/**
 * 고양이 발자국이 찍힐 자리.
 *
 * 닻은 실제로 만난 지점(있으면)이고, 좌표를 남기기 전의 기록은 구역 중심이다.
 * 어느 쪽이든 그대로 찍지 않고 고양이 id로 정한 방향·거리만큼 옮긴다. 난수
 * 대신 해시를 쓰는 이유는 두 가지다 - 새로 그릴 때마다 발자국이 널뛰면 안
 * 되고, 같은 고양이는 늘 같은 자리에 보여야 한다. 정확한 지점을 숨기는 것도
 * 이 오프셋의 몫이다. sqrt는 원판에 고르게 퍼지게 하는 보정이다.
 */
export function scatterCatPoint(
  cat: Cat | undefined,
  catId: string,
  regionId: string,
  regionLat: number,
  regionLng: number,
): CatMapPoint {
  const anchorLat = cat?.lastSeenLat ?? regionLat;
  const anchorLng = cat?.lastSeenLng ?? regionLng;
  const angle = hashToUnit(catId) * Math.PI * 2;
  const distance = Math.sqrt(hashToUnit(`${catId}:distance`)) * CAT_SCATTER_RADIUS_M;
  const latOffset = (distance * Math.cos(angle)) / 111320;
  const lngOffset = (distance * Math.sin(angle)) / (111320 * Math.cos((anchorLat * Math.PI) / 180));

  return {
    catId,
    regionId,
    lat: anchorLat + latOffset,
    lng: anchorLng + lngOffset,
  };
}
