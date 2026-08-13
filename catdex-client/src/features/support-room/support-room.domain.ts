import type { CoatColorId, CoatPatternId } from '@/shared/coat/coat.types';
import { selectCharacter, type CharacterMatchRuleId } from '@/features/support-room/character-matcher';
import type {
  BehaviorId,
  CharacterAssetKey,
  PropId,
} from '@/features/support-room/support-room.assets';

/** 방을 가로로 나눈 세 구역. 슬롯도 구역당 하나씩이다. */
export type ZoneId = 'reception' | 'work' | 'records';

/** 한 장면이 생기는 간격 */
export const SCENE_INTERVAL_MS = 60 * 60 * 1000;
/** 확인하지 않은 장면이 이만큼 쌓이면 시간이 더 쌓이지 않는다 */
export const MAX_PENDING_SCENES = 3;

/** 비품 하나에 행동 하나. P0에서는 고정이다. */
export const BEHAVIOR_BY_PROP: Record<PropId, BehaviorId> = {
  prop_visitor_cushion: 'use_cushion',
  prop_service_bell: 'press_bell',
  prop_swivel_chair: 'sit_swivel_chair',
  prop_paw_stamp_pad: 'stamp_paw',
  prop_paper_basket: 'hide_paper_basket',
  prop_document_box: 'peek_document_box',
};

interface ZoneDefinition {
  id: ZoneId;
  /** 처음부터 놓여 있는 비품 */
  starter: PropId;
  /** 최초 기록이 threshold개가 되면 열리는 비품 */
  unlockable: PropId;
  unlockAt: number;
}

/**
 * 구역·슬롯 정의.
 *
 * 슬롯은 구역당 하나이고 후보는 둘뿐이다. 끌어 옮기거나 구역을 넘나들 수 없다 -
 * 자유 배치를 넣으면 빈 바닥을 넓게 두자는 공간 원칙이 무너진다.
 */
export const ZONES: readonly ZoneDefinition[] = [
  { id: 'reception', starter: 'prop_visitor_cushion', unlockable: 'prop_service_bell', unlockAt: 2 },
  { id: 'work', starter: 'prop_swivel_chair', unlockable: 'prop_paw_stamp_pad', unlockAt: 4 },
  { id: 'records', starter: 'prop_paper_basket', unlockable: 'prop_document_box', unlockAt: 6 },
];

export const STARTER_PROPS: Record<ZoneId, PropId> = {
  reception: 'prop_visitor_cushion',
  work: 'prop_swivel_chair',
  records: 'prop_paper_basket',
};

/** 도메인이 아는 고객의 최소 모양. fetchMyCats() 결과가 그대로 들어온다. */
export interface RoomCat {
  id: string;
  name: string;
  coatColors: CoatColorId[];
  coatPattern: CoatPatternId | null;
}

/**
 * 방에 나타난 한 장면.
 *
 * 고양이 이름·털색·고른 그림을 그때 값으로 복사해 둔다. 나중에 그 고양이를
 * 지우거나 털색을 고쳐도 지난 기록이 다른 고양이로 바뀌면 안 된다.
 */
export interface Scene {
  id: string;
  scheduledAt: number;
  catId: string;
  catNameSnapshot: string;
  coatColorsSnapshot: CoatColorId[];
  coatPatternSnapshot: CoatPatternId | null;
  characterAssetKeySnapshot: CharacterAssetKey;
  characterMatchRuleIdSnapshot: CharacterMatchRuleId;
  propId: PropId;
  behaviorId: BehaviorId;
  zoneId: ZoneId;
  /** catId:propId. 이 조합을 처음 봤는지 판단하는 열쇠다 */
  combinationKey: string;
  isFirstSeen: boolean;
}

/**
 * 영구 상담기록.
 *
 * 처음 본 catId:propId 조합만 남는다. 같은 조합을 다시 봐도 방에는 나타나지만
 * 기록은 늘지 않는다 - 늘어나면 목록이 같은 이야기로 채워져 새 기록을 찾는
 * 재미가 사라진다.
 */
export interface ConsultationRecord {
  id: string;
  scheduledAt: number;
  catId: string;
  catNameSnapshot: string;
  coatColorsSnapshot: CoatColorId[];
  coatPatternSnapshot: CoatPatternId | null;
  characterAssetKeySnapshot: CharacterAssetKey;
  characterMatchRuleIdSnapshot: CharacterMatchRuleId;
  propId: PropId;
  behaviorId: BehaviorId;
  combinationKey: string;
  status: 'unread' | 'read';
}

