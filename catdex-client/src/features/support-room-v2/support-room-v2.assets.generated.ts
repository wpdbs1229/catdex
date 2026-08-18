/**
 * 이 파일은 scripts/generate-support-room-v2.js가 생성한다. 손으로 고치지 말 것.
 * 원본: 대한냥냥공사 패키지 assets/v2 (catalog-v2.json schemaVersion 1)
 */
import type { FurnitureId, SurfaceId } from './domain/furniture';

type ImageSource = ReturnType<typeof require>;

export const V2_ROOM_SHELL: ImageSource = require('../../../assets/support-room-v2/environment/support-room-shell-wide.webp');

export const V2_FURNITURE_IMAGES: Record<FurnitureId, ImageSource> = {
  visitor_cushion_orange: require('../../../assets/support-room-v2/furniture/visitor_cushion_orange.webp'),
  service_bell_brass: require('../../../assets/support-room-v2/furniture/service_bell_brass.webp'),
  swivel_chair_lavender: require('../../../assets/support-room-v2/furniture/swivel_chair_lavender.webp'),
  paw_stamp_pad_orange: require('../../../assets/support-room-v2/furniture/paw_stamp_pad_orange.webp'),
  paper_basket_cream: require('../../../assets/support-room-v2/furniture/paper_basket_cream.webp'),
  document_box_olive: require('../../../assets/support-room-v2/furniture/document_box_olive.webp'),
  window_bench: require('../../../assets/support-room-v2/furniture/window_bench.webp'),
  customer_water_station: require('../../../assets/support-room-v2/furniture/customer_water_station.webp'),
  reception_desk_cream: require('../../../assets/support-room-v2/furniture/reception_desk_cream.webp'),
  consultation_desk_honey: require('../../../assets/support-room-v2/furniture/consultation_desk_honey.webp'),
  meeting_table_round: require('../../../assets/support-room-v2/furniture/meeting_table_round.webp'),
  office_sofa_sage: require('../../../assets/support-room-v2/furniture/office_sofa_sage.webp'),
  low_bookshelf_honey: require('../../../assets/support-room-v2/furniture/low_bookshelf_honey.webp'),
  file_cabinet_olive: require('../../../assets/support-room-v2/furniture/file_cabinet_olive.webp'),
  office_partition_cream: require('../../../assets/support-room-v2/furniture/office_partition_cream.webp'),
  floor_lamp_warm: require('../../../assets/support-room-v2/furniture/floor_lamp_warm.webp'),
  plant_large_rubber: require('../../../assets/support-room-v2/furniture/plant_large_rubber.webp'),
  plant_small_desk: require('../../../assets/support-room-v2/furniture/plant_small_desk.webp'),
  umbrella_stand_olive: require('../../../assets/support-room-v2/furniture/umbrella_stand_olive.webp'),
  document_organizer_cream: require('../../../assets/support-room-v2/furniture/document_organizer_cream.webp'),
  wall_clock_agency: require('../../../assets/support-room-v2/furniture/wall_clock_agency.webp'),
  bulletin_board_customer: require('../../../assets/support-room-v2/furniture/bulletin_board_customer.webp'),
  agency_wall_sign: require('../../../assets/support-room-v2/furniture/agency_wall_sign.webp'),
  employee_award_frame: require('../../../assets/support-room-v2/furniture/employee_award_frame.webp'),
  wall_shelf_honey: require('../../../assets/support-room-v2/furniture/wall_shelf_honey.webp'),
};

