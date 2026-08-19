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

const DAY_MS = 24 * 60 * 60 * 1000;

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
  const used = new Set<number>();
  const visitors: RoomVisitor[] = [];

  DEFAULT_BUSY_CATS.forEach((slotTemplate, slot) => {
    const eventId = `${salt}:${dayStartMs}:${slot}`;
    if (consultedEventIds.has(eventId)) return;

    let index = stableHash(eventId) % pool.length;
    for (let attempt = 0; attempt < pool.length && used.has(index); attempt += 1) {
      index = (index + 1) % pool.length;
    }
    used.add(index);

    const cat = pool[index];
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
): ObservationCat | null {
  const eligible = cats.filter((cat) => !consultedCatIds.has(cat.id));
  if (eligible.length === 0) return null;

  const preferred = eligible.filter((cat) => !avoidCatIds.has(cat.id));
  const source = preferred.length > 0 ? preferred : eligible;

  const seed = stableHash(`${salt}:${dayStartMs}:idle`);
  const cat = source[seed % source.length];
  const character = selectCharacter(cat.coatColors, cat.coatPattern, cat.id);
  const template = DEFAULT_IDLE_CATS[0];
  return { key: character.key as CharacterAssetKey, gridX: template.gridX, gridY: template.gridY };
}
