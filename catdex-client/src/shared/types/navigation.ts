export type Screen = 'home' | 'dex' | 'detail' | 'capture' | 'map' | 'my' | 'drawer';

export type TabScreen = Exclude<Screen, 'detail' | 'drawer'>;

export interface NavigationState {
  screen: Screen;
  selectedCatId: string | null;
}
