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
    origin: { x: 619, y: 497 },
    axisX: { x: 64.5556, y: 34.5556 },
    axisY: { x: -63.1111, y: 34.5556 },
    hasAnnex: false,
  },
  stage1: {
    cols: 13,
    rows: 11,
    imageW: 1254,
    imageH: 1254,
    artBounds: { x: 29, y: 142, width: 1207, height: 1027 },
    origin: { x: 564, y: 466 },
    axisX: { x: 51.4615, y: 26.9231 },
    axisY: { x: -48.4545, y: 28.8182 },
    hasAnnex: false,
  },
  stage2: {
    cols: 18,
    rows: 13,
    imageW: 1254,
    imageH: 1254,
    artBounds: { x: 23, y: 144, width: 1214, height: 986 },
    origin: { x: 491, y: 407 },
    axisX: { x: 41.1667, y: 21.6667 },
    axisY: { x: -38.8333, y: 23.1667 },
    hasAnnex: false,
  },
  stage3: {
    cols: 27,
    rows: 14,
    imageW: 1254,
    imageH: 1254,
    artBounds: { x: 0, y: 173, width: 1239, height: 1081 },
    origin: { x: 409, y: 398 },
    axisX: { x: 30.6667, y: 15.0739 },
    axisY: { x: -30.0768, y: 19.3846 },
    hasAnnex: false,
  },
  stage4: {
    cols: 40,
    rows: 20,
    imageW: 1254,
    imageH: 1254,
    artBounds: { x: 15, y: 238, width: 1220, height: 818 },
    origin: { x: 363, y: 429 },
    axisX: { x: 21.2196, y: 8.878 },
    axisY: { x: -19.222, y: 12.1113 },
    hasAnnex: true,
  },
};
