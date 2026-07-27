import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Main: undefined;
  /** 촬영은 탭 위에 전체 화면으로 덮는다. 탭바가 프리뷰를 가리지 않게 하기 위함이다. */
  CaptureFlow: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  MapTab: undefined;
  CaptureTab: undefined;
  CollectionTab: undefined;
  MyTab: undefined;
};

export type CaptureStackParamList = {
  Camera: { lastCutoutUri?: string } | undefined;
  CaptureReview: { photoUri: string };
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type CaptureStackScreenProps<T extends keyof CaptureStackParamList> = NativeStackScreenProps<
  CaptureStackParamList,
  T
>;
