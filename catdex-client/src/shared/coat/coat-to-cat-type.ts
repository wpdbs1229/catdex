import type { CatType } from '@/shared/types/cat';
import type { CoatColorId, CoatPatternId } from '@/shared/coat/coat.types';

/**
 * 컬러·무늬 조합을 도감이 부르는 이름(CatType)으로 접는다.
 *
 * 예전에는 이 값을 cats.type에 저장했지만, 여러 조합이 한 이름으로 뭉치는
 * 단방향 변환이라 원본과 어긋나기만 했다. 지금은 저장하지 않고 읽을 때마다
 * 만든다. 순수하게 표시용이다 — 거르기·희귀도는 컬러·무늬 원본을 본다.
 */
export function deriveCatType(colors: CoatColorId[], pattern: CoatPatternId | null): CatType {
  const color = colors[0] ?? null;

  if (pattern === 'tortie') {
    return color === 'black' || color === 'chocolate' ? '카오스냥' : '삼색이';
  }

  if (pattern === 'tabby') {
    if (color === 'orange' || color === 'cream') {
      return '치즈냥';
    }

    if (color === 'gray' || color === 'black') {
      return '고등어냥';
    }

    return '갈색태비';
  }

  if (pattern === 'bicolor') {
    if (color === 'black') {
      return '턱시도';
    }

    if (color === 'white') {
      return '젖소냥';
    }

    return '얼룩냥';
  }

  switch (color) {
    case 'black':
      return '검은냥';
    case 'white':
      return '흰냥';
    case 'gray':
    case 'lilac':
      return '회색냥';
    case 'cream':
    case 'orange':
      return '치즈냥';
    case 'chocolate':
    case 'brown':
    case 'cinnamon':
      return '갈색태비';
    default:
      return '기타냥';
  }
}
