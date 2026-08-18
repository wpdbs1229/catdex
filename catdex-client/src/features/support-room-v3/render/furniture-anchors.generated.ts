/**
 * 이 파일은 scripts/measure-furniture-anchors.py가 생성한다. 손으로 고치지 말 것.
 * 각 가구 스프라이트의 내용 영역(투명 여백 제외)과 접지선 비율.
 */
import type { FurnitureId } from '@/features/support-room-v2/domain/furniture';

export interface FurnitureAnchor {
  /** 정규화된 내용 영역 (이미지 크기 대비 0~1) */
  contentX: number;
  contentY: number;
  contentW: number;
  contentH: number;
  /** 이미지 높이 대비 접지선 위치 */
  baselineY: number;
  footprintW: number;
  footprintD: number;
}

export const FURNITURE_ANCHORS: Record<FurnitureId, FurnitureAnchor> = {
  visitor_cushion_orange: { contentX: 0.0801, contentY: 0.2012, contentW: 0.8398, contentH: 0.5957, baselineY: 0.7969, footprintW: 2, footprintD: 2 },
  service_bell_brass: { contentX: 0.0801, contentY: 0.1113, contentW: 0.8398, contentH: 0.7773, baselineY: 0.82, footprintW: 1, footprintD: 1 },
  swivel_chair_lavender: { contentX: 0.2227, contentY: 0.0801, contentW: 0.5547, contentH: 0.8398, baselineY: 0.9, footprintW: 2, footprintD: 2 },
  paw_stamp_pad_orange: { contentX: 0.0801, contentY: 0.1641, contentW: 0.8398, contentH: 0.6719, baselineY: 0.82, footprintW: 1, footprintD: 1 },
  paper_basket_cream: { contentX: 0.123, contentY: 0.0801, contentW: 0.752, contentH: 0.8398, baselineY: 0.88, footprintW: 2, footprintD: 2 },
  document_box_olive: { contentX: 0.0801, contentY: 0.1055, contentW: 0.8398, contentH: 0.7871, baselineY: 0.88, footprintW: 2, footprintD: 2 },
  window_bench: { contentX: 0.0566, contentY: 0.2129, contentW: 0.8868, contentH: 0.5877, baselineY: 0.8006, footprintW: 3, footprintD: 2 },
  customer_water_station: { contentX: 0.1675, contentY: 0.13, contentW: 0.6643, contentH: 0.7329, baselineY: 0.86, footprintW: 2, footprintD: 2 },
  reception_desk_cream: { contentX: 0.0, contentY: 0.2608, contentW: 1.0, contentH: 0.7392, baselineY: 0.9, footprintW: 4, footprintD: 2 },
  consultation_desk_honey: { contentX: 0.0, contentY: 0.244, contentW: 1.0, contentH: 0.756, baselineY: 0.9, footprintW: 3, footprintD: 2 },
  meeting_table_round: { contentX: 0.0, contentY: 0.248, contentW: 1.0, contentH: 0.752, baselineY: 0.9, footprintW: 3, footprintD: 3 },
  office_sofa_sage: { contentX: 0.0, contentY: 0.2273, contentW: 1.0, contentH: 0.7727, baselineY: 0.9, footprintW: 4, footprintD: 2 },
  low_bookshelf_honey: { contentX: 0.0, contentY: 0.2791, contentW: 1.0, contentH: 0.7209, baselineY: 0.9, footprintW: 3, footprintD: 1 },
  file_cabinet_olive: { contentX: 0.0, contentY: 0.1443, contentW: 1.0, contentH: 0.8557, baselineY: 0.9, footprintW: 2, footprintD: 1 },
  office_partition_cream: { contentX: 0.0, contentY: 0.2967, contentW: 1.0, contentH: 0.7033, baselineY: 0.9, footprintW: 3, footprintD: 1 },
  floor_lamp_warm: { contentX: 0.0, contentY: 0.1037, contentW: 1.0, contentH: 0.8963, baselineY: 0.92, footprintW: 1, footprintD: 1 },
  plant_large_rubber: { contentX: 0.0, contentY: 0.0821, contentW: 1.0, contentH: 0.9179, baselineY: 0.93, footprintW: 2, footprintD: 2 },
  plant_small_desk: { contentX: 0.0, contentY: 0.2081, contentW: 1.0, contentH: 0.7919, baselineY: 0.9, footprintW: 1, footprintD: 1 },
  umbrella_stand_olive: { contentX: 0.0, contentY: 0.1252, contentW: 1.0, contentH: 0.8748, baselineY: 0.92, footprintW: 1, footprintD: 1 },
  document_organizer_cream: { contentX: 0.0, contentY: 0.2089, contentW: 1.0, contentH: 0.7911, baselineY: 0.9, footprintW: 2, footprintD: 1 },
  wall_clock_agency: { contentX: 0.0, contentY: 0.1563, contentW: 1.0, contentH: 0.8437, baselineY: 0.5, footprintW: 2, footprintD: 2 },
  bulletin_board_customer: { contentX: 0.0, contentY: 0.2532, contentW: 1.0, contentH: 0.7468, baselineY: 0.5, footprintW: 3, footprintD: 2 },
  agency_wall_sign: { contentX: 0.0, contentY: 0.2164, contentW: 1.0, contentH: 0.7836, baselineY: 0.5, footprintW: 3, footprintD: 1 },
  employee_award_frame: { contentX: 0.0, contentY: 0.0989, contentW: 1.0, contentH: 0.9011, baselineY: 0.5, footprintW: 2, footprintD: 2 },
  wall_shelf_honey: { contentX: 0.0, contentY: 0.3679, contentW: 1.0, contentH: 0.6321, baselineY: 0.5, footprintW: 3, footprintD: 1 },
};
