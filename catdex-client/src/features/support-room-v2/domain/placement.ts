import type { GridPoint, Surface } from './grid';
import { gridFor, isInsideGrid, pointKey } from './grid';
import type { FurnitureId, FurnitureSpec } from './furniture';
import { furnitureCollides, mirrorOffsetX } from './furniture';
import type { RoomShellConfig } from './room-shell';

/** 저장 모델. 화면 픽셀 좌표를 절대 넣지 않는다. */
export interface Placement {
  placementId: string;
  furnitureId: FurnitureId;
  surface: Surface;
  /** footprint 좌상단 셀 */
  gridX: number;
  gridY: number;
  flipX: boolean;
}

export type SpecLookup = (id: FurnitureId) => FurnitureSpec | undefined;

export type PlacementIssueCode =
  | 'unknown_furniture'
  | 'surface_mismatch'
  | 'flip_not_allowed'
  | 'out_of_bounds'
  | 'overlap'
  | 'door_blocked'
  | 'walkway_blocked'
  | 'anchor_blocked';

export interface PlacementIssue {
  code: PlacementIssueCode;
  placementId?: string;
  cells?: readonly GridPoint[];
}

function offsetCells(
  placement: Pick<Placement, 'gridX' | 'gridY' | 'flipX'>,
  spec: FurnitureSpec,
  offsets: readonly GridPoint[],
): GridPoint[] {
  return offsets.map((o) => ({
    x: placement.gridX + (placement.flipX ? mirrorOffsetX(o.x, spec.footprint.width) : o.x),
    y: placement.gridY + o.y,
  }));
}

/** footprint가 차지하는 셀 전체(충돌 여부와 무관). */
export function footprintCells(placement: Placement, spec: FurnitureSpec): GridPoint[] {
  const cells: GridPoint[] = [];
  for (let dx = 0; dx < spec.footprint.width; dx += 1) {
    for (let dy = 0; dy < spec.footprint.depth; dy += 1) {
      cells.push({ x: placement.gridX + dx, y: placement.gridY + dy });
    }
  }
  return cells;
}

/** 통행을 막는 셀. 러그류(collisionMask 없음)는 빈 배열. */
export function collisionCells(placement: Placement, spec: FurnitureSpec): GridPoint[] {
  return offsetCells(placement, spec, spec.collisionMask);
}

export function approachAnchorCells(placement: Placement, spec: FurnitureSpec): GridPoint[] {
  return offsetCells(placement, spec, spec.approachAnchors);
}

/**
 * 단일 배치의 하드 유효성: 카탈로그·표면·경계·충돌.
 * 문·통로·앵커 검사는 저장 시점의 validateLayout에서 수행한다(docs/03 5.3).
 */
export function validatePlacement(
  candidate: Placement,
  others: readonly Placement[],
  lookup: SpecLookup,
): PlacementIssue[] {
  const spec = lookup(candidate.furnitureId);
  if (!spec) return [{ code: 'unknown_furniture', placementId: candidate.placementId }];

  const issues: PlacementIssue[] = [];
  if (spec.surface !== candidate.surface) {
    issues.push({ code: 'surface_mismatch', placementId: candidate.placementId });
  }
  if (candidate.flipX && !spec.canFlipX) {
    issues.push({ code: 'flip_not_allowed', placementId: candidate.placementId });
  }

  const cells = footprintCells(candidate, spec);
  const outside = cells.filter((c) => !isInsideGrid(candidate.surface, c));
  if (outside.length > 0) {
    issues.push({ code: 'out_of_bounds', placementId: candidate.placementId, cells: outside });
    return issues;
  }

  if (furnitureCollides(spec)) {
    const occupied = new Set<string>();
    for (const other of others) {
      if (other.placementId === candidate.placementId) continue;
      if (other.surface !== candidate.surface) continue;
      const otherSpec = lookup(other.furnitureId);
      if (!otherSpec || !furnitureCollides(otherSpec)) continue;
      for (const cell of collisionCells(other, otherSpec)) occupied.add(pointKey(cell));
    }
    const overlapping = collisionCells(candidate, spec).filter((c) => occupied.has(pointKey(c)));
    if (overlapping.length > 0) {
      issues.push({ code: 'overlap', placementId: candidate.placementId, cells: overlapping });
    }
  }

  return issues;
}

/** 바닥에서 통행 가능한 셀 집합(pointKey). */
export function walkableFloorCells(
  placements: readonly Placement[],
  lookup: SpecLookup,
  shell: RoomShellConfig,
): Set<string> {
  const blocked = new Set<string>();
  for (const placement of placements) {
    if (placement.surface !== 'floor') continue;
    const spec = lookup(placement.furnitureId);
    if (!spec) continue;
    for (const cell of collisionCells(placement, spec)) blocked.add(pointKey(cell));
  }
  const walkable = new Set<string>();
  for (let x = 0; x < shell.floor.columns; x += 1) {
    for (let y = 0; y < shell.floor.rows; y += 1) {
      const key = pointKey({ x, y });
      if (!blocked.has(key)) walkable.add(key);
    }
  }
  return walkable;
}

