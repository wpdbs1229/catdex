import type { FurnitureId, FurnitureSpec } from './furniture';
import type { Placement, SpecLookup } from './placement';

/**
 * 행동 에셋까지 준비된 8종 가구 명세.
 * 원본: 패키지 assets/v2/furniture/<id>/metadata.json (schemaVersion 1).
 */
export const INTERACTIVE_FURNITURE_SPECS: readonly FurnitureSpec[] = [
  {
    id: 'visitor_cushion_orange',
    name: '방문자 방석',
    group: 'interactive',
    surface: 'floor',
    footprint: { width: 2, depth: 2 },
    collisionMask: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
    approachAnchors: [
      { x: 0, y: 2, facing: 'right' },
      { x: 1, y: 2, facing: 'left' },
    ],
    canFlipX: true,
    capacity: 1,
    behaviors: ['use_cushion'],
    layerMode: 'compositeInteraction',
    baselineY: 0.8,
  },
  {
    id: 'service_bell_brass',
    name: '호출벨',
    group: 'interactive',
    surface: 'floor',
    footprint: { width: 1, depth: 1 },
    collisionMask: [{ x: 0, y: 0 }],
    approachAnchors: [
      { x: 0, y: 1, facing: 'left' },
      { x: -1, y: 0, facing: 'right' },
    ],
    canFlipX: true,
    capacity: 1,
    behaviors: ['press_bell'],
    layerMode: 'compositeInteraction',
    baselineY: 0.82,
  },
  {
    id: 'swivel_chair_lavender',
    name: '회전의자',
    group: 'interactive',
    surface: 'floor',
    footprint: { width: 2, depth: 2 },
    collisionMask: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
    approachAnchors: [
      { x: 0, y: 2, facing: 'right' },
      { x: 1, y: 2, facing: 'left' },
    ],
    canFlipX: true,
    capacity: 1,
    behaviors: ['sit_swivel_chair'],
    layerMode: 'compositeInteraction',
    baselineY: 0.9,
  },
  {
    id: 'paw_stamp_pad_orange',
    name: '발도장 패드',
    group: 'interactive',
    surface: 'floor',
    footprint: { width: 1, depth: 1 },
    collisionMask: [{ x: 0, y: 0 }],
    approachAnchors: [
      { x: 0, y: 1, facing: 'left' },
      { x: -1, y: 0, facing: 'right' },
    ],
    canFlipX: true,
    capacity: 1,
    behaviors: ['stamp_paw'],
    layerMode: 'compositeInteraction',
    baselineY: 0.82,
  },
  {
    id: 'paper_basket_cream',
    name: '종이 바구니',
    group: 'interactive',
    surface: 'floor',
    footprint: { width: 2, depth: 2 },
    collisionMask: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
    approachAnchors: [
      { x: 0, y: 2, facing: 'right' },
      { x: 1, y: 2, facing: 'left' },
    ],
    canFlipX: true,
    capacity: 1,
    behaviors: ['hide_paper_basket'],
    layerMode: 'compositeInteraction',
    baselineY: 0.88,
  },
  {
    id: 'document_box_olive',
    name: '문서 상자',
    group: 'interactive',
    surface: 'floor',
    footprint: { width: 2, depth: 2 },
    collisionMask: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
    approachAnchors: [
      { x: 0, y: 2, facing: 'right' },
      { x: 1, y: 2, facing: 'left' },
    ],
    canFlipX: true,
    capacity: 1,
    behaviors: ['peek_document_box'],
    layerMode: 'compositeInteraction',
    baselineY: 0.88,
  },
  {
    id: 'window_bench',
    name: '창가 벤치',
    group: 'interactive',
    surface: 'floor',
    footprint: { width: 3, depth: 2 },
    collisionMask: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    approachAnchors: [
      { x: 0, y: 2, facing: 'right' },
      { x: 1, y: 2, facing: 'left' },
      { x: 2, y: 2, facing: 'left' },
    ],
    canFlipX: true,
    capacity: 2,
    behaviors: ['watch_window'],
    layerMode: 'splitLayers',
    baselineY: 0.82,
  },
  {
    id: 'customer_water_station',
    name: '고객용 정수기',
    group: 'interactive',
    surface: 'floor',
    footprint: { width: 2, depth: 2 },
    collisionMask: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
    approachAnchors: [
      { x: 0, y: 2, facing: 'right' },
      { x: 1, y: 2, facing: 'left' },
    ],
    canFlipX: false,
    capacity: 1,
    behaviors: ['drink_water'],
    layerMode: 'splitLayers',
    baselineY: 0.86,
  },
];

const SPEC_BY_ID = new Map<FurnitureId, FurnitureSpec>(
  INTERACTIVE_FURNITURE_SPECS.map((spec) => [spec.id, spec]),
);

export const fixtureSpecLookup: SpecLookup = (id) => SPEC_BY_ID.get(id);

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
