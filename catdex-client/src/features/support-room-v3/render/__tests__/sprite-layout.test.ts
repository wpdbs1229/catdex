import { describe, expect, it } from 'vitest';
import { createProjection } from '../projection';
import { createWorldScale } from '../world-scale';
import {
  CAT_ACTION_ANCHORS,
  calculateCatOnFurnitureLayout,
  calculateFurnitureSpriteLayout,
  calculateIdleCatLayout,
  furnitureSpriteAnchor,
  NEEDS_ART_REEXPORT,
} from '../sprite-layout';

const projection = createProjection('stage0', 0.4);

describe('support-room-v3 sprite layout', () => {
  it('일반 가구 baseline이 공통 접지점과 일치한다', () => {
    const layout = calculateFurnitureSpriteLayout({
      projection,
      furnitureId: 'consultation_desk_honey',
      gridX: 3.7,
      gridY: 0.4,
    });
    const anchor = furnitureSpriteAnchor('consultation_desk_honey');
    expect(layout.top + anchor.baselineY * layout.imageSize).toBeCloseTo(layout.groundY, 5);
  });

  it('가구 위 고양이는 가구와 별개의 스프라이트로 놓인다', () => {
    const furniture = calculateFurnitureSpriteLayout({
      projection,
      furnitureId: 'swivel_chair_lavender',
      gridX: 5.6,
      gridY: 3.4,
      compositeBehavior: 'sit_swivel_chair',
    });
    const cat = calculateCatOnFurnitureLayout(
      projection,
      'swivel_chair_lavender',
      5.6,
      3.4,
      'sit_swivel_chair',
    );
    // 크기 손잡이가 둘로 나뉘었다. 합성본이던 시절엔 하나뿐이었다.
    expect(cat.imageSize).not.toBeCloseTo(furniture.imageSize, 3);
    // 고양이는 가구보다 앞(위)에 그려진다.
    expect(cat.zIndex).toBeGreaterThanOrEqual(furniture.zIndex);
    // 고양이 발은 바닥이 아니라 의자 좌석에 닿는다.
    expect(cat.groundY).toBeLessThan(furniture.groundY);
    expect(cat.groundY).toBeGreaterThan(furniture.top);
  });

  it('모든 자세의 고양이가 idle과 같은 크기로 그려진다', () => {
    const idle = calculateIdleCatLayout(projection, 3.75, 3.55);
    for (const [behavior, furnitureId, gridX, gridY] of [
      ['use_cushion', 'visitor_cushion_orange', 1.9, 1.1],
      ['sit_swivel_chair', 'swivel_chair_lavender', 5.6, 3.4],
      ['hide_paper_basket', 'paper_basket_cream', 3, 1],
    ] as const) {
      const cat = calculateCatOnFurnitureLayout(projection, furnitureId, gridX, gridY, behavior);
      // 자세별 보정값이 없으므로 ±15%가 아니라 정확히 같아야 한다.
      expect(cat.imageSize, behavior).toBeCloseTo(idle.imageSize, 6);
      expect(CAT_ACTION_ANCHORS[behavior].baselineY, behavior).toBeCloseTo(0.875, 6);
    }
  });

  it('고양이가 올라가는 가구는 고양이 몸 폭에 맞춰 커진다', () => {
    const cushion = calculateFurnitureSpriteLayout({
      projection,
      furnitureId: 'visitor_cushion_orange',
      gridX: 1.9,
      gridY: 1.1,
      compositeBehavior: 'use_cushion',
    });
    const cat = calculateCatOnFurnitureLayout(
      projection,
      'visitor_cushion_orange',
      1.9,
      1.1,
      'use_cushion',
    );
    // 방석은 웅크린 고양이보다 넓어야 고양이가 삐져나오지 않는다.
    expect(cushion.visual.width).toBeGreaterThan(cat.visual.width);
    expect(cushion.visual.width / cat.visual.width).toBeLessThan(1.6);
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
    expect(flatness(desk)).toBeCloseTo(flatness(cat), 6);
    expect(flatness(cat)).toBeCloseTo(projection.tileH / projection.tileW, 6);
  });

  it('아이소 아트가 다 들어와 재작업 목록이 비었다', () => {
    expect(NEEDS_ART_REEXPORT).toEqual([]);
  });
});
