import { createContext, useContext } from 'react';
import { SHELL_GEOMETRY, type RoomStage, type ShellGeometry } from './shells.generated';

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ProjectedFootprint {
  corners: readonly [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
  center: ScreenPoint;
  /**
   * 물체가 바닥에 닿는 기준점 = footprint 다이아의 중심.
   * 예전엔 "중심에서 앞 모서리 쪽으로 70%"라는 눈대중 값이었는데, 그러면
   * footprint가 깊을수록 물체가 앞으로 밀려 격자와 어긋났다.
   */
  ground: ScreenPoint;
}

export interface IsoProjection {
  stage: RoomStage;
  geometry: ShellGeometry;
  scale: number;
  /** 한 셀 다이아의 화면상 전체 폭·높이(두 축 벡터 합) */
  tileW: number;
  tileH: number;
  point: (x: number, y: number) => ScreenPoint;
  footprint: (x: number, y: number, width: number, depth: number) => ProjectedFootprint;
  /** point()의 역변환. 화면 픽셀 드래그량을 그리드 칸 이동량으로 바꾼다. */
  screenDeltaToGrid: (dxScreen: number, dyScreen: number) => { dx: number; dy: number };
  /** 투명 여백을 제외하고 실제로 표시되는 셸 크기 */
  displayW: number;
  displayH: number;
  /** 원본 1254 캔버스를 artBounds 안에 맞춰 그릴 때의 위치·크기 */
  imageFrame: { left: number; top: number; width: number; height: number };
}

function footprintFromPoints(
  corners: readonly [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint],
): ProjectedFootprint {
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const center = {
    x: corners.reduce((sum, point) => sum + point.x, 0) / corners.length,
    y: corners.reduce((sum, point) => sum + point.y, 0) / corners.length,
  };
  return {
    corners,
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    center,
    ground: center,
  };
}

export function createProjection(stage: RoomStage, scale: number): IsoProjection {
  const geometry = SHELL_GEOMETRY[stage];
  const bounds = geometry.artBounds;
  const point = (x: number, y: number): ScreenPoint => ({
    x:
      (geometry.origin.x + x * geometry.axisX.x + y * geometry.axisY.x - bounds.x) *
      scale,
    y:
      (geometry.origin.y + x * geometry.axisX.y + y * geometry.axisY.y - bounds.y) *
      scale,
  });

  // point()가 쓰는 2×2 행렬 [axisX axisY]의 역행렬. 화면 델타 → 그리드 델타.
  const det =
    geometry.axisX.x * geometry.axisY.y - geometry.axisY.x * geometry.axisX.y;
  const screenDeltaToGrid = (dxScreen: number, dyScreen: number) => {
    const sx = dxScreen / scale;
    const sy = dyScreen / scale;
    return {
      dx: (geometry.axisY.y * sx - geometry.axisY.x * sy) / det,
      dy: (geometry.axisX.x * sy - geometry.axisX.y * sx) / det,
    };
  };

  return {
    stage,
    geometry,
    scale,
    tileW: (Math.abs(geometry.axisX.x) + Math.abs(geometry.axisY.x)) * scale,
    tileH: (Math.abs(geometry.axisX.y) + Math.abs(geometry.axisY.y)) * scale,
    point,
    screenDeltaToGrid,
    footprint: (x, y, width, depth) =>
      footprintFromPoints([
        point(x, y),
        point(x + width, y),
        point(x + width, y + depth),
        point(x, y + depth),
      ]),
    displayW: bounds.width * scale,
    displayH: bounds.height * scale,
    imageFrame: {
      left: -bounds.x * scale,
      top: -bounds.y * scale,
      width: geometry.imageW * scale,
      height: geometry.imageH * scale,
    },
  };
}

export interface RoomViewport {
  width: number;
  height: number;
}

/**
 * 방을 roomArea 안에 앉히는 배율.
 *
 * 기준은 두 가지다.
 *   1) 세로 - 방이 쓸 수 있는 높이의 68%를 차지한다. 60~70% 밖으로 나가면
 *      위아래에 큰 여백이 생기거나(작을 때) 잘려 나간다(클 때).
 *   2) 가로 - 셸은 옆으로 긴 마름모라 68%를 맞추면 화면보다 넓어진다.
 *      잘려도 되는 건 바닥 테두리까지이므로 넘침을 화면 폭의 18%까지만 허용하고,
 *      가구는 layout의 safe area 검사로 따로 막는다.
 *
 * artBounds는 셸 WebP의 알파 경계라 투명 여백이 이미 빠져 있다.
 */
export const ROOM_TARGET_HEIGHT_RATIO = 0.68;
export const ROOM_MAX_WIDTH_RATIO = 1.18;

export function calculateShellFitScale(
  geometry: ShellGeometry,
  viewport: RoomViewport,
  options: {
    targetHeightRatio?: number;
    maxWidthRatio?: number;
  } = {},
): number {
  const targetHeightRatio = options.targetHeightRatio ?? ROOM_TARGET_HEIGHT_RATIO;
  const maxWidthRatio = options.maxWidthRatio ?? ROOM_MAX_WIDTH_RATIO;
  const byHeight = (Math.max(1, viewport.height) * targetHeightRatio) / geometry.artBounds.height;
  const byWidth = (Math.max(1, viewport.width) * maxWidthRatio) / geometry.artBounds.width;
  return Math.min(byHeight, byWidth);
}

/**
 * 최소 줌(overview) 배율 - 방 전체가 roomArea 안에 다 들어온다.
 *
 * calculateShellFitScale은 가로로 18%까지 넘치도록 허용한다. 작은 방에서는
 * 바닥 테두리만 잘려서 괜찮지만, 5단계처럼 옆으로 긴 방에서는 방 끝이
 * 화면 밖으로 나가 "전체가 보인다"가 깨진다. 확대·축소가 붙은 뒤로는
 * 축소 상태에서 전체가 보이는 게 기준이라 넘침을 허용하지 않는다.
 */
export function calculateOverviewScale(
  geometry: ShellGeometry,
  viewport: RoomViewport,
): number {
  return Math.min(
    (Math.max(1, viewport.height) * 0.96) / geometry.artBounds.height,
    (Math.max(1, viewport.width) * 0.98) / geometry.artBounds.width,
  );
}

/**
 * 최대 줌 - 고양이 표정과 가구 디테일이 보이는 배율.
 *
 * 단계별 상수가 아니라 overview에서 한 칸이 화면 몇 px인지로 낸다. 5단계는
 * 한 칸이 10px 남짓이라 더 당겨야 하고, 0단계는 이미 커서 조금만 당기면
 * 된다. 어느 쪽이든 2.5~3배 사이로 묶는다.
 */
export const MIN_ZOOM = 1;
export const TARGET_TILE_PX = 52;

export function calculateMaxZoom(geometry: ShellGeometry, viewport: RoomViewport): number {
  const scale = calculateOverviewScale(geometry, viewport);
  const tileW = (Math.abs(geometry.axisX.x) + Math.abs(geometry.axisY.x)) * scale;
  return Math.min(3, Math.max(2.5, TARGET_TILE_PX / Math.max(tileW, 1)));
}

/** 앞쪽 접지점(x+y가 큰 쪽)이 위에 오도록 하는 안정적인 정렬 키. */
export function isoDepth(x: number, y: number): number {
  return Math.round((x + y) * 100) + 1000;
}

const ProjectionContext = createContext<IsoProjection | null>(null);

export const ProjectionProvider = ProjectionContext.Provider;

export function useProjection(): IsoProjection {
  const projection = useContext(ProjectionContext);
  if (!projection) {
    throw new Error('IsoRoom 안에서만 쓸 수 있다');
  }
  return projection;
}
