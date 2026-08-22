import { describe, expect, it } from 'vitest';
import { CAT_ACTION_IMAGES } from '@/features/support-room/support-room.assets';
import type { CharacterAssetKey } from '@/features/support-room/support-room.assets';
import { walkFrames } from '../support-room-v3.cat-walk';

describe('걷는 포즈 그림', () => {
  it('idle이 있는 캐릭터는 모두 걷는 그림도 있다', () => {
    const keys = Object.keys(CAT_ACTION_IMAGES) as CharacterAssetKey[];
    expect(keys.length).toBeGreaterThan(0);
    const missing = keys.filter((key) => walkFrames(key) === null);
    expect(missing).toEqual([]);
  });
});
