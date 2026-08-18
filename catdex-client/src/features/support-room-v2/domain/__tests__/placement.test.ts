import { describe, expect, it } from 'vitest';

import type { FurnitureId, FurnitureSpec } from '../furniture';
import type { Placement, SpecLookup } from '../placement';
import {
  approachAnchorCells,
  renderSortKey,
  validateLayout,
  validatePlacement,
  walkableFloorCells,
} from '../placement';
import { DEFAULT_ROOM_SHELL } from '../room-shell';
import { INTERACTIVE_FURNITURE_SPECS, STARTER_LAYOUT, specLookup } from '../fixtures';

const cushion = (over: Partial<Placement> = {}): Placement => ({
  placementId: 'p1',
  furnitureId: 'visitor_cushion_orange',
  surface: 'floor',
  gridX: 5,
  gridY: 5,
  flipX: false,
  ...over,
});

const RUG_ID = 'rug_test' as FurnitureId;
const rugSpec: FurnitureSpec = {
  id: RUG_ID,
  name: '테스트 러그',
  group: 'decor',
  surface: 'floor',
  footprint: { width: 3, depth: 2 },
  collisionMask: [],
  approachAnchors: [],
  canFlipX: true,
  capacity: 0,
  behaviors: [],
  layerMode: 'standalone',
  baselineY: 0.5,
};
const lookupWithRug: SpecLookup = (id) => (id === RUG_ID ? rugSpec : specLookup(id));

describe('validatePlacement', () => {
  it('경계 밖 배치를 거절한다', () => {
    const issues = validatePlacement(cushion({ gridX: 29, gridY: 7 }), [], specLookup);
    expect(issues.map((i) => i.code)).toContain('out_of_bounds');
  });

  it('음수 좌표와 소수 좌표를 거절한다', () => {
    expect(validatePlacement(cushion({ gridX: -1 }), [], specLookup)[0]?.code).toBe(
      'out_of_bounds',
    );
    expect(validatePlacement(cushion({ gridY: 1.5 }), [], specLookup)[0]?.code).toBe(
      'out_of_bounds',
    );
  });

  it('일반 가구끼리 충돌하면 거절한다', () => {
    const existing = cushion({ placementId: 'p0', gridX: 6, gridY: 6 });
    const issues = validatePlacement(cushion(), [existing], specLookup);
    expect(issues.map((i) => i.code)).toContain('overlap');
  });

  it('러그류(비충돌)는 다른 가구와 겹쳐도 허용한다', () => {
    const rug: Placement = {
      placementId: 'rug1',
      furnitureId: RUG_ID,
      surface: 'floor',
      gridX: 5,
      gridY: 5,
      flipX: false,
    };
    expect(validatePlacement(rug, [cushion({ placementId: 'p0' })], lookupWithRug)).toEqual([]);
    expect(validatePlacement(cushion(), [rug], lookupWithRug)).toEqual([]);
  });

  it('표면이 다르면 거절한다', () => {
    const issues = validatePlacement(cushion({ surface: 'wall', gridY: 2 }), [], specLookup);
    expect(issues.map((i) => i.code)).toContain('surface_mismatch');
  });

  it('반전 불가 가구의 flipX를 거절한다', () => {
    const station = cushion({ furnitureId: 'customer_water_station', flipX: true });
    const issues = validatePlacement(station, [], specLookup);
    expect(issues.map((i) => i.code)).toContain('flip_not_allowed');
  });
});

describe('validateLayout', () => {
  it('시작 레이아웃은 문·통로·앵커 검증을 모두 통과한다', () => {
    expect(validateLayout(STARTER_LAYOUT, specLookup, DEFAULT_ROOM_SHELL)).toEqual([]);
  });

  it('출입문 앞을 막으면 거절한다', () => {
    const blocking = cushion({ gridX: 0, gridY: 3 });
    const issues = validateLayout([blocking], specLookup, DEFAULT_ROOM_SHELL);
    expect(issues.map((i) => i.code)).toContain('door_blocked');
  });

  it('좌우 통로를 완전히 끊으면 거절한다', () => {
    // 15열을 위(0)부터 아래(7)까지 세로로 봉쇄
    const wall: Placement[] = [0, 2, 4, 6].map((y) => ({
      placementId: `w${y}`,
      furnitureId: 'visitor_cushion_orange',
      surface: 'floor',
      gridX: 15,
      gridY: y,
      flipX: false,
    }));
    const issues = validateLayout(wall, specLookup, DEFAULT_ROOM_SHELL);
    expect(issues.map((i) => i.code)).toContain('walkway_blocked');
  });

  it('행동 가구의 접근 앵커가 모두 막히면 거절한다', () => {
    // 방석을 (5,5)에 두고 앵커 행(7)의 두 칸을 다른 가구로 봉쇄
    const target = cushion();
    const blockerLeft = cushion({ placementId: 'b1', gridX: 4, gridY: 6 });
    const blockerRight = cushion({ placementId: 'b2', gridX: 6, gridY: 6 });
    const issues = validateLayout(
      [target, blockerLeft, blockerRight],
      specLookup,
      DEFAULT_ROOM_SHELL,
    );
    expect(issues.some((i) => i.code === 'anchor_blocked' && i.placementId === 'p1')).toBe(true);
  });

  it('러그는 통행을 막지 않는다', () => {
    const rug: Placement = {
      placementId: 'rug1',
      furnitureId: RUG_ID,
      surface: 'floor',
      gridX: 0,
      gridY: 3,
      flipX: false,
    };
    const walkable = walkableFloorCells([rug], lookupWithRug, DEFAULT_ROOM_SHELL);
    expect(walkable.has('0,3')).toBe(true);
    expect(validateLayout([rug], lookupWithRug, DEFAULT_ROOM_SHELL)).toEqual([]);
  });
});

describe('flip과 정렬 키', () => {
  it('flipX 시 접근 앵커가 footprint 폭 기준으로 반전된다', () => {
    const bellSpec = INTERACTIVE_FURNITURE_SPECS.find((s) => s.id === 'service_bell_brass');
    if (!bellSpec) throw new Error('spec missing');
    const bell: Placement = {
      placementId: 'bell',
      furnitureId: 'service_bell_brass',
      surface: 'floor',
      gridX: 10,
      gridY: 4,
      flipX: false,
    };
    // 원본 앵커: (0,1), (-1,0) → flip(폭1): (0,1), (1,0)
    expect(approachAnchorCells(bell, bellSpec)).toEqual([
      { x: 10, y: 5 },
      { x: 9, y: 4 },
    ]);
    expect(approachAnchorCells({ ...bell, flipX: true }, bellSpec)).toEqual([
      { x: 10, y: 5 },
      { x: 11, y: 4 },
    ]);
  });

  it('같은 입력이면 같은 정렬 키, 앞 행 가구가 더 큰 키를 가진다', () => {
    const spec = INTERACTIVE_FURNITURE_SPECS[0];
    const back = cushion({ gridY: 1 });
    const front = cushion({ gridY: 5 });
    expect(renderSortKey(back, spec)).toBe(renderSortKey(back, spec));
    expect(renderSortKey(front, spec)).toBeGreaterThan(renderSortKey(back, spec));
  });
});
