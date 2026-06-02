import type { CatFilter, CatType, PersonalityTag } from '@/shared/types/cat';

export const coatOptions: CatType[] = ['치즈냥', '삼색이', '턱시도', '검은냥', '흰냥'];

export const personalityOptions: PersonalityTag[] = [
  '애교많음',
  '겁많음',
  '느긋함',
  '활발함',
  '귀끝표식',
  '자묘동반',
  '상처의심',
  '마름주의',
  '자주보임',
];

export const catFilters: CatFilter[] = ['전체', '치즈냥', '삼색이', '턱시도', '희귀'];

export const totalDexCount = 100;
