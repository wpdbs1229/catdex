export type CatType = '치즈냥' | '삼색이' | '턱시도' | '검은냥' | '흰냥';

export type CatRarity = 1 | 2 | 3 | 4 | 5;

export type PersonalityTag = '애교많음' | '겁많음' | '느긋함' | '활발함';

export type CatFilter = '전체' | CatType | '희귀';

export interface Cat {
  id: string;
  number: number;
  name: string;
  type: CatType;
  rarity: CatRarity;
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
