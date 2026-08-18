import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserId } from '@/shared/api/auth.api';
import type { SurfaceId } from './domain/furniture';
import type { Placement } from './domain/placement';
import { validatePlacement } from './domain/placement';
import { STARTER_LAYOUT, specLookup } from './domain/fixtures';
import { SURFACE_CATALOG } from './domain/catalog.generated';

/**
 * V2 프로토타입 전용 로컬 개발 fixture 저장.
 * 서버 정본 연결(프롬프트 4) 전까지의 임시 저장소이며 V1 키는 절대 읽지 않는다.
 */
const STORAGE_PREFIX = 'catdex.supportRoomV2.dev';
const SCHEMA_VERSION = 1;

export interface StoredRoomV2 {
  schemaVersion: number;
  placements: Placement[];
  wallSurfaceId: SurfaceId;
  floorSurfaceId: SurfaceId;
}

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}.v${SCHEMA_VERSION}:${userId}`;
}

export function createInitialStoredRoomV2(): StoredRoomV2 {
  return {
    schemaVersion: SCHEMA_VERSION,
    placements: [...STARTER_LAYOUT],
    wallSurfaceId: 'wallpaper_cream_plaster',
    floorSurfaceId: 'flooring_honey_oak',
  };
}

function isSurfaceId(value: unknown): value is SurfaceId {
  return SURFACE_CATALOG.some((s) => s.id === value);
}

/** 저장값을 믿지 않는다. 모양이 어긋난 placement는 버리고 나머지만 살린다. */
function reviveStoredRoomV2(raw: unknown): StoredRoomV2 {
  const fallback = createInitialStoredRoomV2();
  if (!raw || typeof raw !== 'object') return fallback;
  const value = raw as Partial<StoredRoomV2>;
  if (value.schemaVersion !== SCHEMA_VERSION) return fallback;

  const placements: Placement[] = [];
  if (Array.isArray(value.placements)) {
    for (const item of value.placements) {
      if (!item || typeof item !== 'object') continue;
      const p = item as Placement;
      if (typeof p.placementId !== 'string' || typeof p.furnitureId !== 'string') continue;
      const candidate: Placement = {
        placementId: p.placementId,
        furnitureId: p.furnitureId,
        surface: p.surface === 'wall' ? 'wall' : 'floor',
        gridX: typeof p.gridX === 'number' ? p.gridX : NaN,
        gridY: typeof p.gridY === 'number' ? p.gridY : NaN,
        flipX: p.flipX === true,
      };
      if (validatePlacement(candidate, placements, specLookup).length === 0) {
        placements.push(candidate);
      }
    }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    placements,
    wallSurfaceId: isSurfaceId(value.wallSurfaceId) ? value.wallSurfaceId : fallback.wallSurfaceId,
    floorSurfaceId: isSurfaceId(value.floorSurfaceId)
      ? value.floorSurfaceId
      : fallback.floorSurfaceId,
  };
}

/** 로그아웃 상태면 초기 방을 돌려주고 저장하지 않는다. */
export async function loadRoomV2(): Promise<StoredRoomV2> {
  const userId = await getCurrentUserId();
  if (!userId) return createInitialStoredRoomV2();
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    return raw ? reviveStoredRoomV2(JSON.parse(raw)) : createInitialStoredRoomV2();
  } catch (error) {
    console.warn('[support-room-v2] load failed, starting fresh', error);
    return createInitialStoredRoomV2();
  }
}

export async function saveRoomV2(stored: StoredRoomV2): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  try {
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(stored));
  } catch (error) {
    console.warn('[support-room-v2] save failed', error);
  }
}
