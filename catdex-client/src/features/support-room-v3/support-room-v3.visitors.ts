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
 * 이미 오늘 상담 완료된 자리(consultedEventIds에 eventId가 있음)는 빈 자리로 둔다.
 */
export function assignBusyVisitors(
  cats: readonly VisitorCat[],
  salt: string,
  dayStartMs: number,
  consultedEventIds: ReadonlySet<string>,
): RoomVisitor[] {
  if (cats.length === 0) return [];
  const used = new Set<number>();
  const visitors: RoomVisitor[] = [];

  DEFAULT_BUSY_CATS.forEach((slotTemplate, slot) => {
    const eventId = `${salt}:${dayStartMs}:${slot}`;
    if (consultedEventIds.has(eventId)) return;

    let index = stableHash(eventId) % cats.length;
    for (let attempt = 0; attempt < cats.length && used.has(index); attempt += 1) {
      index = (index + 1) % cats.length;
    }
    used.add(index);

    const cat = cats[index];
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

/** 바닥에 어슬렁거리는 손님 한 마리. 상담 대상이 아니라 항상 그 자리에 있다. */
export function assignIdleVisitor(
  cats: readonly VisitorCat[],
  salt: string,
  dayStartMs: number,
  excludeCatIds: ReadonlySet<string>,
): ObservationCat | null {
  const pool = cats.filter((cat) => !excludeCatIds.has(cat.id));
  const source = pool.length > 0 ? pool : cats;
  if (source.length === 0) return null;

  const seed = stableHash(`${salt}:${dayStartMs}:idle`);
  const cat = source[seed % source.length];
  const character = selectCharacter(cat.coatColors, cat.coatPattern, cat.id);
  const template = DEFAULT_IDLE_CATS[0];
  return { key: character.key as CharacterAssetKey, gridX: template.gridX, gridY: template.gridY };
}