export interface RoomState {
  installedProps: Record<ZoneId, PropId>;
  /** 아직 확인하지 않은 장면 */
  pendingScenes: Scene[];
  /** 지금까지 처음 본 catId:propId 조합. 해금 진행도가 이 수를 본다 */
  discoveredCombinations: string[];
  /** 영구 상담기록. 최신이 뒤에 붙는다 */
  records: ConsultationRecord[];
  /** 다음 장면이 생길 시각. 아직 한 번도 정산하지 않았으면 null */
  nextScheduledAt: number | null;
}

export function combinationKeyOf(catId: string, propId: PropId): string {
  return `${catId}:${propId}`;
}

export function zoneOfProp(propId: PropId): ZoneId {
  const zone = ZONES.find((item) => item.starter === propId || item.unlockable === propId);

  if (!zone) {
    throw new Error(`구역을 알 수 없는 비품: ${propId}`);
  }

  return zone.id;
}

/** 최초 기록 수로 열린 비품을 판단한다. 저장하지 않고 셀 때마다 만든다. */
export function unlockedProps(discoveredCount: number): PropId[] {
  return ZONES.filter((zone) => discoveredCount >= zone.unlockAt).map((zone) => zone.unlockable);
}

export function createInitialRoomState(): RoomState {
  return {
    installedProps: { ...STARTER_PROPS },
    pendingScenes: [],
    discoveredCombinations: [],
    records: [],
    nextScheduledAt: null,
  };
}

/** 후보 중 하나를 고르는 함수. 도메인이 난수를 직접 부르지 않도록 주입받는다. */
export type PickOne = <T>(candidates: readonly T[]) => T;

interface SettleInput {
  state: RoomState;
  cats: readonly RoomCat[];
  now: number;
  pick: PickOne;
  /** 장면 id를 만드는 함수. 중복 생성을 막는 열쇠라 밖에서 넣는다 */
  makeSceneId: (scheduledAt: number, catId: string, propId: PropId) => string;
}

/**
 * 비운 시간만큼 장면을 만든다.
 *
 * 순수 함수다. 시각도 난수도 밖에서 받는다 - 그래야 "60분 경계에서 정확히 한 건"
 * 같은 걸 시계를 건드리지 않고 확인할 수 있다.
 */
