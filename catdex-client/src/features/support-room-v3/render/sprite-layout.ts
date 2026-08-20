import type { BehaviorId as CatBehaviorId } from '@/features/support-room/support-room.assets';
import type { FurnitureId } from '@/features/support-room-v2/domain/furniture';
import { FURNITURE_ANCHORS } from './furniture-anchors.generated';
import type { IsoProjection } from './projection';
import { isoDepth } from './projection';
import { FURNITURE_TILE_FILL, createWorldScale } from './world-scale';

export interface SpriteAnchor {
  contentX: number;
  contentY: number;
  contentW: number;
  contentH: number;
  baselineY: number;
}

export interface SpriteRenderMeta {
  needsArtReexport?: boolean;
}

const DEFAULT_FURNITURE_META: SpriteRenderMeta = {};

/**
 * 접지 그림자 규칙. 크기·농도·방향을 여기서만 정한다.
 * 높이를 바닥 타일과 같은 비율로 눌러서 바닥에 누워 있는 타원으로 보이게 한다.
 */
const SHADOW = {
  /** 물체의 보이는 폭 대비 그림자 폭 */
  widthRatio: 0.62,
  /** 광원이 오른쪽 위 창에 있어 그림자는 왼쪽 아래로 아주 살짝 밀린다. */
  offsetXRatio: -0.04,
  offsetYRatio: 0.06,
  color: 'rgba(73, 44, 20, 0.16)',
} as const;

export const SHADOW_COLOR = SHADOW.color;

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

/** 정면성이 강해 아이소 장면에 쓸 수 없는 가구. 새 아트가 나오면 지운다. */
export const FURNITURE_RENDER_META: Partial<Record<FurnitureId, SpriteRenderMeta>> = {
  customer_water_station: { needsArtReexport: true },
  file_cabinet_olive: { needsArtReexport: true },
  low_bookshelf_honey: { needsArtReexport: true },
};

export type CompositeBehavior = Extract<
  CatBehaviorId,
  'use_cushion' | 'hide_paper_basket' | 'sit_swivel_chair'
>;

/**
 * 합성본 한 장에 그려진 고양이 실루엣이 idle 고양이 실루엣의 몇 배인지.
 *
 * 캐릭터 16종의 같은 행동 이미지를 겹쳐 픽셀 분산을 내면 캐릭터마다 바뀌는
 * 영역(=고양이)과 고정된 영역(=가구)이 갈린다. 그 고양이 영역의 넓이를
 * idle 고양이 실루엣 넓이와 비교해 sqrt를 취한 값이다(자세가 달라도 실루엣
 * 넓이는 몸집을 비교적 잘 대변한다).
 *
 * 이 값으로 나눠서 그리면 어떤 자세든 고양이 몸집이 idle과 같아진다.
 * 손으로 고른 배율이 아니라 그림에서 잰 값이므로, 아트가 바뀌면 다시 재야 한다.
 */
export const CAT_SILHOUETTE_RATIO: Record<CompositeBehavior, number> = {
  use_cushion: 0.91,
  sit_swivel_chair: 0.82,
  hide_paper_basket: 1.01,
};

export interface ActionCompositeAnchor extends SpriteAnchor, SpriteRenderMeta {}

/** 행동 합성본은 일반 가구와 투명 여백·접지선이 달라 별도 측정값을 쓴다. */
export const ACTION_COMPOSITE_ANCHORS: Record<CompositeBehavior, ActionCompositeAnchor> = {
  use_cushion: {
    contentX: 0.0801,
    contentY: 0.1523,
    contentW: 0.8398,
    contentH: 0.6934,
    baselineY: 0.8457,
  },
  hide_paper_basket: {
    contentX: 0.1934,
    contentY: 0.0801,
    contentW: 0.6133,
    contentH: 0.8398,
    baselineY: 0.9199,
    needsArtReexport: true,
  },
  sit_swivel_chair: {
    contentX: 0.2168,
    contentY: 0.0801,
    contentW: 0.5645,
    contentH: 0.8398,
    baselineY: 0.9199,
  },
};

export const IDLE_CAT_ANCHOR: SpriteAnchor = {
  contentX: 0.1758,
  contentY: 0.0801,
  contentW: 0.6465,
  contentH: 0.8398,
  baselineY: 0.9199,
};

/** 화면에 실제로 그려지는 사각형. 가림 판정은 이미지 크기가 아니라 이걸 쓴다. */
export interface VisualBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

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
  visual: VisualBox;
}

export function furnitureRenderMeta(furnitureId: FurnitureId): SpriteRenderMeta {
  return FURNITURE_RENDER_META[furnitureId] ?? DEFAULT_FURNITURE_META;
}

export function furnitureSpriteAnchor(furnitureId: FurnitureId): SpriteAnchor {
  return FURNITURE_ANCHOR_OVERRIDES[furnitureId] ?? FURNITURE_ANCHORS[furnitureId];
}

