export type Screen =
  | 'home'
  | 'dex'
  | 'detail'
  | 'capture'
  | 'my'
  | 'explorationHistory'
  | 'profileEdit'
  | 'notifications';

export type TabScreen = Exclude<Screen, 'detail' | 'explorationHistory' | 'profileEdit' | 'notifications'>;

export interface NavigationState {
  screen: Screen;
  selectedCatId: string | null;
}
