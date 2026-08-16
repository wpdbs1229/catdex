import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Announcement } from '@/shared/types/announcement';
import type { CoatColorId, CoatPatternId } from '@/shared/coat/coat.types';
import type { CatVisionBoundingBox } from '@/shared/native/catVision';

export type RootStackParamList = {
  /** 온보딩 완료 화면처럼 탭 속 화면을 콕 집어 열 때 중첩 파라미터를 쓴다. */
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  /**
   * 촬영은 탭 위에 전체 화면으로 덮는다. 탭바가 프리뷰를 가리지 않게 하기 위함이다.
   * 온보딩은 { screen: 'Camera', params: { tutorial: true } }로 교육 모드를 켠다.
   */
  CaptureFlow: NavigatorScreenParams<CaptureStackParamList> | undefined;
  /**
   * 도감 기록 상세도 탭바 없이 전체 화면으로 덮는다. (피그마 4_도감_기록o)
   *
   * siblingIds는 옆으로 넘길 때 따라갈 순서다. 도감이 화면에 늘어놓고 있던
   * 목록을 그대로 넘겨준다 - 필터를 걸고 들어왔는데 넘기니 걸러냈던 고양이가
   * 나오면 방금 본 화면과 어긋난다. 지도·알림처럼 목록이 없는 곳에서 들어오면
   * 비워두고, 상세가 같은 거처 전체로 알아서 채운다.
   */
  CatDetail: {
    catId: string;
    siblingIds?: string[];
    /** 지부 도감에서 연 상세에만 이름 투표를 노출한다. */
    entryPoint?: 'neighborhoodDex';
  };
  /** 헤더 벨에서 여는 알림함. 시안에 없어 새로 그린 화면이다. */
  NotificationInbox: undefined;
  /** 마이페이지 > 공지사항 */
  Announcements: undefined;
  /**
   * 공지 본문. 목록에서 이미 받아온 글을 그대로 넘긴다 - 열 때마다 다시
   * 조회하면 방금 본 목록과 다른 글이 뜰 수 있고 기다릴 이유도 없다.
   */
  AnnouncementDetail: { announcement: Announcement };
  /** 피그마 마이페이지_알림 */
  NotificationSettings: undefined;
  /** 마이페이지 > 내 게시글. 커뮤니티에 내가 쓴 글만 모아 본다. */
  MyPosts: undefined;
  /**
   * 내 게시글에서 여는 커뮤니티 상세. 지부 탭의 CommunityPostDetail과 같은
   * 화면이지만, 여기(루트 스택)에 따로 올려야 뒤로 가기가 마이페이지로
   * 돌아온다 - 지부 탭으로 건너가 열면 뒤로 가도 커뮤니티에 남는다.
   */
  MyPostDetail: { postId: string };
  /** 마이페이지 > 신고 목록. 내가 접수한 신고들의 내역이다. */
  MyReports: undefined;
  /** 마이페이지 > 냥냥 비품상점. 고객 파일의 배경지·케이스·라벨을 판다. */
  Shop: undefined;
  /** 상점 > 전체 미리보기. 아직 안 산 상품을 고객 파일에 입혀서 보여준다. */
  ShopPreview: { itemId: string };
  /** 상점 > 구매 완료. */
  ShopPurchaseComplete: { itemId: string };
};

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList> | undefined;
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
  /** 피그마 동네_커뮤(90:3979) */
  NeighborhoodCommunity: undefined;
  /** 첨부 시안의 현장 기록 상세 */
  CommunityPostDetail: { postId: string };
  /** 첨부 시안의 현장 기록 작성 */
  CommunityPostComposer: undefined;
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
  /** 신입 사원 첫 업무(보리 등록)를 마치고 사원증이 활성화되는 화면 */
  OnboardingComplete: undefined;
};

/**
 * tutorial은 온보딩의 교육 모드다. 카메라 대신 번들된 보리 일러스트를 찍고,
 * AI 판별 없이 프리셋 특징으로 등록까지 이어진다. 서버에는 시드된 교육용
 * 개체의 만남 기록만 남는다.
 */
export type CaptureStackParamList = {
  Camera: { lastCutoutUri?: string; tutorial?: boolean } | undefined;
  CaptureReview: { photoUri: string; tutorial?: boolean };
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
    tutorial?: boolean;
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
