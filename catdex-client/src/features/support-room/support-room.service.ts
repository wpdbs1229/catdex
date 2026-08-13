import { fetchMyCats } from '@/shared/api/cats.api';
import type { PropId } from '@/features/support-room/support-room.assets';
import {
  settleScenes,
  unlockedProps,
  type RoomCat,
  type Scene,
} from '@/features/support-room/support-room.domain';
import { loadRoom, saveRoom, type StoredRoom } from '@/features/support-room/support-room.storage';

export interface RoomSync {
  stored: StoredRoom;
  cats: RoomCat[];
  /** 이번 정산에서 새로 생긴 장면 */
  newScenes: Scene[];
  /** 이번 정산으로 열린 비품 */
  newlyUnlocked: PropId[];
  /** 마지막 정산 이후 흐른 시간(시간 단위). 처음이면 null */
  hoursSinceLastSettle: number | null;
}

/**
 * 방을 지금 시각으로 맞춘다.
 *
 * 홈과 고객지원실이 **같은 경로**를 쓴다. 방에 들어갈 때만 정산하면, 앱을 껐다
 * 한참 뒤에 켜도 홈은 계속 "조용해요"라고 말한다. 정작 들어오게 만들어야 할
 * 새 장면 배지가 방에 들어가야만 생기는 셈이라 재방문 고리가 끊긴다.
 * 기획의 핵심 루프도 '고객지원실 진입 또는 앱 재개'에 정산을 둔다.
 *
 * 화면에 보여 주기 전에 저장한다. 여기서 앱이 죽어도 같은 장면이 두 번 생기거나
 * 사라지지 않는다.
 */
export async function syncRoom(now = Date.now()): Promise<RoomSync> {
  const [loaded, myCats] = await Promise.all([loadRoom(), fetchMyCats()]);
  const cats: RoomCat[] = myCats.map((cat) => ({
    id: cat.id,
    name: cat.name,
    coatColors: cat.coatColors,
    coatPattern: cat.coatPattern,
  }));

  const before = loaded.room;
  const settled = settleScenes({
    state: before,
    cats,
    now,
    pick: (candidates) => candidates[Math.floor(Math.random() * candidates.length)],
    makeSceneId: (scheduledAt, catId, propId) => `${scheduledAt}-${catId}-${propId}`,
  });

  const stored: StoredRoom = { ...loaded, room: settled };

  await saveRoom(stored);

  const knownSceneIds = new Set(before.pendingScenes.map((scene) => scene.id));
  const unlockedBefore = unlockedProps(before.discoveredCombinations.length);
  const unlockedAfter = unlockedProps(settled.discoveredCombinations.length);

  return {
    stored,
    cats,
    newScenes: settled.pendingScenes.filter((scene) => !knownSceneIds.has(scene.id)),
    newlyUnlocked: unlockedAfter.filter((propId) => !unlockedBefore.includes(propId)),
    hoursSinceLastSettle:
      before.nextScheduledAt === null
        ? null
        : Math.max(0, Math.round((now - before.nextScheduledAt) / (60 * 60 * 1000)) + 1),
  };
}
