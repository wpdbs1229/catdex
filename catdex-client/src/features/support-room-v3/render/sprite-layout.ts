import type { BehaviorId as CatBehaviorId } from '@/features/support-room/support-room.assets';
import type { FurnitureId } from '@/features/support-room-v2/domain/furniture';
import { FURNITURE_ANCHORS } from './furniture-anchors.generated';
import type { IsoProjection } from './projection';
import { isoDepth } from './projection';

export interface SpriteAnchor {
  contentX: number;
  contentY: number;
  contentW: number;
  contentH: number;
  baselineY: number;
}

export interface SpriteRenderMeta {
  visualScale: number;
  shadowWidth: number;
  shadowOffsetY: number;
  allowedRotations: readonly number[];
  needsArtReexport?: boolean;
}

/**
 * 가구·고양이가 모두 공유하는 "칸당 체감 크기" 비율. 예전엔 항목마다
 * 0.56~0.72 사이에서 따로 튜닝해서(고양이는 별도 tileW*0.98 공식까지 써서)
 * 같은 1칸이어도 물체마다 그리드를 채우는 정도가 제각각으로 보였다.
 * 하나로 통일해서 "1×1은 1×1답게, 2×2는 2×2답게" 보이게 한다.
 */
export const GRID_FIT_SCALE = 0.9;

const DEFAULT_FURNITURE_META: SpriteRenderMeta = {
  visualScale: GRID_FIT_SCALE,
  shadowWidth: 0.5,
  shadowOffsetY: 0.015,
  allowedRotations: [0],
};

/**
 * 일부 1254px WebP는 압축된 반투명 픽셀이 캔버스 가장자리까지 남아 getbbox가 전체
 * 이미지로 측정됐다. alpha > 32 기준으로 다시 잰 기본 장면 에셋의 정본이다.
 */
const FURNITURE_ANCHOR_OVERRIDES: Partial<Record<FurnitureId, SpriteAnchor>> = {
  consultation_desk_honey: {
    contentX: 0.0845,
    contentY: 0.2448,
    contentW: 0.8621,
    contentH: 0.5646,
    baselineY: 0.8094,
  },
  floor_lamp_warm: {
    contentX: 0.3604,
    contentY: 0.1053,
    contentW: 0.2728,
    contentH: 0.7631,
    baselineY: 0.8684,
  },
  plant_small_desk: {
    contentX: 0.2703,
    contentY: 0.2097,
    contentW: 0.4578,
    contentH: 0.5806,
    baselineY: 0.7903,
  },
};

/**
 * footprint는 충돌 규칙이고 visualScale은 그림의 체감 크기다. 서로 섞지 않는다.
 * 기본 장면에서 제외한 3종은 정면성이 강해 새 아이소 아트가 필요하다.
 */
export const FURNITURE_RENDER_META: Partial<Record<FurnitureId, SpriteRenderMeta>> = {
  plant_small_desk: { ...DEFAULT_FURNITURE_META, shadowWidth: 0.46 },
  service_bell_brass: { ...DEFAULT_FURNITURE_META, shadowWidth: 0.46 },
  customer_water_station: {
    ...DEFAULT_FURNITURE_META,
    needsArtReexport: true,
  },
  file_cabinet_olive: {
    ...DEFAULT_FURNITURE_META,
    needsArtReexport: true,
  },
  low_bookshelf_honey: {
    ...DEFAULT_FURNITURE_META,
    needsArtReexport: true,
  },
};

export type CompositeBehavior = Extract<
  CatBehaviorId,
  'use_cushion' | 'hide_paper_basket' | 'sit_swivel_chair'
>;

export interface ActionCompositeAnchor extends SpriteAnchor, SpriteRenderMeta {
  /** 합성본의 보이는 폭 중 고양이 몸이 차지하는 비율. idle과 체감 크기 검증에 쓴다. */
  catBodyWidthRatio: number;
}

/** 행동 합성본은 일반 가구와 투명 여백·접지선이 달라 반드시 별도 측정값을 쓴다. */
export const ACTION_COMPOSITE_ANCHORS: Record<CompositeBehavior, ActionCompositeAnchor> = {
  // 이 세 값의 visualScale은 GRID_FIT_SCALE로 통일하지 않는다 - 같은
  // 2×2 footprint라도 catBodyWidthRatio(합성본에서 고양이 몸이 차지하는
  // 비율)가 서로 달라서, 몸 체감 크기를 idle과 ±15% 안으로 맞추려면
  // visualScale이 그 비율을 상쇄하도록 각자 달라야 한다. 아래
  // sprite-layout.test.ts가 이 관계를 고정한다.
  use_cushion: {
    contentX: 0.0801,
    contentY: 0.1523,
    contentW: 0.8398,
    contentH: 0.6934,
    baselineY: 0.8457,
    visualScale: 0.56,
    shadowWidth: 0.56,
    shadowOffsetY: 0.01,
    allowedRotations: [0],
    catBodyWidthRatio: 0.88,
  },
  hide_paper_basket: {
    contentX: 0.1934,
    contentY: 0.0801,
    contentW: 0.6133,
    contentH: 0.8398,
    baselineY: 0.9199,
    visualScale: 0.64,
    shadowWidth: 0.52,
    shadowOffsetY: 0.01,
    allowedRotations: [0],
    catBodyWidthRatio: 0.77,
    needsArtReexport: true,
  },
  sit_swivel_chair: {
    contentX: 0.2168,
    contentY: 0.0801,
    contentW: 0.5645,
    contentH: 0.8398,
    baselineY: 0.9199,
    visualScale: 0.72,
    shadowWidth: 0.52,
    shadowOffsetY: 0.01,
    allowedRotations: [0],
    catBodyWidthRatio: 0.69,
  },
};

