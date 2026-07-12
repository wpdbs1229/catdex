import type { Cat } from '@/shared/types/cat';

export interface FeaturedCatSlot {
  slot: number;
  catId: string;
  caption: string;
}

export type CollectionEntitlementTier = 'free' | 'nyangkkureomi';

export interface CollectionCustomizationState {
  featuredCatSlots: FeaturedCatSlot[];
  entitlementTier: CollectionEntitlementTier;
  maxFeaturedCats: number;
}

export interface CollectionSummary {
  featuredCats: Cat[];
  achievedBadgeCount: number;
}
