import type { Cat } from '@/shared/types/cat';

export interface FeaturedCatSlot {
  slot: number;
  catId: string;
  caption: string;
}

export interface CollectionCustomizationState {
  featuredCatSlots: FeaturedCatSlot[];
}

export interface CollectionSummary {
  featuredCats: Cat[];
  achievedBadgeCount: number;
}
