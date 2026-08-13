import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserId } from '@/shared/api/auth.api';
import {
  createInitialRoomState,
  MAX_PENDING_SCENES,
  STARTER_PROPS,
  type RoomState,
  type Scene,
  type ZoneId,
} from '@/features/support-room/support-room.domain';
import type { PropId } from '@/features/support-room/support-room.assets';

const STORAGE_PREFIX = 'catdex.supportRoom';
const SCHEMA_VERSION = 1;

/** 화면이 기억하는 마지막 자리. 다시 들어왔을 때 보던 곳에서 시작한다. */
export interface ViewState {
  lastZoneId: ZoneId;
  lastOffset: number;
}

export interface StoredRoom {
  schemaVersion: number;
  room: RoomState;
  view: ViewState;
  /** 가로 탐색 안내를 한 번 봤는지 */
  tutorialSeen: boolean;
}

/**
 * 사용자별 키.
 *
 * 한 기기에서 계정을 바꿔도 앞사람 방이 보이면 안 된다. 로그아웃 상태에서는
 * 저장하지 않는다 - 익명 방을 만들어 두면 로그인한 뒤 어느 쪽이 진짜인지
 * 정할 방법이 없다.
 */
function storageKey(userId: string) {
  return `${STORAGE_PREFIX}.v${SCHEMA_VERSION}:${userId}`;
}

export function createInitialStoredRoom(): StoredRoom {
  return {
    schemaVersion: SCHEMA_VERSION,
    room: createInitialRoomState(),
    view: { lastZoneId: 'work', lastOffset: 0 },
    tutorialSeen: false,
  };
}

function isZoneId(value: unknown): value is ZoneId {
  return value === 'reception' || value === 'work' || value === 'records';
}

function isPropId(value: unknown): value is PropId {
  return (
    value === 'prop_visitor_cushion' ||
    value === 'prop_service_bell' ||
    value === 'prop_swivel_chair' ||
    value === 'prop_paw_stamp_pad' ||
    value === 'prop_paper_basket' ||
    value === 'prop_document_box'
  );
}

/**
 * 저장된 값을 믿지 않고 하나씩 확인한다.
 *
 * 앱을 강제 종료하다 반쯤 쓰인 JSON, 옛 버전이 남긴 모양, 손으로 고친 값이
 * 들어올 수 있다. 어느 경우든 화면이 죽는 것보다 새 방으로 시작하는 편이 낫다.
 */
function reviveStoredRoom(raw: unknown): StoredRoom {
  const fallback = createInitialStoredRoom();

  if (!raw || typeof raw !== 'object') {
    return fallback;
  }

  const value = raw as Partial<StoredRoom>;

  if (value.schemaVersion !== SCHEMA_VERSION) {
    return fallback;
  }

  const room = value.room as Partial<RoomState> | undefined;

  if (!room) {
    return fallback;
  }

  const installedProps = { ...STARTER_PROPS };

  for (const zoneId of Object.keys(installedProps) as ZoneId[]) {
    const stored = room.installedProps?.[zoneId];

    if (isPropId(stored)) {
      installedProps[zoneId] = stored;
    }
  }

  const pendingScenes = Array.isArray(room.pendingScenes)
    ? (room.pendingScenes.filter(
        (scene) =>
          scene &&
          typeof scene === 'object' &&
          typeof (scene as Scene).id === 'string' &&
          typeof (scene as Scene).catId === 'string' &&
          isPropId((scene as Scene).propId),
      ) as Scene[]).slice(0, MAX_PENDING_SCENES)
    : [];

  const discovered = Array.isArray(room.discoveredCombinations)
    ? room.discoveredCombinations.filter((key): key is string => typeof key === 'string')
    : [];

  return {
    schemaVersion: SCHEMA_VERSION,
    room: {
      installedProps,
      pendingScenes,
      discoveredCombinations: [...new Set(discovered)],
      nextScheduledAt: typeof room.nextScheduledAt === 'number' ? room.nextScheduledAt : null,
    },
    view: {
      lastZoneId: isZoneId(value.view?.lastZoneId) ? value.view.lastZoneId : 'work',
      lastOffset: typeof value.view?.lastOffset === 'number' ? value.view.lastOffset : 0,
    },
    tutorialSeen: value.tutorialSeen === true,
  };
}

/** 로그아웃 상태면 새 방을 돌려주고 저장하지 않는다. */
export async function loadRoom(): Promise<StoredRoom> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return createInitialStoredRoom();
  }

  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));

    return raw ? reviveStoredRoom(JSON.parse(raw)) : createInitialStoredRoom();
  } catch (error) {
    console.warn('[support-room] load failed, starting fresh', error);

    return createInitialStoredRoom();
  }
}

export async function saveRoom(stored: StoredRoom): Promise<void> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return;
  }

  try {
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(stored));
  } catch (error) {
    // 저장이 실패해도 화면은 그대로 둔다. 다음 저장에서 따라잡는다.
    console.warn('[support-room] save failed', error);
  }
}
