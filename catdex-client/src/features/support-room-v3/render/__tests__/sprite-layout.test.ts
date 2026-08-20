import { describe, expect, it } from 'vitest';
import { FURNITURE_ANCHORS } from '../furniture-anchors.generated';
import { createProjection } from '../projection';
import { createWorldScale } from '../world-scale';
import {
  ACTION_COMPOSITE_ANCHORS,
  calculateFurnitureSpriteLayout,
  calculateIdleCatLayout,
  furnitureSpriteAnchor,
  CAT_SILHOUETTE_RATIO,
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

  it('모든 자세의 고양이 몸집이 idle과 ±15% 안이다', () => {
    const idle = calculateIdleCatLayout(projection, 3.75, 3.55);
    // 실루엣 넓이의 제곱근을 몸집으로 본다(CAT_SILHOUETTE_RATIO와 같은 척도).
    const idleBody = idle.imageSize;

    for (const [behavior, furnitureId, gridX, gridY] of [
      ['use_cushion', 'visitor_cushion_orange', 1.65, 2.75],
      ['sit_swivel_chair', 'swivel_chair_lavender', 5.35, 2.55],
      ['hide_paper_basket', 'paper_basket_cream', 5.25, 3.45],
    ] as const) {
      const layout = calculateFurnitureSpriteLayout({
        projection,
        furnitureId,
        gridX,
        gridY,
        compositeBehavior: behavior,
      });
      const body = layout.imageSize * CAT_SILHOUETTE_RATIO[behavior];
      expect(body / idleBody).toBeGreaterThanOrEqual(0.85);
      expect(body / idleBody).toBeLessThanOrEqual(1.15);
    }
  });

  it('고양이 키가 문 높이를 넘지 않는다 - 예전엔 문의 절반이었다', () => {
    const idle = calculateIdleCatLayout(projection, 3.75, 3.55);
    const world = createWorldScale(projection);
    expect(idle.visual.height / world.doorH).toBeLessThan(0.4);
    expect(idle.visual.height / world.doorH).toBeGreaterThan(0.2);
  });

  it('접지 그림자가 바닥 타일과 같은 납작함을 가진다', () => {
    const desk = calculateFurnitureSpriteLayout({
      projection,
      furnitureId: 'consultation_desk_honey',
      gridX: 3.7,
      gridY: 0.4,
    });
    const cat = calculateIdleCatLayout(projection, 3.75, 3.55);
    const flatness = (l: { shadowWidth: number; shadowHeight: number }) =>
      l.shadowHeight / l.shadowWidth;
    // 크기는 달라도 납작한 정도(=바닥에 누운 각도)는 하나의 규칙이어야 한다.
    expect(flatness(desk)).toBeCloseTo(flatness(cat), 6);
    expect(flatness(cat)).toBeCloseTo(projection.tileH / projection.tileW, 6);
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
