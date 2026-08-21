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
    cols: 9,
    rows: 9,
    imageW: 1254,
    imageH: 1254,
    artBounds: { x: 48, y: 77, width: 1158, height: 1100 },
    origin: { x: 652, y: 488 },
    axisX: { x: 54.7658, y: 36.7128 },
    axisY: { x: -58.0345, y: 38.5284 },
    hasAnnex: false,
  },
  stage1: {
    cols: 13,
    rows: 11,
    imageW: 1254,
    imageH: 1254,
    artBounds: { x: 29, y: 142, width: 1207, height: 1027 },
    origin: { x: 601, y: 457 },
    axisX: { x: 45.2906, y: 28.3667 },
    axisY: { x: -46.5198, y: 30.3898 },
    hasAnnex: false,
  },
  stage2: {
    cols: 18,
    rows: 13,
    imageW: 1254,
    imageH: 1254,
    artBounds: { x: 23, y: 144, width: 1214, height: 986 },
    origin: { x: 522, y: 389 },
    axisX: { x: 37.3214, y: 23.5637 },
    axisY: { x: -34.8838, y: 23.555 },
    hasAnnex: false,
  },
  stage3: {
    cols: 27,
    rows: 14,
    imageW: 1254,
    imageH: 1254,
    artBounds: { x: 0, y: 173, width: 1239, height: 1081 },
    origin: { x: 442, y: 363 },
    axisX: { x: 28.0825, y: 17.5919 },
    axisY: { x: -27.8118, y: 19.8656 },
    hasAnnex: false,
  },
  stage4: {
    cols: 40,
    rows: 20,
    imageW: 1254,
    imageH: 1254,
    artBounds: { x: 0, y: 192, width: 1228, height: 1062 },
    origin: { x: 428, y: 384 },
    axisX: { x: 19.1016, y: 12.6334 },
    axisY: { x: -17.97, y: 12.5597 },
    hasAnnex: true,
  },
};
