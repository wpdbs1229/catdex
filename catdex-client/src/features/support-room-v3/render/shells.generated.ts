/**
 * 이 파일은 scripts/measure-room-shells.py가 생성한다. 손으로 고치지 말 것.
 * 각 단계의 바닥 뒤쪽 꼭짓점과 두 축의 한 칸 벡터를 실측한 결과다.
 */

export type RoomStage = 'stage0' | 'stage1' | 'stage2' | 'stage3' | 'stage4';

export interface ShellPoint { x: number; y: number }
export interface ShellBounds { x: number; y: number; width: number; height: number }
export interface ShellGeometry {
  cols: number;
  rows: number;
  imageW: number;
  imageH: number;
  artBounds: ShellBounds;
  origin: ShellPoint;
  axisX: ShellPoint;
  axisY: ShellPoint;
  hasAnnex: boolean;
}

export const SHELL_GEOMETRY: Record<RoomStage, ShellGeometry> = {
  stage0: {
    cols: 8,
    rows: 8,
    imageW: 1254,
    imageH: 1254,
    artBounds: { x: 48, y: 77, width: 1158, height: 1100 },
    origin: { x: 619, y: 497 },
    axisX: { x: 72.625, y: 38.875 },
    axisY: { x: -71, y: 38.875 },
    hasAnnex: false,
  },
  stage1: {
    cols: 10,
    rows: 8,
    imageW: 1254,
    imageH: 1254,
    artBounds: { x: 29, y: 142, width: 1207, height: 1027 },
    origin: { x: 564, y: 466 },
    axisX: { x: 66.9, y: 35 },
    axisY: { x: -66.625, y: 39.625 },
    hasAnnex: false,
  },
  stage2: {
    cols: 12,
    rows: 8,
    imageW: 1254,
    imageH: 1254,
    artBounds: { x: 23, y: 144, width: 1214, height: 986 },
    origin: { x: 491, y: 407 },
    axisX: { x: 61.75, y: 32.5 },
    axisY: { x: -58.25, y: 34.75 },
    hasAnnex: false,
  },
  stage3: {
    cols: 14,
    rows: 7,
    imageW: 1254,
    imageH: 1254,
    artBounds: { x: 0, y: 173, width: 1239, height: 1081 },
    origin: { x: 409, y: 398 },
    axisX: { x: 59.143, y: 29.071 },
    axisY: { x: -55.857, y: 36 },
    hasAnnex: false,
  },
  stage4: {
    cols: 14,
    rows: 6,
    imageW: 1254,
    imageH: 1254,
    artBounds: { x: 15, y: 238, width: 1220, height: 818 },
    origin: { x: 363, y: 429 },
    axisX: { x: 62.143, y: 26 },
    axisY: { x: -57.666, y: 36.334 },
    hasAnnex: true,
  },
};
