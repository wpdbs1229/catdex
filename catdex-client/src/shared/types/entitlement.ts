export interface SharedMapAccess {
  hasLifetimeAccess: boolean;
  priceLabel: string;
  source?: 'manual' | 'revenuecat' | 'app_store' | 'play_store';
}
