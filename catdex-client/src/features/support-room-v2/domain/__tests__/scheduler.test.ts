import { describe, expect, it } from 'vitest';

import { findPath } from '../pathfinding';
import { planVisits, settleOfflineVisits, type PlanInput } from '../scheduler';
import { DEFAULT_ROOM_SHELL } from '../room-shell';
import { STARTER_LAYOUT, specLookup } from '../fixtures';
import { pointKey } from '../grid';
import { approachAnchorCells, walkableFloorCells } from '../placement';
import type { Placement } from '../placement';

function fullWalkable(): Set<string> {
  return walkableFloorCells([], specLookup, DEFAULT_ROOM_SHELL);
}

const CATS = [
  { catId: 'cat-1', characterAssetKey: 'tabby_orange', catName: '감자' },
  { catId: 'cat-2', characterAssetKey: 'solid_black', catName: '먹물' },
];

function planInput(over: Partial<PlanInput> = {}): PlanInput {
  return {
    placements: STARTER_LAYOUT,
    lookup: specLookup,
    shell: DEFAULT_ROOM_SHELL,
    cats: CATS,
    scheduledAt: 1_700_000_000_000,
    slots: 2,
    salt: 'user-a',
    ...over,
  };
}

describe('findPath', () => {
  it('빈 방에서 단순 경로를 찾는다', () => {
    const path = findPath(fullWalkable(), { x: 0, y: 3 }, { x: 10, y: 3 });
    expect(path).not.toBeNull();
    expect(path?.[0]).toEqual({ x: 0, y: 3 });
    expect(path?.at(-1)).toEqual({ x: 10, y: 3 });
    expect(path).toHaveLength(11); // 맨해튼 최단
  });

  it('막힌 칸을 우회한다', () => {
    const walkable = fullWalkable();
    // x=5 열을 y=0..6까지 막아 아래(7)로만 돌아가게 한다
    for (let y = 0; y <= 6; y += 1) walkable.delete(pointKey({ x: 5, y }));
    const path = findPath(walkable, { x: 0, y: 3 }, { x: 10, y: 3 });
    expect(path).not.toBeNull();
    expect(path?.some((p) => p.y === 7)).toBe(true);
    expect(path?.every((p) => walkable.has(pointKey(p)))).toBe(true);
  });

  it('완전히 차단되면 null', () => {
    const walkable = fullWalkable();
    for (let y = 0; y <= 7; y += 1) walkable.delete(pointKey({ x: 5, y }));
    expect(findPath(walkable, { x: 0, y: 3 }, { x: 10, y: 3 })).toBeNull();
  });

  it('같은 입력이면 같은 경로', () => {
    const a = findPath(fullWalkable(), { x: 0, y: 3 }, { x: 20, y: 6 });
    const b = findPath(fullWalkable(), { x: 0, y: 3 }, { x: 20, y: 6 });
    expect(a).toEqual(b);
  });
});

describe('planVisits', () => {
  it('같은 입력이면 같은 장면과 eventId', () => {
    const a = planVisits(planInput());
    const b = planVisits(planInput());
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
    expect(a[0].eventId).toBe('user-a:1700000000000:0');
  });

  it('행동은 준비된 8종 안에서만 고른다 (share_bench 없음)', () => {
    const scenes = planVisits(planInput({ slots: 8 }));
    for (const scene of scenes) {
      expect(scene.behaviorId).not.toBe('share_bench');
    }
  });

  it('capacity 1 가구는 같은 창에서 중복 예약되지 않는다', () => {
    // 방석 하나만 있는 방에서 slot 3개 → 장면은 최대 1개
    const single: Placement[] = [STARTER_LAYOUT[0]];
    const scenes = planVisits(planInput({ placements: single, slots: 3 }));
    expect(scenes).toHaveLength(1);
  });

  it('접근 불가 가구는 후보에서 빠진다', () => {
    // 방석의 접근 앵커 칸을 전부 다른 가구로 덮는다. footprint가 바뀌어도
    // 앵커를 스펙에서 읽으므로 테스트가 흔들리지 않는다.
    const target = STARTER_LAYOUT[0];
    const spec = specLookup(target.furnitureId);
    if (!spec) throw new Error('방석 스펙이 없다');
    const blockers: Placement[] = approachAnchorCells(target, spec).map((cell, index) => ({
      placementId: `b${index}`,
      furnitureId: 'paper_basket_cream',
      surface: 'floor',
      gridX: cell.x,
      gridY: cell.y,
      flipX: false,
    }));
    const scenes = planVisits(planInput({ placements: [target, ...blockers], slots: 6 }));
    expect(scenes.every((s) => s.placementId !== target.placementId)).toBe(true);
  });

  it('가구를 옮기면 경로가 새 위치 기준으로 다시 계산된다', () => {
    const before = planVisits(planInput({ placements: [STARTER_LAYOUT[0]], slots: 1 }));
    const moved: Placement = { ...STARTER_LAYOUT[0], gridX: 20 };
    const after = planVisits(planInput({ placements: [moved], slots: 1 }));
    expect(before[0].anchor).not.toEqual(after[0].anchor);
    expect(before[0].path).not.toEqual(after[0].path);
  });

  it('여러 앵커 중 경로가 가장 짧은 유효 앵커를 고른다', () => {
    const target = STARTER_LAYOUT[0];
    const spec = specLookup(target.furnitureId);
    if (!spec) throw new Error('방석 스펙이 없다');
    const scenes = planVisits(planInput({ placements: [target], slots: 1 }));
    const scene = scenes[0];
    const anchors = approachAnchorCells(target, spec);
    // 고른 앵커는 스펙의 앵커 중 하나여야 하고, 문에서 가장 가까운 것이어야 한다.
    expect(anchors).toContainEqual(scene.anchor);
    const distance = (cell: { x: number; y: number }) =>
      Math.abs(cell.x - 0) + Math.abs(cell.y - 3);
    const nearest = Math.min(...anchors.map(distance));
    expect(distance(scene.anchor)).toBe(nearest);
  });
});

describe('settleOfflineVisits', () => {
  const HOUR = 60 * 60 * 1000;

  it('여러 시간이 지나도 요약은 최대 3건', () => {
    const scenes = settleOfflineVisits(
      { placements: STARTER_LAYOUT, lookup: specLookup, shell: DEFAULT_ROOM_SHELL, cats: CATS, salt: 'u' },
      0,
      10 * HOUR,
    );
    expect(scenes.length).toBeLessThanOrEqual(3);
  });

  it('같은 구간을 두 번 정산해도 eventId가 겹친다(중복 지급 방지 키)', () => {
    const input = { placements: STARTER_LAYOUT, lookup: specLookup, shell: DEFAULT_ROOM_SHELL, cats: CATS, salt: 'u' };
    const first = settleOfflineVisits(input, 0, 2 * HOUR);
    const second = settleOfflineVisits(input, 0, 2 * HOUR);
    expect(first.map((s) => s.eventId)).toEqual(second.map((s) => s.eventId));
  });
});
