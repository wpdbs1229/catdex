export type Screen =
  | 'home'
  | 'dex'
  | 'detail'
  | 'capture'
  | 'community'
  | 'communityPostCreate'
  | 'communityComments'
  | 'my'
  | 'explorationHistory'
  | 'profileEdit'
  | 'notifications';

export type TabScreen = Exclude<
  Screen,
  'detail' | 'communityPostCreate' | 'communityComments' | 'explorationHistory' | 'profileEdit' | 'notifications'
>;

export interface NavigationState {
  screen: Screen;
  selectedCatId: string | null;
  selectedCommunityPostId?: string | null;
}
