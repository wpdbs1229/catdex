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
 * 나머지는 각 셸에서 잰 문 밑선 길이(문 폭)에 stage0의 높이/폭 비(2.33)를
 * 곱해서 냈다. 문 그림은 단계가 달라도 같으므로 이 비는 유지된다.
 *
 *   폭 stage0 151.6 · stage1 118.6 · stage2 90.6 · stage3 69.5 · stage4 46.1
 *
 * 예전에는 artBounds 높이에 비례한다고 근사했는데, 방이 커질수록 셸이 작게
 * 그려지는 걸 반영하지 못해 stage4에서 문높이를 2.45배로 잡았다.
 * 고양이 크기가 여기서 나오므로 고양이가 그만큼 커져 있었다.
 */
const MEASURED_DOOR_HEIGHT: Record<RoomStage, number> = {
  stage0: 353,
  stage1: 276,
  stage2: 211,
  stage3: 162,
  stage4: 107,
};

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
  const doorH = MEASURED_DOOR_HEIGHT[projection.stage] * projection.scale;

  return {
    tileW: projection.tileW,
    tileH: projection.tileH,
    doorH,
    catH: doorH * CAT_HEIGHT_IN_DOORS,
    maxFurnitureH: doorH * FURNITURE_MAX_HEIGHT_IN_DOORS,
  };
}
