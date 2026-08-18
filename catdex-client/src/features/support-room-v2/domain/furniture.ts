import type { GridPoint, Surface } from './grid';

/** 1차 카탈로그 25종. assets/v2/manifests/catalog-v2.json과 1:1. */
export type FurnitureId =
  // 행동 가구 8종
  | 'visitor_cushion_orange'
  | 'service_bell_brass'
  | 'swivel_chair_lavender'
  | 'paw_stamp_pad_orange'
  | 'paper_basket_cream'
  | 'document_box_olive'
  | 'window_bench'
  | 'customer_water_station'
  // 일반·업무 가구 7종
  | 'reception_desk_cream'
  | 'consultation_desk_honey'
  | 'meeting_table_round'
  | 'office_sofa_sage'
  | 'low_bookshelf_honey'
  | 'file_cabinet_olive'
  | 'office_partition_cream'
  // 일반 장식 5종
  | 'floor_lamp_warm'
  | 'plant_large_rubber'
  | 'plant_small_desk'
  | 'umbrella_stand_olive'
  | 'document_organizer_cream'
  // 벽 장식 5종
  | 'wall_clock_agency'
  | 'bulletin_board_customer'
  | 'agency_wall_sign'
  | 'employee_award_frame'
  | 'wall_shelf_honey';

export type SurfaceId =
  | 'wallpaper_cream_plaster'
  | 'wallpaper_sage_linen'
  | 'wallpaper_apricot_pinstripe'
  | 'flooring_honey_oak'
  | 'flooring_cream_terrazzo'
  | 'flooring_warm_gray_carpet';

export type BehaviorId =
  | 'use_cushion'
  | 'press_bell'
  | 'sit_swivel_chair'
  | 'stamp_paw'
  | 'hide_paper_basket'
  | 'peek_document_box'
  | 'watch_window'
  | 'drink_water';

export type FurnitureGroup = 'interactive' | 'office' | 'decor' | 'wall';
export type LayerMode = 'standalone' | 'compositeInteraction' | 'splitLayers';

export interface Footprint {
  width: number;
  depth: number;
}

export interface ApproachAnchor extends GridPoint {
  facing: 'left' | 'right';
}

/**
 * 배치·충돌·행동 판단에 필요한 가구 도메인 명세.
 * 원본은 패키지 assets/v2/furniture/<id>/metadata.json.
 * collisionMask·approachAnchors 좌표는 배치 원점(footprint 좌상단 셀) 기준 상대 오프셋이며
 * 음수(footprint 밖 인접 셀)를 허용한다.
 */
export interface FurnitureSpec {
  id: FurnitureId;
  name: string;
  group: FurnitureGroup;
  surface: Surface;
  footprint: Footprint;
  /** 비어 있으면 collides=false(러그류)로 취급한다. */
  collisionMask: readonly GridPoint[];
  approachAnchors: readonly ApproachAnchor[];
  canFlipX: boolean;
  capacity: number;
  behaviors: readonly BehaviorId[];
  layerMode: LayerMode;
  /** 이미지 하단 기준선. 이미지 높이 대비 0~1 비율. */
  baselineY: number;
}

/** catalog-v2.json의 안전한 표현. */
export interface CatalogFurnitureEntry {
  id: FurnitureId;
  name: string;
  group: FurnitureGroup;
  surface: Surface;
  footprint: readonly [number, number];
  behaviors: readonly BehaviorId[];
  price: number;
  acquisition: 'starter' | 'welfarePoint';
  artStatus: string;
  assetPath: string;
}

export interface CatalogSurfaceEntry {
  id: SurfaceId;
  type: 'wallpaper' | 'flooring';
  price: number;
  acquisition: 'starter' | 'welfarePoint';
  artStatus: string;
  assetPath: string;
}

export interface CatalogV2 {
  schemaVersion: number;
  furniture: readonly CatalogFurnitureEntry[];
  surfaces: readonly CatalogSurfaceEntry[];
}

/** flipX 시 footprint 폭 기준으로 상대 오프셋을 좌우 반전한다. */
export function mirrorOffsetX(offsetX: number, footprintWidth: number): number {
  return footprintWidth - 1 - offsetX;
}

export function furnitureCollides(spec: FurnitureSpec): boolean {
  return spec.collisionMask.length > 0;
}
