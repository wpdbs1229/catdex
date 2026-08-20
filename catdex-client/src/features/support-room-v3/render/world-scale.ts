import type { IsoProjection } from './projection';
import type { RoomStage } from './shells.generated';

/**
 * 방·가구·고양이가 함께 쓰는 단 하나의 world scale.
 *
 * 크기 기준자는 두 개뿐이다.
 *   가로 - tileW: 한 칸 다이아의 화면 폭. footprint가 있는 물체(가구)를 잰다.
 *   세로 - doorH: 셸에 그려진 문의 높이. footprint가 없는 물체(고양이)를 잰다.
 *
 * 예전에는 항목마다 visualScale을 0.56~0.72로 따로 만졌고, 그래서 같은
 * "한 칸짜리"인데도 물체마다 방을 채우는 정도가 제각각이었다. 지금 손으로
 * 정하는 값은 CAT_HEIGHT_IN_DOORS 하나뿐이고, 나머지는 전부 그림에서 잰 값이다.
 */

/**
 * 각 단계 셸에 그려진 문의 높이(원본 1254px 캔버스 기준).
 *
 * stage0은 아치 꼭대기 y=376, 문지방 중앙 y=729를 직접 재서 353이다.
 *
 * ponytail: stage1~4는 아직 재지 않았다. 화면이 stage0만 쓰기 때문이다
 * (IsoRoomSpikeScreen의 STAGE 상수). 그 단계를 열 때 같은 방법으로 재서
 * 이 표만 채우면 되고, 그때까지는 stage0 비율로 근사한다.
 */
const MEASURED_DOOR_HEIGHT: Partial<Record<RoomStage, number>> = {
  stage0: 353,
};

/** stage0에서 잰 문높이 / artBounds 높이. 미측정 단계의 근사에 쓴다. */
const DOOR_TO_ART_HEIGHT = 353 / 1100;

/**
 * 앉은 고양이의 키를 문 높이의 몇 배로 볼지.
 *
 * 이 파일에서 손으로 정하는 유일한 값이다. 실제 고양이는 문의 0.2 정도지만
 * 이 그림체는 캐릭터를 크게 그리므로 조금 키운다. 예전 코드는 이 값이
 * 사실상 0.55였고(문 높이의 절반), 그래서 고양이가 방을 압도했다.
 */
export const CAT_HEIGHT_IN_DOORS = 0.32;

/**
 * 가구가 자기 footprint 다이아를 채우는 비율. 1.0이면 칸에 꽉 차서 서로
 * 붙어 보이므로 살짝 줄인다. 모든 가구가 이 값 하나를 공유한다.
 */
export const FURNITURE_TILE_FILL = 0.9;

/**
 * 가구가 문보다 커지지 않게 하는 상한.
 *
 * 크기를 footprint 폭으로만 정하면 스탠드처럼 가늘고 높은 그림이 폭을 채우려다
 * 세로로 폭주한다(실제로 조명 스탠드가 문 높이의 1.19배로 그려졌다).
 * 방 안의 어떤 가구도 문틀보다 높지 않다는 규칙 하나로 막는다.
 */
export const FURNITURE_MAX_HEIGHT_IN_DOORS = 0.95;

export interface WorldScale {
  /** 한 칸 다이아의 화면 폭 */
  tileW: number;
  /** 한 칸 다이아의 화면 높이 */
  tileH: number;
  /** 셸에 그려진 문의 화면 높이 */
  doorH: number;
  /** 앉은 고양이 한 마리의 화면 높이. 모든 고양이가 이 값을 목표로 그려진다. */
  catH: number;
  /** 가구가 넘을 수 없는 화면 높이 */
  maxFurnitureH: number;
}

export function createWorldScale(projection: IsoProjection): WorldScale {
  const measured = MEASURED_DOOR_HEIGHT[projection.stage];
  const doorSourceH = measured ?? projection.geometry.artBounds.height * DOOR_TO_ART_HEIGHT;
  const doorH = doorSourceH * projection.scale;

  return {
    tileW: projection.tileW,
    tileH: projection.tileH,
    doorH,
    catH: doorH * CAT_HEIGHT_IN_DOORS,
    maxFurnitureH: doorH * FURNITURE_MAX_HEIGHT_IN_DOORS,
  };
}
