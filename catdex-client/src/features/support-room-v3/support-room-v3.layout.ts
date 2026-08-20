import type {
  BehaviorId as CatBehaviorId,
  CharacterAssetKey,
} from '@/features/support-room/support-room.assets';
import type { FurnitureId } from '@/features/support-room-v2/domain/furniture';
import { FURNITURE_ANCHORS } from './render/furniture-anchors.generated';
import { createProjection, type IsoProjection } from './render/projection';
import {
  calculateFurnitureSpriteLayout,
  calculateIdleCatLayout,
  type CompositeBehavior,
  type VisualBox,
} from './render/sprite-layout';
import { SHELL_GEOMETRY, type RoomStage } from './render/shells.generated';

export interface ObservationPlacement {
  furnitureId: FurnitureId;
  gridX: number;
  gridY: number;
  /** 좌우 반전. 아이소 아트가 한 방향뿐이라 '회전'은 반전으로 구현한다. */
  flipX?: boolean;
}

export interface ObservationCat {
  key: CharacterAssetKey;
  gridX: number;
  gridY: number;
}

export interface BusyObservationCat {
  key: CharacterAssetKey;
  behavior: Extract<CompositeBehavior, 'use_cushion' | 'sit_swivel_chair'>;
  on: FurnitureId;
}

/**
 * 단계별 방 규칙. 셸 그림에서 문 밑선을 재서 격자로 되돌린 값이다.
 *
 * 여기에 있는 단계만 실제로 열 수 있다(문 위치와 정사각 칸을 확인한 단계).
 * 새 단계를 열려면 같은 방법으로 재서 한 줄 추가하면 된다.
 */
export interface StageRules {
  /** 항상 비워 두는 출입문 앞 */
  doorClearances: readonly GridRect[];
  /** 문에서 방 가운데로 이어지는 통로 */
  centerAisle: GridRect;
}

export const STAGE_RULES: Partial<Record<RoomStage, StageRules>> = {
  // 문 밑선 (170,768)-(300,690) -> 격자 y 4.73~6.65
  stage0: {
    doorClearances: [{ x: 0, y: 4.6, width: 2, depth: 2 }],
    centerAisle: { x: 2, y: 4.6, width: 3, depth: 2 },
  },
  // 문 밑선 (128,712)-(232,655) -> 격자 y 4.87~6.37
  stage1: {
    doorClearances: [{ x: 0, y: 4.7, width: 2, depth: 2 }],
    centerAisle: { x: 2, y: 4.7, width: 4, depth: 2 },
  },
  // 문이 둘이다.
  //   왼쪽 (122,632)-(200,586) -> x≈0.08 벽면의 y 5.08~6.41
  //   오른쪽 (1065,727)-(1145,772) -> y≈0.3 벽면의 x 9.55~10.89
  stage2: {
    doorClearances: [
      { x: 0, y: 4.7, width: 2, depth: 2 },
      { x: 9.4, y: 0, width: 2, depth: 2 },
    ],
    centerAisle: { x: 2, y: 4.7, width: 5, depth: 2 },
  },
  // 문 둘.
  //   왼쪽  (100,588)-(160,553) -> x≈-0.1 벽면의 y 4.37~5.39
  //   오른쪽 (1076,762)-(1160,806) -> y≈0.6 벽면의 x 11.82~13.28
  stage3: {
    doorClearances: [
      { x: 0, y: 3.9, width: 2, depth: 2 },
      { x: 11.6, y: 0, width: 2, depth: 2 },
    ],
    centerAisle: { x: 2, y: 3.9, width: 6, depth: 2 },
  },
};

/** 셸을 실제로 그릴 수 있는 단계. 확장 구매는 서버가 따로 판단한다. */
export const CALIBRATED_STAGES = Object.keys(STAGE_RULES) as RoomStage[];

export function stageRules(stage: RoomStage): StageRules {
  return STAGE_RULES[stage] ?? STAGE_RULES.stage0!;
}

/**
 * 기본 장면 배치.
 *
 * 고양이 세 마리(방석·의자·서 있는 고양이)가 한 줄로 서지 않고 삼각형을
 * 이루도록 잡았다. 서로 가리지 않아야 얼굴 셋이 모두 보인다.
 */
