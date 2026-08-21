import type {
  BehaviorId,
  CharacterAssetKey,
} from '@/features/support-room/support-room.assets';

/**
 * 고양이 단독 행동 그림. 가구가 빠져 있어 가구 스프라이트와 따로 그릴 수 있다.
 * (기존 <행동>.webp는 고양이와 가구가 한 장에 합쳐진 그림이라 크기를 따로
 * 조절할 수 없었다.)
 *
 * Metro는 require의 인자를 정적으로 읽으므로 문자열 조립이 아니라 전부 적는다.
 */

type ImageSource = ReturnType<typeof require>;

export type CatOnlyBehavior = Extract<
  BehaviorId,
  'use_cushion' | 'sit_swivel_chair' | 'hide_paper_basket'
>;

export const CAT_ONLY_ACTION_IMAGES: Record<
  CharacterAssetKey,
  Record<CatOnlyBehavior, ImageSource>
> = {
  bicolor_cow: {
    use_cushion: require('../../../assets/support-room/cats/actions/bicolor_cow/use_cushion.cat.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/bicolor_cow/sit_swivel_chair.cat.webp'),
    hide_paper_basket: require('../../../assets/support-room/cats/actions/bicolor_cow/hide_paper_basket.cat.webp'),
  },
  bicolor_spotted: {
    use_cushion: require('../../../assets/support-room/cats/actions/bicolor_spotted/use_cushion.cat.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/bicolor_spotted/sit_swivel_chair.cat.webp'),
    hide_paper_basket: require('../../../assets/support-room/cats/actions/bicolor_spotted/hide_paper_basket.cat.webp'),
  },
  bicolor_tuxedo: {
    use_cushion: require('../../../assets/support-room/cats/actions/bicolor_tuxedo/use_cushion.cat.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/bicolor_tuxedo/sit_swivel_chair.cat.webp'),
    hide_paper_basket: require('../../../assets/support-room/cats/actions/bicolor_tuxedo/hide_paper_basket.cat.webp'),
  },
  fallback_cream: {
    use_cushion: require('../../../assets/support-room/cats/actions/fallback_cream/use_cushion.cat.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/fallback_cream/sit_swivel_chair.cat.webp'),
    hide_paper_basket: require('../../../assets/support-room/cats/actions/fallback_cream/hide_paper_basket.cat.webp'),
  },
  point_reserved: {
    use_cushion: require('../../../assets/support-room/cats/actions/point_reserved/use_cushion.cat.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/point_reserved/sit_swivel_chair.cat.webp'),
    hide_paper_basket: require('../../../assets/support-room/cats/actions/point_reserved/hide_paper_basket.cat.webp'),
  },
  solid_black: {
    use_cushion: require('../../../assets/support-room/cats/actions/solid_black/use_cushion.cat.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/solid_black/sit_swivel_chair.cat.webp'),
    hide_paper_basket: require('../../../assets/support-room/cats/actions/solid_black/hide_paper_basket.cat.webp'),
  },
  solid_brown: {
    use_cushion: require('../../../assets/support-room/cats/actions/solid_brown/use_cushion.cat.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/solid_brown/sit_swivel_chair.cat.webp'),
    hide_paper_basket: require('../../../assets/support-room/cats/actions/solid_brown/hide_paper_basket.cat.webp'),
  },
  solid_cream: {
    use_cushion: require('../../../assets/support-room/cats/actions/solid_cream/use_cushion.cat.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/solid_cream/sit_swivel_chair.cat.webp'),
    hide_paper_basket: require('../../../assets/support-room/cats/actions/solid_cream/hide_paper_basket.cat.webp'),
  },
  solid_gray: {
    use_cushion: require('../../../assets/support-room/cats/actions/solid_gray/use_cushion.cat.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/solid_gray/sit_swivel_chair.cat.webp'),
    hide_paper_basket: require('../../../assets/support-room/cats/actions/solid_gray/hide_paper_basket.cat.webp'),
  },
  solid_orange: {
    use_cushion: require('../../../assets/support-room/cats/actions/solid_orange/use_cushion.cat.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/solid_orange/sit_swivel_chair.cat.webp'),
    hide_paper_basket: require('../../../assets/support-room/cats/actions/solid_orange/hide_paper_basket.cat.webp'),
  },
  solid_white: {
    use_cushion: require('../../../assets/support-room/cats/actions/solid_white/use_cushion.cat.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/solid_white/sit_swivel_chair.cat.webp'),
    hide_paper_basket: require('../../../assets/support-room/cats/actions/solid_white/hide_paper_basket.cat.webp'),
  },
  tabby_brown: {
    use_cushion: require('../../../assets/support-room/cats/actions/tabby_brown/use_cushion.cat.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/tabby_brown/sit_swivel_chair.cat.webp'),
    hide_paper_basket: require('../../../assets/support-room/cats/actions/tabby_brown/hide_paper_basket.cat.webp'),
  },
  tabby_gray: {
    use_cushion: require('../../../assets/support-room/cats/actions/tabby_gray/use_cushion.cat.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/tabby_gray/sit_swivel_chair.cat.webp'),
    hide_paper_basket: require('../../../assets/support-room/cats/actions/tabby_gray/hide_paper_basket.cat.webp'),
  },
  tabby_orange: {
    use_cushion: require('../../../assets/support-room/cats/actions/tabby_orange/use_cushion.cat.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/tabby_orange/sit_swivel_chair.cat.webp'),
    hide_paper_basket: require('../../../assets/support-room/cats/actions/tabby_orange/hide_paper_basket.cat.webp'),
  },
  tortie_calico: {
    use_cushion: require('../../../assets/support-room/cats/actions/tortie_calico/use_cushion.cat.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/tortie_calico/sit_swivel_chair.cat.webp'),
    hide_paper_basket: require('../../../assets/support-room/cats/actions/tortie_calico/hide_paper_basket.cat.webp'),
  },
  tortie_dark: {
    use_cushion: require('../../../assets/support-room/cats/actions/tortie_dark/use_cushion.cat.webp'),
    sit_swivel_chair: require('../../../assets/support-room/cats/actions/tortie_dark/sit_swivel_chair.cat.webp'),
    hide_paper_basket: require('../../../assets/support-room/cats/actions/tortie_dark/hide_paper_basket.cat.webp'),
  },
};
