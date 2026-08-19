import { describe, expect, it } from 'vitest';
import {
  createDefaultObservationLayout,
  observationFootprintCoverage,
  validateObservationLayout,
} from '../support-room-v3.layout';

describe('support-room-v3 default observation layout', () => {
  const placements = createDefaultObservationLayout();

  it('바닥 점유율이 35% 이하이고 가구가 6개 이하다', () => {
    expect(placements).toHaveLength(5);
    expect(observationFootprintCoverage(placements)).toBeCloseTo(16 / 48, 6);
    expect(observationFootprintCoverage(placements)).toBeLessThanOrEqual(0.35);
  });

  it('겹침·문 앞·접근점·중앙 통로 검사를 모두 통과한다', () => {
    expect(validateObservationLayout(placements)).toEqual([]);
  });
});
