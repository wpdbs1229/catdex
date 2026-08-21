import { FURNITURE_ANCHORS } from './render/furniture-anchors.generated';
import { isFloorCell } from './render/floor-masks.generated';
import { SHELL_GEOMETRY, type RoomStage } from './render/shells.generated';
import { stageRules, type GridRect, type ObservationPlacement } from './support-room-v3.layout';

export interface Cell {
  x: number;
  y: number;
}

/** 한 칸 걷는 데 걸리는 시간. 가구까지 대여섯 칸이면 3초 안쪽이다. */
export const WALK_MS_PER_CELL = 420;
/** 손님이 줄줄이 쏟아지지 않도록 슬롯마다 늦춰 들어온다. */
export const ARRIVAL_STAGGER_MS = 1100;
/** 문이 열리고 고양이가 나오기까지. */
export const DOOR_OPEN_MS = 420;

function walkable(stage: RoomStage, blocked: ReadonlySet<string>, x: number, y: number): boolean {
  return isFloorCell(stage, x, y) && !blocked.has(`${x},${y}`);
}

function blockedCells(placements: readonly ObservationPlacement[]): Set<string> {
  const blocked = new Set<string>();
  for (const placement of placements) {
    const anchor = FURNITURE_ANCHORS[placement.furnitureId];
    const x0 = Math.floor(placement.gridX);
    const y0 = Math.floor(placement.gridY);
    for (let dy = 0; dy < Math.ceil(anchor.footprintD); dy += 1) {
      for (let dx = 0; dx < Math.ceil(anchor.footprintW); dx += 1) {
        blocked.add(`${x0 + dx},${y0 + dy}`);
      }
    }
  }
  return blocked;
}

/**
 * 손님이 들어오는 문. 목표에서 가장 가까운 문을 고른다.
 *
 * 5단계는 본실과 별실에 문이 하나씩 있어서, 별실 가구에 앉을 손님이 본실
 * 문으로 들어오면 방을 가로질러 온다.
 */
export function nearestDoor(stage: RoomStage, target?: Cell): { rect: GridRect; entry: Cell } {
  const doors = stageRules(stage).doorClearances.map((rect) => ({
    rect,
    entry: {
      x: Math.floor(rect.x + rect.width / 2),
      y: Math.floor(rect.y + rect.depth / 2),
    },
  }));
  const usable = doors.filter((door) => isFloorCell(stage, door.entry.x, door.entry.y));
  const pool = usable.length > 0 ? usable : doors;
  if (!target) return pool[0];
  const distance = (cell: Cell) => Math.hypot(cell.x - target.x, cell.y - target.y);
  return pool.reduce((best, door) => (distance(door.entry) < distance(best.entry) ? door : best));
}

/**
 * 가구 앞에 서는 자리. 앉기 직전에 여기까지 걸어온다.
 *
 * 예전에는 가구별 고정 좌표였는데, 사용자가 가구를 옮기면 그 좌표가 엉뚱한
 * 데를 가리켰다. 놓인 자리에서 바로 낸다 - 앞(화면 아래쪽)을 먼저 보고,
 * 막혀 있으면 옆·뒤 순으로 돌아본다.
 */
export function approachCell(
  placement: ObservationPlacement,
  stage: RoomStage,
  placements: readonly ObservationPlacement[] = [],
): Cell {
  const anchor = FURNITURE_ANCHORS[placement.furnitureId];
  const x0 = Math.floor(placement.gridX);
  const y0 = Math.floor(placement.gridY);
  const w = Math.max(1, Math.ceil(anchor.footprintW));
  const d = Math.max(1, Math.ceil(anchor.footprintD));
  const blocked = blockedCells(placements);
  const midX = x0 + Math.floor(w / 2);
  const midY = y0 + Math.floor(d / 2);

  const candidates: Cell[] = [
    { x: midX, y: y0 + d },
    { x: x0 + w, y: midY },
    { x: x0 - 1, y: midY },
    { x: midX, y: y0 - 1 },
  ];
  return (
    candidates.find((cell) => walkable(stage, blocked, cell.x, cell.y)) ?? { x: midX, y: y0 + d }
  );
}

/**
 * 문 앞에서 목표 칸까지 가구를 피해 가는 길(너비 우선).
 *
 * 길이 아예 없으면 직선으로 잇는다 - 가구에 막혀 못 들어오는 것보다 벽을
 * 스치더라도 손님이 오는 편이 낫다.
 */
export function walkPath(
  stage: RoomStage,
  from: Cell,
  to: Cell,
  placements: readonly ObservationPlacement[] = [],
): Cell[] {
  const { cols, rows } = SHELL_GEOMETRY[stage];
  const blocked = blockedCells(placements);
  const start = { x: Math.round(from.x), y: Math.round(from.y) };
  const goal = { x: Math.round(to.x), y: Math.round(to.y) };
  const key = (cell: Cell) => `${cell.x},${cell.y}`;

  const cameFrom = new Map<string, Cell | null>([[key(start), null]]);
  const queue: Cell[] = [start];
  let found = false;

  while (queue.length > 0 && !found) {
    const cell = queue.shift()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const next = { x: cell.x + dx, y: cell.y + dy };
      if (next.x < 0 || next.y < 0 || next.x >= cols || next.y >= rows) continue;
      if (cameFrom.has(key(next))) continue;
      // 도착 칸은 가구 바로 앞이라 막혀 있어도 들어간다.
      const isGoal = next.x === goal.x && next.y === goal.y;
      if (!isGoal && !walkable(stage, blocked, next.x, next.y)) continue;
      cameFrom.set(key(next), cell);
      if (isGoal) {
        found = true;
        break;
      }
      queue.push(next);
    }
  }

  if (!found) return [start, goal];

  const path: Cell[] = [];
  let cursor: Cell | null = goal;
  while (cursor) {
    path.unshift(cursor);
    cursor = cameFrom.get(key(cursor)) ?? null;
  }
  return simplify(path);
}

/** 같은 방향으로 이어지는 칸은 한 다리로 묶는다. 애니메이션 마디가 줄어든다. */
function simplify(path: readonly Cell[]): Cell[] {
  if (path.length < 3) return [...path];
  const out: Cell[] = [path[0]];
  for (let i = 1; i < path.length - 1; i += 1) {
    const before = path[i - 1];
    const after = path[i + 1];
    const turns = (after.x - before.x) !== 0 && (after.y - before.y) !== 0;
    if (turns) out.push(path[i]);
  }
  out.push(path[path.length - 1]);
  return out;
}

/** 경로 전체를 걷는 데 걸리는 시간. 도착 뒤 앉는 시점을 잡는 데 쓴다. */
export function walkDurationMs(path: readonly Cell[]): number {
  let cells = 0;
  for (let i = 1; i < path.length; i += 1) {
    cells += Math.abs(path[i].x - path[i - 1].x) + Math.abs(path[i].y - path[i - 1].y);
  }
  return Math.max(WALK_MS_PER_CELL, cells * WALK_MS_PER_CELL);
}
