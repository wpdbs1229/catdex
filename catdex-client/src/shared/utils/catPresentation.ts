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

/**
 * 한 번 더 만날 때마다 남은 거리의 이만큼씩 좁혀진다.
 * 작을수록 빨리 친해진다.
 */
const AFFINITY_REMAINING_PER_MEETING = 0.75;

/**
 * 친밀도(0~100). 오직 만난 횟수에서 나온다.
 *
 * 예전에는 관계 레벨 이름('첫 만남', '골목 대장'…)마다 숫자를 박아뒀지만,
 * 등급 안에서는 몇 번을 더 만나도 게이지가 그대로라 기록한 보람이 없었다.
 * 이제는 만날 때마다 반드시 오르되, 남은 거리의 일정 비율씩만 좁혀서
 * 초반 재회는 크게, 나중 재회는 완만하게 반영한다.
 * (1회 25 · 3회 58 · 5회 76 · 10회 94 · 20회 100)
 */
export function getAffinity(cat: Cat) {
  return Math.round(100 * (1 - AFFINITY_REMAINING_PER_MEETING ** cat.encounterCount));
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
    '다시 만난 횟수는 희귀도가 아니라 친밀도에 반영돼요.',
  ];
}
