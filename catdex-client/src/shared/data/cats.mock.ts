import type {
  Cat,
  CatEncounter,
  CatFilter,
  CatType,
  DexPlaceholder,
  PersonalityTag,
} from '@/shared/types/cat';

export const coatOptions: CatType[] = ['치즈냥', '삼색이', '턱시도', '검은냥', '흰냥'];

export const personalityOptions: PersonalityTag[] = ['애교많음', '겁많음', '느긋함', '활발함'];

export const catFilters: CatFilter[] = ['전체', '치즈냥', '삼색이', '턱시도', '희귀'];

export const baseCollectedCount = 17;
export const baseRediscoveryCount = 11;
export const totalDexCount = 100;

export const catsMock: Cat[] = [
  {
    id: 'gamja',
    number: 1,
    name: '감자',
    type: '치즈냥',
    rarity: 3,
    encounterCount: 4,
    firstSeenAt: '2026.04.25',
    lastSeenAt: '2026.05.03',
    relationshipLevel: '동네 친구',
    tags: ['애교많음', '느긋함', '벤치 단골'],
    memo: '간식 봉투 소리에 귀를 쫑긋 세우고 천천히 다가온다.',
  },
  {
    id: 'nabi',
    number: 2,
    name: '나비',
    type: '삼색이',
    rarity: 4,
    encounterCount: 2,
    firstSeenAt: '2026.04.18',
    lastSeenAt: '2026.04.30',
    relationshipLevel: '살짝 경계 중',
    tags: ['겁많음', '활발함', '담장 점프'],
    memo: '사람 발소리가 가까워지면 담장 위로 재빨리 올라간다.',
  },
  {
    id: 'huchu',
    number: 3,
    name: '후추',
    type: '턱시도',
    rarity: 2,
    encounterCount: 7,
    firstSeenAt: '2026.03.12',
    lastSeenAt: '2026.05.04',
    relationshipLevel: '골목 대장',
    tags: ['활발함', '애교많음', '야간 순찰'],
    memo: '밤이 되면 같은 골목을 크게 한 바퀴 돌고 다시 돌아온다.',
  },
  {
    id: 'moka',
    number: 4,
    name: '모카',
    type: '검은냥',
    rarity: 5,
    encounterCount: 1,
    firstSeenAt: '2026.04.21',
    lastSeenAt: '2026.04.21',
    relationshipLevel: '미스터리 손님',
    tags: ['겁많음', '느긋함', '심야 출몰'],
    memo: '어두운 시간대에만 보여서 실루엣이 먼저 눈에 띈다.',
  },
  {
    id: 'gureum',
    number: 5,
    name: '구름',
    type: '흰냥',
    rarity: 3,
    encounterCount: 3,
    firstSeenAt: '2026.04.02',
    lastSeenAt: '2026.05.01',
    relationshipLevel: '낮잠 장인',
    tags: ['느긋함', '애교많음', '햇살 명당'],
    memo: '햇빛이 드는 카페 앞 화분 근처를 가장 좋아한다.',
  }
];

export const catEncountersMock: CatEncounter[] = [
  { id: 'enc-gamja-1', catId: 'gamja', seenAt: '2026.04.25', regionName: '부천시 중동 근처', memo: '첫 발견' },
  { id: 'enc-gamja-2', catId: 'gamja', seenAt: '2026.04.28', regionName: '부천시 중동 근처', memo: '다시 만남' },
  { id: 'enc-gamja-3', catId: 'gamja', seenAt: '2026.05.03', regionName: '부천시 중동 근처', memo: '낮잠 자는 모습 발견' },
  { id: 'enc-gamja-4', catId: 'gamja', seenAt: '2026.05.06', regionName: '부천시 중동 근처', memo: '저녁 산책길에서 다시 인사' },
  { id: 'enc-nabi-1', catId: 'nabi', seenAt: '2026.04.18', regionName: '부천시 중동 근처', memo: '골목 끝 화단에서 첫 발견' },
  { id: 'enc-nabi-2', catId: 'nabi', seenAt: '2026.04.30', regionName: '부천시 중동 근처', memo: '저녁 산책 중 다시 만남' },
  { id: 'enc-huchu-1', catId: 'huchu', seenAt: '2026.03.12', regionName: '부천시 중동 근처', memo: '분리수거장 근처에서 첫 발견' },
  { id: 'enc-huchu-2', catId: 'huchu', seenAt: '2026.03.29', regionName: '부천시 중동 근처', memo: '새벽 순찰 중 다시 만남' },
  { id: 'enc-huchu-3', catId: 'huchu', seenAt: '2026.04.14', regionName: '부천시 중동 근처', memo: '벽돌 담장 위에서 쉬는 모습 발견' },
  { id: 'enc-huchu-4', catId: 'huchu', seenAt: '2026.04.25', regionName: '부천시 중동 근처', memo: '근처 편의점 앞에서 여유롭게 휴식' },
  { id: 'enc-huchu-5', catId: 'huchu', seenAt: '2026.04.27', regionName: '부천시 중동 근처', memo: '밤 순찰 경로에서 다시 발견' },
  { id: 'enc-huchu-6', catId: 'huchu', seenAt: '2026.05.01', regionName: '부천시 중동 근처', memo: '상자 옆에서 천천히 스트레칭' },
  { id: 'enc-huchu-7', catId: 'huchu', seenAt: '2026.05.04', regionName: '부천시 중동 근처', memo: '골목 입구에서 다시 만남' },
  { id: 'enc-moka-1', catId: 'moka', seenAt: '2026.04.21', regionName: '부천시 상동 근처', memo: '밤 산책 중 첫 발견' },
  { id: 'enc-gureum-1', catId: 'gureum', seenAt: '2026.04.02', regionName: '부천시 상동 근처', memo: '카페 앞 화단에서 첫 발견' },
  { id: 'enc-gureum-2', catId: 'gureum', seenAt: '2026.04.19', regionName: '부천시 상동 근처', memo: '창가 햇살 아래에서 다시 만남' },
  { id: 'enc-gureum-3', catId: 'gureum', seenAt: '2026.05.01', regionName: '부천시 상동 근처', memo: '식빵 자세로 졸고 있는 모습 발견' }
];

export const undiscoveredDexSlotsMock: DexPlaceholder[] = [
  { id: 'shadow-006', number: 6, type: '치즈냥', rarity: 4 },
  { id: 'shadow-007', number: 7, type: '삼색이', rarity: 5 },
  { id: 'shadow-008', number: 8, type: '턱시도', rarity: 3 }
];

export const initialVisibleCatCount = catsMock.length;
export const initialEncounterCount = catEncountersMock.length;
