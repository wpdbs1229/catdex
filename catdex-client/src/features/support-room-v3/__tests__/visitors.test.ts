import { describe, expect, it } from 'vitest';
import { assignBusyVisitors, assignIdleVisitor, todayStartMs, type VisitorCat } from '../support-room-v3.visitors';

const CATS: VisitorCat[] = [
  { coatColors: ['orange'], coatPattern: 'tabby', id: 'cat-1', name: '감자' },
  { coatColors: ['black', 'white'], coatPattern: 'bicolor', id: 'cat-2', name: '보리' },
  { coatColors: ['gray'], coatPattern: 'solid', id: 'cat-3', name: '몽이' },
];

describe('assignBusyVisitors', () => {
  const day = todayStartMs(Date.UTC(2026, 0, 1, 12));

  it('고양이가 없으면 빈 방', () => {
    expect(assignBusyVisitors([], 'user-a', day, new Set(), new Set())).toEqual([]);
  });

  it('같은 입력이면 항상 같은 배정(결정적)', () => {
    const first = assignBusyVisitors(CATS, 'user-a', day, new Set(), new Set());
    const second = assignBusyVisitors(CATS, 'user-a', day, new Set(), new Set());
    expect(first).toEqual(second);
    expect(first).toHaveLength(2);
  });

  it('두 자리에 서로 다른 고양이가 앉는다(고양이가 2마리 이상일 때)', () => {
    const visitors = assignBusyVisitors(CATS, 'user-a', day, new Set(), new Set());
    expect(new Set(visitors.map((v) => v.catId)).size).toBe(visitors.length);
  });

  it('오늘 이미 상담 완료된 자리는 빈 자리로 둔다', () => {
    const before = assignBusyVisitors(CATS, 'user-a', day, new Set(), new Set());
    const consulted = new Set([before[0].eventId]);
    const after = assignBusyVisitors(CATS, 'user-a', day, consulted, new Set());
    expect(after).toHaveLength(1);
    expect(after[0].eventId).toBe(before[1].eventId);
  });

  it('오늘 상담 완료된 고양이는 다른 자리에도 재배정되지 않는다', () => {
    const before = assignBusyVisitors(CATS, 'user-a', day, new Set(), new Set());
    const consultedCat = before[0].catId;
    const after = assignBusyVisitors(
      CATS,
      'user-a',
      day,
      new Set([before[0].eventId]),
      new Set([consultedCat]),
    );
    expect(after.some((v) => v.catId === consultedCat)).toBe(false);
  });
});

describe('assignIdleVisitor', () => {
  const day = todayStartMs(Date.UTC(2026, 0, 1, 12));

  it('고양이가 없으면 null', () => {
    expect(assignIdleVisitor([], 'user-a', day, new Set())).toBeNull();
  });

  it('오늘 상담 완료된 고양이는 폴백으로도 다시 나오지 않는다', () => {
    const allIds = new Set(CATS.map((cat) => cat.id));
    expect(assignIdleVisitor(CATS, 'user-a', day, allIds)).toBeNull();
  });

  it('avoidCatIds가 전체를 덮으면 그래도 폴백으로 고른다', () => {
    const allIds = new Set(CATS.map((cat) => cat.id));
    expect(assignIdleVisitor(CATS, 'user-a', day, new Set(), allIds)).not.toBeNull();
  });

  it('결정적이다', () => {
    expect(assignIdleVisitor(CATS, 'user-a', day, new Set())).toEqual(
      assignIdleVisitor(CATS, 'user-a', day, new Set()),
    );
  });
});

describe('한 자리를 끝내도 다른 자리는 그대로다', () => {
  const cats = Array.from({ length: 8 }, (_, i) => ({
    id: `cat-${i}`,
    name: `고양이${i}`,
    coatColors: ['orange'] as never,
    coatPattern: null,
  }));

  it('상담을 끝내면 그 자리만 비고 옆자리 고양이는 안 바뀐다', () => {
    const before = assignBusyVisitors(cats, 'u', 0, new Set(), new Set());
    expect(before.length).toBeGreaterThan(1);

    const after = assignBusyVisitors(
      cats,
      'u',
      0,
      new Set([before[0].eventId]),
      new Set([before[0].catId]),
    );

    expect(after.map((visitor) => visitor.slot)).not.toContain(before[0].slot);
    for (const visitor of after) {
      const same = before.find((item) => item.slot === visitor.slot);
      expect(visitor.catId, `slot ${visitor.slot}`).toBe(same?.catId);
    }
  });

  it('바닥 손님도 다른 고양이가 빠졌다고 바뀌지 않는다', () => {
    const before = assignIdleVisitor(cats, 'u', 0, new Set());
    const other = cats.find((cat) => cat.id !== before?.catId)!;
    const after = assignIdleVisitor(cats, 'u', 0, new Set([other.id]));
    expect(after?.catId).toBe(before?.catId);
  });
});
