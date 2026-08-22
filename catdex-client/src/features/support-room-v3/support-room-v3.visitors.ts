import { selectCharacter, stableHash } from '@/features/support-room/character-matcher';
import type { CharacterAssetKey } from '@/features/support-room/support-room.assets';
import type { CoatColorId, CoatPatternId } from '@/shared/coat/coat.types';
import { DEFAULT_BUSY_CATS, DEFAULT_IDLE_CATS, type BusyObservationCat, type ObservationCat } from './support-room-v3.layout';

export interface VisitorCat {
  id: string;
  name: string;
  coatColors: readonly CoatColorId[];
  coatPattern: CoatPatternId | null;
}

export interface RoomVisitor extends BusyObservationCat {
  catId: string;
  catName: string;
  eventId: string;
  scheduledAt: number;
  slot: number;
}

/**
 * 앉을 가구가 방에 없어서 바닥을 돌아다니는 손님.
 *
 * 예전에는 배정된 가구가 방에 없으면 그 고양이가 통째로 사라졌다.
 * 상담은 가구가 있어야 열리지만, 고양이는 그것과 무관하게 방에 와 있어야 한다.
 */
export interface WanderingVisitor {
  catId: string;
  catName: string;
  key: CharacterAssetKey;
  /** 오갈 지점들(격자 좌표). 첫 지점에서 시작해 순환한다. */
  path: readonly { x: number; y: number }[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 씨앗 하나로 후보 중 한 마리를 고른다. 후보가 줄어도 나머지의 순위는 그대로다.
 *
 * 예전에는 stableHash(seed) % pool.length 였다. 한 마리가 상담을 끝내 풀에서
 * 빠지면 length가 바뀌어 모든 자리의 인덱스가 밀렸고, 그래서 손대지도 않은
 * 옆자리 고양이가 조용히 다른 고양이로 바뀌었다.
 */
function pickStable(
  pool: readonly VisitorCat[],
  seed: string,
  used: ReadonlySet<string>,
): VisitorCat | null {
  let best: VisitorCat | null = null;
  let bestScore = -1;
  for (const cat of pool) {
    if (used.has(cat.id)) continue;
    const score = stableHash(`${seed}:${cat.id}`);
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }
  return best;
}

/** 로컬 자정 기준 오늘의 시작 시각. 방문 배정과 record eventId가 여기 물린다. */
export function todayStartMs(now = Date.now()): number {
  const offsetMs = new Date(now).getTimezoneOffset() * 60 * 1000;
  return Math.floor((now - offsetMs) / DAY_MS) * DAY_MS + offsetMs;
}

/**
 * 오늘의 상담데스크·의자 손님을 결정적으로 배정한다.
 * consultedCatIds(오늘 이미 상담 완료된 고양이 개체)는 배정 풀 자체에서 뺀다 -
 * 슬롯만 비우면 그 개체가 다른 자리에 재배정될 수 있어서 개체 단위로 걸러야 한다.
 */
export function assignBusyVisitors(
  cats: readonly VisitorCat[],
  salt: string,
  dayStartMs: number,
  consultedEventIds: ReadonlySet<string>,
  consultedCatIds: ReadonlySet<string>,
): RoomVisitor[] {
  const pool = cats.filter((cat) => !consultedCatIds.has(cat.id));
  if (pool.length === 0) return [];
  const used = new Set<string>();
  const visitors: RoomVisitor[] = [];

  DEFAULT_BUSY_CATS.forEach((slotTemplate, slot) => {
    const eventId = `${salt}:${dayStartMs}:${slot}`;
    if (consultedEventIds.has(eventId)) return;

    const cat = pickStable(pool, eventId, used);
    if (!cat) return;
    used.add(cat.id);
    const character = selectCharacter(cat.coatColors, cat.coatPattern, cat.id);
    visitors.push({
      behavior: slotTemplate.behavior,
      on: slotTemplate.on,
      key: character.key,
      catId: cat.id,
      catName: cat.name,
      eventId,
      scheduledAt: dayStartMs,
      slot,
    });
  });

  return visitors;
}

/**
 * 바닥에 어슬렁거리는 손님 한 마리. 상담 대상이 아니라 항상 그 자리에 있다.
 * consultedCatIds는 하드 제외(오늘 끝난 고양이는 폴백으로도 다시 안 나온다).
 * avoidCatIds(지금 다른 자리에 앉은 고양이)는 소프트 제외 - 대안이 없으면 겹쳐도 된다.
 */
export function assignIdleVisitor(
  cats: readonly VisitorCat[],
  salt: string,
  dayStartMs: number,
  consultedCatIds: ReadonlySet<string>,
  avoidCatIds: ReadonlySet<string> = new Set(),
): (ObservationCat & { catId: string }) | null {
  const eligible = cats.filter((cat) => !consultedCatIds.has(cat.id));
  if (eligible.length === 0) return null;

  const preferred = eligible.filter((cat) => !avoidCatIds.has(cat.id));
  const source = preferred.length > 0 ? preferred : eligible;

  const cat = pickStable(source, `${salt}:${dayStartMs}:idle`, new Set());
  if (!cat) return null;
  const character = selectCharacter(cat.coatColors, cat.coatPattern, cat.id);
  const template = DEFAULT_IDLE_CATS[0];
  return {
    catId: cat.id,
    key: character.key as CharacterAssetKey,
    gridX: template.gridX,
    gridY: template.gridY,
  };
}

/**
 * 배정된 손님을 "앉은 손님"과 "돌아다니는 손님"으로 가른다.
 *
 * 앉으려던 가구가 방에 없으면 사라지게 두지 않고 바닥으로 내보낸다.
 * 상담(기록 발생)은 앉은 손님에게만 열린다 - 가구가 있어야 상담이다.
 */
export function splitVisitorsByFurniture(
  visitors: readonly RoomVisitor[],
  placedFurnitureIds: ReadonlySet<string>,
  freeCells: readonly { x: number; y: number }[],
): { seated: RoomVisitor[]; wandering: WanderingVisitor[] } {
  const seated: RoomVisitor[] = [];
  const wandering: WanderingVisitor[] = [];

  for (const visitor of visitors) {
    if (placedFurnitureIds.has(visitor.on)) {
      seated.push(visitor);
      continue;
    }
    wandering.push({
      catId: visitor.catId,
      catName: visitor.catName,
      key: visitor.key,
      path: pickWanderPath(visitor.catId, freeCells),
    });
  }

  return { seated, wandering };
}

/**
 * 빈 칸 중 세 곳을 골라 순환 경로를 만든다.
 * 고양이마다 다른 곳을 걷도록 id로 씨앗을 만들고, 서로 너무 가까운 곳은 건너뛴다.
 */
export function pickWanderPath(
  catId: string,
  freeCells: readonly { x: number; y: number }[],
  stops = 3,
): { x: number; y: number }[] {
  if (freeCells.length === 0) return [];

  const path: { x: number; y: number }[] = [];
  let index = stableHash(`${catId}:wander`) % freeCells.length;

  for (let picked = 0; picked < stops; picked += 1) {
    let attempts = 0;
    while (
      attempts < freeCells.length &&
      path.some((stop) => Math.hypot(stop.x - freeCells[index].x, stop.y - freeCells[index].y) < 2)
    ) {
      index = (index + 1) % freeCells.length;
      attempts += 1;
    }
    path.push(freeCells[index]);
    index = (index + 1 + stableHash(`${catId}:${picked}`) % 3) % freeCells.length;
  }

  return path;
}