function neighbors(point: GridPoint): GridPoint[] {
  return [
    { x: point.x - 1, y: point.y },
    { x: point.x + 1, y: point.y },
    { x: point.x, y: point.y - 1 },
    { x: point.x, y: point.y + 1 },
  ];
}

/** 문 clearance 셀에서 4방향 BFS로 도달 가능한 통행 셀 집합. */
export function reachableFromDoors(
  walkable: ReadonlySet<string>,
  shell: RoomShellConfig,
): Set<string> {
  const reachable = new Set<string>();
  const queue: GridPoint[] = [];
  for (const door of shell.doors) {
    for (const cell of door.clearanceCells) {
      const key = pointKey(cell);
      if (walkable.has(key) && !reachable.has(key)) {
        reachable.add(key);
        queue.push(cell);
      }
    }
  }
  while (queue.length > 0) {
    const current = queue.shift() as GridPoint;
    for (const next of neighbors(current)) {
      const key = pointKey(next);
      if (!walkable.has(key) || reachable.has(key)) continue;
      if (!isInsideGrid('floor', next)) continue;
      reachable.add(key);
      queue.push(next);
    }
  }
  return reachable;
}

/**
 * 좌우를 잇는 최소 N행 두께 통로 존재 여부.
 * (x,y)~(x,y+N-1)이 모두 통행 가능한 "밴드 셀"의 4방향 연결로
 * 0열에서 마지막 열까지 이어지는 경로가 있는지 검사한다.
 */
export function hasHorizontalWalkway(
  walkable: ReadonlySet<string>,
  shell: RoomShellConfig,
): boolean {
  const bandRows = shell.requiredWalkwayRows;
  const isBand = (x: number, y: number): boolean => {
    for (let dy = 0; dy < bandRows; dy += 1) {
      if (!walkable.has(pointKey({ x, y: y + dy }))) return false;
    }
    return true;
  };
  const maxBandY = shell.floor.rows - bandRows;
  const visited = new Set<string>();
  const queue: GridPoint[] = [];
  for (let y = 0; y <= maxBandY; y += 1) {
    if (isBand(0, y)) {
      visited.add(pointKey({ x: 0, y }));
      queue.push({ x: 0, y });
    }
  }
  while (queue.length > 0) {
    const current = queue.shift() as GridPoint;
    if (current.x === shell.floor.columns - 1) return true;
    for (const next of neighbors(current)) {
      if (next.x < 0 || next.y < 0 || next.x >= shell.floor.columns || next.y > maxBandY) continue;
      const key = pointKey(next);
      if (visited.has(key) || !isBand(next.x, next.y)) continue;
      visited.add(key);
      queue.push(next);
    }
  }
  return false;
}

/**
 * 저장 시점 레이아웃 전체 검증: 문 앞 확보, 가로 통로, 행동 가구 접근 앵커.
 * 이슈가 있으면 저장을 막고 사용자에게 막힌 셀을 보여 준다.
 */
export function validateLayout(
  placements: readonly Placement[],
  lookup: SpecLookup,
  shell: RoomShellConfig,
): PlacementIssue[] {
  const issues: PlacementIssue[] = [];
  const walkable = walkableFloorCells(placements, lookup, shell);

  for (const door of shell.doors) {
    const blockedCells = door.clearanceCells.filter((c) => !walkable.has(pointKey(c)));
    if (blockedCells.length > 0) {
      issues.push({ code: 'door_blocked', cells: blockedCells });
    }
  }

  if (!hasHorizontalWalkway(walkable, shell)) {
    issues.push({ code: 'walkway_blocked' });
  }

  const reachable = reachableFromDoors(walkable, shell);
  for (const placement of placements) {
    const spec = lookup(placement.furnitureId);
    if (!spec || spec.behaviors.length === 0) continue;
    const anchors = approachAnchorCells(placement, spec).filter((c) => isInsideGrid('floor', c));
    const usable = anchors.some((c) => reachable.has(pointKey(c)));
    if (!usable) {
      issues.push({ code: 'anchor_blocked', placementId: placement.placementId, cells: anchors });
    }
  }

  return issues;
}

/**
 * 렌더 정렬 키. 같은 입력이면 항상 같은 값.
 * 벽 가구가 바닥 가구보다 항상 뒤, 바닥 가구는 앞 행(baseline 셀)이 클수록 앞.
 */
export function renderSortKey(placement: Placement, spec: FurnitureSpec): number {
  if (placement.surface === 'wall') {
    return placement.gridY * gridFor('wall').columns + placement.gridX;
  }
  const baselineRow = placement.gridY + spec.footprint.depth - 1;
  const wallCells = gridFor('wall').columns * gridFor('wall').rows;
  return wallCells + baselineRow * 10_000 + placement.gridX * 10 + (placement.flipX ? 1 : 0);
}
