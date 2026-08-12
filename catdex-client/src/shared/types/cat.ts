import type { CoatColorId, CoatPatternId } from '@/shared/coat/coat.types';

export type CatType =
  | '치즈냥'
  | '고등어냥'
  | '갈색태비'
  | '삼색이'
  | '카오스냥'
  | '턱시도'
  | '젖소냥'
  | '검은냥'
  | '흰냥'
  | '회색냥'
  | '포인트냥'
  | '얼룩냥'
  | '기타냥';

export type CatRarity = 1 | 2 | 3 | 4 | 5;

export type PersonalityTag = '애교많음' | '겁많음' | '느긋함' | '활발함';

export type CatFilter = '전체' | CatType | '희귀';

export interface Cat {
  id: string;
  number: number;
  name: string;
  type: CatType;
  /**
   * 등록할 때 고른 털색·무늬 원본. type은 이 둘을 deriveCatType으로 접은 값이라
   * 되돌릴 수 없어서, 도감 필터가 쓸 수 있게 따로 남긴다.
   */
  coatColors: CoatColorId[];
  coatPattern: CoatPatternId | null;
  rarity: CatRarity;
  rarityReasons: string[];
  encounterCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  relationshipLevel: string;
  tags: string[];
  memo?: string;
  /** 대표 이미지. 촬영으로 등록한 고양이는 배경을 지운 누끼다. */
  imageUrl?: string;
  /** 누끼를 만들기 전의 원본 사진. 데모 데이터나 옛 기록에는 없다. */
  originalPhotoUrl?: string;
}

export interface CatEncounter {
  id: string;
  catId: string;
  userId?: string;
  seenAt: string;
  regionName: string;
  memo: string;
  imageUrl?: string;
}

export interface CaptureCatDraft {
  name: string;
  type: CatType;
  coatColors: CoatColorId[];
  coatPattern: CoatPatternId | null;
  // 성격 태그 외에 '수컷'/'암컷', '품종:페르시안' 같은 속성 태그도 함께 담는다.
  tags: string[];
  regionName: string;
  memo: string;
  imageUrl?: string;
  cutoutImageUrl?: string;
  originalPhotoUrl?: string;
  observationId?: string;
}

export interface CatProfileUpdateDraft {
  name: string;
  tags: PersonalityTag[];
  memo: string;
  imageUri?: string;
  clearImage?: boolean;
}

export interface ProcessedCatPhoto {
  originalImageUri: string;
  cutoutImageUri: string;
  confidence: number;
  isPreciseCutout: boolean;
  // 누끼 색 분포에서 추정한 털색 후보 (후보 정렬 가중치 힌트 전용)
  coatHints?: string[];
  // 온디바이스 시각 임베딩 (후보 정렬 유사도 전용)
  embedding?: number[];
  embeddingVersion?: string | null;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  featureVector: number[];
}

export interface CatObservation {
  id: string;
  originalImageUrl: string;
  cutoutImageUrl: string;
  regionName: string;
  detectionConfidence: number;
  matchedCatId?: string;
}

export type CatMatchMethod = 'neighborhood_recent' | 'visual_embedding' | 'manual';

export interface CatMatchCandidate {
  cat: Cat;
  score: number;
  reason: string;
  method: CatMatchMethod;
  modelVersion?: string;
}

export type CatReportReason = 'duplicate_cat' | 'inappropriate_photo' | 'location_risk' | 'incorrect_info' | 'other';

export interface CatReportDraft {
  catId: string;
  reason: CatReportReason;
  memo: string;
}

export interface DexPlaceholder {
  id: string;
  type: CatType;
  /** 개체와 같은 두 축. 목격 카드도 컬러·무늬 필터에 걸린다. */
  coatColors: CoatColorId[];
  coatPattern: CoatPatternId | null;
  rarity: CatRarity;
  clueTitle?: string;
  clue?: string;
  regionHint: string;
  timeHint?: string;
  unlockHint?: string;
  sightedAt?: string;
  reportCount?: number;
  behaviorHint?: string;
  imageUrl?: string;
}
