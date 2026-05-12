export type Screen = 'home' | 'dex' | 'detail' | 'capture' | 'map' | 'my';

export type TabScreen = Exclude<Screen, 'detail'>;

export interface NavigationState {
  screen: Screen;
  selectedCatId: string | null;
}
