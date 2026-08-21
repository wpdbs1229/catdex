import type { CharacterAssetKey } from '@/features/support-room/support-room.assets';

type ImageSource = ReturnType<typeof require>;

/**
 * 걷는 포즈 그림. 문에서 자리까지 걸어오는 손님이 쓴다.
 *
 * 아직 아트가 없어서 비어 있다. 비어 있으면 ArrivingCat이 idle 한 장에
 * 걸음 흔들림만 얹어 대신 쓴다 - 아트가 들어오는 순간 아래 표만 채우면
 * 코드는 그대로 두고 걷는 그림으로 바뀐다.
 *
 * 아트 규격(기존 idle.webp와 같아야 앵커·크기 계산이 그대로 맞는다):
 *   - 512x512 WebP, 배경 투명
 *   - 내용은 캔버스 가운데, 발끝이 y≈471(=0.92)에 닿게. idle.webp와 같은
 *     발밑선이어야 걷다가 앉을 때 튀지 않는다.
 *   - 아이소 3/4 측면, 화면 오른쪽 아래를 향해 걷는 자세 한 방향만.
 *     왼쪽으로 갈 때는 코드가 좌우 반전해서 쓴다.
 *   - 두 장(walk_a = 왼발 앞, walk_b = 오른발 앞)이면 걸음이 살아난다.
 *     한 장만 와도 동작한다.
 *   - 경로: assets/support-room/cats/actions/<캐릭터>/walk_a.webp
 *
 * 캐릭터 16종: bicolor_cow, bicolor_spotted, bicolor_tuxedo, fallback_cream,
 * point_reserved, solid_black, solid_brown, solid_cream, solid_gray,
 * solid_orange, solid_white, tabby_brown, tabby_gray, tabby_orange,
 * tortie_calico, tortie_dark
 *
 * Metro는 require의 인자를 정적으로 읽으므로 문자열 조립이 아니라 전부 적는다.
 */
export const CAT_WALK_FRAMES: Partial<Record<CharacterAssetKey, readonly ImageSource[]>> = {};

/** 걷는 그림이 있으면 프레임들을, 없으면 null. */
export function walkFrames(key: CharacterAssetKey): readonly ImageSource[] | null {
  const frames = CAT_WALK_FRAMES[key];
  return frames && frames.length > 0 ? frames : null;
}
