import { describe, expect, it } from 'vitest';
import { FURNITURE_ANCHORS } from '../furniture-anchors.generated';
import { createProjection } from '../projection';
import {
  ACTION_COMPOSITE_ANCHORS,
  calculateFurnitureSpriteLayout,
  calculateIdleCatLayout,
  furnitureSpriteAnchor,
  IDLE_CAT_ANCHOR,
  NEEDS_ACTION_ART_REEXPORT,
  NEEDS_ART_REEXPORT,
} from '../sprite-layout';

const projection = createProjection('stage0', 0.4);

describe('support-room-v3 sprite layout', () => {
  it('일반 가구 baseline이 공통 접지점과 ±2px 이내로 일치한다', () => {
    const layout = calculateFurnitureSpriteLayout({
      projection,
      furnitureId: 'consultation_desk_honey',
      gridX: 3.7,
      gridY: 0.4,
    });
    const anchor = furnitureSpriteAnchor('consultation_desk_honey');
    expect(layout.top + anchor.baselineY * layout.imageSize).toBeCloseTo(layout.groundY, 5);
  });

  it('행동 합성본은 일반 가구 anchor가 아닌 행동별 baseline을 쓴다', () => {
    const layout = calculateFurnitureSpriteLayout({
      projection,
      furnitureId: 'paper_basket_cream',
      gridX: 5.25,
      gridY: 3.45,
      compositeBehavior: 'hide_paper_basket',
    });
    const anchor = ACTION_COMPOSITE_ANCHORS.hide_paper_basket;
    expect(layout.top + anchor.baselineY * layout.imageSize).toBeCloseTo(layout.groundY, 5);
    expect(anchor.contentW).not.toBe(FURNITURE_ANCHORS.paper_basket_cream.contentW);
  });

  it('idle과 두 행동 고양이의 체감 몸 폭이 ±15%다', () => {
    const idle = calculateIdleCatLayout(projection, 3.75, 3.55);
    const idleBodyWidth = idle.imageSize * IDLE_CAT_ANCHOR.contentW;

    for (const [behavior, furnitureId, gridX, gridY] of [
      ['use_cushion', 'visitor_cushion_orange', 1.65, 2.75],
      ['sit_swivel_chair', 'swivel_chair_lavender', 5.35, 2.55],
    ] as const) {
      const layout = calculateFurnitureSpriteLayout({
        projection,
        furnitureId,
        gridX,
        gridY,
        compositeBehavior: behavior,
      });
      const anchor = ACTION_COMPOSITE_ANCHORS[behavior];
      const bodyWidth = layout.imageSize * anchor.contentW * anchor.catBodyWidthRatio;
      expect(bodyWidth / idleBodyWidth).toBeGreaterThanOrEqual(0.85);
      expect(bodyWidth / idleBodyWidth).toBeLessThanOrEqual(1.15);
    }
  });

  it('시점이 맞지 않는 기존 에셋을 재작업 목록에 남긴다', () => {
    expect(NEEDS_ART_REEXPORT).toEqual(
      expect.arrayContaining([
        'customer_water_station',
        'file_cabinet_olive',
        'low_bookshelf_honey',
      ]),
    );
    expect(NEEDS_ACTION_ART_REEXPORT).toContain('hide_paper_basket');
  });
});
