import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CoatColorId, CoatPatternId } from '@/features/capture/coat/coat.types';
import type { CatVisionBoundingBox } from '@/shared/native/catVision';

export type RootStackParamList = {
  Main: undefined;
  /** 촬영은 탭 위에 전체 화면으로 덮는다. 탭바가 프리뷰를 가리지 않게 하기 위함이다. */
  CaptureFlow: undefined;
  /** 도감 기록 상세도 탭바 없이 전체 화면으로 덮는다. (피그마 4_도감_기록o) */
  CatDetail: { catId: string };
};

export type MainTabParamList = {
  HomeTab: undefined;
  MapTab: undefined;
  CaptureTab: undefined;
  CollectionTab: undefined;
  MyTab: undefined;
};

export type MapStackParamList = {
  NeighborhoodDex: undefined;
  NeighborhoodMap: undefined;
};

export type CaptureStackParamList = {
  Camera: { lastCutoutUri?: string } | undefined;
  CaptureReview: { photoUri: string };
  /** AI 판별 결과 + 첫 발견자 안내 (피그마 5_촬영) */
  CaptureMatch: {
    photoUri: string;
    cutoutUri: string | null;
    confidence: number;
    isPreciseCutout: boolean;
    boundingBox: CatVisionBoundingBox | null;
    colors: CoatColorId[];
    pattern: CoatPatternId | null;
  };
  /** 도감 추가하기 시트 (피그마 5_촬영 후 등록) */
  CaptureRegister: {
    cutoutUri: string;
    imageStoragePath: string;
    observationId?: string;
    regionName: string;
    colors: CoatColorId[];
    pattern: CoatPatternId | null;
  };
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type CaptureStackScreenProps<T extends keyof CaptureStackParamList> = NativeStackScreenProps<
  CaptureStackParamList,
  T
>;

export type MapStackScreenProps<T extends keyof MapStackParamList> = NativeStackScreenProps<
  MapStackParamList,
  T
>;
