export type Screen =
  | 'home'
  | 'dex'
  | 'detail'
  | 'capture'
  | 'map'
  | 'communityPostDetail'
  | 'communityCompose'
  | 'my'
  | 'badgeBook'
  | 'explorationHistory'
  | 'profileEdit'
  | 'notifications';

export type TabScreen = Exclude<
  Screen,
  | 'detail'
  | 'communityPostDetail'
  | 'communityCompose'
  | 'badgeBook'
  | 'explorationHistory'
  | 'profileEdit'
  | 'notifications'
>;

export interface NavigationState {
  screen: Screen;
  selectedCatId: string | null;
  selectedOwnerId: string | null;
  selectedCommunityPostId?: string | null;
}
