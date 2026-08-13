/**
 * 고객지원실 이미지 목록.
 *
 * 전부 손으로 적은 정적 require다. Metro는 번들을 만들 때 require의 인자를 읽어
 * 에셋을 포함시키므로, 문자열을 조립해 넘기면 그림이 통째로 빠진다.
 *
 * 이 파일은 tools로 생성한다. 에셋이 바뀌면 손으로 고치지 말고 다시 생성한다.
 */

/** 방에 세울 수 있는 캐릭터. 털색·무늬에서 고른다. */
export type SelectableCharacterAssetKey =
  | 'bicolor_cow'
  | 'bicolor_spotted'
  | 'bicolor_tuxedo'
  | 'fallback_cream'
  | 'solid_black'
  | 'solid_brown'
  | 'solid_cream'
  | 'solid_gray'
  | 'solid_orange'
  | 'solid_white'
  | 'tabby_brown'
  | 'tabby_gray'
  | 'tabby_orange'
  | 'tortie_calico'
  | 'tortie_dark';

/**
 * 예약 키까지 포함한 전체 목록.
 *
 * point_reserved는 그림만 있고 자동으로 고르지 않는다. 지금 원본 필드에는
 * 포인트 분포를 뜻하는 값이 없어서, 크림+초콜릿 조합만으로 포인트 고양이라고
 * 단정할 수 없기 때문이다.
 */
export type CharacterAssetKey = SelectableCharacterAssetKey | 'point_reserved';

/** 비품별 공용 행동. idle은 비품 없이 앉아 있는 기본 자세다. */
export type BehaviorId =
  | 'hide_paper_basket'
  | 'idle'
  | 'peek_document_box'
  | 'press_bell'
  | 'sit_swivel_chair'
  | 'stamp_paw'
  | 'use_cushion';

export type PropId =
  | 'prop_document_box'
  | 'prop_paper_basket'
  | 'prop_paw_stamp_pad'
  | 'prop_service_bell'
  | 'prop_swivel_chair'
  | 'prop_visitor_cushion';

type ImageSource = ReturnType<typeof require>;