const CANDIDATE_PLACEMENTS: readonly ObservationPlacement[] = [
  { furnitureId: 'floor_lamp_warm', gridX: 0.4, gridY: 0.5 },
  { furnitureId: 'consultation_desk_honey', gridX: 5.2, gridY: 0.7 },
  { furnitureId: 'plant_small_desk', gridX: 0.4, gridY: 2.7 },
  { furnitureId: 'visitor_cushion_orange', gridX: 2.6, gridY: 2.1 },
  { furnitureId: 'swivel_chair_lavender', gridX: 6.2, gridY: 4.8 },
];

export const DEFAULT_BUSY_CATS: readonly BusyObservationCat[] = [
  { key: 'solid_gray', behavior: 'use_cushion', on: 'visitor_cushion_orange' },
  { key: 'bicolor_tuxedo', behavior: 'sit_swivel_chair', on: 'swivel_chair_lavender' },
];

export const DEFAULT_IDLE_CATS: readonly ObservationCat[] = [
  { key: 'tabby_orange', gridX: 3.2, gridY: 5.9 },
];

export interface GridRect {
  x: number;
  y: number;
  width: number;
  depth: number;
}

/** 이전 이름 호환. 새 코드는 stageRules(stage)를 쓴다. */
export const STAGE0_DOOR_CLEARANCES = STAGE_RULES.stage0!.doorClearances;
export const STAGE0_CENTER_AISLE = STAGE_RULES.stage0!.centerAisle;

const ACTION_APPROACHES = [
  { furnitureId: 'visitor_cushion_orange' as const, x: 3.9, y: 3.2 },
  { furnitureId: 'swivel_chair_lavender' as const, x: 5.4, y: 5.9 },
] as const;

function placementRect(placement: ObservationPlacement): GridRect {
  const anchor = FURNITURE_ANCHORS[placement.furnitureId];
  return {
    x: placement.gridX,
    y: placement.gridY,
    width: anchor.footprintW,
    depth: anchor.footprintD,
  };
}

function rectsOverlap(a: GridRect, b: GridRect): boolean {
  return (
    a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.depth && a.y + a.depth > b.y
  );
}

function pointInRect(point: { x: number; y: number }, rect: GridRect): boolean {
  return (
    point.x >= rect.x &&
    point.x < rect.x + rect.width &&
    point.y >= rect.y &&
    point.y < rect.y + rect.depth
  );
}

export function observationFootprintCoverage(
  placements: readonly ObservationPlacement[],
  stage: RoomStage = 'stage0',
): number {
  const { cols, rows } = SHELL_GEOMETRY[stage];
  const used = placements.reduce((sum, placement) => {
    const anchor = FURNITURE_ANCHORS[placement.furnitureId];
    return sum + anchor.footprintW * anchor.footprintD;
  }, 0);
  return used / (cols * rows);
}

/**
 * 문 앞에서 방 한가운데까지 걸어갈 수 있는지 본다.
 * 출발점은 단계마다 다르므로 문 clearance 한가운데에서 시작한다.
 */
function hasPathToCenter(
  placements: readonly ObservationPlacement[],
  stage: RoomStage,
): boolean {
  const { cols: COLS, rows: ROWS } = SHELL_GEOMETRY[stage];
  const door = stageRules(stage).doorClearances[0];
  const start = {
    x: Math.round((door.x + door.width / 2) * 2) / 2,
    y: Math.round((door.y + door.depth / 2) * 2) / 2,
  };
  const goal = { x: Math.round(COLS / 2) - 0.25, y: Math.round(ROWS / 2) + 0.25 };
  const step = 0.5;
  const obstacles = placements.map(placementRect);
  const key = (point: { x: number; y: number }) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
  const queue = [start];
  const seen = new Set([key(start)]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    if (Math.abs(current.x - goal.x) <= step / 2 && Math.abs(current.y - goal.y) <= step / 2) {
      return true;
    }
    for (const [dx, dy] of [
      [step, 0],
      [-step, 0],
      [0, step],
      [0, -step],
    ] as const) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (next.x < 0 || next.y < 0 || next.x >= COLS || next.y >= ROWS) continue;
      if (obstacles.some((rect) => pointInRect(next, rect))) continue;
      const nextKey = key(next);
      if (seen.has(nextKey)) continue;
      seen.add(nextKey);
      queue.push(next);
    }
  }
  return false;
}

