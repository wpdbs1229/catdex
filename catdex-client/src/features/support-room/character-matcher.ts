import type { CoatColorId, CoatPatternId } from '@/shared/coat/coat.types';
import type { SelectableCharacterAssetKey } from '@/features/support-room/support-room.assets';

/**
 * 어떤 규칙으로 골랐는지. 상담기록 스냅숏에 함께 남긴다.
 *
 * 나중에 규칙을 손봤을 때 "예전 기록은 왜 저 그림이었나"를 되짚을 수 있어야 한다.
 * 키만 남기면 규칙이 바뀐 순간 과거 기록의 근거가 사라진다.
 */
export type CharacterMatchRuleId =
  | 'tortie.calico'
  | 'tortie.dark'
  | 'tabby.orange'
  | 'tabby.gray'
  | 'tabby.brown'
  | 'bicolor.black-white.variant'
  | 'bicolor.black'
  | 'bicolor.white'
  | 'bicolor.other'
  | 'solid.black'
  | 'solid.white'
  | 'solid.gray'
  | 'solid.orange'
  | 'solid.cream'
  | 'solid.brown'
  | 'fallback.no-pattern'
  | 'fallback.no-valid-color'
  | 'fallback.conflicting-solid'
  | 'fallback.unmatched-tabby';

export interface CharacterMatch {
  key: SelectableCharacterAssetKey;
  ruleId: CharacterMatchRuleId;
}

/**
 * 캐릭터를 고를 때 인정하는 털색.
 *
 * 원본 필드에 있어도 여기 없는 값은 버린다. 색이 늘어나면 그림을 먼저 만들고
 * 이 집합에 넣어야 한다 - 반대로 하면 그림이 없는 키가 나온다.
 */
const VALID_COLORS: ReadonlySet<CoatColorId> = new Set<CoatColorId>([
  'black',
  'gray',
  'brown',
  'chocolate',
  'cinnamon',
  'orange',
  'cream',
  'lilac',
  'white',
]);

/**
 * 문자열을 고정된 수로 접는다(FNV-1a).
 *
 * 같은 고양이는 언제 어느 기기에서 보든 같은 변형이 나와야 하므로 난수를 쓰지
 * 않는다. 해시 품질보다 '항상 같은 답'이 중요하다.
 */
export function stableHash(value: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash >>> 0;
}

/**
 * 털색·무늬로 고객지원실 캐릭터를 고른다.
 *
 * 도감의 표시 이름(Cat.type)을 거치지 않는다. 그 이름은 여러 조합을 하나로 접은
 * 표시용 값이라, 민무늬 주황 고양이가 줄무늬 그림으로 나오는 식으로 어긋난다.
 *
 * coatColors의 순서와 중복은 의미가 없다. 자동 분석은 픽셀 비율 순서로, 수동
 * 등록은 사용자가 누른 순서로 들어와서 첫 번째 색을 우세색으로 볼 수 없다.
 */
export function selectCharacter(
  coatColors: readonly CoatColorId[],
  coatPattern: CoatPatternId | null,
  catId: string,
): CharacterMatch {
  const colors = new Set(coatColors.filter((color) => VALID_COLORS.has(color)));
  const hasAny = (...ids: CoatColorId[]) => ids.some((id) => colors.has(id));

  if (!coatPattern) {
    return { key: 'fallback_cream', ruleId: 'fallback.no-pattern' };
  }

  if (colors.size === 0) {
    return { key: 'fallback_cream', ruleId: 'fallback.no-valid-color' };
  }

  if (coatPattern === 'tortie') {
    const isCalico =
      colors.has('white') &&
      hasAny('orange', 'cream', 'cinnamon') &&
      hasAny('black', 'gray', 'brown', 'chocolate', 'lilac');

    return isCalico
      ? { key: 'tortie_calico', ruleId: 'tortie.calico' }
      : { key: 'tortie_dark', ruleId: 'tortie.dark' };
  }

  if (coatPattern === 'tabby') {
    if (hasAny('orange', 'cream')) {
      return { key: 'tabby_orange', ruleId: 'tabby.orange' };
    }

    if (hasAny('black', 'gray', 'lilac')) {
      return { key: 'tabby_gray', ruleId: 'tabby.gray' };
    }

    if (hasAny('brown', 'chocolate', 'cinnamon')) {
      return { key: 'tabby_brown', ruleId: 'tabby.brown' };
    }

    return { key: 'fallback_cream', ruleId: 'fallback.unmatched-tabby' };
  }

  if (coatPattern === 'bicolor') {
    // 검정+흰색은 턱시도와 젖소 둘 다 맞는 설명이다. 어느 쪽인지 가릴 근거가
    // 원본에 없으므로 고양이마다 고정된 한쪽을 준다. 체형을 추론하는 게 아니라
    // 같은 그림만 계속 나오지 않게 하는 변형 선택이다.
    if (colors.size === 2 && colors.has('black') && colors.has('white')) {
      return stableHash(catId) % 2 === 0
        ? { key: 'bicolor_tuxedo', ruleId: 'bicolor.black-white.variant' }
        : { key: 'bicolor_cow', ruleId: 'bicolor.black-white.variant' };
    }

    if (colors.size === 1 && colors.has('black')) {
      return { key: 'bicolor_tuxedo', ruleId: 'bicolor.black' };
    }

    if (colors.size === 1 && colors.has('white')) {
      return { key: 'bicolor_cow', ruleId: 'bicolor.white' };
    }

    return { key: 'bicolor_spotted', ruleId: 'bicolor.other' };
  }

  // 원톤인데 색이 여럿이면 서로 모순된 입력이다. 아무 색이나 골라 그리면
  // 사용자가 고른 것과 다른 고양이가 나오므로 중립 그림으로 물러선다.
  if (colors.size !== 1) {
    return { key: 'fallback_cream', ruleId: 'fallback.conflicting-solid' };
  }

  const [color] = colors;

  switch (color) {
    case 'black':
      return { key: 'solid_black', ruleId: 'solid.black' };
    case 'white':
      return { key: 'solid_white', ruleId: 'solid.white' };
    case 'gray':
    case 'lilac':
      return { key: 'solid_gray', ruleId: 'solid.gray' };
    case 'orange':
      return { key: 'solid_orange', ruleId: 'solid.orange' };
    case 'cream':
      return { key: 'solid_cream', ruleId: 'solid.cream' };
    default:
      return { key: 'solid_brown', ruleId: 'solid.brown' };
  }
}
