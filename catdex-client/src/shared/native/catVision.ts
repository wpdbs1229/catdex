import { requireOptionalNativeModule } from 'expo-modules-core';

export interface CatVisionBoundingBox {
  /** 좌상단 원점, 0~1로 정규화된 표시용 좌표 */
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 마스크가 적용된 픽셀 격자. RGBA 바이트가 행 우선으로 이어져 있고 알파는
 * 미리 나눠져 있다(non-premultiplied). 털색·무늬 판정은 이 값을 받아
 * `features/capture/coat/coat-analysis.ts`에서 한다.
 */
export interface CatVisionSamples {
  base64: string;
  /** 가로 = 세로 = size */
  size: number;
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
  /** 잘라낸 피사체 픽셀. 털색과 무늬를 여기서 읽는다. */
  subjectSamples: CatVisionSamples | null;
  /** 원본 색 + 피사체 마스크(알파). 알파가 없는 픽셀이 배경이라 조명 추정에 쓴다. */
  sceneSamples: CatVisionSamples | null;
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
