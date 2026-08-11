import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CoatColorId, CoatPatternId } from '@/shared/coat/coat.types';
import type { CatVisionBoundingBox } from '@/shared/native/catVision';

export type RootStackParamList = {
  Main: undefined;
  /** 촬영은 탭 위에 전체 화면으로 덮는다. 탭바가 프리뷰를 가리지 않게 하기 위함이다. */
  CaptureFlow: undefined;
  /** 도감 기록 상세도 탭바 없이 전체 화면으로 덮는다. (피그마 4_도감_기록o) */
  CatDetail: { catId: string };
  /** 헤더 벨에서 여는 알림함. 시안에 없어 새로 그린 화면이다. */
  NotificationInbox: undefined;
  /** 피그마 마이페이지_알림 */
  NotificationSettings: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  MapTab: undefined;
  CaptureTab: undefined;
  CollectionTab: undefined;
  MyTab: undefined;
};

/** 고객 탭 안의 화면들. 전용 하단바가 남아야 해서 루트가 아니라 여기에 둔다. */
export type ClientStackParamList = {
  ClientRoster: undefined;
  ClientMap: undefined;
};

export type MapStackParamList = {
  NeighborhoodDex: undefined;
  NeighborhoodMap: undefined;
};

/**
 * 홈 탭 안에서 미는 화면들. 루트 스택이 아니라 여기 두어야 하단바가 남는다.
 * 시안(출근 현황)이 하단바를 그대로 보여 준다.
 */
export type HomeStackParamList = {
  Home: undefined;
  /** 인사고과 카드의 출근 칸에서 연다 */
  Attendance: undefined;
  /** 출근 현황의 '전체 기록 보기' */
  AttendanceMonth: undefined;
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

export type HomeStackScreenProps<T extends keyof HomeStackParamList> = NativeStackScreenProps<
  HomeStackParamList,
  T
>;
