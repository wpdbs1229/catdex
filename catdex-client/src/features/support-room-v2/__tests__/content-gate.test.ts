import { describe, expect, it } from 'vitest';

import { CAT_ACTION_IMAGES } from '@/features/support-room/support-room.assets';
import { FURNITURE_CATALOG, FURNITURE_SPECS, SURFACE_CATALOG } from '../domain/catalog.generated';
import {
  V2_FURNITURE_IMAGES,
  V2_FURNITURE_THUMBS,
  V2_NEW_CAT_ACTION_IMAGES,
  V2_SURFACE_IMAGES,
} from '../support-room-v2.assets.generated';

/**
 * docs/14 프롬프트 8 콘텐츠 게이트의 자동 검수 부분.
 * 25종 가구·6종 표면·16캐릭터×9행동 에셋과 카탈로그가 어긋나면 여기서 잡힌다.
 */
describe('콘텐츠 게이트', () => {
  it('가구 25종의 스펙·카탈로그·이미지·썸네일이 전부 일치한다', () => {
    expect(FURNITURE_SPECS).toHaveLength(25);
    expect(FURNITURE_CATALOG).toHaveLength(25);
    const specIds = new Set(FURNITURE_SPECS.map((s) => s.id));
    expect(specIds.size).toBe(25);
    for (const spec of FURNITURE_SPECS) {
      expect(V2_FURNITURE_IMAGES[spec.id], `${spec.id} 배치 이미지`).toBeDefined();
      expect(V2_FURNITURE_THUMBS[spec.id], `${spec.id} 썸네일`).toBeDefined();
      expect(FURNITURE_CATALOG.some((c) => c.id === spec.id)).toBe(true);
    }
  });

  it('행동 가구 8종은 모두 준비된 행동과 접근 앵커·capacity를 가진다', () => {
    const interactive = FURNITURE_SPECS.filter((s) => s.group === 'interactive');
    expect(interactive).toHaveLength(8);
    for (const spec of interactive) {
      expect(spec.behaviors.length).toBeGreaterThan(0);
      expect(spec.approachAnchors.length).toBeGreaterThan(0);
      expect(spec.capacity).toBeGreaterThan(0);
    }
    // share_bench는 어떤 가구의 준비된 행동 목록에도 없다(후속 콘텐츠)
    expect(interactive.flatMap((s) => s.behaviors)).not.toContain('share_bench');
  });

  it('16개 캐릭터 × 9개 행동(idle 포함) 이미지가 전부 등록되어 있다', () => {
    const characterKeys = Object.keys(CAT_ACTION_IMAGES);
    expect(characterKeys).toHaveLength(16);
    const legacyBehaviors = [
      'idle',
      'use_cushion',
      'press_bell',
      'sit_swivel_chair',
      'stamp_paw',
      'hide_paper_basket',
      'peek_document_box',
    ] as const;
    for (const key of characterKeys) {
      const forCharacter = CAT_ACTION_IMAGES[key as keyof typeof CAT_ACTION_IMAGES];
      for (const behavior of legacyBehaviors) {
        expect(forCharacter[behavior], `${key}/${behavior}`).toBeDefined();
      }
      expect(V2_NEW_CAT_ACTION_IMAGES[key]?.watch_window, `${key}/watch_window`).toBeDefined();
      expect(V2_NEW_CAT_ACTION_IMAGES[key]?.drink_water, `${key}/drink_water`).toBeDefined();
    }
  });

  it('표면 6종 타일이 전부 등록되어 있다', () => {
    expect(SURFACE_CATALOG).toHaveLength(6);
    for (const surface of SURFACE_CATALOG) {
      expect(V2_SURFACE_IMAGES[surface.id], surface.id).toBeDefined();
    }
  });

  it('시작 지급 구성: 가구 3종 + 벽지·바닥 각 1종', () => {
    expect(FURNITURE_CATALOG.filter((c) => c.acquisition === 'starter').map((c) => c.id).sort()).toEqual([
      'paper_basket_cream',
      'swivel_chair_lavender',
      'visitor_cushion_orange',
    ]);
    expect(SURFACE_CATALOG.filter((c) => c.acquisition === 'starter').map((c) => c.id).sort()).toEqual([
      'flooring_honey_oak',
      'wallpaper_cream_plaster',
    ]);
  });
});
