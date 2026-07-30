import type { CatType } from '@/shared/types/cat';
import type { CoatColorId, CoatPatternId } from '@/features/capture/coat/coat.types';

/**
 * 촬영 화면에서 고른 컬러/패턴 조합을 기존 도감 분류(CatType)로 변환한다.
 * 서버 스키마(cats.type)가 한국어 털색 분류를 쓰므로 여기서 한 번 접는다.
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
