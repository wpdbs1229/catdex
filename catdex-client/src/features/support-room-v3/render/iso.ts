/**
 * 아이소메트릭 투영 상수와 좌표 변환 (docs/16 §2).
 * 2:1 다이아이므로 벽 기울기는 atan(0.5) = 26.565°로 고정된다.
 */

export type IsoWall = 'right' | 'left';

export const ISO = {
  /** 셀 다이아의 화면 폭. 높이는 항상 절반. */
  tileW: 64,
  get tileH() {
    return this.tileW / 2;
  },
  /** 원본 타일 좌표계에서의 셀 한 변 (다이아 사영 전) */
  get cellSrc() {
    return this.tileW / Math.SQRT2;
  },
  skewDeg: 26.565,
  /** 벽 전체 높이 */
  wallH: 150,
  /** 하부 와인스코트 높이 */
  wainscotH: 54,
  /** 벽 상단 우드 캡 */
  capH: 12,
  baseboardH: 9,
  /** 바닥 우드 프레임 두께(타일 좌표계) */
  floorRim: 22,
  /** 컷어웨이 단면 두께 */
  platformH: 16,
  /** 월드 캔버스 */
  worldW: 780,
  worldH: 1020,
  originX: 390,
  originY: 330,
} as const;

export function isoPoint(x: number, y: number): { x: number; y: number } {
  return {
    x: ISO.originX + ((x - y) * ISO.tileW) / 2,
    y: ISO.originY + ((x + y) * ISO.tileH) / 2,
  };
}

/** 깊이 정렬 키. 앞칸(x+y가 큰 쪽)이 위로 온다. */
export function isoDepth(x: number, y: number): number {
  return Math.round((x + y) * 10) + 100;
}