export const CAT_ACTION_IMAGES: Record<CharacterAssetKey, Record<BehaviorId, ImageSource>> = {
  bicolor_cow: {
    hide_paper_basket: require('../../../assets/support-room/cats/actions/bicolor_cow/hide_paper_basket.webp'),
    idle: require('../../../assets/support-room/cats/actions/bicolor_cow/idle.webp'),
    peek_document_box: require('../../../assets/support-room/cats/actions/bicolor_cow/peek_document_box.webp'),
    press_bell: require('../../../assets/support-room/cats/actions/bicolor_cow/press_bell.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/bicolor_cow/sit_swivel_chair.webp'),
    stamp_paw: require('../../../assets/support-room/cats/actions/bicolor_cow/stamp_paw.webp'),
    use_cushion: require('../../../assets/support-room/cats/actions/bicolor_cow/use_cushion.webp'),
  },
  bicolor_spotted: {
    hide_paper_basket: require('../../../assets/support-room/cats/actions/bicolor_spotted/hide_paper_basket.webp'),
    idle: require('../../../assets/support-room/cats/actions/bicolor_spotted/idle.webp'),
    peek_document_box: require('../../../assets/support-room/cats/actions/bicolor_spotted/peek_document_box.webp'),
    press_bell: require('../../../assets/support-room/cats/actions/bicolor_spotted/press_bell.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/bicolor_spotted/sit_swivel_chair.webp'),
    stamp_paw: require('../../../assets/support-room/cats/actions/bicolor_spotted/stamp_paw.webp'),
    use_cushion: require('../../../assets/support-room/cats/actions/bicolor_spotted/use_cushion.webp'),
  },
  bicolor_tuxedo: {
    hide_paper_basket: require('../../../assets/support-room/cats/actions/bicolor_tuxedo/hide_paper_basket.webp'),
    idle: require('../../../assets/support-room/cats/actions/bicolor_tuxedo/idle.webp'),
    peek_document_box: require('../../../assets/support-room/cats/actions/bicolor_tuxedo/peek_document_box.webp'),
    press_bell: require('../../../assets/support-room/cats/actions/bicolor_tuxedo/press_bell.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/bicolor_tuxedo/sit_swivel_chair.webp'),
    stamp_paw: require('../../../assets/support-room/cats/actions/bicolor_tuxedo/stamp_paw.webp'),
    use_cushion: require('../../../assets/support-room/cats/actions/bicolor_tuxedo/use_cushion.webp'),
  },
  fallback_cream: {
    hide_paper_basket: require('../../../assets/support-room/cats/actions/fallback_cream/hide_paper_basket.webp'),
    idle: require('../../../assets/support-room/cats/actions/fallback_cream/idle.webp'),
    peek_document_box: require('../../../assets/support-room/cats/actions/fallback_cream/peek_document_box.webp'),
    press_bell: require('../../../assets/support-room/cats/actions/fallback_cream/press_bell.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/fallback_cream/sit_swivel_chair.webp'),
    stamp_paw: require('../../../assets/support-room/cats/actions/fallback_cream/stamp_paw.webp'),
    use_cushion: require('../../../assets/support-room/cats/actions/fallback_cream/use_cushion.webp'),
  },
  point_reserved: {
    hide_paper_basket: require('../../../assets/support-room/cats/actions/point_reserved/hide_paper_basket.webp'),
    idle: require('../../../assets/support-room/cats/actions/point_reserved/idle.webp'),
    peek_document_box: require('../../../assets/support-room/cats/actions/point_reserved/peek_document_box.webp'),
    press_bell: require('../../../assets/support-room/cats/actions/point_reserved/press_bell.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/point_reserved/sit_swivel_chair.webp'),
    stamp_paw: require('../../../assets/support-room/cats/actions/point_reserved/stamp_paw.webp'),
    use_cushion: require('../../../assets/support-room/cats/actions/point_reserved/use_cushion.webp'),
  },
  solid_black: {
    hide_paper_basket: require('../../../assets/support-room/cats/actions/solid_black/hide_paper_basket.webp'),
    idle: require('../../../assets/support-room/cats/actions/solid_black/idle.webp'),
    peek_document_box: require('../../../assets/support-room/cats/actions/solid_black/peek_document_box.webp'),
    press_bell: require('../../../assets/support-room/cats/actions/solid_black/press_bell.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/solid_black/sit_swivel_chair.webp'),
    stamp_paw: require('../../../assets/support-room/cats/actions/solid_black/stamp_paw.webp'),
    use_cushion: require('../../../assets/support-room/cats/actions/solid_black/use_cushion.webp'),
  },
  solid_brown: {
    hide_paper_basket: require('../../../assets/support-room/cats/actions/solid_brown/hide_paper_basket.webp'),
    idle: require('../../../assets/support-room/cats/actions/solid_brown/idle.webp'),
    peek_document_box: require('../../../assets/support-room/cats/actions/solid_brown/peek_document_box.webp'),
    press_bell: require('../../../assets/support-room/cats/actions/solid_brown/press_bell.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/solid_brown/sit_swivel_chair.webp'),
    stamp_paw: require('../../../assets/support-room/cats/actions/solid_brown/stamp_paw.webp'),
    use_cushion: require('../../../assets/support-room/cats/actions/solid_brown/use_cushion.webp'),
  },
  solid_cream: {
    hide_paper_basket: require('../../../assets/support-room/cats/actions/solid_cream/hide_paper_basket.webp'),
    idle: require('../../../assets/support-room/cats/actions/solid_cream/idle.webp'),
    peek_document_box: require('../../../assets/support-room/cats/actions/solid_cream/peek_document_box.webp'),
    press_bell: require('../../../assets/support-room/cats/actions/solid_cream/press_bell.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/solid_cream/sit_swivel_chair.webp'),
    stamp_paw: require('../../../assets/support-room/cats/actions/solid_cream/stamp_paw.webp'),
    use_cushion: require('../../../assets/support-room/cats/actions/solid_cream/use_cushion.webp'),
  },
  solid_gray: {
    hide_paper_basket: require('../../../assets/support-room/cats/actions/solid_gray/hide_paper_basket.webp'),
    idle: require('../../../assets/support-room/cats/actions/solid_gray/idle.webp'),
    peek_document_box: require('../../../assets/support-room/cats/actions/solid_gray/peek_document_box.webp'),
    press_bell: require('../../../assets/support-room/cats/actions/solid_gray/press_bell.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/solid_gray/sit_swivel_chair.webp'),
    stamp_paw: require('../../../assets/support-room/cats/actions/solid_gray/stamp_paw.webp'),
    use_cushion: require('../../../assets/support-room/cats/actions/solid_gray/use_cushion.webp'),
  },
  solid_orange: {
    hide_paper_basket: require('../../../assets/support-room/cats/actions/solid_orange/hide_paper_basket.webp'),
    idle: require('../../../assets/support-room/cats/actions/solid_orange/idle.webp'),
    peek_document_box: require('../../../assets/support-room/cats/actions/solid_orange/peek_document_box.webp'),
    press_bell: require('../../../assets/support-room/cats/actions/solid_orange/press_bell.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/solid_orange/sit_swivel_chair.webp'),
    stamp_paw: require('../../../assets/support-room/cats/actions/solid_orange/stamp_paw.webp'),
    use_cushion: require('../../../assets/support-room/cats/actions/solid_orange/use_cushion.webp'),
  },
  solid_white: {
    hide_paper_basket: require('../../../assets/support-room/cats/actions/solid_white/hide_paper_basket.webp'),
    idle: require('../../../assets/support-room/cats/actions/solid_white/idle.webp'),
    peek_document_box: require('../../../assets/support-room/cats/actions/solid_white/peek_document_box.webp'),
    press_bell: require('../../../assets/support-room/cats/actions/solid_white/press_bell.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/solid_white/sit_swivel_chair.webp'),
    stamp_paw: require('../../../assets/support-room/cats/actions/solid_white/stamp_paw.webp'),
    use_cushion: require('../../../assets/support-room/cats/actions/solid_white/use_cushion.webp'),
  },
  tabby_brown: {
    hide_paper_basket: require('../../../assets/support-room/cats/actions/tabby_brown/hide_paper_basket.webp'),
    idle: require('../../../assets/support-room/cats/actions/tabby_brown/idle.webp'),
    peek_document_box: require('../../../assets/support-room/cats/actions/tabby_brown/peek_document_box.webp'),
    press_bell: require('../../../assets/support-room/cats/actions/tabby_brown/press_bell.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/tabby_brown/sit_swivel_chair.webp'),
    stamp_paw: require('../../../assets/support-room/cats/actions/tabby_brown/stamp_paw.webp'),
    use_cushion: require('../../../assets/support-room/cats/actions/tabby_brown/use_cushion.webp'),
  },
  tabby_gray: {
    hide_paper_basket: require('../../../assets/support-room/cats/actions/tabby_gray/hide_paper_basket.webp'),
    idle: require('../../../assets/support-room/cats/actions/tabby_gray/idle.webp'),
    peek_document_box: require('../../../assets/support-room/cats/actions/tabby_gray/peek_document_box.webp'),
    press_bell: require('../../../assets/support-room/cats/actions/tabby_gray/press_bell.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/tabby_gray/sit_swivel_chair.webp'),
    stamp_paw: require('../../../assets/support-room/cats/actions/tabby_gray/stamp_paw.webp'),
    use_cushion: require('../../../assets/support-room/cats/actions/tabby_gray/use_cushion.webp'),
  },
  tabby_orange: {
    hide_paper_basket: require('../../../assets/support-room/cats/actions/tabby_orange/hide_paper_basket.webp'),
    idle: require('../../../assets/support-room/cats/actions/tabby_orange/idle.webp'),
    peek_document_box: require('../../../assets/support-room/cats/actions/tabby_orange/peek_document_box.webp'),
    press_bell: require('../../../assets/support-room/cats/actions/tabby_orange/press_bell.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/tabby_orange/sit_swivel_chair.webp'),
    stamp_paw: require('../../../assets/support-room/cats/actions/tabby_orange/stamp_paw.webp'),
    use_cushion: require('../../../assets/support-room/cats/actions/tabby_orange/use_cushion.webp'),
  },
  tortie_calico: {
    hide_paper_basket: require('../../../assets/support-room/cats/actions/tortie_calico/hide_paper_basket.webp'),
    idle: require('../../../assets/support-room/cats/actions/tortie_calico/idle.webp'),
    peek_document_box: require('../../../assets/support-room/cats/actions/tortie_calico/peek_document_box.webp'),
    press_bell: require('../../../assets/support-room/cats/actions/tortie_calico/press_bell.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/tortie_calico/sit_swivel_chair.webp'),
    stamp_paw: require('../../../assets/support-room/cats/actions/tortie_calico/stamp_paw.webp'),
    use_cushion: require('../../../assets/support-room/cats/actions/tortie_calico/use_cushion.webp'),
  },
  tortie_dark: {
    hide_paper_basket: require('../../../assets/support-room/cats/actions/tortie_dark/hide_paper_basket.webp'),
    idle: require('../../../assets/support-room/cats/actions/tortie_dark/idle.webp'),
    peek_document_box: require('../../../assets/support-room/cats/actions/tortie_dark/peek_document_box.webp'),
    press_bell: require('../../../assets/support-room/cats/actions/tortie_dark/press_bell.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/tortie_dark/sit_swivel_chair.webp'),
    stamp_paw: require('../../../assets/support-room/cats/actions/tortie_dark/stamp_paw.webp'),
    use_cushion: require('../../../assets/support-room/cats/actions/tortie_dark/use_cushion.webp'),
  },
};