export const V2_FURNITURE_THUMBS: Record<FurnitureId, ImageSource> = {
  visitor_cushion_orange: require('../../../assets/support-room-v2/furniture/thumbs/visitor_cushion_orange.webp'),
  service_bell_brass: require('../../../assets/support-room-v2/furniture/thumbs/service_bell_brass.webp'),
  swivel_chair_lavender: require('../../../assets/support-room-v2/furniture/thumbs/swivel_chair_lavender.webp'),
  paw_stamp_pad_orange: require('../../../assets/support-room-v2/furniture/thumbs/paw_stamp_pad_orange.webp'),
  paper_basket_cream: require('../../../assets/support-room-v2/furniture/thumbs/paper_basket_cream.webp'),
  document_box_olive: require('../../../assets/support-room-v2/furniture/thumbs/document_box_olive.webp'),
  window_bench: require('../../../assets/support-room-v2/furniture/thumbs/window_bench.webp'),
  customer_water_station: require('../../../assets/support-room-v2/furniture/thumbs/customer_water_station.webp'),
  reception_desk_cream: require('../../../assets/support-room-v2/furniture/thumbs/reception_desk_cream.webp'),
  consultation_desk_honey: require('../../../assets/support-room-v2/furniture/thumbs/consultation_desk_honey.webp'),
  meeting_table_round: require('../../../assets/support-room-v2/furniture/thumbs/meeting_table_round.webp'),
  office_sofa_sage: require('../../../assets/support-room-v2/furniture/thumbs/office_sofa_sage.webp'),
  low_bookshelf_honey: require('../../../assets/support-room-v2/furniture/thumbs/low_bookshelf_honey.webp'),
  file_cabinet_olive: require('../../../assets/support-room-v2/furniture/thumbs/file_cabinet_olive.webp'),
  office_partition_cream: require('../../../assets/support-room-v2/furniture/thumbs/office_partition_cream.webp'),
  floor_lamp_warm: require('../../../assets/support-room-v2/furniture/thumbs/floor_lamp_warm.webp'),
  plant_large_rubber: require('../../../assets/support-room-v2/furniture/thumbs/plant_large_rubber.webp'),
  plant_small_desk: require('../../../assets/support-room-v2/furniture/thumbs/plant_small_desk.webp'),
  umbrella_stand_olive: require('../../../assets/support-room-v2/furniture/thumbs/umbrella_stand_olive.webp'),
  document_organizer_cream: require('../../../assets/support-room-v2/furniture/thumbs/document_organizer_cream.webp'),
  wall_clock_agency: require('../../../assets/support-room-v2/furniture/thumbs/wall_clock_agency.webp'),
  bulletin_board_customer: require('../../../assets/support-room-v2/furniture/thumbs/bulletin_board_customer.webp'),
  agency_wall_sign: require('../../../assets/support-room-v2/furniture/thumbs/agency_wall_sign.webp'),
  employee_award_frame: require('../../../assets/support-room-v2/furniture/thumbs/employee_award_frame.webp'),
  wall_shelf_honey: require('../../../assets/support-room-v2/furniture/thumbs/wall_shelf_honey.webp'),
};

export const V2_SURFACE_IMAGES: Record<SurfaceId, ImageSource> = {
  wallpaper_cream_plaster: require('../../../assets/support-room-v2/surfaces/wallpaper_cream_plaster.webp'),
  wallpaper_sage_linen: require('../../../assets/support-room-v2/surfaces/wallpaper_sage_linen.webp'),
  wallpaper_apricot_pinstripe: require('../../../assets/support-room-v2/surfaces/wallpaper_apricot_pinstripe.webp'),
  flooring_honey_oak: require('../../../assets/support-room-v2/surfaces/flooring_honey_oak.webp'),
  flooring_cream_terrazzo: require('../../../assets/support-room-v2/surfaces/flooring_cream_terrazzo.webp'),
  flooring_warm_gray_carpet: require('../../../assets/support-room-v2/surfaces/flooring_warm_gray_carpet.webp'),
};

