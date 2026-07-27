import { requireOptionalNativeModule } from 'expo-modules-core';

export interface CatVisionBoundingBox {
  /** 좌상단 원점, 0~1로 정규화된 표시용 좌표 */
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
  cutoutWidth: number;
  cutoutHeight: number;
  /** 마스크 기반 정밀 누끼면 true, 사각 크롭 폴백이면 false */
  isPreciseCutout: boolean;
  colorProfile: CatVisionColorProfile | null;
  // 시각 임베딩은 아직 채우지 않는다. iOS 전용 Vision Feature Print를 쓰면 Android와
  // 비교가 불가능해서, 두 플랫폼이 같은 모델을 쓰도록 정리한 뒤에 붙인다.
  // 자세한 배경은 docs/domain-rules.md의 "온디바이스 비전 계약" 참고.
  embedding: number[];
  embeddingVersion: string | null;
  processingMs: number;
}

export interface CatVisionPrepareResult {
  ready: boolean;
  message: string | null;
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
  prepare: () => Promise<CatVisionPrepareResult>;
  clearCache: () => Promise<void>;
}

const nativeCatVision = requireOptionalNativeModule<CatVisionNativeModule>('CatVision');

export function isCatVisionAvailable() {
  return Boolean(nativeCatVision);
}

export async function processCatPhoto(imageUri: string): Promise<CatVisionResult> {
  if (!nativeCatVision) {
    throw new Error('이 기기에서는 로컬 고양이 인식 모듈을 사용할 수 없어요. 개발 빌드에서 다시 확인해주세요.');
  }

  return nativeCatVision.processCatPhoto(imageUri);
}

/**
 * Android는 Play 서비스에서 누끼 모델을 내려받아야 한다. 촬영 화면 진입 시 미리 호출해
 * 첫 촬영에서 수 초를 기다리는 상황을 피한다. 실패해도 촬영은 사각 크롭으로 이어진다.
 */
export async function prepareCatVision(): Promise<CatVisionPrepareResult> {
  if (!nativeCatVision) {
    return { ready: false, message: '로컬 고양이 인식 모듈을 사용할 수 없어요.' };
  }

  try {
    return await nativeCatVision.prepare();
  } catch (error) {
    return { ready: false, message: error instanceof Error ? error.message : String(error) };
  }
}

export async function clearCatVisionCache(): Promise<void> {
  await nativeCatVision?.clearCache();
}
