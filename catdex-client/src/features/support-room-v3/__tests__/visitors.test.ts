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
    expect(assignBusyVisitors([], 'user-a', day, new Set())).toEqual([]);
  });

  it('같은 입력이면 항상 같은 배정(결정적)', () => {
    const first = assignBusyVisitors(CATS, 'user-a', day, new Set());
    const second = assignBusyVisitors(CATS, 'user-a', day, new Set());
    expect(first).toEqual(second);
    expect(first).toHaveLength(2);
  });

  it('두 자리에 서로 다른 고양이가 앉는다(고양이가 2마리 이상일 때)', () => {
    const visitors = assignBusyVisitors(CATS, 'user-a', day, new Set());
    expect(new Set(visitors.map((v) => v.catId)).size).toBe(visitors.length);
  });

  it('오늘 이미 상담 완료된 자리는 빈 자리로 둔다', () => {
    const before = assignBusyVisitors(CATS, 'user-a', day, new Set());
    const consulted = new Set([before[0].eventId]);
    const after = assignBusyVisitors(CATS, 'user-a', day, consulted);
    expect(after).toHaveLength(1);
    expect(after[0].eventId).toBe(before[1].eventId);
  });
});

describe('assignIdleVisitor', () => {
  const day = todayStartMs(Date.UTC(2026, 0, 1, 12));

  it('고양이가 없으면 null', () => {
    expect(assignIdleVisitor([], 'user-a', day, new Set())).toBeNull();
  });

  it('제외 목록이 전체를 덮어도 null 대신 전체 풀에서 고른다', () => {
    const allIds = new Set(CATS.map((cat) => cat.id));
    expect(assignIdleVisitor(CATS, 'user-a', day, allIds)).not.toBeNull();
  });

  it('결정적이다', () => {
    expect(assignIdleVisitor(CATS, 'user-a', day, new Set())).toEqual(
      assignIdleVisitor(CATS, 'user-a', day, new Set()),
    );
  });
});
