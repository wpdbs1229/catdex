export type Screen =
  | 'home'
  | 'dex'
  | 'detail'
  | 'capture'
  | 'map'
  | 'communityPostDetail'
  | 'communityCompose'
  | 'my'
  | 'myCommunityPosts'
  | 'badgeBook'
  | 'explorationHistory'
  | 'profileEdit'
  | 'notifications';

export type TabScreen = Exclude<
  Screen,
  | 'detail'
  | 'communityPostDetail'
  | 'communityCompose'
  | 'myCommunityPosts'
  | 'badgeBook'
  | 'explorationHistory'
  | 'profileEdit'
  | 'notifications'
>;

export interface NavigationState {
  screen: Screen;
  selectedCatId: string | null;
  selectedOwnerId: string | null;
  selectedCommunityCatId?: string | null;
  selectedCommunityPostId?: string | null;
}
