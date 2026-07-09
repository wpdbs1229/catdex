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
  rarity: CatRarity;
  rarityReasons: string[];
  encounterCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  relationshipLevel: string;
  tags: string[];
  memo?: string;
  imageUrl?: string;
}

export interface CatEncounter {
  id: string;
  catId: string;
  seenAt: string;
  regionName: string;
  memo: string;
  imageUrl?: string;
}

export interface CaptureCatDraft {
  name: string;
  type: CatType;
  tags: PersonalityTag[];
  regionName: string;
  memo: string;
  imageUrl?: string;
  cutoutImageUrl?: string;
  observationId?: string;
}

export interface ProcessedCatPhoto {
  originalImageUri: string;
  cutoutImageUri: string;
  confidence: number;
  isPreciseCutout: boolean;
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

export interface CatMatchCandidate {
  cat: Cat;
  score: number;
  reason: string;
}

export type CatReportReason = 'duplicate_cat' | 'inappropriate_photo' | 'location_risk' | 'incorrect_info' | 'other';

export interface CatReportDraft {
  catId: string;
  reason: CatReportReason;
  memo: string;
}

export interface DexPlaceholder {
  id: string;
  number: number;
  type: CatType;
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

export interface HomeSummary {
  myWeeklyCollected: number;
  myTotalCollected: number;
  sharedTodayDiscovered: number;
  sharedTotalCats: number;
  recentMyRediscovered: string;
}

export interface DexProgress {
  collected: number;
  total: number;
}