/** 신규 2행동의 캐릭터별 합성 이미지. 기존 7행동은 V1 CAT_ACTION_IMAGES 재사용. */
export const V2_NEW_CAT_ACTION_IMAGES: Record<string, Record<'watch_window' | 'drink_water', ImageSource>> = {
  bicolor_cow: {
    watch_window: require('../../../assets/support-room-v2/cats/actions/bicolor_cow/watch_window.webp'),
    drink_water: require('../../../assets/support-room-v2/cats/actions/bicolor_cow/drink_water.webp'),
  },
  bicolor_spotted: {
    watch_window: require('../../../assets/support-room-v2/cats/actions/bicolor_spotted/watch_window.webp'),
    drink_water: require('../../../assets/support-room-v2/cats/actions/bicolor_spotted/drink_water.webp'),
  },
  bicolor_tuxedo: {
    watch_window: require('../../../assets/support-room-v2/cats/actions/bicolor_tuxedo/watch_window.webp'),
    drink_water: require('../../../assets/support-room-v2/cats/actions/bicolor_tuxedo/drink_water.webp'),
  },
  fallback_cream: {
    watch_window: require('../../../assets/support-room-v2/cats/actions/fallback_cream/watch_window.webp'),
    drink_water: require('../../../assets/support-room-v2/cats/actions/fallback_cream/drink_water.webp'),
  },
  point_reserved: {
    watch_window: require('../../../assets/support-room-v2/cats/actions/point_reserved/watch_window.webp'),
    drink_water: require('../../../assets/support-room-v2/cats/actions/point_reserved/drink_water.webp'),
  },
  solid_black: {
    watch_window: require('../../../assets/support-room-v2/cats/actions/solid_black/watch_window.webp'),
    drink_water: require('../../../assets/support-room-v2/cats/actions/solid_black/drink_water.webp'),
  },
  solid_brown: {
    watch_window: require('../../../assets/support-room-v2/cats/actions/solid_brown/watch_window.webp'),
    drink_water: require('../../../assets/support-room-v2/cats/actions/solid_brown/drink_water.webp'),
  },
  solid_cream: {
    watch_window: require('../../../assets/support-room-v2/cats/actions/solid_cream/watch_window.webp'),
    drink_water: require('../../../assets/support-room-v2/cats/actions/solid_cream/drink_water.webp'),
  },
  solid_gray: {
    watch_window: require('../../../assets/support-room-v2/cats/actions/solid_gray/watch_window.webp'),
    drink_water: require('../../../assets/support-room-v2/cats/actions/solid_gray/drink_water.webp'),
  },
  solid_orange: {
    watch_window: require('../../../assets/support-room-v2/cats/actions/solid_orange/watch_window.webp'),
    drink_water: require('../../../assets/support-room-v2/cats/actions/solid_orange/drink_water.webp'),
  },
  solid_white: {
    watch_window: require('../../../assets/support-room-v2/cats/actions/solid_white/watch_window.webp'),
    drink_water: require('../../../assets/support-room-v2/cats/actions/solid_white/drink_water.webp'),
  },
  tabby_brown: {
    watch_window: require('../../../assets/support-room-v2/cats/actions/tabby_brown/watch_window.webp'),
    drink_water: require('../../../assets/support-room-v2/cats/actions/tabby_brown/drink_water.webp'),
  },
  tabby_gray: {
    watch_window: require('../../../assets/support-room-v2/cats/actions/tabby_gray/watch_window.webp'),
    drink_water: require('../../../assets/support-room-v2/cats/actions/tabby_gray/drink_water.webp'),
  },
  tabby_orange: {
    watch_window: require('../../../assets/support-room-v2/cats/actions/tabby_orange/watch_window.webp'),
    drink_water: require('../../../assets/support-room-v2/cats/actions/tabby_orange/drink_water.webp'),
  },
  tortie_calico: {
    watch_window: require('../../../assets/support-room-v2/cats/actions/tortie_calico/watch_window.webp'),
    drink_water: require('../../../assets/support-room-v2/cats/actions/tortie_calico/drink_water.webp'),
  },
  tortie_dark: {
    watch_window: require('../../../assets/support-room-v2/cats/actions/tortie_dark/watch_window.webp'),
    drink_water: require('../../../assets/support-room-v2/cats/actions/tortie_dark/drink_water.webp'),
  },
};
