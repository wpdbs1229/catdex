import { describe, expect, it } from 'vitest';
import {
  calculateShellFitScale,
  createProjection,
  isoDepth,
} from '../projection';
import { SHELL_GEOMETRY } from '../shells.generated';

describe('support-room-v3 projection', () => {
  it('stage0의 네 바닥 꼭짓점이 검수된 셸 모서리와 일치한다', () => {
    const projection = createProjection('stage0', 1);
    expect(projection.point(0, 0)).toEqual({ x: 571, y: 420 });
    expect(projection.point(8, 0).x).toBeCloseTo(1152, 2);
    expect(projection.point(8, 0).y).toBeCloseTo(731, 2);
    expect(projection.point(0, 6).x).toBeCloseTo(3, 2);
    expect(projection.point(0, 6).y).toBeCloseTo(731, 2);
    expect(projection.point(8, 6).x).toBeCloseTo(584, 1);
    expect(projection.point(8, 6).y).toBeCloseTo(1042, 1);
  });

  it('390/430 폭에서 실제 roomArea 높이의 68%를 방이 차지한다', () => {
    const geometry = SHELL_GEOMETRY.stage0;
    for (const viewport of [
      { width: 390, height: 610 },
      { width: 430, height: 690 },
    ]) {
      const scale = calculateShellFitScale(geometry, viewport);
      const projection = createProjection('stage0', scale);
      expect(projection.displayH / viewport.height).toBeCloseTo(0.68, 4);
      expect(projection.displayW).toBeLessThanOrEqual(viewport.width * 1.34 + 0.01);
    }
  });

  it('앞쪽 접지점의 depth가 항상 더 크다', () => {
    expect(isoDepth(4, 5)).toBeGreaterThan(isoDepth(4, 4));
    expect(isoDepth(5, 4)).toBeGreaterThan(isoDepth(4, 4));
  });

  it('확장 셸 다섯 단계를 모두 갖고 stage4만 별관 마스크 대상이다', () => {
    expect(Object.keys(SHELL_GEOMETRY)).toEqual([
      'stage0',
      'stage1',
      'stage2',
      'stage3',
      'stage4',
    ]);
    expect(SHELL_GEOMETRY.stage3.hasAnnex).toBe(false);
    expect(SHELL_GEOMETRY.stage4.hasAnnex).toBe(true);
  });
});
