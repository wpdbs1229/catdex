/**
 * 고객지원실 V2 논리 그리드.
 * 저장 좌표는 화면 픽셀이 아니라 이 그리드 좌표만 사용한다.
 * 원본 월드 3859×2166은 렌더 시 투영 계산에만 쓴다.
 */

export type Surface = 'floor' | 'wall';

export interface GridPoint {
  x: number;
  y: number;
}

export interface GridSize {
  columns: number;
  rows: number;
}

export const WORLD_SOURCE_SIZE = { width: 3859, height: 2166 } as const;

export const FLOOR_GRID: GridSize = { columns: 30, rows: 8 };
export const WALL_GRID: GridSize = { columns: 30, rows: 5 };

export function gridFor(surface: Surface): GridSize {
  return surface === 'floor' ? FLOOR_GRID : WALL_GRID;
}

export function isInsideGrid(surface: Surface, point: GridPoint): boolean {
  const grid = gridFor(surface);
  return (
    Number.isInteger(point.x) &&
    Number.isInteger(point.y) &&
    point.x >= 0 &&
    point.y >= 0 &&
    point.x < grid.columns &&
    point.y < grid.rows
  );
}

export function pointKey(point: GridPoint): string {
  return `${point.x},${point.y}`;
}
