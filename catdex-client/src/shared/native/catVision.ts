import { requireOptionalNativeModule } from 'expo-modules-core';

export interface CatVisionBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CatVisionResult {
  hasCat: boolean;
  confidence: number;
  boundingBox: CatVisionBoundingBox | null;
  cutoutImageUri: string | null;
  featureVector: number[];
  isPreciseCutout: boolean;
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
