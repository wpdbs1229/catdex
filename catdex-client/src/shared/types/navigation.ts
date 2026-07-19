export type Screen =
  | 'home'
  | 'dex'
  | 'detail'
  | 'catEdit'
  | 'capture'
  | 'map'
  | 'communityPostDetail'
  | 'communityCompose'
  | 'my'
  | 'myCommunityPosts'
  | 'badgeBook'
  | 'explorationHistory'
  | 'blockedUsers'
  | 'profileEdit'
  | 'notificationInbox'
  | 'notifications';

export type TabScreen = Exclude<
  Screen,
  | 'detail'
  | 'catEdit'
  | 'communityPostDetail'
  | 'communityCompose'
  | 'myCommunityPosts'
  | 'badgeBook'
  | 'explorationHistory'
  | 'blockedUsers'
  | 'profileEdit'
  | 'notificationInbox'
  | 'notifications'
>;

export interface NavigationState {
  screen: Screen;
  selectedCatId: string | null;
  selectedOwnerId: string | null;
  selectedCommunityCatId?: string | null;
  selectedCommunityPostId?: string | null;
}
