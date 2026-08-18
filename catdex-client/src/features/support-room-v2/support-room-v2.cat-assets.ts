import { CAT_ACTION_IMAGES } from '@/features/support-room/support-room.assets';
import type { BehaviorId } from './domain/furniture';
import { V2_NEW_CAT_ACTION_IMAGES } from './support-room-v2.assets.generated';

type ImageSource = ReturnType<typeof require>;

/**
 * 캐릭터 × 행동 이미지 선택.
 * 기존 7행동(idle 포함)은 V1 맵 재사용, 신규 2행동은 V2 생성 맵.
 * 어떤 실패든 중립 캐릭터 idle로 물러선다(화면이 비지 않게).
 */
export function catActionImage(
  characterAssetKey: string,
  behaviorId: BehaviorId | 'idle',
): ImageSource {
  if (behaviorId === 'watch_window' || behaviorId === 'drink_water') {
    return (
      V2_NEW_CAT_ACTION_IMAGES[characterAssetKey]?.[behaviorId] ??
      CAT_ACTION_IMAGES.fallback_cream.idle
    );
  }
  const forCharacter =
    CAT_ACTION_IMAGES[characterAssetKey as keyof typeof CAT_ACTION_IMAGES] ??
    CAT_ACTION_IMAGES.fallback_cream;
  return forCharacter[behaviorId] ?? CAT_ACTION_IMAGES.fallback_cream.idle;
}
