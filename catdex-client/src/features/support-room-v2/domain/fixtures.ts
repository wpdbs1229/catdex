import { FURNITURE_SPECS } from './catalog.generated';
import type { FurnitureId, FurnitureSpec } from './furniture';
import type { Placement, SpecLookup } from './placement';

/** 행동 에셋까지 준비된 8종 가구 명세. */
export const INTERACTIVE_FURNITURE_SPECS: readonly FurnitureSpec[] = FURNITURE_SPECS.filter(
  (spec) => spec.group === 'interactive',
);

const SPEC_BY_ID = new Map<FurnitureId, FurnitureSpec>(
  FURNITURE_SPECS.map((spec) => [spec.id, spec]),
);

export const specLookup: SpecLookup = (id) => SPEC_BY_ID.get(id);

/** 시작 지급 3종의 기본 배치. DEFAULT_ROOM_SHELL 기준으로 문·통로·앵커 검증을 통과한다. */
export const STARTER_LAYOUT: readonly Placement[] = [
  {
    placementId: 'starter-cushion',
    furnitureId: 'visitor_cushion_orange',
    surface: 'floor',
    gridX: 5,
    gridY: 5,
    flipX: false,
  },
  {
    placementId: 'starter-chair',
    furnitureId: 'swivel_chair_lavender',
    surface: 'floor',
    gridX: 12,
    gridY: 1,
    flipX: false,
  },
  {
    placementId: 'starter-basket',
    furnitureId: 'paper_basket_cream',
    surface: 'floor',
    gridX: 24,
    gridY: 5,
    flipX: false,
  },
];
