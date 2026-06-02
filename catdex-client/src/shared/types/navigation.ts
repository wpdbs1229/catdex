export type Screen =
  | 'home'
  | 'dex'
  | 'detail'
  | 'capture'
  | 'map'
  | 'sharedMap'
  | 'my'
  | 'drawer'
  | 'explorationHistory'
  | 'sharedCollections'
  | 'likedCollections'
  | 'profileEdit'
  | 'notifications'
  | 'subscriptionUpsell'
  | 'ranking'
  | 'publicCollection';

export type TabScreen = Exclude<
  Screen,
  | 'detail'
  | 'sharedMap'
  | 'drawer'
  | 'explorationHistory'
  | 'sharedCollections'
  | 'likedCollections'
  | 'profileEdit'
  | 'notifications'
  | 'subscriptionUpsell'
  | 'ranking'
  | 'publicCollection'
>;

export interface NavigationState {
  screen: Screen;
  selectedCatId: string | null;
  selectedOwnerId: string | null;
}
