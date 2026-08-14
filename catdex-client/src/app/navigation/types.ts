import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CoatColorId, CoatPatternId } from '@/shared/coat/coat.types';
import type { CatVisionBoundingBox } from '@/shared/native/catVision';

export type RootStackParamList = {
  Main: undefined;
  /** 촬영은 탭 위에 전체 화면으로 덮는다. 탭바가 프리뷰를 가리지 않게 하기 위함이다. */
  CaptureFlow: undefined;
  /**
   * 도감 기록 상세도 탭바 없이 전체 화면으로 덮는다. (피그마 4_도감_기록o)
   *
   * siblingIds는 옆으로 넘길 때 따라갈 순서다. 도감이 화면에 늘어놓고 있던
   * 목록을 그대로 넘겨준다 - 필터를 걸고 들어왔는데 넘기니 걸러냈던 고양이가
   * 나오면 방금 본 화면과 어긋난다. 지도·알림처럼 목록이 없는 곳에서 들어오면
   * 비워두고, 상세가 같은 거처 전체로 알아서 채운다.
   */
  CatDetail: { catId: string; siblingIds?: string[] };
  /** 헤더 벨에서 여는 알림함. 시안에 없어 새로 그린 화면이다. */
  NotificationInbox: undefined;
  /** 피그마 마이페이지_알림 */
  NotificationSettings: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  MapTab: undefined;
  CaptureTab: undefined;
  /** 고객 탭은 스택이다. 홈에서 고객지원실을 바로 열 수 있어야 해서 중첩을 밝힌다. */
  CollectionTab: NavigatorScreenParams<ClientStackParamList> | undefined;
  MyTab: undefined;
};

/** 고객 탭 안의 화면들. 전용 하단바가 남아야 해서 루트가 아니라 여기에 둔다. */
export type ClientStackParamList = {
  /** 지도에서 구역을 골라 들어오면 그 구역 고객만 남긴다. */
  ClientRoster: { regionName?: string; catIds?: string[] } | undefined;
  ClientMap: undefined;
  /** 고객 상담 = 고객지원실. 방치형 방문 화면이다. */
  ClientSupportRoom: undefined;
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
    /** 누끼 PNG의 스토리지 경로. 고양이 대표 이미지가 된다. */
    imageStoragePath: string;
    /** 누끼를 만들기 전의 원본 사진 경로. */
    originalStoragePath?: string;
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
