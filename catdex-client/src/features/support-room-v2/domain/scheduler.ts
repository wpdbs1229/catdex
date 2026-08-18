import { stableHash } from '@/features/support-room/character-matcher';
import type { BehaviorId, FurnitureId } from './furniture';
import type { GridPoint } from './grid';
import { pointKey } from './grid';
import type { Placement, SpecLookup } from './placement';
import { approachAnchorCells, walkableFloorCells } from './placement';
import { findPath } from './pathfinding';
import type { RoomShellConfig } from './room-shell';

/**
 * 자율 방문 스케줄러. 같은 입력이면 항상 같은 장면을 만든다(Math.random 금지).
 * eventId = salt:scheduledAt:slot 이라 서버 unique(user, scheduled_at, slot)와
 * 클라이언트 중복 재생 방지가 같은 키를 공유한다.
 */

export interface VisitCat {
  catId: string;
  characterAssetKey: string;
  catName: string;
}

export interface VisitScene {
  eventId: string;
  slot: number;
  scheduledAt: number;
  catId: string;
  catName: string;
  characterAssetKey: string;
  placementId: string;
  furnitureId: FurnitureId;
  behaviorId: BehaviorId;
  /** 문 → 접근 앵커 경로(포함) */
  path: GridPoint[];
  anchor: GridPoint;
}

export interface PlanInput {
  placements: readonly Placement[];
  lookup: SpecLookup;
  shell: RoomShellConfig;
  cats: readonly VisitCat[];
  /** 장면 시각(예: 시간 창 시작). 결정성의 입력이다. */
  scheduledAt: number;
  slots: number;
  /** 사용자별 결정성 salt(userId) */
  salt: string;
}


interface Candidate {
  placement: Placement;
  behaviorId: BehaviorId;
  capacity: number;
  path: GridPoint[];
  anchor: GridPoint;
}

/**
 * 행동 후보: 준비된 행동이 있고(share_bench 같은 future 행동 제외는 spec.behaviors가 보장),
 * 문에서 가장 짧은 유효 앵커까지 경로가 있는 배치.
 */
function collectCandidates(input: PlanInput): Candidate[] {
  const walkable = walkableFloorCells(input.placements, input.lookup, input.shell);
  const doorCells = input.shell.doors
    .flatMap((door) => door.clearanceCells)
    .filter((cell) => walkable.has(pointKey(cell)));
  if (doorCells.length === 0) return [];
  const spawn = doorCells[0];

  const candidates: Candidate[] = [];
  for (const placement of input.placements) {
    const spec = input.lookup(placement.furnitureId);
    if (!spec || spec.behaviors.length === 0) continue;
    // 여러 앵커 중 경로가 가장 짧은 유효 앵커를 고른다. 동률이면 앵커 정의 순서.
    let best: { path: GridPoint[]; anchor: GridPoint } | null = null;
    for (const anchor of approachAnchorCells(placement, spec)) {
      if (!walkable.has(pointKey(anchor))) continue;
      const path = findPath(walkable, spawn, anchor);
      if (path && (!best || path.length < best.path.length)) {
        best = { path, anchor };
      }
    }
    if (best) {
      candidates.push({
        placement,
        behaviorId: spec.behaviors[0],
        capacity: spec.capacity,
        path: best.path,
        anchor: best.anchor,
      });
    }
  }
  // placementId로 정렬해 순서까지 결정적으로.
  return candidates.sort((a, b) => a.placement.placementId.localeCompare(b.placement.placementId));
}

/**
 * slot 수만큼 장면을 결정적으로 만든다.
 * 같은 시간 창 안에서 capacity를 초과 예약하지 않고, 경로 없는 가구는 제외한다.
 */
export function planVisits(input: PlanInput): VisitScene[] {
  if (input.cats.length === 0) return [];
  const candidates = collectCandidates(input);
  if (candidates.length === 0) return [];

  const reserved = new Map<string, number>();
  const scenes: VisitScene[] = [];

  for (let slot = 0; slot < input.slots; slot += 1) {
    const seed = stableHash(`${input.salt}:${input.scheduledAt}:${slot}`);
    const cat = input.cats[seed % input.cats.length];

    // capacity가 남은 후보만. seed 기반 시작점에서 순환 탐색해 결정적으로 고른다.
    let picked: Candidate | null = null;
    for (let i = 0; i < candidates.length; i += 1) {
      const candidate = candidates[(seed + i) % candidates.length];
      const used = reserved.get(candidate.placement.placementId) ?? 0;
      if (used < candidate.capacity) {
        picked = candidate;
        break;
      }
    }
    if (!picked) continue; // 모든 가구가 만석이면 이 slot은 건너뛴다(idle/exit)

    reserved.set(picked.placement.placementId, (reserved.get(picked.placement.placementId) ?? 0) + 1);
    scenes.push({
      eventId: `${input.salt}:${input.scheduledAt}:${slot}`,
      slot,
      scheduledAt: input.scheduledAt,
      catId: cat.catId,
      catName: cat.catName,
      characterAssetKey: cat.characterAssetKey,
      placementId: picked.placement.placementId,
      furnitureId: picked.placement.furnitureId,
      behaviorId: picked.behaviorId,
      path: picked.path,
      anchor: picked.anchor,
    });
  }
  return scenes;
}

/**
 * 미접속 정산: 마지막 정산 이후 지난 시간 창들의 장면을 계산해 최근 3건만 남긴다.
 * 창 크기 1시간. 같은 창을 두 번 정산해도 eventId가 같아 중복이 생기지 않는다.
 */
export const SETTLE_WINDOW_MS = 60 * 60 * 1000;
export const MAX_OFFLINE_SUMMARY = 3;

export function settleOfflineVisits(
  input: Omit<PlanInput, 'scheduledAt' | 'slots'>,
  lastSettledAt: number,
  now: number,
): VisitScene[] {
  const scenes: VisitScene[] = [];
  const firstWindow = Math.floor(lastSettledAt / SETTLE_WINDOW_MS) + 1;
  const lastWindow = Math.floor(now / SETTLE_WINDOW_MS);
  for (let window = firstWindow; window <= lastWindow; window += 1) {
    scenes.push(...planVisits({ ...input, scheduledAt: window * SETTLE_WINDOW_MS, slots: 1 }));
  }
  return scenes.slice(-MAX_OFFLINE_SUMMARY);
}
