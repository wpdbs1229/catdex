import { describe, expect, it } from 'vitest';

import { INTERACTIVE_FURNITURE_SPECS } from '../../domain/fixtures';
import type { Placement } from '../../domain/placement';
import { CELL_WIDTH, FLOOR_ROW_HEIGHT, WORLD, placementRect, snapToCell } from '../projection';

const spec = INTERACTIVE_FURNITURE_SPECS[0]; // 2×2 방석

describe('projection', () => {
  it('placement 원점 픽셀을 snapToCell에 넣으면 같은 셀이 나온다(왕복 일관성)', () => {
    for (const cell of [
      { x: 0, y: 0 },
      { x: 14, y: 3 },
      { x: 28, y: 6 },
    ]) {
      const worldX = cell.x * CELL_WIDTH;
      const worldY = WORLD.floorBand.top + cell.y * FLOOR_ROW_HEIGHT;
      expect(snapToCell('floor', worldX, worldY, spec)).toEqual(cell);
    }
  });

  it('snapToCell은 footprint가 그리드를 벗어나지 않게 clamp한다', () => {
    const snapped = snapToCell('floor', WORLD.width * 2, WORLD.height * 2, spec);
    expect(snapped).toEqual({ x: 30 - spec.footprint.width, y: 8 - spec.footprint.depth });
    expect(snapToCell('floor', -500, -500, spec)).toEqual({ x: 0, y: 0 });
  });

  it('바닥 가구 이미지 하단은 footprint 마지막 행의 아래 변에 맞는다', () => {
    const placement: Placement = {
      placementId: 'p',
      furnitureId: spec.id,
      surface: 'floor',
      gridX: 4,
      gridY: 2,
      flipX: false,
    };
    const rect = placementRect(placement, spec);
    expect(rect.top + rect.height).toBeCloseTo(
      WORLD.floorBand.top + (2 + spec.footprint.depth) * FLOOR_ROW_HEIGHT,
    );
    expect(rect.width).toBeCloseTo(spec.footprint.width * CELL_WIDTH);
  });
});
