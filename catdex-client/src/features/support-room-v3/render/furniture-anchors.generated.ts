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
  visitor_cushion_orange: { contentX: 0.0801, contentY: 0.2012, contentW: 0.8398, contentH: 0.5957, baselineY: 0.7969, footprintW: 1, footprintD: 1 },
  service_bell_brass: { contentX: 0.0801, contentY: 0.1113, contentW: 0.8398, contentH: 0.7773, baselineY: 0.82, footprintW: 1, footprintD: 1 },
  swivel_chair_lavender: { contentX: 0.2227, contentY: 0.0801, contentW: 0.5547, contentH: 0.8398, baselineY: 0.9, footprintW: 1, footprintD: 1 },
  paw_stamp_pad_orange: { contentX: 0.0801, contentY: 0.1641, contentW: 0.8398, contentH: 0.6719, baselineY: 0.82, footprintW: 1, footprintD: 1 },
  paper_basket_cream: { contentX: 0.123, contentY: 0.0801, contentW: 0.752, contentH: 0.8398, baselineY: 0.88, footprintW: 1, footprintD: 1 },
  document_box_olive: { contentX: 0.0801, contentY: 0.1055, contentW: 0.8398, contentH: 0.7871, baselineY: 0.88, footprintW: 1, footprintD: 1 },
  window_bench: { contentX: 0.0566, contentY: 0.2129, contentW: 0.8868, contentH: 0.5877, baselineY: 0.8006, footprintW: 3, footprintD: 1 },
  customer_water_station: { contentX: 0.1683, contentY: 0.1308, contentW: 0.6635, contentH: 0.7313, baselineY: 0.86, footprintW: 1, footprintD: 1 },
  reception_desk_cream: { contentX: 0.0965, contentY: 0.2624, contentW: 0.8142, contentH: 0.5686, baselineY: 0.8309, footprintW: 3, footprintD: 2 },
  consultation_desk_honey: { contentX: 0.0845, contentY: 0.2448, contentW: 0.862, contentH: 0.5646, baselineY: 0.8094, footprintW: 2, footprintD: 2 },
  meeting_table_round: { contentX: 0.1898, contentY: 0.2488, contentW: 0.6212, contentH: 0.5191, baselineY: 0.7679, footprintW: 2, footprintD: 2 },
  office_sofa_sage: { contentX: 0.1093, contentY: 0.2281, contentW: 0.7807, contentH: 0.5415, baselineY: 0.7695, footprintW: 3, footprintD: 2 },
  low_bookshelf_honey: { contentX: 0.0909, contentY: 0.2799, contentW: 0.8262, contentH: 0.4593, baselineY: 0.7392, footprintW: 2, footprintD: 1 },
  file_cabinet_olive: { contentX: 0.2432, contentY: 0.1459, contentW: 0.5175, contentH: 0.7233, baselineY: 0.8692, footprintW: 1, footprintD: 1 },
  office_partition_cream: { contentX: 0.1093, contentY: 0.2974, contentW: 0.7855, contentH: 0.4314, baselineY: 0.7289, footprintW: 3, footprintD: 1 },
  floor_lamp_warm: { contentX: 0.3604, contentY: 0.1053, contentW: 0.2727, contentH: 0.7632, baselineY: 0.8684, footprintW: 1, footprintD: 1 },
  plant_large_rubber: { contentX: 0.2344, contentY: 0.0837, contentW: 0.5175, contentH: 0.7951, baselineY: 0.8788, footprintW: 1, footprintD: 1 },
  plant_small_desk: { contentX: 0.2703, contentY: 0.2097, contentW: 0.4577, contentH: 0.5805, baselineY: 0.7903, footprintW: 1, footprintD: 1 },
  umbrella_stand_olive: { contentX: 0.3174, contentY: 0.126, contentW: 0.3517, contentH: 0.7552, baselineY: 0.8812, footprintW: 1, footprintD: 1 },
  document_organizer_cream: { contentX: 0.1794, contentY: 0.2105, contentW: 0.6611, contentH: 0.6037, baselineY: 0.8142, footprintW: 1, footprintD: 1 },
  wall_clock_agency: { contentX: 0.1619, contentY: 0.1579, contentW: 0.6683, contentH: 0.6842, baselineY: 0.5, footprintW: 2, footprintD: 2 },
  bulletin_board_customer: { contentX: 0.1119, contentY: 0.2541, contentW: 0.7762, contentH: 0.489, baselineY: 0.5, footprintW: 3, footprintD: 2 },
  agency_wall_sign: { contentX: 0.1167, contentY: 0.2173, contentW: 0.7673, contentH: 0.5414, baselineY: 0.5, footprintW: 3, footprintD: 1 },
  employee_award_frame: { contentX: 0.2197, contentY: 0.1004, contentW: 0.5639, contentH: 0.7871, baselineY: 0.5, footprintW: 2, footprintD: 2 },
  wall_shelf_honey: { contentX: 0.0802, contentY: 0.3697, contentW: 0.8418, contentH: 0.3226, baselineY: 0.5, footprintW: 3, footprintD: 1 },
};
