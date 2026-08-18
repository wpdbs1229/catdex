import { unlockedProps } from '@/features/support-room/support-room.domain';
import { loadRoom as loadV1Room } from '@/features/support-room/support-room.storage';
import type { PropId } from '@/features/support-room/support-room.assets';
import {
  ensureSupportRoomSetup,
  fetchSupportRoomInventory,
  fetchSupportRoomV2,
  fetchWelfarePointBalance,
  migrateSupportRoomV1,
} from '@/shared/api/support-room-v2.api';
import { isSupabaseConfigured } from '@/shared/supabase/client';
import type { FurnitureId } from './domain/furniture';
import { STARTER_LAYOUT } from './domain/fixtures';
import {
  loadStoredRoomV2,
  saveStoredRoomV2,
  type RoomSnapshot,
  type StoredRoomV2,
} from './support-room-v2.storage';

/** V1 고정 슬롯 비품 → V2 카탈로그 가구 */
const V1_PROP_TO_V2: Record<PropId, FurnitureId> = {
  prop_visitor_cushion: 'visitor_cushion_orange',
  prop_service_bell: 'service_bell_brass',
  prop_swivel_chair: 'swivel_chair_lavender',
  prop_paw_stamp_pad: 'paw_stamp_pad_orange',
  prop_paper_basket: 'paper_basket_cream',
  prop_document_box: 'document_box_olive',
};

export interface SyncRoomV2Result {
  stored: StoredRoomV2;
  inventory: Map<string, number>;
  balance: number;
  /** 서버에 닿지 못해 캐시로 그리는 중인지 */
  offline: boolean;
}

/**
 * 서버 정본을 불러와 스냅숏 캐시를 갱신한다. draft는 건드리지 않는다.
 * V1 데이터가 아직 이전되지 않았으면 멱등 이전을 먼저 시도한다.
 * V1 AsyncStorage는 읽기만 하고 절대 지우지 않는다(롤백 경로 유지).
 */
export async function syncRoomV2(): Promise<SyncRoomV2Result> {
  const stored = await loadStoredRoomV2();

  if (!isSupabaseConfigured) {
    return { stored, inventory: new Map(), balance: 0, offline: true };
  }

  try {
    await ensureSupportRoomSetup();

    if (!stored.v1MigrationDone) {
      const v1 = await loadV1Room();
      const unlocked = new Set<FurnitureId>();
      for (const propId of Object.values(v1.room.installedProps)) {
        unlocked.add(V1_PROP_TO_V2[propId]);
      }
      for (const propId of unlockedProps(v1.room.discoveredCombinations.length)) {
        unlocked.add(V1_PROP_TO_V2[propId]);
      }
      await migrateSupportRoomV1([...unlocked], STARTER_LAYOUT);
      // 서버가 성공을 확인한 뒤에만 완료로 기록한다.
      stored.v1MigrationDone = true;
    }

    const [server, inventory, balance] = await Promise.all([
      fetchSupportRoomV2(),
      fetchSupportRoomInventory(),
      fetchWelfarePointBalance(),
    ]);

    if (server) {
      const snapshot: RoomSnapshot = {
        layoutVersion: server.layoutVersion,
        placements: server.placements,
        wallSurfaceId: server.wallSurfaceId,
        floorSurfaceId: server.floorSurfaceId,
      };
      stored.snapshot = snapshot;
    }

    await saveStoredRoomV2(stored);
    return { stored, inventory, balance, offline: false };
  } catch (error) {
    console.warn('[support-room-v2] sync failed, using cache', error);
    return { stored, inventory: new Map(), balance: 0, offline: true };
  }
}
