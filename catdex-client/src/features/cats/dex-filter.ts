import { COAT_COLORS, type CoatColorId, type CoatPatternId } from '@/shared/coat/coat.types';

/** 개체(Cat)와 미확인 목격(DexPlaceholder)이 함께 만족하는 최소 모양. */
interface CoatBearing {
  coatColors: CoatColorId[];
  coatPattern: CoatPatternId | null;
}

/**
 * 시안(3_도감_필터)의 "기타". 목록에 없는 색이 아니라 **기록이 없는** 고양이를 뜻한다.
 * 목록이 CoatColorId 전체라서 그 밖의 값이 존재할 수 없기 때문이다.
 */
export const OTHER_COAT = 'other';

export type DexColorFilter = CoatColorId | typeof OTHER_COAT;
export type DexPatternFilter = CoatPatternId | typeof OTHER_COAT;

export interface DexFilter {
  colors: DexColorFilter[];
  patterns: DexPatternFilter[];
}

export const emptyDexFilter: DexFilter = { colors: [], patterns: [] };

interface DexColorOption {
  id: DexColorFilter;
  label: string;
  /** 기타는 칠할 색이 없어 비운다. */
  swatch: string | null;
}

interface DexPatternOption {
  id: DexPatternFilter;
  label: string;
}

function swatchFor(id: CoatColorId) {
  return COAT_COLORS.find((color) => color.id === id)?.swatch ?? '#FFFFFF';
}

/**
 * 순서와 라벨은 시안을 그대로 따른다.
 * 촬영 화면(COAT_COLORS)은 같은 값을 '검정·회색·갈색·주황·흰색'으로 부르는데,
 * 그쪽 시안이 확정되면 한쪽으로 맞춰야 한다.
 */
export const DEX_COLOR_OPTIONS: DexColorOption[] = [
  { id: 'black', label: '블랙', swatch: swatchFor('black') },
  { id: 'gray', label: '그레이', swatch: swatchFor('gray') },
  { id: 'white', label: '화이트', swatch: swatchFor('white') },
  { id: 'cream', label: '크림', swatch: swatchFor('cream') },
  { id: 'chocolate', label: '초콜릿', swatch: swatchFor('chocolate') },
  { id: 'brown', label: '브라운', swatch: swatchFor('brown') },
  { id: 'cinnamon', label: '시나몬', swatch: swatchFor('cinnamon') },
  { id: 'orange', label: '오렌지', swatch: swatchFor('orange') },
  { id: 'lilac', label: '라일락', swatch: swatchFor('lilac') },
  { id: OTHER_COAT, label: '기타', swatch: null },
];

export const DEX_PATTERN_OPTIONS: DexPatternOption[] = [
  { id: 'solid', label: '원톤' },
  { id: 'bicolor', label: '투톤' },
  { id: 'tortie', label: '토티' },
  { id: 'tabby', label: '태비' },
  { id: OTHER_COAT, label: '기타' },
];

export function toggleDexFilterValue<T extends string>(selected: T[], value: T): T[] {
  return selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
}

export function countDexFilterSelections(filter: DexFilter) {
  return filter.colors.length + filter.patterns.length;
}

export function isDexFilterEmpty(filter: DexFilter) {
  return countDexFilterSelections(filter) === 0;
}

function matchesColors(coat: CoatBearing, selected: DexColorFilter[]) {
  if (selected.length === 0) {
    return true;
  }

  return selected.some((value) =>
    value === OTHER_COAT ? coat.coatColors.length === 0 : coat.coatColors.includes(value),
  );
}

function matchesPatterns(coat: CoatBearing, selected: DexPatternFilter[]) {
  if (selected.length === 0) {
    return true;
  }

  return selected.some((value) =>
    value === OTHER_COAT ? coat.coatPattern === null : coat.coatPattern === value,
  );
}

/** 같은 축 안에서는 OR, 축끼리는 AND. 컬러를 둘 고르면 둘 중 하나만 맞아도 걸린다. */
export function matchesDexFilter(coat: CoatBearing, filter: DexFilter) {
  return matchesColors(coat, filter.colors) && matchesPatterns(coat, filter.patterns);
}

export function describeDexFilter(filter: DexFilter) {
  const colorLabels = filter.colors.map(
    (id) => DEX_COLOR_OPTIONS.find((option) => option.id === id)?.label ?? id,
  );
  const patternLabels = filter.patterns.map(
    (id) => DEX_PATTERN_OPTIONS.find((option) => option.id === id)?.label ?? id,
  );

  return [...colorLabels, ...patternLabels];
}
