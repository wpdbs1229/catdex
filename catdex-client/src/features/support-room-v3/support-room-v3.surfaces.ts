import type { SurfaceId } from '@/features/support-room-v2/domain/furniture';
import type { RoomStage } from './render/shells.generated';

/**
 * 단계별 표면(벽지·바닥재) 오버레이. 셸 위에 겹쳐 그린다.
 * scripts/make-iso-surface-overlays.py가 굽는다. 손으로 고치지 말 것.
 */
type ImageSource = ReturnType<typeof require>;

export const V3_SURFACE_OVERLAYS: Record<RoomStage, Record<SurfaceId, ImageSource>> = {
  stage0: {
    flooring_honey_oak: require('../../../assets/support-room-v3/surfaces/stage0/flooring_honey_oak.webp'),
    flooring_cream_terrazzo: require('../../../assets/support-room-v3/surfaces/stage0/flooring_cream_terrazzo.webp'),
    flooring_warm_gray_carpet: require('../../../assets/support-room-v3/surfaces/stage0/flooring_warm_gray_carpet.webp'),
    wallpaper_cream_plaster: require('../../../assets/support-room-v3/surfaces/stage0/wallpaper_cream_plaster.webp'),
    wallpaper_sage_linen: require('../../../assets/support-room-v3/surfaces/stage0/wallpaper_sage_linen.webp'),
    wallpaper_apricot_pinstripe: require('../../../assets/support-room-v3/surfaces/stage0/wallpaper_apricot_pinstripe.webp'),
  },
  stage1: {
    flooring_honey_oak: require('../../../assets/support-room-v3/surfaces/stage1/flooring_honey_oak.webp'),
    flooring_cream_terrazzo: require('../../../assets/support-room-v3/surfaces/stage1/flooring_cream_terrazzo.webp'),
    flooring_warm_gray_carpet: require('../../../assets/support-room-v3/surfaces/stage1/flooring_warm_gray_carpet.webp'),
    wallpaper_cream_plaster: require('../../../assets/support-room-v3/surfaces/stage1/wallpaper_cream_plaster.webp'),
    wallpaper_sage_linen: require('../../../assets/support-room-v3/surfaces/stage1/wallpaper_sage_linen.webp'),
    wallpaper_apricot_pinstripe: require('../../../assets/support-room-v3/surfaces/stage1/wallpaper_apricot_pinstripe.webp'),
  },
  stage2: {
    flooring_honey_oak: require('../../../assets/support-room-v3/surfaces/stage2/flooring_honey_oak.webp'),
    flooring_cream_terrazzo: require('../../../assets/support-room-v3/surfaces/stage2/flooring_cream_terrazzo.webp'),
    flooring_warm_gray_carpet: require('../../../assets/support-room-v3/surfaces/stage2/flooring_warm_gray_carpet.webp'),
    wallpaper_cream_plaster: require('../../../assets/support-room-v3/surfaces/stage2/wallpaper_cream_plaster.webp'),
    wallpaper_sage_linen: require('../../../assets/support-room-v3/surfaces/stage2/wallpaper_sage_linen.webp'),
    wallpaper_apricot_pinstripe: require('../../../assets/support-room-v3/surfaces/stage2/wallpaper_apricot_pinstripe.webp'),
  },
  stage3: {
    flooring_honey_oak: require('../../../assets/support-room-v3/surfaces/stage3/flooring_honey_oak.webp'),
    flooring_cream_terrazzo: require('../../../assets/support-room-v3/surfaces/stage3/flooring_cream_terrazzo.webp'),
    flooring_warm_gray_carpet: require('../../../assets/support-room-v3/surfaces/stage3/flooring_warm_gray_carpet.webp'),
    wallpaper_cream_plaster: require('../../../assets/support-room-v3/surfaces/stage3/wallpaper_cream_plaster.webp'),
    wallpaper_sage_linen: require('../../../assets/support-room-v3/surfaces/stage3/wallpaper_sage_linen.webp'),
    wallpaper_apricot_pinstripe: require('../../../assets/support-room-v3/surfaces/stage3/wallpaper_apricot_pinstripe.webp'),
  },
  stage4: {
    flooring_honey_oak: require('../../../assets/support-room-v3/surfaces/stage4/flooring_honey_oak.webp'),
    flooring_cream_terrazzo: require('../../../assets/support-room-v3/surfaces/stage4/flooring_cream_terrazzo.webp'),
    flooring_warm_gray_carpet: require('../../../assets/support-room-v3/surfaces/stage4/flooring_warm_gray_carpet.webp'),
    wallpaper_cream_plaster: require('../../../assets/support-room-v3/surfaces/stage4/wallpaper_cream_plaster.webp'),
    wallpaper_sage_linen: require('../../../assets/support-room-v3/surfaces/stage4/wallpaper_sage_linen.webp'),
    wallpaper_apricot_pinstripe: require('../../../assets/support-room-v3/surfaces/stage4/wallpaper_apricot_pinstripe.webp'),
  },
};
