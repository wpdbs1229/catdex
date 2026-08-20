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
 *
 * 가구에는 그리지 않는다. 아이소 아트에 이미 접지 음영이 그려져 있어서
 * 타원을 겹치면 두 개의 그림자가 어긋나 오히려 떠 보였다.
 * 고양이 그림에는 그 음영이 없어서 타원이 있어야 바닥에 붙는다.
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
 * 앱에서만 교체한 그림의 anchor.
 *
 * 생성기(measure-furniture-anchors.py)는 패키지의 원본 그림을 재는데,
 * 아래 6종은 앱 쪽 파일만 아이소 재작업본으로 바꿔 뒀다.
 * (예전에 있던 책상·스탠드·화분 override는 생성기가 반투명 잔여 픽셀까지
 * 세던 버그를 손으로 때운 것이라, 생성기를 고치면서 지웠다.)
 */
const FURNITURE_ANCHOR_OVERRIDES: Partial<Record<FurnitureId, SpriteAnchor>> = {
  // 2026-08-20에 아이소 시점으로 다시 그린 6종. generated 파일은 옛 그림 기준이다.
  visitor_cushion_orange: { contentX: 0.0625, contentY: 0.2637, contentW: 0.875, contentH: 0.6113, baselineY: 0.875 },
  swivel_chair_lavender: { contentX: 0.2461, contentY: 0.0938, contentW: 0.5059, contentH: 0.7812, baselineY: 0.875 },
  paper_basket_cream: { contentX: 0.1484, contentY: 0.0938, contentW: 0.7031, contentH: 0.7812, baselineY: 0.875 },
  customer_water_station: { contentX: 0.1914, contentY: 0.0938, contentW: 0.6152, contentH: 0.7812, baselineY: 0.875 },
  file_cabinet_olive: { contentX: 0.2402, contentY: 0.0938, contentW: 0.5195, contentH: 0.7812, baselineY: 0.875 },
  low_bookshelf_honey: { contentX: 0.0625, contentY: 0.1738, contentW: 0.875, contentH: 0.7012, baselineY: 0.875 },
};

/**
 * 정면성이 강해 아이소 장면에 쓸 수 없는 가구.
 * 급수대·서류함·책장 3종은 2026-08-20에 아이소로 다시 그려 받아 비었다.
 */
export const FURNITURE_RENDER_META: Partial<Record<FurnitureId, SpriteRenderMeta>> = {};

export type CompositeBehavior = Extract<
  CatBehaviorId,
  'use_cushion' | 'hide_paper_basket' | 'sit_swivel_chair'
>;

/**
 * 고양이 단독 행동 그림의 anchor. 16종 캐릭터의 평균이며 baseline은 셋 다 0.875다.
 * 자세가 달라도 같은 배율로 그려져 있어서, 모든 고양이를 하나의 크기로 그리면
 * 몸집이 저절로 맞는다(자세별 보정값이 없다).
 */
export const CAT_ACTION_ANCHORS: Record<CompositeBehavior, SpriteAnchor> = {
  use_cushion: { contentX: 0.1644, contentY: 0.4242, contentW: 0.6704, contentH: 0.4508, baselineY: 0.875 },
  sit_swivel_chair: { contentX: 0.1931, contentY: 0.0938, contentW: 0.6133, contentH: 0.7811, baselineY: 0.875 },
  hide_paper_basket: { contentX: 0.1755, contentY: 0.3956, contentW: 0.6478, contentH: 0.4794, baselineY: 0.875 },
};

/**
 * 고양이가 올라가는 가구는 고양이 몸 폭을 자로 쓴다.
 *
 * 격자(footprint)로 재면 2×2가 고양이보다 훨씬 커져 고양이가 방석 위 점처럼
 * 보인다. 실제 높이로 재도 안 되는데, 아이소에서 납작한 물건의 스프라이트
 * 높이는 물리 높이가 아니라 깊이가 섞인 값이기 때문이다.
 * 방석·의자·휴지통은 애초에 고양이한테 맞춰 만든 물건이므로 고양이를 자로 쓴다.
 */
export const PROP_WIDTH_IN_CAT_BODIES: Record<CompositeBehavior, number> = {
  use_cushion: 1.3,
  sit_swivel_chair: 1.25,
  hide_paper_basket: 1.09,
};

/**
 * 고양이 발이 닿는 지점. 가구 스프라이트 캔버스 기준 비율이다.
 * (0.5, y)는 가로 한가운데를 뜻한다.
 */
export const PROP_SEAT_ANCHORS: Record<CompositeBehavior, { x: number; y: number }> = {
  use_cushion: { x: 0.5, y: 0.52 },
  sit_swivel_chair: { x: 0.5, y: 0.45 },
  hide_paper_basket: { x: 0.5, y: 0.36 },
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
  const anchor = furnitureSpriteAnchor(furnitureId);
  const world = createWorldScale(projection);

  // 고양이가 올라가는 가구는 고양이를 자로 쓰고, 나머지는 footprint 폭으로 잰다.
  // 어느 쪽이든 문보다 높아지지는 않는다.
  const imageSize = compositeBehavior
    ? (catBodyWidth(projection, compositeBehavior) * PROP_WIDTH_IN_CAT_BODIES[compositeBehavior]) /
      anchor.contentW
    : Math.min(
        (footprint.width * FURNITURE_TILE_FILL) / anchor.contentW,
        world.maxFurnitureH / anchor.contentH,
      );

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

/** 그 자세로 그렸을 때 고양이 몸이 차지하는 화면 폭. */
function catBodyWidth(projection: IsoProjection, behavior: CompositeBehavior): number {
  return catImageSize(projection) * CAT_ACTION_ANCHORS[behavior].contentW;
}

/**
 * 가구 위에 앉은 고양이. 가구와 따로 그려서 각자 자기 anchor·크기·깊이를 가진다.
 * 두 레이어는 같은 접지점(가구의 footprint 중심)에서 만난다.
 */
export function calculateCatOnFurnitureLayout(
  projection: IsoProjection,
  furnitureId: FurnitureId,
  gridX: number,
  gridY: number,
  behavior: CompositeBehavior,
): GroundedSpriteLayout {
  const furniture = calculateFurnitureSpriteLayout({
    projection,
    furnitureId,
    gridX,
    gridY,
    compositeBehavior: behavior,
  });
  const seat = PROP_SEAT_ANCHORS[behavior];
  const anchor = CAT_ACTION_ANCHORS[behavior];

  // 가구 스프라이트 안의 '앉는 지점'을 화면 좌표로 옮긴다.
  const seatX = furniture.left + seat.x * furniture.imageSize;
  const seatY = furniture.top + seat.y * furniture.imageSize;

  return layoutGroundedSprite({
    projection,
    anchor,
    imageSize: catImageSize(projection),
    groundX: seatX,
    groundY: seatY,
    // 깊이는 앉은 가구와 같은 칸을 쓰되 한 칸 앞으로 둬서 가구보다 위에 그린다.
    frontX: gridX + FURNITURE_ANCHORS[furnitureId].footprintW,
    frontY: gridY + FURNITURE_ANCHORS[furnitureId].footprintD,
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

/** 가구 위 고양이는 바닥에 그림자를 따로 그리지 않는다(가구가 이미 그린다). */
export const CAT_ON_FURNITURE_HAS_SHADOW = false;

export const NEEDS_ART_REEXPORT = (
  Object.entries(FURNITURE_RENDER_META) as Array<[FurnitureId, SpriteRenderMeta]>
)
  .filter(([, meta]) => meta.needsArtReexport)
  .map(([id]) => id);
