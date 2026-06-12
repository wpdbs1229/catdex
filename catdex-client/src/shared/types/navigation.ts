export type Screen =
  | 'home'
  | 'dex'
  | 'detail'
  | 'capture'
  | 'community'
  | 'communityPostCreate'
  | 'communityComments'
  | 'communityMedia'
  | 'my'
  | 'explorationHistory'
  | 'profileEdit'
  | 'notifications';

export type TabScreen = Exclude<
  Screen,
  'detail' | 'communityPostCreate' | 'communityComments' | 'communityMedia' | 'explorationHistory' | 'profileEdit' | 'notifications'
>;

export interface NavigationState {
  screen: Screen;
  selectedCatId: string | null;
  selectedCommunityPostId?: string | null;
  selectedCommunityMediaId?: string | null;
  communityMediaReturnScreen?: 'community' | 'communityComments';
}
