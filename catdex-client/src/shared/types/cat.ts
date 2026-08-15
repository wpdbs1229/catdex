import type { CatHabitat } from '@/shared/cats/habitat';
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

export interface Cat {
  id: string;
  number: number;
  name: string;
  /**
   * 털색·무늬 원본. 이 개체를 설명하는 단 하나의 축이다.
   *
   * 예전에는 여기서 접은 이름("고등어냥")을 Cat.type으로 들고 다녔지만, 같은
   * 개체를 두 가지로 설명하는 셈이라 어느 쪽이 진짜인지 계속 헷갈렸다. 이름이
   * 필요한 자리에서만 deriveCatType(coatColors, coatPattern)으로 만들어 쓴다.
   */
  coatColors: CoatColorId[];
  coatPattern: CoatPatternId | null;
  /** 집냥이·길냥이·보호소냥이. 등록한 사람이 정하는 공유값이다. */
  habitat: CatHabitat;
  rarity: CatRarity;
  rarityReasons: string[];
  encounterCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  /** 마지막으로 만난 실제 지점. 좌표를 남기기 전의 기록에는 없다.
      화면은 이 점을 그대로 찍지 않고 주변에 흩어 보여준다. */
  lastSeenLat?: number;
  lastSeenLng?: number;
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
  coatColors: CoatColorId[];
  coatPattern: CoatPatternId | null;
  habitat: CatHabitat;
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

export type CatMatchMethod =
  | 'neighborhood_recent'
  /** 동네 후보 중 털색까지 겹친 경우. 서버가 코트 힌트와 컬러를 맞춰 본다. */
  | 'neighborhood_recent_coat'
  | 'visual_embedding'
  | 'manual';

export interface CatMatchCandidate {
  cat: Cat;
  score: number;
  reason: string;
  method: CatMatchMethod;
  modelVersion?: string;
}

/**
 * 고양이 신고의 사유. 접수 UI는 지금 없지만(커뮤니티 열 때 다시 붙는다)
 * 이미 접수된 기록이 이 값으로 남아 있어, 신고 목록이 이름표를 붙일 때 쓴다.
 */
export type CatReportReason = 'duplicate_cat' | 'inappropriate_photo' | 'location_risk' | 'incorrect_info' | 'other';

export interface DexPlaceholder {
  id: string;
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
