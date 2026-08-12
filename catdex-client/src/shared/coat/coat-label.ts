import { COAT_COLORS, COAT_PATTERNS, type CoatColorId, type CoatPatternId } from '@/shared/coat/coat.types';

/**
 * 컬러·패턴을 한 줄로 부른다. 예: "주황 태비".
 *
 * 서버의 public.coat_label과 같은 규칙이다. 희귀도 사유 문구를 서버가 이 이름으로
 * 만들기 때문에, 화면이 다른 이름을 쓰면 근거와 라벨이 어긋난다.
 */
export function describeCoat(colors: CoatColorId[], pattern: CoatPatternId | null) {
  const colorLabel = colors.map((id) => COAT_COLORS.find((color) => color.id === id)?.label ?? id).join('·');
  const patternLabel = pattern ? (COAT_PATTERNS.find((option) => option.id === pattern)?.label ?? pattern) : '';

  return [colorLabel, patternLabel].filter(Boolean).join(' ') || '털색 미상';
}