export const IDLE_CAT_ANCHOR: SpriteAnchor = {
  contentX: 0.1758,
  contentY: 0.0801,
  contentW: 0.6465,
  contentH: 0.8398,
  baselineY: 0.9199,
};

export interface GroundedSpriteLayout {
  left: number;
  top: number;
  imageSize: number;
  groundX: number;
  groundY: number;
  shadowLeft: number;
  shadowTop: number;
  shadowWidth: number;
  shadowHeight: number;
  zIndex: number;
}

interface FurnitureLayoutInput {
  projection: IsoProjection;
  furnitureId: FurnitureId;
  gridX: number;
  gridY: number;
  compositeBehavior?: CompositeBehavior;
}

export function furnitureRenderMeta(furnitureId: FurnitureId): SpriteRenderMeta {
  return FURNITURE_RENDER_META[furnitureId] ?? DEFAULT_FURNITURE_META;
}

export function furnitureSpriteAnchor(furnitureId: FurnitureId): SpriteAnchor {
  return FURNITURE_ANCHOR_OVERRIDES[furnitureId] ?? FURNITURE_ANCHORS[furnitureId];
}

export function calculateFurnitureSpriteLayout({
  projection,
  furnitureId,
  gridX,
  gridY,
  compositeBehavior,
}: FurnitureLayoutInput): GroundedSpriteLayout {
  const furnitureAnchor = FURNITURE_ANCHORS[furnitureId];
  const meta = compositeBehavior
    ? ACTION_COMPOSITE_ANCHORS[compositeBehavior]
    : furnitureRenderMeta(furnitureId);
  const anchor: SpriteAnchor = compositeBehavior
    ? ACTION_COMPOSITE_ANCHORS[compositeBehavior]
    : furnitureSpriteAnchor(furnitureId);
  const footprint = projection.footprint(
    gridX,
    gridY,
    furnitureAnchor.footprintW,
    furnitureAnchor.footprintD,
  );
  const visibleWidth = footprint.width * meta.visualScale;
  const imageSize = visibleWidth / anchor.contentW;
  const groundX = footprint.ground.x;
  const groundY = footprint.ground.y;
  const shadowWidth = footprint.width * meta.shadowWidth;
  const shadowHeight = shadowWidth * 0.19;
  const shadowCenterY = groundY + footprint.height * meta.shadowOffsetY;

  return {
    left: groundX - (anchor.contentX + anchor.contentW / 2) * imageSize,
    top: groundY - anchor.baselineY * imageSize,
    imageSize,
    groundX,
    groundY,
    shadowLeft: groundX - shadowWidth / 2,
    shadowTop: shadowCenterY - shadowHeight / 2,
    shadowWidth,
    shadowHeight,
    zIndex: isoDepth(
      gridX + furnitureAnchor.footprintW,
      gridY + furnitureAnchor.footprintD,
    ),
  };
}

/**
 * idle 고양이도 가구와 같은 1×1 footprint 물체로 취급해서 같은 공식으로
 * 그린다. 예전엔 tileW*0.98이라는 별도 공식을 써서 가구와 "1칸"의 체감이
 * 서로 달랐다.
 */
export function calculateIdleCatLayout(
  projection: IsoProjection,
  gridX: number,
  gridY: number,
): GroundedSpriteLayout {
  const footprint = projection.footprint(gridX, gridY, 1, 1);
  const visibleWidth = footprint.width * GRID_FIT_SCALE;
  const imageSize = visibleWidth / IDLE_CAT_ANCHOR.contentW;
  const groundX = footprint.ground.x;
  const groundY = footprint.ground.y;
  const shadowWidth = footprint.width * 0.5;
  const shadowHeight = shadowWidth * 0.19;
  return {
    left: groundX - (IDLE_CAT_ANCHOR.contentX + IDLE_CAT_ANCHOR.contentW / 2) * imageSize,
    top: groundY - IDLE_CAT_ANCHOR.baselineY * imageSize,
    imageSize,
    groundX,
    groundY,
    shadowLeft: groundX - shadowWidth / 2,
    shadowTop: groundY + footprint.height * 0.015 - shadowHeight / 2,
    shadowWidth,
    shadowHeight,
    zIndex: isoDepth(gridX + 1, gridY + 1),
  };
}

export const NEEDS_ART_REEXPORT = (
  Object.entries(FURNITURE_RENDER_META) as Array<[FurnitureId, SpriteRenderMeta]>
)
  .filter(([, meta]) => meta.needsArtReexport)
  .map(([id]) => id);

export const NEEDS_ACTION_ART_REEXPORT = (
  Object.entries(ACTION_COMPOSITE_ANCHORS) as Array<[
    CompositeBehavior,
    ActionCompositeAnchor,
  ]>
)
  .filter(([, meta]) => meta.needsArtReexport)
  .map(([behavior]) => behavior);
