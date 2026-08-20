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
import { SHELL_GEOMETRY } from './render/shells.generated';

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

const COLS = SHELL_GEOMETRY.stage0.cols;
const ROWS = SHELL_GEOMETRY.stage0.rows;

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

/**
 * 왼쪽 출입문 앞에 항상 비워 두는 2×2.
 *
 * 셸 원본에서 문지방 양 끝(170,768)·(300,690)을 재서 격자로 되돌리면
 * 문은 x≈0.28의 벽면에서 y 4.73~6.65를 차지한다(8행 격자 기준). 그 앞 2칸을 비운다.
 */
export const STAGE0_DOOR_CLEARANCES: readonly GridRect[] = [
  { x: 0, y: 4.6, width: 2, depth: 2 },
];

/** 문에서 방 가운데로 이어지는 통로. 가구로 막으면 고양이가 들어올 길이 없다. */
export const STAGE0_CENTER_AISLE: GridRect = { x: 2, y: 4.6, width: 3, depth: 2 };

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
  cols = COLS,
  rows = ROWS,
): number {
  const used = placements.reduce((sum, placement) => {
    const anchor = FURNITURE_ANCHORS[placement.furnitureId];
    return sum + anchor.footprintW * anchor.footprintD;
  }, 0);
  return used / (cols * rows);
}

function hasPathToCenter(placements: readonly ObservationPlacement[]): boolean {
  const step = 0.5;
  const obstacles = placements.map(placementRect);
  const start = { x: 0.25, y: 5.75 };
  const goal = { x: 4.25, y: 4.25 };
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
  if (placements.length > 6) issues.add('too_many_furniture');
  if (observationFootprintCoverage(placements) > 0.35) issues.add('too_dense');

  const rects = placements.map(placementRect);
  rects.forEach((rect, index) => {
    if (rect.x < 0 || rect.y < 0 || rect.x + rect.width > COLS || rect.y + rect.depth > ROWS) {
      issues.add('out_of_bounds');
    }
    if (STAGE0_DOOR_CLEARANCES.some((clearance) => rectsOverlap(rect, clearance))) {
      issues.add('door_blocked');
    }
    if (rectsOverlap(rect, STAGE0_CENTER_AISLE)) {
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
  if (!hasPathToCenter(placements)) issues.add('walkway_blocked');

  // 격자만으로는 못 잡는 것들. 그림이 실제로 겹치는지, 화면 밖으로 나가는지.
  const projection = options.projection ?? createProjection('stage0', 1);
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
