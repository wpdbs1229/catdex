import { describe, expect, it } from 'vitest';
import { STAGE_UNLOCK_COST, calculateExpansionProgress } from '../support-room-v3.progress';

describe('고객지원실 확장 진행도', () => {
  it('잔액과 퍼센트가 서로 어긋나지 않는다', () => {
    const progress = calculateExpansionProgress(4_000, 'stage0');
    expect(progress.cost).toBe(STAGE_UNLOCK_COST.stage1);
    expect(progress.percent).toBe(40);
    expect(progress.remaining).toBe(6_000);
    // 화면 문구가 말하는 금액과 막대 비율이 같은 값에서 나와야 한다.
    expect(progress.label).toContain('6,000 BP 남음');
    expect(progress.remaining + 4_000).toBe(progress.cost);
  });

  it('목표를 채우면 남은 금액이 0이고 문구가 바뀐다', () => {
    const progress = calculateExpansionProgress(12_000, 'stage0');
    expect(progress.remaining).toBe(0);
    expect(progress.percent).toBe(100);
    expect(progress.label).toContain('넓힐 수 있어요');
  });

  it('마지막 단계에는 다음 목표가 없다', () => {
    expect(calculateExpansionProgress(999_999, 'stage4').nextStage).toBeNull();
  });

  it('잔액이 음수여도 막대가 뒤집히지 않는다', () => {
    const progress = calculateExpansionProgress(-50, 'stage0');
    expect(progress.ratio).toBe(0);
    expect(progress.percent).toBe(0);
  });
});
