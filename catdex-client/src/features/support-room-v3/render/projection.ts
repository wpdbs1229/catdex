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
  /** 물체의 접지 기준. 중심에서 앞 모서리 쪽으로 70% 내려온 지점이다. */
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
    ground: {
      x: center.x,
      y: center.y + (maxY - center.y) * 0.7,
    },
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

  return {
    stage,
    geometry,
    scale,
    tileW: (Math.abs(geometry.axisX.x) + Math.abs(geometry.axisY.x)) * scale,
    tileH: (Math.abs(geometry.axisX.y) + Math.abs(geometry.axisY.y)) * scale,
    point,
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
 * 실제 roomArea를 기준으로 셸을 맞춘다. 세로 68%를 목표로 하되 가로가 너무 많이
 * 잘리지 않도록 최대 1.34 화면 폭까지만 초기 확대한다. 이후 사용자가 직접 줌할 수 있다.
 */
export function calculateShellFitScale(
  geometry: ShellGeometry,
  viewport: RoomViewport,
  options: {
    horizontalPadding?: number;
    targetHeightRatio?: number;
    maxWidthRatio?: number;
  } = {},
): number {
  const horizontalPadding = options.horizontalPadding ?? 24;
  const targetHeightRatio = options.targetHeightRatio ?? 0.68;
  const maxWidthRatio = options.maxWidthRatio ?? 1.34;
  const widthFit = Math.max(1, viewport.width - horizontalPadding) / geometry.artBounds.width;
  const heightFit =
    Math.max(1, viewport.height) * targetHeightRatio / geometry.artBounds.height;
  const maxScale =
    Math.max(1, viewport.width) * maxWidthRatio / geometry.artBounds.width;
  return Math.min(Math.max(widthFit, heightFit), Math.max(widthFit, maxScale));
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
