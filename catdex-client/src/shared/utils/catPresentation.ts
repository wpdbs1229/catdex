import type { Cat, CatEncounter, CatRarity, CatType } from '@/shared/types/cat';

const visuals: Record<CatType, { emoji: string; colors: [string, string] }> = {
  치즈냥: { emoji: '🐈', colors: ['#F7D098', '#FFF2D9'] },
  삼색이: { emoji: '🐱', colors: ['#F7C8B0', '#FFF0D9'] },
  턱시도: { emoji: '🐈‍⬛', colors: ['#B7B4B1', '#ECE7E2'] },
  검은냥: { emoji: '🌑', colors: ['#6A6461', '#C9C2BC'] },
  흰냥: { emoji: '☁️', colors: ['#FFFFFF', '#EDEAE5'] },
};

export function getCatVisual(type: CatType) {
  return visuals[type];
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
