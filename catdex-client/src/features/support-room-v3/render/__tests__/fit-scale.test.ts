import { describe, expect, it } from 'vitest';
import {
  calculateInitialZoom,
  calculateMaxZoom,
  calculateOverviewScale,
  calculateShellFitScale,
} from '../projection';
import { SHELL_GEOMETRY } from '../shells.generated';

/**
 * roomArea는 화면 전체가 아니라 헤더·칩·푸터를 뺀 나머지다.
 * 아래 값은 iPhone 15/16 계열의 실제 여유 높이를 재서 넣은 근사다.
 */
const ROOM_AREA = [
  { device: '390x844', width: 390, height: 627 },
  { device: '430x932', width: 430, height: 703 },
] as const;

describe('셸 반응형 배율', () => {
  it('두 화면 모두에서 방이 사용 가능 높이의 60~70%를 차지한다', () => {
    for (const area of ROOM_AREA) {
      const scale = calculateShellFitScale(SHELL_GEOMETRY.stage0, area);
      const displayH = SHELL_GEOMETRY.stage0.artBounds.height * scale;
      const ratio = displayH / area.height;
      expect(ratio, area.device).toBeGreaterThanOrEqual(0.6);
      expect(ratio, area.device).toBeLessThanOrEqual(0.7);
    }
  });

  it('가로 넘침이 화면 폭의 18%를 넘지 않는다', () => {
    for (const area of ROOM_AREA) {
      const scale = calculateShellFitScale(SHELL_GEOMETRY.stage0, area);
      const displayW = SHELL_GEOMETRY.stage0.artBounds.width * scale;
      expect(displayW / area.width, area.device).toBeLessThanOrEqual(1.18);
    }
  });

  it('아주 좁은 화면에서는 세로를 포기하고 가로를 지킨다', () => {
    const scale = calculateShellFitScale(SHELL_GEOMETRY.stage0, { width: 320, height: 900 });
    const displayW = SHELL_GEOMETRY.stage0.artBounds.width * scale;
    expect(displayW / 320).toBeLessThanOrEqual(1.18);
  });
});

describe('처음 배율', () => {
  it('5단계는 남는 세로만큼 당겨서 시작한다', () => {
    for (const area of ROOM_AREA) {
      const zoom = calculateInitialZoom(SHELL_GEOMETRY.stage4, area);
      const scale = calculateOverviewScale(SHELL_GEOMETRY.stage4, area);
      const shown = SHELL_GEOMETRY.stage4.artBounds.height * scale * zoom;
      expect(zoom, area.device).toBeGreaterThan(1);
      expect(shown / area.height, area.device).toBeLessThanOrEqual(1);
      expect(shown / area.height, area.device).toBeGreaterThan(0.8);
    }
  });

  it('처음 배율은 최대 줌을 넘지 않는다', () => {
    for (const stage of ['stage0', 'stage4'] as const) {
      for (const area of ROOM_AREA) {
        expect(calculateInitialZoom(SHELL_GEOMETRY[stage], area)).toBeLessThanOrEqual(
          calculateMaxZoom(SHELL_GEOMETRY[stage], area),
        );
      }
    }
  });
});
