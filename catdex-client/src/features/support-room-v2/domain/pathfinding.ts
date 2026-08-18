import type { GridPoint } from './grid';
import { FLOOR_GRID, pointKey } from './grid';

/**
 * 바닥 그리드 4방향 A*.
 * 결정적 tie-break: f → h → y → x 순으로 비교해 같은 입력이면 항상 같은 경로.
 */
export function findPath(
  walkable: ReadonlySet<string>,
  start: GridPoint,
  goal: GridPoint,
): GridPoint[] | null {
  const startKey = pointKey(start);
  const goalKey = pointKey(goal);
  if (!walkable.has(startKey) || !walkable.has(goalKey)) return null;

  const h = (p: GridPoint) => Math.abs(p.x - goal.x) + Math.abs(p.y - goal.y);

  interface Node {
    point: GridPoint;
    g: number;
    f: number;
    h: number;
  }

  const open: Node[] = [{ point: start, g: 0, f: h(start), h: h(start) }];
  const cameFrom = new Map<string, GridPoint>();
  const gScore = new Map<string, number>([[startKey, 0]]);
  const closed = new Set<string>();

  while (open.length > 0) {
    // 240셀 그리드라 정렬 비용이 무시할 수준이다. 결정적 순서가 우선.
    open.sort(
      (a, b) => a.f - b.f || a.h - b.h || a.point.y - b.point.y || a.point.x - b.point.x,
    );
    const current = open.shift() as Node;
    const currentKey = pointKey(current.point);
    if (currentKey === goalKey) {
      const path: GridPoint[] = [current.point];
      let cursor = currentKey;
      while (cameFrom.has(cursor)) {
        const prev = cameFrom.get(cursor) as GridPoint;
        path.unshift(prev);
        cursor = pointKey(prev);
      }
      return path;
    }
    if (closed.has(currentKey)) continue;
    closed.add(currentKey);

    const neighbors: GridPoint[] = [
      { x: current.point.x, y: current.point.y - 1 },
      { x: current.point.x - 1, y: current.point.y },
      { x: current.point.x + 1, y: current.point.y },
      { x: current.point.x, y: current.point.y + 1 },
    ];
    for (const next of neighbors) {
      if (next.x < 0 || next.y < 0 || next.x >= FLOOR_GRID.columns || next.y >= FLOOR_GRID.rows) {
        continue;
      }
      const nextKey = pointKey(next);
      if (!walkable.has(nextKey) || closed.has(nextKey)) continue;
      const tentative = current.g + 1;
      if (tentative < (gScore.get(nextKey) ?? Infinity)) {
        gScore.set(nextKey, tentative);
        cameFrom.set(nextKey, current.point);
        open.push({ point: next, g: tentative, f: tentative + h(next), h: h(next) });
      }
    }
  }
  return null;
}