interface GroundedInput {
  projection: IsoProjection;
  anchor: SpriteAnchor;
  imageSize: number;
  /** 바닥에 닿는 지점(footprint 중심). */
  groundX: number;
  groundY: number;
  /** 앞쪽 접지점. 깊이 정렬에 쓴다. */
  frontX: number;
  frontY: number;
}

/**
 * 모든 물체가 지나는 단 하나의 배치 함수.
 * 이미지 종류(가구·고양이·합성본)와 무관하게 anchor·크기·접지점만 받는다.
 */
function layoutGroundedSprite({
  projection,
  anchor,
  imageSize,
  groundX,
  groundY,
  frontX,
  frontY,
}: GroundedInput): GroundedSpriteLayout {
  const visualWidth = anchor.contentW * imageSize;
  const visualHeight = anchor.contentH * imageSize;
  const left = groundX - (anchor.contentX + anchor.contentW / 2) * imageSize;
  const top = groundY - anchor.baselineY * imageSize;

  const shadowWidth = visualWidth * SHADOW.widthRatio;
  const shadowHeight = shadowWidth * (projection.tileH / projection.tileW);

  return {
    left,
    top,
    imageSize,
    groundX,
    groundY,
    shadowLeft: groundX - shadowWidth / 2 + shadowWidth * SHADOW.offsetXRatio,
    shadowTop: groundY - shadowHeight / 2 + shadowHeight * SHADOW.offsetYRatio,
    shadowWidth,
    shadowHeight,
    zIndex: isoDepth(frontX, frontY),
    visual: {
      left: left + anchor.contentX * imageSize,
      top: top + anchor.contentY * imageSize,
      width: visualWidth,
      height: visualHeight,
    },
  };
}

interface FurnitureLayoutInput {
  projection: IsoProjection;
  furnitureId: FurnitureId;
  gridX: number;
  gridY: number;
  compositeBehavior?: CompositeBehavior;
}

export function calculateFurnitureSpriteLayout({
  projection,
  furnitureId,
  gridX,
  gridY,
  compositeBehavior,
}: FurnitureLayoutInput): GroundedSpriteLayout {
  const spec = FURNITURE_ANCHORS[furnitureId];
  const footprint = projection.footprint(gridX, gridY, spec.footprintW, spec.footprintD);

  // 합성본은 가구가 아니라 그 안의 고양이를 기준으로 크기를 정한다.
  // 그래야 어느 자세든 고양이 몸집이 idle과 같아진다.
  const anchor = compositeBehavior
    ? ACTION_COMPOSITE_ANCHORS[compositeBehavior]
    : furnitureSpriteAnchor(furnitureId);
  const world = createWorldScale(projection);
  // 가구 크기는 footprint 폭에서 나오되, 문보다 높아지지 않게 한 번 눌러 준다.
  const byWidth = (footprint.width * FURNITURE_TILE_FILL) / anchor.contentW;
  const byHeightCap = world.maxFurnitureH / anchor.contentH;
  const imageSize = compositeBehavior
    ? catImageSize(projection) / CAT_SILHOUETTE_RATIO[compositeBehavior]
    : Math.min(byWidth, byHeightCap);

  return layoutGroundedSprite({
    projection,
    anchor,
    imageSize,
    groundX: footprint.ground.x,
    groundY: footprint.ground.y,
    frontX: gridX + spec.footprintW,
    frontY: gridY + spec.footprintD,
  });
}

/** idle 고양이 한 장의 이미지 크기. 모든 고양이 크기가 여기서 나온다. */
export function catImageSize(projection: IsoProjection): number {
  return createWorldScale(projection).catH / IDLE_CAT_ANCHOR.contentH;
}

/**
 * 고양이는 footprint가 없다. 가구처럼 칸 폭이 아니라 문 높이를 기준으로
 * 키를 정하고, 서 있는 칸의 중심에 접지시킨다.
 */
export function calculateIdleCatLayout(
  projection: IsoProjection,
  gridX: number,
  gridY: number,
): GroundedSpriteLayout {
  const footprint = projection.footprint(gridX, gridY, 1, 1);
  return layoutGroundedSprite({
    projection,
    anchor: IDLE_CAT_ANCHOR,
    imageSize: catImageSize(projection),
    groundX: footprint.ground.x,
    groundY: footprint.ground.y,
    frontX: gridX + 1,
    frontY: gridY + 1,
  });
}

export const NEEDS_ART_REEXPORT = (
  Object.entries(FURNITURE_RENDER_META) as Array<[FurnitureId, SpriteRenderMeta]>
)
  .filter(([, meta]) => meta.needsArtReexport)
  .map(([id]) => id);

export const NEEDS_ACTION_ART_REEXPORT = (
  Object.entries(ACTION_COMPOSITE_ANCHORS) as Array<[CompositeBehavior, ActionCompositeAnchor]>
)
  .filter(([, meta]) => meta.needsArtReexport)
  .map(([behavior]) => behavior);
