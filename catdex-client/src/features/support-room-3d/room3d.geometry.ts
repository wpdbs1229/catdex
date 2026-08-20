import { FLOOR_GRID, WALL_GRID, type GridPoint } from '@/features/support-room-v2/domain/grid';
import type { Placement } from '@/features/support-room-v2/domain/placement';
import type { FurnitureSpec } from '@/features/support-room-v2/domain/furniture';

/**
 * 3D 스파이크의 좌표계. 셀 한 칸이 월드 1단위다.
 *   격자 x(열) → 월드 x, 격자 y(행) → 월드 z, 높이 → 월드 y
 * 바닥은 원점을 방 한가운데로 옮겨 그린다. 그래야 카메라를 원점 둘레로
 * 돌리는 것만으로 90° 스냅 회전이 된다.
 */
export const CELL = 1;
export const ROOM_W = FLOOR_GRID.columns * CELL;
export const ROOM_D = FLOOR_GRID.rows * CELL;
export const WALL_H = WALL_GRID.rows * CELL;

/** 격자 셀의 중심을 월드 좌표로. 방 중심이 원점이 되도록 절반만큼 민다. */
export function cellToWorld(x: number, y: number): [number, number] {
  return [x * CELL + CELL / 2 - ROOM_W / 2, y * CELL + CELL / 2 - ROOM_D / 2];
}

/** cellToWorld의 역변환. 바닥 레이캐스트가 준 월드 좌표를 셀로 되돌린다. */
export function worldToCell(worldX: number, worldZ: number): GridPoint {
  return {
    x: Math.floor((worldX + ROOM_W / 2) / CELL),
    y: Math.floor((worldZ + ROOM_D / 2) / CELL),
  };
}

/** footprint 전체의 중심. 가구 박스를 놓을 자리다. */
export function placementCenter(placement: Placement, spec: FurnitureSpec): [number, number] {
  const [x] = cellToWorld(placement.gridX, placement.gridY);
  const [, z] = cellToWorld(placement.gridX, placement.gridY);
  return [
    x + ((spec.footprint.width - 1) * CELL) / 2,
    z + ((spec.footprint.depth - 1) * CELL) / 2,
  ];
}

export type SnapAngle = 0 | 1 | 2 | 3;

/** 90° 스냅 회전. 자유 궤도 대신 네 방향만 둔다(고양이 4방향 스프라이트와 맞춘다). */
export function cameraAngle(snap: SnapAngle): number {
  return (snap * Math.PI) / 2 + Math.PI / 4;
}

export type WallId = 'north' | 'south' | 'east' | 'west';

/**
 * 카메라와 방 사이를 가로막는 두 벽. 심즈처럼 이 벽을 숨겨야 안이 보인다.
 * 스냅이 0일 때 카메라는 남동쪽에 있으므로 south·east가 앞을 막는다.
 */
export function hiddenWalls(snap: SnapAngle): readonly WallId[] {
  const order: readonly [WallId, WallId][] = [
    ['south', 'east'],
    ['south', 'west'],
    ['north', 'west'],
    ['north', 'east'],
  ];
  return order[snap];
}
