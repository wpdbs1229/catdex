import { describe, expect, it } from 'vitest';
import {
  calculateShellFitScale,
  createProjection,
  isoDepth,
} from '../projection';
import { SHELL_GEOMETRY } from '../shells.generated';

describe('support-room-v3 projection', () => {
  it('바닥 네 꼭짓점이 검수된 셸 모서리와 일치한다', () => {
    const projection = createProjection('stage0', 1);
    const { cols, rows } = SHELL_GEOMETRY.stage0;
    // 칸 수가 바뀌어도 바닥 마름모의 네 귀퉁이는 같은 자리여야 한다.
    expect(projection.point(0, 0)).toEqual({ x: 571, y: 420 });
    expect(projection.point(cols, 0).x).toBeCloseTo(1152, 2);
    expect(projection.point(cols, 0).y).toBeCloseTo(731, 2);
    expect(projection.point(0, rows).x).toBeCloseTo(3, 2);
    expect(projection.point(0, rows).y).toBeCloseTo(731, 2);
    expect(projection.point(cols, rows).x).toBeCloseTo(584, 1);
    expect(projection.point(cols, rows).y).toBeCloseTo(1042, 1);
  });

  it('한 칸이 정사각형이다 - 가구 아트가 정사각 칸을 전제로 그려진다', () => {
    const { axisX, axisY } = SHELL_GEOMETRY.stage0;
    const lengthX = Math.hypot(axisX.x, axisX.y);
    const lengthY = Math.hypot(axisY.x, axisY.y);
    // 예전 8×6에서는 세로가 31% 길었다.
    expect(lengthY / lengthX).toBeGreaterThan(0.95);
    expect(lengthY / lengthX).toBeLessThan(1.05);
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

  it('screenDeltaToGrid가 point()의 정확한 역변환이다(드래그 이동량 복원)', () => {
    const projection = createProjection('stage0', 0.5);
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [2.5, -1.5],
      [-3, 4],
    ] as const) {
      const from = projection.point(2, 2);
      const to = projection.point(2 + dx, 2 + dy);
      const recovered = projection.screenDeltaToGrid(to.x - from.x, to.y - from.y);
      expect(recovered.dx).toBeCloseTo(dx, 6);
      expect(recovered.dy).toBeCloseTo(dy, 6);
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
