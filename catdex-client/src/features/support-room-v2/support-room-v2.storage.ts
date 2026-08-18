import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserId } from '@/shared/api/auth.api';
import type { SurfaceId } from './domain/furniture';
import type { Placement } from './domain/placement';
import { validatePlacement } from './domain/placement';
import { specLookup } from './domain/fixtures';
import { SURFACE_CATALOG } from './domain/catalog.generated';

/**
 * V2 로컬 저장: 서버 스냅숏 캐시 + 저장 전 draft.
 * 서버가 정본이고, 여기는 오프라인 표시·충돌 복구·재시도를 위한 로컬 사본이다.
 * V1 키(catdex.supportRoom.*)는 절대 읽거나 지우지 않는다(롤백용 보존).
 *
 * schemaVersion 2: 개발 fixture 단일 상태 → snapshot/draft 분리.
 */
const STORAGE_PREFIX = 'catdex.supportRoomV2';
const SCHEMA_VERSION = 2;

export interface RoomLayoutState {
  placements: Placement[];
  wallSurfaceId: SurfaceId;
  floorSurfaceId: SurfaceId;
}

export interface RoomSnapshot extends RoomLayoutState {
  layoutVersion: number;
}

export interface RoomDraft extends RoomLayoutState {
  /** 편집을 시작한 시점의 서버 layoutVersion. 저장 시 expectedVersion으로 보낸다. */
  baseVersion: number;
}

export interface StoredRoomV2 {
  schemaVersion: number;
  /** 마지막으로 본 서버 정본. 오프라인일 때 이걸 그린다. */
  snapshot: RoomSnapshot | null;
  /** 저장하지 못한 편집안. 저장 성공 시 지운다. */
  draft: RoomDraft | null;
  /** V1 이전이 서버에서 성공 확인된 뒤에만 true로 바꾼다. */
  v1MigrationDone: boolean;
  /** 이 시각 이후의 기록이 "새 기록" 배지 대상이다. */
  lastReadEventAt: number;
  /** 미접속 정산을 마친 시각. 0이면 아직 한 번도 방을 열지 않음. */
  lastSettledAt: number;
}

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}.v${SCHEMA_VERSION}:${userId}`;
}

export function createInitialStoredRoomV2(): StoredRoomV2 {
  return {
    schemaVersion: SCHEMA_VERSION,
    snapshot: null,
    draft: null,
    v1MigrationDone: false,
    lastReadEventAt: 0,
    lastSettledAt: 0,
  };
}

function isSurfaceId(value: unknown): value is SurfaceId {
  return SURFACE_CATALOG.some((s) => s.id === value);
}

function revivePlacements(raw: unknown): Placement[] {
  const placements: Placement[] = [];
  if (!Array.isArray(raw)) return placements;
  for (const item of raw) {
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
  return placements;
}

function reviveLayoutState(raw: unknown): RoomLayoutState | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<RoomLayoutState>;
  if (!isSurfaceId(value.wallSurfaceId) || !isSurfaceId(value.floorSurfaceId)) return null;
  return {
    placements: revivePlacements(value.placements),
    wallSurfaceId: value.wallSurfaceId,
    floorSurfaceId: value.floorSurfaceId,
  };
}

export function reviveStoredRoomV2(raw: unknown): StoredRoomV2 {
  const fallback = createInitialStoredRoomV2();
  if (!raw || typeof raw !== 'object') return fallback;
  const value = raw as Partial<StoredRoomV2>;
  if (value.schemaVersion !== SCHEMA_VERSION) return fallback;

  let snapshot: RoomSnapshot | null = null;
  const rawSnapshot = value.snapshot as Partial<RoomSnapshot> | null | undefined;
  const snapshotLayout = reviveLayoutState(rawSnapshot);
  if (snapshotLayout && typeof rawSnapshot?.layoutVersion === 'number' && rawSnapshot.layoutVersion >= 0) {
    snapshot = { ...snapshotLayout, layoutVersion: rawSnapshot.layoutVersion };
  }

  let draft: RoomDraft | null = null;
  const rawDraft = value.draft as Partial<RoomDraft> | null | undefined;
  const draftLayout = reviveLayoutState(rawDraft);
  if (draftLayout && typeof rawDraft?.baseVersion === 'number' && rawDraft.baseVersion >= 0) {
    draft = { ...draftLayout, baseVersion: rawDraft.baseVersion };
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    snapshot,
    draft,
    v1MigrationDone: value.v1MigrationDone === true,
    lastReadEventAt: typeof value.lastReadEventAt === 'number' ? value.lastReadEventAt : 0,
    lastSettledAt: typeof value.lastSettledAt === 'number' ? value.lastSettledAt : 0,
  };
}

/** 로그아웃 상태면 초기 상태를 돌려주고 저장하지 않는다. */
export async function loadStoredRoomV2(): Promise<StoredRoomV2> {
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

export async function saveStoredRoomV2(stored: StoredRoomV2): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  try {
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(stored));
  } catch (error) {
    console.warn('[support-room-v2] save failed', error);
  }
}