/**
 * 좁은 화면에서 방 좌우가 조금 잘려도 가구는 안 잘리게 하는 여백.
 *
 * 셸을 화면 높이의 60~70%로 키우면 가로가 화면보다 넓어져 양옆이 잘린다.
 * 잘려도 되는 건 바닥 테두리까지고, 물건이 잘리면 안 된다. 그래서 배치는
 * 화면 폭 안에 들어오는 x 범위 안에서만 허용한다.
 */
export function roomSafeScreenRange(
  projection: IsoProjection,
  viewportWidth: number,
): { min: number; max: number } {
  const overflow = Math.max(0, projection.displayW - viewportWidth);
  const inset = overflow / 2;
  return { min: inset, max: projection.displayW - inset };
}

function visualBoxesOverlapRatio(a: VisualBox, b: VisualBox): number {
  const overlapW = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const overlapH = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  if (overlapW <= 0 || overlapH <= 0) return 0;
  return (overlapW * overlapH) / (a.width * a.height);
}

export type ObservationLayoutIssue =
  | 'too_dense'
  | 'too_many_furniture'
  | 'overlap'
  | 'out_of_bounds'
  | 'door_blocked'
  | 'aisle_blocked'
  | 'approach_blocked'
  | 'walkway_blocked'
  | 'cat_occluded'
  | 'outside_safe_area';

/** 편집 중에 사용자에게 보여줄 이유. 조용히 되돌리지 않기 위한 문구다. */
export const LAYOUT_ISSUE_TEXT: Record<ObservationLayoutIssue, string> = {
  too_dense: '가구가 너무 빽빽해요',
  too_many_furniture: '가구를 더 놓을 수 없어요',
  overlap: '다른 가구와 겹쳐요',
  out_of_bounds: '방 밖으로 나가요',
  door_blocked: '출입문 앞은 비워 둬야 해요',
  aisle_blocked: '가운데 통로를 막아요',
  approach_blocked: '고양이가 다가갈 자리가 막혀요',
  walkway_blocked: '고양이가 지나갈 길이 없어져요',
  cat_occluded: '고양이가 가려져요',
  outside_safe_area: '화면 밖으로 잘려요',
};

/** 여러 이유가 겹치면 사용자가 가장 먼저 고쳐야 할 하나만 말한다. */
const ISSUE_PRIORITY: readonly ObservationLayoutIssue[] = [
  'out_of_bounds',
  'outside_safe_area',
  'overlap',
  'door_blocked',
  'aisle_blocked',
  'walkway_blocked',
  'approach_blocked',
  'cat_occluded',
  'too_dense',
  'too_many_furniture',
];

export function primaryIssueText(issues: readonly ObservationLayoutIssue[]): string | null {
  const first = ISSUE_PRIORITY.find((code) => issues.includes(code));
  return first ? LAYOUT_ISSUE_TEXT[first] : null;
}

export interface LayoutCheckOptions {
  /** 검사할 단계. 방 크기와 문 위치가 달라진다. */
  stage?: RoomStage;
  /** 주면 화면 폭 기준 safe inset까지 검사한다. */
  projection?: IsoProjection;
  viewportWidth?: number;
  busyCats?: readonly BusyObservationCat[];
  idleCats?: readonly ObservationCat[];
}

