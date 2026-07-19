import { requireOptionalNativeModule } from 'expo-modules-core';

export interface CatVisionBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CatVisionColorProfile {
  black?: number;
  white?: number;
  gray?: number;
  orange?: number;
  brown?: number;
  coverage?: number;
  maskUsed?: number;
}

export interface CatVisionResult {
  hasCat: boolean;
  confidence: number;
  boundingBox: CatVisionBoundingBox | null;
  cutoutImageUri: string | null;
  featureVector: number[];
  isPreciseCutout: boolean;
  colorProfile?: CatVisionColorProfile | null;
}

// 색 계열 비율을 앱의 털색 분류로 해석한다. 후보 정렬의 가중치 힌트로만
// 쓰이므로 틀려도 비용이 낮게, 배타적이지 않게 여러 후보를 함께 반환한다.
export function deriveCoatHints(profile: CatVisionColorProfile | null | undefined): string[] {
  if (!profile) {
    return [];
  }

  const black = profile.black ?? 0;
  const white = profile.white ?? 0;
  const gray = profile.gray ?? 0;
  const orange = profile.orange ?? 0;
  const brown = profile.brown ?? 0;
  const isSignificant = (value: number) => value >= 0.15;
  const isDominant = (value: number) => value >= 0.55;
  const hints = new Set<string>();

  if (isSignificant(orange) && isSignificant(black)) {
    hints.add('삼색이');
    hints.add('카오스냥');
  }

  if (isDominant(orange) || (isSignificant(orange) && isSignificant(white) && !isSignificant(black))) {
    hints.add('치즈냥');
  }

  if (isSignificant(black) && isSignificant(white) && !isSignificant(orange)) {
    hints.add('턱시도');
    hints.add('젖소냥');
  }

  if (isDominant(black)) {
    hints.add('검은냥');
  }

  if (isDominant(white)) {
    hints.add('흰냥');
    hints.add('포인트냥');
  }

  if (isDominant(gray)) {
    hints.add('회색냥');
    hints.add('고등어냥');
  }

  if (isSignificant(brown) && (isSignificant(gray) || isSignificant(black))) {
    hints.add('고등어냥');
    hints.add('갈색태비');
  }

  if (isDominant(brown)) {
    hints.add('갈색태비');
  }

  return [...hints].slice(0, 4);
}

interface CatVisionNativeModule {
  processCatPhoto: (imageUri: string) => Promise<CatVisionResult>;
}

const nativeCatVision = requireOptionalNativeModule<CatVisionNativeModule>('CatVision');

export async function processCatPhoto(imageUri: string): Promise<CatVisionResult> {
  if (!nativeCatVision) {
    throw new Error('이 기기에서는 로컬 고양이 인식 모듈을 사용할 수 없어요. iOS 개발 빌드에서 다시 확인해주세요.');
  }

  return nativeCatVision.processCatPhoto(imageUri);
}

export function isCatVisionAvailable() {
  return Boolean(nativeCatVision);
}
