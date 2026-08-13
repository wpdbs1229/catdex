import { describeCoat } from '@/shared/coat/coat-label';
import type { Cat, CatEncounter, CatRarity } from '@/shared/types/cat';

export function sortByLastSeenDesc<T extends { lastSeenAt: string }>(items: T[]) {
  return [...items].sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt));
}

export function sortEncountersByDateAsc(encounters: CatEncounter[]) {
  return [...encounters].sort((left, right) => left.seenAt.localeCompare(right.seenAt));
}

export function formatDisplayDate(date: string) {
  return date.replace(/-/g, '.').replace(/\//g, '.');
}

// 폴라로이드 카드의 냥태그 라벨: "이름_YYYY.MM.DD"
export function formatNyanTagLabel(name: string, date: string) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return `${name}_${formatDisplayDate(date)}`;
  }

  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');

  return `${name}_${parsed.getFullYear()}.${month}.${day}`;
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
    `${describeCoat(cat.coatColors, cat.coatPattern)} 기본 희귀도와 도감 내 분포를 기준으로 산정했어요.`,
    '동네에서 같은 털색이 적거나 전체 도감에서 드문 털색이면 별이 올라가요.',
    '많이 수집할수록 도달할 수 있는 최대 별이 올라가요. 10마리에 4성, 30마리에 5성이 열려요.',
    '다시 만난 횟수는 희귀도가 아니라 관계 레벨에 반영돼요.',
  ];
}