/** 명단·기록처럼 방 밖에서 쓰는 기본 자세 */
export const CAT_IDLE_IMAGES: Record<CharacterAssetKey, ImageSource> = {
  bicolor_cow: require('../../../assets/support-room/cats/characters/bicolor_cow.webp'),
  bicolor_spotted: require('../../../assets/support-room/cats/characters/bicolor_spotted.webp'),
  bicolor_tuxedo: require('../../../assets/support-room/cats/characters/bicolor_tuxedo.webp'),
  fallback_cream: require('../../../assets/support-room/cats/characters/fallback_cream.webp'),
  point_reserved: require('../../../assets/support-room/cats/characters/point_reserved.webp'),
  solid_black: require('../../../assets/support-room/cats/characters/solid_black.webp'),
  solid_brown: require('../../../assets/support-room/cats/characters/solid_brown.webp'),
  solid_cream: require('../../../assets/support-room/cats/characters/solid_cream.webp'),
  solid_gray: require('../../../assets/support-room/cats/characters/solid_gray.webp'),
  solid_orange: require('../../../assets/support-room/cats/characters/solid_orange.webp'),
  solid_white: require('../../../assets/support-room/cats/characters/solid_white.webp'),
  tabby_brown: require('../../../assets/support-room/cats/characters/tabby_brown.webp'),
  tabby_gray: require('../../../assets/support-room/cats/characters/tabby_gray.webp'),
  tabby_orange: require('../../../assets/support-room/cats/characters/tabby_orange.webp'),
  tortie_calico: require('../../../assets/support-room/cats/characters/tortie_calico.webp'),
  tortie_dark: require('../../../assets/support-room/cats/characters/tortie_dark.webp'),
};

