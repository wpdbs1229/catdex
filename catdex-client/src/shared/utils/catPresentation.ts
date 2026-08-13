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

/** 마지막 만남 이후 이 기간까지는 식지 않는다. */
const AFFINITY_GRACE_DAYS = 14;

/** 유예가 끝난 뒤 하루에 깎이는 점수. */
const AFFINITY_FADE_PER_DAY = 1;

/**
 * 아무리 오래 못 봐도 쌓아둔 것의 이만큼은 남는다.
 * 0으로 두면 열 번 만난 고양이가 처음 보는 고양이와 같아진다.
 */
const AFFINITY_FLOOR_RATIO = 0.5;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** "2026.05.13" / "2026-05-13" 둘 다 받는다. Date 파서에 맡기면 기기마다 다르다. */
function parseCatDate(value: string) {
  const [year, month, day] = value.split(/[.\-/]/).map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return Date.UTC(year, month - 1, day);
}

/**
 * 친밀도(0~100). 만난 횟수로 쌓이고, 못 본 날수만큼 식는다.
 *
 * 예전에는 관계 레벨 이름('첫 만남', '골목 대장'…)마다 숫자를 박아뒀지만,
 * 등급 안에서는 몇 번을 더 만나도 게이지가 그대로라 기록한 보람이 없었다.
 * 이제는 만날 때마다 반드시 오르되, 남은 거리의 일정 비율씩만 좁혀서
 * 초반 재회는 크게, 나중 재회는 완만하게 반영한다.
 * (1회 25 · 3회 58 · 5회 76 · 10회 94 · 20회 100)
 *
 * 여기에 마지막 만남 이후 2주가 지나면 하루 1점씩 깎는다. 다만 절반 아래로는
 * 내려가지 않는다 - 한동안 못 봤다고 해서 열 번 만난 사이가 처음 보는 사이와
 * 같아지지는 않는다. 다시 만나면 깎인 만큼이 그대로 돌아온다.
 *
 * 날짜를 읽을 수 없으면 깎지 않는다. 모르는 것을 "오래 못 봤다"고 세면
 * 실제로 오래 못 본 고양이와 구분이 안 된다.
 */
export function getAffinity(cat: Cat, today: Date = new Date()) {
  const base = Math.round(100 * (1 - AFFINITY_REMAINING_PER_MEETING ** cat.encounterCount));
  const lastSeen = parseCatDate(cat.lastSeenAt);

  if (lastSeen === null) {
    return base;
  }

  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const daysApart = Math.floor((todayUtc - lastSeen) / MS_PER_DAY);
  const faded = base - Math.max(0, daysApart - AFFINITY_GRACE_DAYS) * AFFINITY_FADE_PER_DAY;

  return Math.max(Math.round(base * AFFINITY_FLOOR_RATIO), Math.round(faded));
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
