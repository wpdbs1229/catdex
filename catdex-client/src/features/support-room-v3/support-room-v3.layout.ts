import type {
  BehaviorId as CatBehaviorId,
  CharacterAssetKey,
} from '@/features/support-room/support-room.assets';
import type { FurnitureId } from '@/features/support-room-v2/domain/furniture';
import { FURNITURE_ANCHORS } from './render/furniture-anchors.generated';

export interface ObservationPlacement {
  furnitureId: FurnitureId;
  gridX: number;
  gridY: number;
}

export interface ObservationCat {
  key: CharacterAssetKey;
  gridX: number;
  gridY: number;
}

export interface BusyObservationCat {
  key: CharacterAssetKey;
  behavior: Extract<CatBehaviorId, 'use_cushion' | 'sit_swivel_chair'>;
  on: FurnitureId;
}

const CANDIDATE_PLACEMENTS: readonly ObservationPlacement[] = [
  { furnitureId: 'floor_lamp_warm', gridX: 0.25, gridY: 0.4 },
  { furnitureId: 'consultation_desk_honey', gridX: 3.6, gridY: 0.2 },
  { furnitureId: 'visitor_cushion_orange', gridX: 1.65, gridY: 2.75 },
  { furnitureId: 'swivel_chair_lavender', gridX: 5.35, gridY: 2.55 },
  { furnitureId: 'plant_small_desk', gridX: 1.25, gridY: 4.9 },
];

export const DEFAULT_BUSY_CATS: readonly BusyObservationCat[] = [
  { key: 'solid_gray', behavior: 'use_cushion', on: 'visitor_cushion_orange' },
  { key: 'bicolor_tuxedo', behavior: 'sit_swivel_chair', on: 'swivel_chair_lavender' },
];

export const DEFAULT_IDLE_CATS: readonly ObservationCat[] = [
  { key: 'tabby_orange', gridX: 4.6, gridY: 4.3 },
];

interface GridRect {
  x: number;
  y: number;
  width: number;
  depth: number;
}

/** 생성된 stage0 셸은 왼쪽 출입문 하나만 포함한다. 문 앞 2×2는 항상 비운다. */
export const STAGE0_DOOR_CLEARANCES: readonly GridRect[] = [
  { x: 0, y: 2.8, width: 1.6, depth: 2 },
];

const ACTION_APPROACHES = [
  { furnitureId: 'visitor_cushion_orange' as const, x: 3.9, y: 3.75 },
  { furnitureId: 'swivel_chair_lavender' as const, x: 4.85, y: 3.55 },
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
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.depth &&
    a.y + a.depth > b.y
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
  cols = 8,
  rows = 6,
): number {
  const used = placements.reduce((sum, placement) => {
    const anchor = FURNITURE_ANCHORS[placement.furnitureId];
    return sum + anchor.footprintW * anchor.footprintD;
  }, 0);
  return used / (cols * rows);
}

function hasPathToCenter(placements: readonly ObservationPlacement[]): boolean {
  const step = 0.5;
  const cols = 8;
  const rows = 6;
  const obstacles = placements.map(placementRect);
  const start = { x: 0.25, y: 3.75 };
  const goal = { x: 4.25, y: 3.25 };
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
      if (next.x < 0 || next.y < 0 || next.x >= cols || next.y >= rows) continue;
      if (obstacles.some((rect) => pointInRect(next, rect))) continue;
      const nextKey = key(next);
      if (seen.has(nextKey)) continue;
      seen.add(nextKey);
      queue.push(next);
    }
  }
  return false;
}

export type ObservationLayoutIssue =
  | 'too_dense'
  | 'too_many_furniture'
  | 'overlap'
  | 'out_of_bounds'
  | 'door_blocked'
  | 'approach_blocked'
  | 'walkway_blocked';

export function validateObservationLayout(
  placements: readonly ObservationPlacement[],
): ObservationLayoutIssue[] {
  const issues = new Set<ObservationLayoutIssue>();
  if (placements.length > 6) issues.add('too_many_furniture');
  if (observationFootprintCoverage(placements) > 0.35) issues.add('too_dense');

  const rects = placements.map(placementRect);
  rects.forEach((rect, index) => {
    if (rect.x < 0 || rect.y < 0 || rect.x + rect.width > 8 || rect.y + rect.depth > 6) {
      issues.add('out_of_bounds');
    }
    if (STAGE0_DOOR_CLEARANCES.some((clearance) => rectsOverlap(rect, clearance))) {
      issues.add('door_blocked');
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
        (rect, index) => index !== targetIndex && pointInRect({ x: approach.x, y: approach.y }, rect),
      )
    ) {
      issues.add('approach_blocked');
    }
  }
  if (!hasPathToCenter(placements)) issues.add('walkway_blocked');
  return [...issues];
}

export function createDefaultObservationLayout(): readonly ObservationPlacement[] {
  const issues = validateObservationLayout(CANDIDATE_PLACEMENTS);
  if (issues.length > 0) {
    throw new Error(`기본 고객지원실 배치가 렌더 계약을 위반했다: ${issues.join(', ')}`);
  }
  return CANDIDATE_PLACEMENTS;
}