export function validateObservationLayout(
  placements: readonly ObservationPlacement[],
  options: LayoutCheckOptions = {},
): ObservationLayoutIssue[] {
  const issues = new Set<ObservationLayoutIssue>();
  const stage = options.stage ?? 'stage0';
  const { cols: COLS, rows: ROWS } = SHELL_GEOMETRY[stage];
  const rules = stageRules(stage);
  if (placements.length > 6) issues.add('too_many_furniture');
  if (observationFootprintCoverage(placements, stage) > 0.35) issues.add('too_dense');

  const rects = placements.map(placementRect);
  rects.forEach((rect, index) => {
    if (rect.x < 0 || rect.y < 0 || rect.x + rect.width > COLS || rect.y + rect.depth > ROWS) {
      issues.add('out_of_bounds');
    }
    if (rules.doorClearances.some((clearance) => rectsOverlap(rect, clearance))) {
      issues.add('door_blocked');
    }
    if (rectsOverlap(rect, rules.centerAisle)) {
      issues.add('aisle_blocked');
    }
    if (rects.some((other, otherIndex) => otherIndex !== index && rectsOverlap(rect, other))) {
      issues.add('overlap');
    }
  });

  for (const approach of ACTION_APPROACHES) {
    const targetIndex = placements.findIndex(
      (placement) => placement.furnitureId === approach.furnitureId,
    );
    if (
      rects.some(
        (rect, index) =>
          index !== targetIndex && pointInRect({ x: approach.x, y: approach.y }, rect),
      )
    ) {
      issues.add('approach_blocked');
    }
  }
  if (!hasPathToCenter(placements, stage)) issues.add('walkway_blocked');

  // 격자만으로는 못 잡는 것들. 그림이 실제로 겹치는지, 화면 밖으로 나가는지.
  const projection = options.projection ?? createProjection(stage, 1);
  const busyCats = options.busyCats ?? DEFAULT_BUSY_CATS;
  const idleCats = options.idleCats ?? DEFAULT_IDLE_CATS;

  const catBoxes: VisualBox[] = [];
  const others: VisualBox[] = [];
  for (const placement of placements) {
    const behavior = busyCats.find((cat) => cat.on === placement.furnitureId)?.behavior;
    const layout = calculateFurnitureSpriteLayout({
      projection,
      furnitureId: placement.furnitureId,
      gridX: placement.gridX,
      gridY: placement.gridY,
      compositeBehavior: behavior,
    });
    (behavior ? catBoxes : others).push(layout.visual);

    if (options.viewportWidth !== undefined) {
      const safe = roomSafeScreenRange(projection, options.viewportWidth);
      if (layout.visual.left < safe.min || layout.visual.left + layout.visual.width > safe.max) {
        issues.add('outside_safe_area');
      }
    }
  }
  for (const cat of idleCats) {
    catBoxes.push(calculateIdleCatLayout(projection, cat.gridX, cat.gridY).visual);
  }

  // 앞에 있는 물체가 고양이 몸을 20% 넘게 가리면 얼굴이 안 보인다.
  for (const catBox of catBoxes) {
    for (const other of [...others, ...catBoxes]) {
      if (other === catBox) continue;
      if (visualBoxesOverlapRatio(catBox, other) > 0.2) issues.add('cat_occluded');
    }
  }

  return [...issues];
}

export function createDefaultObservationLayout(): readonly ObservationPlacement[] {
  const issues = validateObservationLayout(CANDIDATE_PLACEMENTS);
  if (issues.length > 0) {
    throw new Error(`기본 고객지원실 배치가 렌더 계약을 위반했다: ${issues.join(', ')}`);
  }
  return CANDIDATE_PLACEMENTS;
}

/**
 * 고양이가 돌아다닐 수 있는 빈 칸.
 *
 * 가구 footprint와 문 앞·통로를 뺀 바닥이다. 문 앞과 통로를 남기지 않으면
 * 돌아다니는 고양이가 입구를 막고 서 있는 그림이 된다(그 둘은 비워 두기로 한
 * 규칙이니 고양이도 지킨다).
 */
export function wanderableCells(
  placements: readonly ObservationPlacement[],
  stage: RoomStage = 'stage0',
): { x: number; y: number }[] {
  const { cols: COLS, rows: ROWS } = SHELL_GEOMETRY[stage];
  const rules = stageRules(stage);
  const blocked = placements.map(placementRect);
  const cells: { x: number; y: number }[] = [];

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const point = { x: x + 0.5, y: y + 0.5 };
      if (blocked.some((rect) => pointInRect(point, rect))) continue;
      if (rules.doorClearances.some((rect) => pointInRect(point, rect))) continue;
      if (pointInRect(point, rules.centerAisle)) continue;
      cells.push({ x, y });
    }
  }

  return cells;
}
