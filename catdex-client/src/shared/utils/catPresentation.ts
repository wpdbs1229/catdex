import type { Cat, CatEncounter, CatRarity, CatType } from '@/shared/types/cat';

export type CatIllustrationKey = 'orange' | 'dark' | 'tuxedo' | 'gray';

const visuals: Record<CatType, { emoji: string; colors: [string, string] }> = {
  치즈냥: { emoji: '🐈', colors: ['#F7D098', '#FFF2D9'] },
  고등어냥: { emoji: '🐱', colors: ['#AEB6B8', '#EEF0ED'] },
  갈색태비: { emoji: '🐈', colors: ['#B88962', '#F1DDC8'] },
  삼색이: { emoji: '🐱', colors: ['#F7C8B0', '#FFF0D9'] },
  카오스냥: { emoji: '🐱', colors: ['#7E5A48', '#E2C5A5'] },
  턱시도: { emoji: '🐈‍⬛', colors: ['#B7B4B1', '#ECE7E2'] },
  젖소냥: { emoji: '🐱', colors: ['#F7F2E8', '#C6B7A8'] },
  검은냥: { emoji: '🌑', colors: ['#6A6461', '#C9C2BC'] },
  흰냥: { emoji: '☁️', colors: ['#FFFFFF', '#EDEAE5'] },
  회색냥: { emoji: '🐱', colors: ['#A8ADB2', '#E3E5E2'] },
  포인트냥: { emoji: '🐈', colors: ['#D9C7AA', '#F5ECDA'] },
  얼룩냥: { emoji: '🐾', colors: ['#C78E59', '#F5E1C7'] },
  기타냥: { emoji: '🐾', colors: ['#D7C4B2', '#F8ECDD'] },
};

export function getCatVisual(type: CatType) {
  return visuals[type];
}

export function getCatIllustrationKey(type: CatType): CatIllustrationKey {
  const keys: Record<CatType, CatIllustrationKey> = {
    치즈냥: 'orange',
    고등어냥: 'gray',
    갈색태비: 'gray',
    삼색이: 'dark',
    카오스냥: 'dark',
    턱시도: 'tuxedo',
    젖소냥: 'tuxedo',
    검은냥: 'dark',
    흰냥: 'gray',
    회색냥: 'gray',
    포인트냥: 'gray',
    얼룩냥: 'orange',
    기타냥: 'orange',
  };

  return keys[type];
}

export function sortByLastSeenDesc<T extends { lastSeenAt: string }>(items: T[]) {
  return [...items].sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt));
}

export function sortEncountersByDateAsc(encounters: CatEncounter[]) {
  return [...encounters].sort((left, right) => left.seenAt.localeCompare(right.seenAt));
}

export function formatDisplayDate(date: string) {
  return date.replace(/-/g, '.').replace(/\//g, '.');
}

export function getAffinityFromRelationship(cat: Cat) {
  const relationMap: Record<string, number> = {
    '첫 만남': 22,
    '살짝 경계 중': 46,
    '동네 친구': 74,
    '낮잠 장인': 65,
    '골목 대장': 88,
    '미스터리 손님': 28,
  };

  return relationMap[cat.relationshipLevel] ?? Math.min(24 + cat.encounterCount * 10, 92);
}

export function getRelationshipLevel(encounterCount: number) {
  if (encounterCount >= 7) {
    return '골목 대장';
  }

  if (encounterCount >= 4) {
    return '동네 친구';
  }

  if (encounterCount >= 2) {
    return '살짝 경계 중';
  }

  return '첫 만남';
}

export function getRarityStars(rarity: CatRarity) {
  return Array.from({ length: 5 }, (_, index) => index < rarity);
}

export function getRarityLabel(rarity: CatRarity) {
  const labels: Record<CatRarity, string> = {
    1: '흔한 만남',
    2: '익숙한 친구',
    3: '눈에 띄는 고양이',
    4: '희귀한 발견',
    5: '전설의 동네냥',
  };

  return labels[rarity];
}

export function getRarityGuide(cat: Cat) {
  if (cat.rarityReasons.length > 0) {
    return cat.rarityReasons;
  }

  return [
    `${cat.type} 기본 희귀도와 도감 내 분포를 기준으로 산정했어요.`,
    '동네에서 같은 털색이 적거나 전체 도감에서 드문 털색이면 별이 올라가요.',
    '다시 만난 횟수는 희귀도가 아니라 관계 레벨에 반영돼요.',
  ];
}
