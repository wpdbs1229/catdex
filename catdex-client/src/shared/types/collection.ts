import type { Cat } from '@/shared/types/cat';

export type EntitlementTier = 'free' | 'nyangkkureomi';
export type EntitlementStatus = 'active' | 'trialing' | 'canceled' | 'expired';

export interface UserEntitlement {
  tier: EntitlementTier;
  status: EntitlementStatus;
  currentPeriodEndsAt: string | null;
}

export interface CollectionTheme {
  id: string;
  name: string;
  description: string;
  palette: string;
  isPremium: boolean;
}

export interface CollectionProfile {
  coverThemeId: string;
  displayTitle: string;
  intro: string;
  selectedBadgeIds: string[];
  selectedStampIds: string[];
  isPublic: boolean;
}

export interface FeaturedCatSlot {
  slot: number;
  catId: string;
  caption: string;
}

export interface SeasonStamp {
  id: string;
  name: string;
  description: string;
  seasonKey: string;
  startsOn: string;
  endsOn: string;
  isPremium: boolean;
  achieved: boolean;
  achievedAt?: string;
}

export interface AlleyBadge {
  id: string;
  name: string;
  description: string;
  achieved: boolean;
  achievedAt?: string;
}

export interface CollectionCustomizationState {
  entitlement: UserEntitlement;
  profile: CollectionProfile;
  themes: CollectionTheme[];
  featuredCatSlots: FeaturedCatSlot[];
  alleyBadges: AlleyBadge[];
  seasonStamps: SeasonStamp[];
}

export interface CollectionSummary {
  planName: string;
  hasNyangkkureomi: boolean;
  coverThemeName: string;
  featuredCats: Cat[];
  selectedBadges: AlleyBadge[];
  selectedStamps: SeasonStamp[];
  achievedBadgeCount: number;
  achievedStampCount: number;
}