export const PROP_IMAGES: Record<PropId, ImageSource> = {
  prop_document_box: require('../../../assets/support-room/furniture/prop_document_box.webp'),
  prop_paper_basket: require('../../../assets/support-room/furniture/prop_paper_basket.webp'),
  prop_paw_stamp_pad: require('../../../assets/support-room/furniture/prop_paw_stamp_pad.webp'),
  prop_service_bell: require('../../../assets/support-room/furniture/prop_service_bell.webp'),
  prop_swivel_chair: require('../../../assets/support-room/furniture/prop_swivel_chair.webp'),
  prop_visitor_cushion: require('../../../assets/support-room/furniture/prop_visitor_cushion.webp'),
};

export const SUPPORT_ROOM_ICONS = {
  icon_consultation_log: require('../../../assets/support-room/ui/icon_consultation_log.webp'),
  icon_direction_paw: require('../../../assets/support-room/ui/icon_direction_paw.webp'),
  icon_room_minimap: require('../../../assets/support-room/ui/icon_room_minimap.webp'),
  icon_supply_box: require('../../../assets/support-room/ui/icon_supply_box.webp'),
} as const;

export const SUPPORT_ROOM_BACKGROUND = require('../../../assets/support-room/environment/support-room-clean-wide.webp');

/**
 * 홈 진입 카드용 미리보기.
 *
 * 3859×2166 원본을 홈 카드에 그대로 넣지 않는다. 카드 크기에 맞춰 잘라 낸
 * 전용 이미지라 12KB면 끝난다.
 */
export const SUPPORT_ROOM_HOME_PREVIEW = require('../../../assets/support-room/home-preview.webp');

/** 자동 선택 후보. point_reserved가 빠져 있다. */
export const SELECTABLE_CHARACTER_KEYS: readonly SelectableCharacterAssetKey[] = [
  'bicolor_cow',
  'bicolor_spotted',
  'bicolor_tuxedo',
  'fallback_cream',
  'solid_black',
  'solid_brown',
  'solid_cream',
  'solid_gray',
  'solid_orange',
  'solid_white',
  'tabby_brown',
  'tabby_gray',
  'tabby_orange',
  'tortie_calico',
  'tortie_dark',
];
