import { describe, expect, it } from 'vitest';
import { FLOOR_GRID } from '@/features/support-room-v2/domain/grid';
import {
  ROOM_D,
  ROOM_W,
  cellToWorld,
  hiddenWalls,
  worldToCell,
} from '../room3d.geometry';

describe('support-room-3d 좌표계', () => {
  it('방을 원점 가운데에 둔다', () => {
    const [x0, z0] = cellToWorld(0, 0);
    expect(x0).toBeCloseTo(-ROOM_W / 2 + 0.5);
    expect(z0).toBeCloseTo(-ROOM_D / 2 + 0.5);

    const [xLast, zLast] = cellToWorld(FLOOR_GRID.columns - 1, FLOOR_GRID.rows - 1);
    expect(xLast).toBeCloseTo(ROOM_W / 2 - 0.5);
    expect(zLast).toBeCloseTo(ROOM_D / 2 - 0.5);
  });

  it('worldToCell이 cellToWorld를 되돌린다 - 드래그가 엉뚱한 칸에 놓이면 여기서 깨진다', () => {
    for (let x = 0; x < FLOOR_GRID.columns; x += 1) {
      for (let y = 0; y < FLOOR_GRID.rows; y += 1) {
        const [wx, wz] = cellToWorld(x, y);
        expect(worldToCell(wx, wz)).toEqual({ x, y });
      }
    }
  });

  it('셀 안 어디를 찍어도 같은 칸으로 떨어진다', () => {
    const [wx, wz] = cellToWorld(3, 2);
    expect(worldToCell(wx - 0.49, wz - 0.49)).toEqual({ x: 3, y: 2 });
    expect(worldToCell(wx + 0.49, wz + 0.49)).toEqual({ x: 3, y: 2 });
  });

  it('회전할 때마다 앞을 막는 벽 두 개를 숨긴다', () => {
    const seen = new Set<string>();
    for (const snap of [0, 1, 2, 3] as const) {
      const walls = hiddenWalls(snap);
      expect(walls).toHaveLength(2);
      // 마주 보는 벽을 동시에 숨기면 방이 뚫려 보인다.
      expect(new Set(walls).has('north') && new Set(walls).has('south')).toBe(false);
      expect(new Set(walls).has('east') && new Set(walls).has('west')).toBe(false);
      seen.add([...walls].sort().join('+'));
    }
    expect(seen.size).toBe(4);
  });
});