export function settleScenes({ state, cats, now, pick, makeSceneId }: SettleInput): RoomState {
  // 수집한 고객이 없으면 아무 일도 없다. 가상의 고양이를 만들지 않는다.
  if (cats.length === 0) {
    return state;
  }

  const installed = Object.values(state.installedProps);
  const discovered = new Set(state.discoveredCombinations);
  const pending = [...state.pendingScenes];
  const records = [...state.records];
  // 한 번에 여러 건을 정산해도 같은 고양이가 두 번 나오지 않게 한다.
  const usedCatIds = new Set(pending.map((scene) => scene.catId));
  // 구역당 한 마리다. 슬롯이 하나뿐이라 두 마리가 같은 비품을 쓸 수 없다.
  const usedZones = new Set(pending.map((scene) => scene.zoneId));

  const createSceneAt = (scheduledAt: number) => {
    const combos: Array<{ cat: RoomCat; propId: PropId }> = [];

    for (const cat of cats) {
      if (usedCatIds.has(cat.id)) {
        continue;
      }

      for (const propId of installed) {
        if (usedZones.has(zoneOfProp(propId))) {
          continue;
        }

        combos.push({ cat, propId });
      }
    }

    if (combos.length === 0) {
      return null;
    }

    // 아직 못 본 조합을 먼저 보여 준다. 새 기록이 생겨야 다시 열어 볼 이유가 된다.
    const fresh = combos.filter((combo) => !discovered.has(combinationKeyOf(combo.cat.id, combo.propId)));
    const chosen = pick(fresh.length > 0 ? fresh : combos);
    const character = selectCharacter(chosen.cat.coatColors, chosen.cat.coatPattern, chosen.cat.id);
    const combinationKey = combinationKeyOf(chosen.cat.id, chosen.propId);

    usedCatIds.add(chosen.cat.id);
    usedZones.add(zoneOfProp(chosen.propId));

    const isFirstSeen = !discovered.has(combinationKey);

    // 조합을 본 순간 발견으로 친다. 시트를 열어야 발견되는 것으로 두면, 시트를
    // 열지 않는 동안 같은 조합이 몇 번이고 '처음'으로 잡혀 기록이 겹친다.
    if (isFirstSeen) {
      discovered.add(combinationKey);
    }

    const scene = {
      id: makeSceneId(scheduledAt, chosen.cat.id, chosen.propId),
      scheduledAt,
      catId: chosen.cat.id,
      catNameSnapshot: chosen.cat.name,
      coatColorsSnapshot: [...chosen.cat.coatColors],
      coatPatternSnapshot: chosen.cat.coatPattern,
      characterAssetKeySnapshot: character.key,
      characterMatchRuleIdSnapshot: character.ruleId,
      propId: chosen.propId,
      behaviorId: BEHAVIOR_BY_PROP[chosen.propId],
      zoneId: zoneOfProp(chosen.propId),
      combinationKey,
      isFirstSeen,
    } satisfies Scene;

    if (isFirstSeen) {
      records.push({
        id: scene.id,
        scheduledAt: scene.scheduledAt,
        catId: scene.catId,
        catNameSnapshot: scene.catNameSnapshot,
        coatColorsSnapshot: scene.coatColorsSnapshot,
        coatPatternSnapshot: scene.coatPatternSnapshot,
        characterAssetKeySnapshot: scene.characterAssetKeySnapshot,
        characterMatchRuleIdSnapshot: scene.characterMatchRuleIdSnapshot,
        propId: scene.propId,
        behaviorId: scene.behaviorId,
        combinationKey,
        status: 'unread',
      });
    }

    return scene;
  };

  // 처음 들어온 사람에게는 기다리지 않고 한 건을 보여 준다.
  if (state.nextScheduledAt === null) {
    const scene = createSceneAt(now);

    return {
      ...state,
      pendingScenes: scene ? [...pending, scene] : pending,
      discoveredCombinations: [...discovered],
      records,
      nextScheduledAt: now + SCENE_INTERVAL_MS,
    };
  }

  let next = state.nextScheduledAt;

  while (now >= next && pending.length < MAX_PENDING_SCENES) {
    const scene = createSceneAt(next);

    if (!scene) {
      break;
    }

    pending.push(scene);
    next += SCENE_INTERVAL_MS;
  }

  // 가득 찬 동안에는 시간이 쌓이지 않는다. 며칠을 비워 둬도 밀린 장면이
  // 한꺼번에 쏟아지지 않게 하려는 것이다.
  if (pending.length >= MAX_PENDING_SCENES && now >= next) {
    next = now + SCENE_INTERVAL_MS;
  }

  return {
    ...state,
    pendingScenes: pending,
    discoveredCombinations: [...discovered],
    records,
    nextScheduledAt: next,
  };
}

/**
 * 확인한 장면을 기록으로 넘긴다.
 *
 * 처음 본 조합만 발견 목록에 더한다. 같은 조합을 다시 봐도 방에는 보이지만
 * 해금 진행도는 오르지 않는다.
 */
/**
 * 상담기록을 열었을 때.
 *
 * 방을 비우고 새 기록을 읽음으로 바꾼다. 기록 자체는 지우지 않는다 - 읽었다고
 * 사라지면 다시 볼 수가 없다.
 */
export function acknowledgeScenes(state: RoomState): RoomState {
  return {
    ...state,
    pendingScenes: [],
    records: state.records.map((record) =>
      record.status === 'unread' ? { ...record, status: 'read' as const } : record,
    ),
  };
}

/** 아직 읽지 않은 기록 수. 클립보드 배지가 보는 값이다. */
export function unreadCount(state: RoomState): number {
  return state.records.filter((record) => record.status === 'unread').length;
}

/** 슬롯의 비품을 바꾼다. 잠긴 비품과 다른 구역의 비품은 받지 않는다. */
export function installProp(state: RoomState, zoneId: ZoneId, propId: PropId): RoomState {
  const zone = ZONES.find((item) => item.id === zoneId);

  if (!zone || (propId !== zone.starter && propId !== zone.unlockable)) {
    return state;
  }

  if (propId === zone.unlockable && state.discoveredCombinations.length < zone.unlockAt) {
    return state;
  }

  return {
    ...state,
    installedProps: { ...state.installedProps, [zoneId]: propId },
    // 바꾼 구역에 서 있던 고양이는 내린다. 새 비품과 짝이 맞지 않는 그림이
    // 남기 때문이다. 이미 남긴 기록은 건드리지 않는다.
    pendingScenes: state.pendingScenes.filter((scene) => scene.zoneId !== zoneId),
  };
}
