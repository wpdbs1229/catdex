import type { CharacterAssetKey } from '@/features/support-room/support-room.assets';

type ImageSource = ReturnType<typeof require>;

/**
 * 걷는 포즈 그림. 문에서 자리까지 걸어오는 손님과 바닥을 도는 손님이 쓴다.
 *
 * 캐릭터마다 중간 걸음 한 장이다(512x512, 발밑선 y=470으로 idle과 같음,
 * 화면 오른쪽 향 3/4 시점). 걸음 흔들림과 좌우 반전은 코드가 얹는다 -
 * 왼쪽으로 갈 때는 scaleX: -1.
 *
 * 여러 장이 생기면 배열에 이어 넣으면 된다. 그리는 쪽이 프레임 수를 보고
 * 번갈아 보여준다.
 *
 * Metro는 require의 인자를 정적으로 읽으므로 문자열 조립이 아니라 전부 적는다.
 */
export const CAT_WALK_FRAMES: Partial<Record<CharacterAssetKey, readonly ImageSource[]>> = {
  bicolor_cow: [require('../../../assets/support-room/cats/actions/bicolor_cow/walk.webp')],
  bicolor_spotted: [require('../../../assets/support-room/cats/actions/bicolor_spotted/walk.webp')],
  bicolor_tuxedo: [require('../../../assets/support-room/cats/actions/bicolor_tuxedo/walk.webp')],
  fallback_cream: [require('../../../assets/support-room/cats/actions/fallback_cream/walk.webp')],
  point_reserved: [require('../../../assets/support-room/cats/actions/point_reserved/walk.webp')],
  solid_black: [require('../../../assets/support-room/cats/actions/solid_black/walk.webp')],
  solid_brown: [require('../../../assets/support-room/cats/actions/solid_brown/walk.webp')],
  solid_cream: [require('../../../assets/support-room/cats/actions/solid_cream/walk.webp')],
  solid_gray: [require('../../../assets/support-room/cats/actions/solid_gray/walk.webp')],
  solid_orange: [require('../../../assets/support-room/cats/actions/solid_orange/walk.webp')],
  solid_white: [require('../../../assets/support-room/cats/actions/solid_white/walk.webp')],
  tabby_brown: [require('../../../assets/support-room/cats/actions/tabby_brown/walk.webp')],
  tabby_gray: [require('../../../assets/support-room/cats/actions/tabby_gray/walk.webp')],
  tabby_orange: [require('../../../assets/support-room/cats/actions/tabby_orange/walk.webp')],
  tortie_calico: [require('../../../assets/support-room/cats/actions/tortie_calico/walk.webp')],
  tortie_dark: [require('../../../assets/support-room/cats/actions/tortie_dark/walk.webp')],
};

/** 걷는 그림이 있으면 프레임들을, 없으면 null. */
export function walkFrames(key: CharacterAssetKey): readonly ImageSource[] | null {
  const frames = CAT_WALK_FRAMES[key];
  return frames && frames.length > 0 ? frames : null;
}
