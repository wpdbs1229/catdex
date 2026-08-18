import type { GridPoint, Surface } from '../domain/grid';
import { FLOOR_GRID, WALL_GRID, WORLD_SOURCE_SIZE } from '../domain/grid';
import type { FurnitureSpec } from '../domain/furniture';
import type { Placement } from '../domain/placement';

/**
 * 원본 월드(3859×2166) 픽셀과 그리드 좌표 사이의 변환을 한곳에 모은다.
 * placement는 그리드 좌표만 저장하고, 화면 좌표는 항상 여기서 계산한다.
 *
 * ponytail: 바닥·벽 밴드 y값은 셸 배경 육안 보정값(선형, 원근 곡선 없음).
 * 정식 원근 스케일 곡선은 아트 공동 검수에서 확정한다.
 */
export const WORLD = {
  width: WORLD_SOURCE_SIZE.width,
  height: WORLD_SOURCE_SIZE.height,
  viewportMultiplier: 3.2,
  /** 뒷벽-바닥 경계선 ~ 이미지 하단 */
  floorBand: { top: 1090, bottom: 2166 },
  /** 천장 몰딩 아래 ~ 바닥 경계선 */
  wallBand: { top: 300, bottom: 1090 },
} as const;

export const CELL_WIDTH = WORLD.width / FLOOR_GRID.columns;
export const FLOOR_ROW_HEIGHT = (WORLD.floorBand.bottom - WORLD.floorBand.top) / FLOOR_GRID.rows;
export const WALL_ROW_HEIGHT = (WORLD.wallBand.bottom - WORLD.wallBand.top) / WALL_GRID.rows;

export interface WorldRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** 셀 하나의 원본 픽셀 사각형 */
export function cellRect(surface: Surface, cell: GridPoint): WorldRect {
  if (surface === 'wall') {
    return {
      left: cell.x * CELL_WIDTH,
      top: WORLD.wallBand.top + cell.y * WALL_ROW_HEIGHT,
      width: CELL_WIDTH,
      height: WALL_ROW_HEIGHT,
    };
  }
  return {
    left: cell.x * CELL_WIDTH,
    top: WORLD.floorBand.top + cell.y * FLOOR_ROW_HEIGHT,
    width: CELL_WIDTH,
    height: FLOOR_ROW_HEIGHT,
  };
}

/**
 * 가구 이미지가 놓일 원본 픽셀 사각형.
 * 에셋은 512×512 정사각형이므로 폭 = footprint 폭, 높이 = 폭으로 두고
 * 바닥 가구는 footprint 마지막 행의 아래 변에 이미지 하단을 맞춘다.
 */
export function placementRect(placement: Placement, spec: FurnitureSpec): WorldRect {
  const width = spec.footprint.width * CELL_WIDTH;
  const height = width;
  const left = placement.gridX * CELL_WIDTH;
  if (placement.surface === 'wall') {
    const top =
      WORLD.wallBand.top +
      placement.gridY * WALL_ROW_HEIGHT +
      (spec.footprint.depth * WALL_ROW_HEIGHT - height) / 2;
    return { left, top, width, height };
  }
  const bottom = WORLD.floorBand.top + (placement.gridY + spec.footprint.depth) * FLOOR_ROW_HEIGHT;
  return { left, top: bottom - height, width, height };
}

/** 원본 픽셀 → 가장 가까운 배치 원점 셀(그리드 경계로 clamp) */
export function snapToCell(surface: Surface, worldX: number, worldY: number, spec: FurnitureSpec): GridPoint {
  const grid = surface === 'wall' ? WALL_GRID : FLOOR_GRID;
  const band = surface === 'wall' ? WORLD.wallBand : WORLD.floorBand;
  const rowHeight = surface === 'wall' ? WALL_ROW_HEIGHT : FLOOR_ROW_HEIGHT;
  const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value));
  return {
    x: clamp(Math.round(worldX / CELL_WIDTH), grid.columns - spec.footprint.width),
    y: clamp(Math.round((worldY - band.top) / rowHeight), grid.rows - spec.footprint.depth),
  };
}
