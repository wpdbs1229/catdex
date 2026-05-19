export type Screen = 'home' | 'dex' | 'detail' | 'capture' | 'map' | 'my' | 'drawer' | 'ranking' | 'publicCollection';

export type TabScreen = Exclude<Screen, 'detail' | 'drawer' | 'ranking' | 'publicCollection'>;

export interface NavigationState {
  screen: Screen;
  selectedCatId: string | null;
  selectedOwnerId: string | null;
}
