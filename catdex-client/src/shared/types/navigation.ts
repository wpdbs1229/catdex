export type Screen =
  | 'home'
  | 'dex'
  | 'detail'
  | 'capture'
  | 'map'
  | 'my'
  | 'drawer'
  | 'explorationHistory'
  | 'sharedCollections'
  | 'likedCollections'
  | 'profileEdit'
  | 'notifications'
  | 'ranking'
  | 'publicCollection';

export type TabScreen = Exclude<
  Screen,
  | 'detail'
  | 'drawer'
  | 'explorationHistory'
  | 'sharedCollections'
  | 'likedCollections'
  | 'profileEdit'
  | 'notifications'
  | 'ranking'
  | 'publicCollection'
>;

export interface NavigationState {
  screen: Screen;
  selectedCatId: string | null;
  selectedOwnerId: string | null;
}
