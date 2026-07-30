import type { CatFilter, CatType, PersonalityTag } from '@/shared/types/cat';

export const coatOptions: CatType[] = [
  '치즈냥',
  '고등어냥',
  '갈색태비',
  '삼색이',
  '카오스냥',
  '턱시도',
  '젖소냥',
  '검은냥',
  '흰냥',
  '회색냥',
  '포인트냥',
  '얼룩냥',
  '기타냥',
];

export const personalityOptions: PersonalityTag[] = ['애교많음', '겁많음', '느긋함', '활발함'];

export const catFilters: CatFilter[] = ['전체', ...coatOptions, '희귀'];

export const totalDexCount = 100;
