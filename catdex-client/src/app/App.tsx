import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppShell } from '@/shared/components/AppShell';
import { BottomTabBar } from '@/shared/components/BottomTabBar';
import { fetchAchievedBadges, fetchMyRegions, fetchProfile, fetchRegions } from '@/shared/api/app.api';
import {
  fetchCollectionCustomization,
  hasActiveNyangkkureomi,
  saveCollectionProfile,
  saveFeaturedCat,
} from '@/shared/api/collection.api';
import { fetchCatOptions, reportCat } from '@/shared/api/cats.api';
import { coatOptions, personalityOptions } from '@/shared/constants/cat.constants';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { CaptureScreen } from '@/features/capture/CaptureScreen';
import { CollectionDrawerScreen } from '@/features/collection/CollectionDrawerScreen';
import { CatDetailScreen } from '@/features/cats/CatDetailScreen';
import { CatDexScreen } from '@/features/cats/CatDexScreen';
import { useCats } from '@/features/cats/hooks/useCats';
import { CommunityCommentsScreen } from '@/features/community/CommunityCommentsScreen';
import { CommunityFeedScreen } from '@/features/community/CommunityFeedScreen';
import { CommunityPostCreateScreen } from '@/features/community/CommunityPostCreateScreen';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { HomeScreen } from '@/features/home/HomeScreen';
import { MapScreen } from '@/features/map/MapScreen';
import {
  ExplorationHistoryScreen,
  LikedCollectionsScreen,
  SharedCollectionsScreen,
} from '@/features/my/MyLinkedCollectionScreens';
import { MyPageScreen } from '@/features/my/MyPageScreen';
import { ProfileEditScreen } from '@/features/my/ProfileEditScreen';
import { NotificationSettingsScreen } from '@/features/notifications/NotificationSettingsScreen';
import { NeighborhoodRankingScreen } from '@/features/social/NeighborhoodRankingScreen';
import { PublicCollectionScreen } from '@/features/social/PublicCollectionScreen';
import { SplashScreen } from '@/features/splash/SplashScreen';
import { NyangkkureomiUpsellScreen } from '@/features/subscription/NyangkkureomiUpsellScreen';
import { useNyangkkureomiPayments } from '@/features/subscription/hooks/useNyangkkureomiPayments';
import {
  fetchPublicCollection,
  fetchPublicCollectionRankings,
  toggleCollectionFollow,
  toggleCollectionLike,
} from '@/shared/api/social.api';
import {
  fetchRemoteNotificationSettings,
  registerNotificationDevice,
  saveRemoteNotificationSettings,
} from '@/shared/api/notifications.api';
import {
  applyNotificationSettings,
  defaultNotificationSettings,
  getExpoPushTokenForDevice,
  getNotificationDevicePlatform,
  getNotificationPermissionState,
  loadNotificationSettings,
  mergeNotificationSettings,
  requestNotificationPermissions,
  sendAchievementPreviewNotification,
} from '@/shared/notifications/notification.service';
import type { Badge, ExplorerProfile } from '@/shared/types/badge';
import type { ProfileUpdateDraft } from '@/shared/types/auth';
import type { CatEncounterDraft, CaptureCatDraft } from '@/shared/types/cat';
import type { CatType, PersonalityTag } from '@/shared/types/cat';
import type { CommunityPost, CommunityReportReason } from '@/features/community/types';
import type { CollectionCustomizationState, CollectionProfile, CollectionSummary } from '@/shared/types/collection';
import type { NavigationState, TabScreen } from '@/shared/types/navigation';
import type { NotificationPermissionState, NotificationSettings } from '@/shared/types/notification';
import type { Region } from '@/shared/types/region';
import type { PublicCollection } from '@/shared/types/social';

const emptyProfile: ExplorerProfile = {
  title: '동네 냥이 탐험가',
  level: 1,
  totalDiscoveries: 0,
  rediscoveries: 0,
  nextLevelProgress: 0,
  nextLevelLabel: '탐험 기록을 불러오는 중',
};

const emptyCustomization: CollectionCustomizationState = {
  entitlement: {
    tier: 'free',
    status: 'active',
    currentPeriodEndsAt: null,
  },
  profile: {
    coverThemeId: 'field-note',
    displayTitle: '나의 냥도감',
    intro: '오늘도 골목에서 만난 친구들을 기록해요.',
    selectedBadgeIds: [],
    selectedStampIds: [],
    isPublic: true,
  },
  themes: [],
  featuredCatSlots: [],
  alleyBadges: [],
  seasonStamps: [],
};

export default function App() {
  const {
    currentUser,
    isAuthenticated,
    isRestoring,
    isSigningOut,
    authErrorMessage,
    pendingProvider,
    loginWithGoogle,
    loginWithKakao,
    updateProfile,
    logout,
  } = useAuth();
  const [navigation, setNavigation] = useState<NavigationState>({
    screen: 'home',
    selectedCatId: null,
    selectedOwnerId: null,
  });
  const [hasCompletedSplash, setHasCompletedSplash] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiCoatOptions, setApiCoatOptions] = useState<CatType[]>(coatOptions);
  const [apiPersonalityOptions, setApiPersonalityOptions] = useState<PersonalityTag[]>(personalityOptions);
  const [regions, setRegions] = useState<Region[]>([]);
  const [myRegions, setMyRegions] = useState<Region[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [profile, setProfile] = useState<ExplorerProfile>(emptyProfile);
  const [customization, setCustomization] = useState<CollectionCustomizationState>(emptyCustomization);
  const [publicCollections, setPublicCollections] = useState<PublicCollection[]>([]);
  const [selectedPublicCollection, setSelectedPublicCollection] = useState<PublicCollection | null>(null);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [notificationPermissionState, setNotificationPermissionState] = useState<NotificationPermissionState>('undetermined');
  const [isNotificationSaving, setIsNotificationSaving] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [upsellSource, setUpsellSource] = useState<'map' | 'social' | 'drawer'>('drawer');
  const payments = useNyangkkureomiPayments(currentUser?.id ?? null);
  const {
    addEncounter,
    cats,
    createCat,
    createCatSighting,
    dexProgress,
    homeSummary,
    myCats,
    recentCats,
    selectedCat,
    selectedCatEncounters,
    undiscoveredDexSlots,
  } = useCats(navigation.selectedCatId, isAuthenticated);
  const community = useCommunity(currentUser);

  const hasNyangkkureomiAccess = hasActiveNyangkkureomi(customization.entitlement) || payments.hasNyangkkureomi;

  const activeTab: TabScreen =
    navigation.screen === 'detail' || navigation.screen === 'ranking' || navigation.screen === 'publicCollection'
      ? 'dex'
      : navigation.screen === 'sharedMap'
        ? 'map'
      : navigation.screen === 'communityPostCreate' || navigation.screen === 'communityComments'
        ? 'community'
      : navigation.screen === 'subscriptionUpsell'
        ? upsellSource === 'map'
          ? 'map'
          : 'my'
      : navigation.screen === 'drawer' ||
          navigation.screen === 'explorationHistory' ||
          navigation.screen === 'sharedCollections' ||
          navigation.screen === 'likedCollections' ||
          navigation.screen === 'profileEdit' ||
          navigation.screen === 'notifications'
        ? 'my'
        : navigation.screen;

  useEffect(() => {
    const timerId = setTimeout(() => {
      setHasCompletedSplash(true);
    }, 1400);

    return () => {
      clearTimeout(timerId);
    };
  }, []);

  const reloadAppResources = async () => {
    const [nextOptions, nextRegions, nextMyRegions, nextBadges, nextProfile, nextCustomization] = await Promise.all([
      fetchCatOptions(),
      fetchRegions(),
      fetchMyRegions(),
      fetchAchievedBadges(),
      fetchProfile(),
      fetchCollectionCustomization(),
    ]);

    setApiCoatOptions(nextOptions.coatTypes);
    setApiPersonalityOptions(nextOptions.personalityTags);
    setRegions(nextRegions);
    setMyRegions(nextMyRegions);
    setBadges(nextBadges);
    setProfile(nextProfile);
    setCustomization(nextCustomization);
  };

  useEffect(() => {
    if (isAuthenticated) {
      reloadAppResources();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let isMounted = true;

    async function loadNotifications() {
      const [localSettings, remoteSettings, nextPermissionState] = await Promise.all([
        loadNotificationSettings(),
        fetchRemoteNotificationSettings().catch(() => null),
        getNotificationPermissionState(),
      ]);
      const nextSettings = mergeNotificationSettings(localSettings, remoteSettings);
      const appliedSettings = await applyNotificationSettings(nextSettings);

      if (isMounted) {
        setNotificationSettings(appliedSettings);
        setNotificationPermissionState(nextPermissionState);
      }
    }

    loadNotifications();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const handleTabChange = (screen: TabScreen) => {
    setNavigation({
      screen,
      selectedCatId: null,
      selectedOwnerId: null,
      selectedCommunityPostId: null,
    });
  };

  const handleOpenCat = (catId: string) => {
    setNavigation({
      screen: 'detail',
      selectedCatId: catId,
      selectedOwnerId: null,
    });
  };

  const handleSaveCapture = async (draft: CaptureCatDraft) => {
    setIsSaving(true);

    try {
      await createCat(draft);
      await reloadAppResources();
      setNavigation({
        screen: 'dex',
        selectedCatId: null,
        selectedOwnerId: null,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSighting = async (draft: CaptureCatDraft) => {
    setIsSaving(true);

    try {
      await createCatSighting(draft);
      await reloadAppResources();
      setNavigation({
        screen: 'dex',
        selectedCatId: null,
        selectedOwnerId: null,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecordEncounter = async (draft: CatEncounterDraft) => {
    if (!selectedCat) {
      return;
    }

    await addEncounter(selectedCat.id, draft);
    await reloadAppResources();
  };

  const handleRecordExistingCat = async (catId: string, draft: CatEncounterDraft) => {
    setIsSaving(true);

    try {
      await addEncounter(catId, draft);
      await reloadAppResources();
      setNavigation({
        screen: 'detail',
        selectedCatId: catId,
        selectedOwnerId: null,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReportSelectedCat = async () => {
    if (!selectedCat) {
      return;
    }

    await reportCat({
      catId: selectedCat.id,
      reason: 'incorrect_info',
      memo: '앱에서 사용자 신고로 접수되었습니다.',
    });
    Alert.alert('신고 접수', '검토가 필요한 고양이 정보로 신고했어요.');
  };

  const handleSaveCollectionProfile = async (nextProfile: CollectionProfile) => {
    setIsSaving(true);

    try {
      await saveCollectionProfile(nextProfile);
      await reloadAppResources();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveFeaturedCat = async (slot: number, catId: string | null) => {
    setIsSaving(true);

    try {
      await saveFeaturedCat(slot, catId);
      await reloadAppResources();
    } finally {
      setIsSaving(false);
    }
  };

  const handleShowPaymentSetup = () => {
    if (!payments.isAvailable) {
      Alert.alert(
        '냥꾸러미 결제 준비',
        payments.errorMessage ?? 'RevenueCat 공개 SDK 키와 스토어 상품을 설정하면 이 화면에서 바로 구독 결제를 시작할 수 있어요.',
      );
      return;
    }

    Alert.alert(
      '냥꾸러미',
      '프리미엄 표지, 우리 도감 주인공 3마리, 시즌 냥발 도장을 사용할 수 있어요. 결제와 영수증은 App Store 또는 Google Play 구독으로 처리됩니다.',
    );
  };

  const handleShowNyangkkureomiUpsell = () => {
    setUpsellSource('drawer');
    setNavigation({
      screen: 'subscriptionUpsell',
      selectedCatId: null,
      selectedOwnerId: null,
    });
  };

  const handleOpenCollectionDrawer = () => {
    setNavigation({
      screen: 'drawer',
      selectedCatId: null,
      selectedOwnerId: null,
    });
  };

  const handleOpenExplorationHistory = () => {
    setNavigation({
      screen: 'explorationHistory',
      selectedCatId: null,
      selectedOwnerId: null,
    });
  };

  const handleOpenSharedCollections = () => {
    if (!hasNyangkkureomiAccess) {
      setUpsellSource('social');
      setNavigation({
        screen: 'subscriptionUpsell',
        selectedCatId: null,
        selectedOwnerId: null,
      });
      return;
    }

    setNavigation({
      screen: 'sharedCollections',
      selectedCatId: null,
      selectedOwnerId: null,
    });
  };

  const handleOpenLikedCollections = async () => {
    if (!hasNyangkkureomiAccess) {
      setUpsellSource('social');
      setNavigation({
        screen: 'subscriptionUpsell',
        selectedCatId: null,
        selectedOwnerId: null,
      });
      return;
    }

    setNavigation({
      screen: 'likedCollections',
      selectedCatId: null,
      selectedOwnerId: null,
    });
    await loadCollectionRankings();
  };

  const handleOpenNotifications = () => {
    setNavigation({
      screen: 'notifications',
      selectedCatId: null,
      selectedOwnerId: null,
    });
  };

  const handleOpenProfileEdit = () => {
    setNavigation({
      screen: 'profileEdit',
      selectedCatId: null,
      selectedOwnerId: null,
    });
  };

  const handleOpenSharedMap = () => {
    if (!hasNyangkkureomiAccess) {
      setUpsellSource('map');
      setNavigation({
        screen: 'subscriptionUpsell',
        selectedCatId: null,
        selectedOwnerId: null,
      });
      return;
    }

    setNavigation({
      screen: 'sharedMap',
      selectedCatId: null,
      selectedOwnerId: null,
    });
  };

  const handleOpenCommunityPostCreate = () => {
    setNavigation({
      screen: 'communityPostCreate',
      selectedCatId: null,
      selectedOwnerId: null,
      selectedCommunityPostId: null,
    });
  };

  const handleOpenCommunityComments = (post: CommunityPost) => {
    setNavigation({
      screen: 'communityComments',
      selectedCatId: null,
      selectedOwnerId: null,
      selectedCommunityPostId: post.id,
    });
  };

  const handleReportCommunityPost = async (post: CommunityPost, reason: CommunityReportReason) => {
    if (!currentUser) {
      return;
    }

    await community.reportTarget({
      targetType: 'POST',
      targetId: post.id,
      reason,
      reporter: currentUser,
    });
  };

  const handleSaveProfile = async (draft: ProfileUpdateDraft) => {
    setIsProfileSaving(true);

    try {
      await updateProfile(draft);
      setNavigation({
        screen: 'my',
        selectedCatId: null,
        selectedOwnerId: null,
      });
    } catch (error) {
      Alert.alert('프로필 저장 실패', error instanceof Error ? error.message : '프로필을 저장하지 못했어요.');
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleChangeNotificationSettings = async (nextSettings: NotificationSettings) => {
    setIsNotificationSaving(true);

    try {
      const appliedSettings = await applyNotificationSettings(nextSettings);
      await saveRemoteNotificationSettings(appliedSettings);
      setNotificationSettings(appliedSettings);
    } catch (error) {
      Alert.alert('알림 설정 실패', error instanceof Error ? error.message : '알림 설정을 저장하지 못했어요.');
    } finally {
      setIsNotificationSaving(false);
    }
  };

  const handleRequestNotificationPermission = async () => {
    setIsNotificationSaving(true);

    try {
      const nextPermissionState = await requestNotificationPermissions();
      setNotificationPermissionState(nextPermissionState);

      if (nextPermissionState === 'granted') {
        const expoPushToken = await getExpoPushTokenForDevice();
        await registerNotificationDevice(expoPushToken, getNotificationDevicePlatform());
      }
    } finally {
      setIsNotificationSaving(false);
    }
  };

  const handleSendNotificationPreview = async () => {
    setIsNotificationSaving(true);

    try {
      await sendAchievementPreviewNotification();
    } finally {
      setIsNotificationSaving(false);
    }
  };

  const loadCollectionRankings = async () => {
    setIsSocialLoading(true);

    try {
      const nextCollections = await fetchPublicCollectionRankings();
      setPublicCollections(nextCollections);
    } finally {
      setIsSocialLoading(false);
    }
  };

  const handleOpenCollectionRankings = async () => {
    if (!hasNyangkkureomiAccess) {
      setUpsellSource('social');
      setNavigation({
        screen: 'subscriptionUpsell',
        selectedCatId: null,
        selectedOwnerId: null,
      });
      return;
    }

    setNavigation({
      screen: 'ranking',
      selectedCatId: null,
      selectedOwnerId: null,
    });
    await loadCollectionRankings();
  };

  const handleOpenPublicCollection = async (ownerId: string) => {
    if (!hasNyangkkureomiAccess) {
      setUpsellSource('social');
      setNavigation({
        screen: 'subscriptionUpsell',
        selectedCatId: null,
        selectedOwnerId: null,
      });
      return;
    }

    setNavigation({
      screen: 'publicCollection',
      selectedCatId: null,
      selectedOwnerId: ownerId,
    });
    setIsSocialLoading(true);

    try {
      setSelectedPublicCollection(await fetchPublicCollection(ownerId));
    } finally {
      setIsSocialLoading(false);
    }
  };

  const reloadSelectedPublicCollection = async () => {
    if (!navigation.selectedOwnerId) {
      return;
    }

    setSelectedPublicCollection(await fetchPublicCollection(navigation.selectedOwnerId));
  };

  const handleToggleCollectionLike = async () => {
    if (!navigation.selectedOwnerId) {
      return;
    }

    setIsSaving(true);

    try {
      await toggleCollectionLike(navigation.selectedOwnerId);
      await reloadSelectedPublicCollection();
      await loadCollectionRankings();
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleCollectionFollow = async () => {
    if (!navigation.selectedOwnerId) {
      return;
    }

    setIsSaving(true);

    try {
      await toggleCollectionFollow(navigation.selectedOwnerId);
      await reloadSelectedPublicCollection();
      await loadCollectionRankings();
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCollectionTheme = customization.themes.find((theme) => theme.id === customization.profile.coverThemeId);
  const selectedCollectionBadges = customization.profile.selectedBadgeIds
    .map((badgeId) => customization.alleyBadges.find((badge) => badge.id === badgeId && badge.achieved))
    .filter((badge): badge is NonNullable<typeof badge> => Boolean(badge));
  const selectedCollectionStamps = customization.profile.selectedStampIds
    .map((stampId) => customization.seasonStamps.find((stamp) => stamp.id === stampId && stamp.achieved))
    .filter((stamp): stamp is NonNullable<typeof stamp> => Boolean(stamp));

  const collectionSummary: CollectionSummary = {
    planName: hasNyangkkureomiAccess ? '냥꾸러미 사용 중' : '무료 서랍',
    hasNyangkkureomi: hasNyangkkureomiAccess,
    coverThemeName: selectedCollectionTheme?.name ?? '골목 관찰 노트',
    featuredCats: customization.featuredCatSlots
      .map((slot) => myCats.find((cat) => cat.id === slot.catId))
      .filter((cat): cat is NonNullable<typeof cat> => Boolean(cat)),
    selectedBadges: selectedCollectionBadges,
    selectedStamps: selectedCollectionStamps,
    achievedBadgeCount: customization.alleyBadges.filter((badge) => badge.achieved).length,
    achievedStampCount: customization.seasonStamps.filter((stamp) => stamp.achieved).length,
  };
  const likedCollections = publicCollections.filter((collection) => collection.viewer.liked && !collection.viewer.isOwner);

  const renderScreen = () => {
    switch (navigation.screen) {
      case 'home':
        return (
          <HomeScreen
            onGoCapture={() => handleTabChange('capture')}
            onOpenCat={handleOpenCat}
            recentCats={recentCats}
            summary={homeSummary}
          />
        );
      case 'dex':
        return (
          <CatDexScreen
            cats={cats}
            collectionProfile={customization.profile}
            collectionSummary={collectionSummary}
            collectionTheme={selectedCollectionTheme}
            onOpenCollectionRankings={handleOpenCollectionRankings}
            onOpenCollectionDrawer={handleOpenCollectionDrawer}
            onOpenCat={handleOpenCat}
            placeholders={undiscoveredDexSlots}
            progress={dexProgress}
          />
        );
      case 'detail':
        return selectedCat ? (
          <CatDetailScreen
            cat={selectedCat}
            encounters={selectedCatEncounters}
            onBack={() => handleTabChange('dex')}
            onRecordEncounter={handleRecordEncounter}
            onReportCat={handleReportSelectedCat}
          />
        ) : (
          <CatDexScreen
            cats={cats}
            collectionProfile={customization.profile}
            collectionSummary={collectionSummary}
            collectionTheme={selectedCollectionTheme}
            onOpenCollectionRankings={handleOpenCollectionRankings}
            onOpenCollectionDrawer={handleOpenCollectionDrawer}
            onOpenCat={handleOpenCat}
            placeholders={undiscoveredDexSlots}
            progress={dexProgress}
          />
        );
      case 'capture':
        return (
          <CaptureScreen
            coatOptions={apiCoatOptions}
            existingCats={cats}
            isSubmitting={isSaving}
            onRecordExisting={handleRecordExistingCat}
            onSave={handleSaveCapture}
            onSaveSighting={handleSaveSighting}
            personalityOptions={apiPersonalityOptions}
            regions={regions}
          />
        );
      case 'map':
        return <MapScreen mode="personal" onOpenSharedMap={handleOpenSharedMap} regions={myRegions} />;
      case 'sharedMap':
        return <MapScreen mode="shared" regions={regions} />;
      case 'community':
        return (
          <CommunityFeedScreen
            currentUser={currentUser}
            errorMessage={community.errorMessage}
            isLoading={community.isLoading}
            isPaginating={community.isPaginating}
            isRefreshing={community.isRefreshing}
            onDeletePost={(post) => (currentUser ? community.removePost(post.id, currentUser) : undefined)}
            onLoadMore={community.loadMore}
            onOpenComments={handleOpenCommunityComments}
            onOpenCreate={handleOpenCommunityPostCreate}
            onRefresh={community.refresh}
            onReportPost={handleReportCommunityPost}
            onRetry={community.retry}
            onToggleLike={(post) => (currentUser ? community.toggleLike(post.id, currentUser) : undefined)}
            posts={community.posts}
          />
        );
      case 'communityPostCreate':
        return (
          <CommunityPostCreateScreen
            currentUser={currentUser}
            onBack={() => handleTabChange('community')}
            onCreatePost={community.addPost}
          />
        );
      case 'communityComments':
        return (
          <CommunityCommentsScreen
            currentUser={currentUser}
            onBack={() => handleTabChange('community')}
            onCreateComment={community.addComment}
            onDeleteComment={community.removeComment}
            onLoadComments={community.loadComments}
            post={community.getPostById(navigation.selectedCommunityPostId)}
          />
        );
      case 'my':
        return currentUser ? (
          <MyPageScreen
            badges={badges}
            collectionSummary={collectionSummary}
            isSigningOut={isSigningOut}
            myCats={myCats}
            onOpenCollectionDrawer={handleOpenCollectionDrawer}
            onOpenCollectionRankings={handleOpenCollectionRankings}
            onOpenExplorationHistory={handleOpenExplorationHistory}
            onOpenSharedCollections={handleOpenSharedCollections}
            onOpenLikedCollections={handleOpenLikedCollections}
            onOpenNotifications={handleOpenNotifications}
            onOpenProfileEdit={handleOpenProfileEdit}
            onOpenCat={handleOpenCat}
            onLogout={logout}
            profile={profile}
            user={currentUser}
          />
        ) : null;
      case 'explorationHistory':
        return (
          <ExplorationHistoryScreen
            cats={myCats}
            onBack={() => handleTabChange('my')}
            onOpenCat={handleOpenCat}
          />
        );
      case 'sharedCollections':
        return currentUser ? (
          <SharedCollectionsScreen
            cats={myCats}
            collectionProfile={customization.profile}
            collectionSummary={collectionSummary}
            onBack={() => handleTabChange('my')}
            onOpenCat={handleOpenCat}
            onOpenCollectionDrawer={handleOpenCollectionDrawer}
            user={currentUser}
          />
        ) : null;
      case 'likedCollections':
        return (
          <LikedCollectionsScreen
            collections={likedCollections}
            isLoading={isSocialLoading}
            onBack={() => handleTabChange('my')}
            onOpenCollection={handleOpenPublicCollection}
          />
        );
      case 'profileEdit':
        return currentUser ? (
          <ProfileEditScreen
            isSaving={isProfileSaving}
            onBack={() => handleTabChange('my')}
            onSave={handleSaveProfile}
            user={currentUser}
          />
        ) : null;
      case 'notifications':
        return (
          <NotificationSettingsScreen
            isSaving={isNotificationSaving}
            onBack={() => handleTabChange('my')}
            onChangeSettings={handleChangeNotificationSettings}
            onRequestPermission={handleRequestNotificationPermission}
            onSendPreview={handleSendNotificationPreview}
            permissionState={notificationPermissionState}
            settings={notificationSettings}
          />
        );
      case 'drawer':
        return (
          <CollectionDrawerScreen
            customization={customization}
            isPaymentAvailable={payments.isAvailable}
            isPurchasing={payments.isPurchasing}
            isSaving={isSaving}
            myCats={myCats}
            onBack={() => handleTabChange('my')}
            onPurchasePackage={payments.purchase}
            onRestorePurchases={payments.restore}
            onSaveFeaturedCat={handleSaveFeaturedCat}
            onSaveProfile={handleSaveCollectionProfile}
            onShowUpsell={handleShowNyangkkureomiUpsell}
            paymentErrorMessage={payments.errorMessage}
            paymentPackages={payments.packages}
          />
        );
      case 'subscriptionUpsell':
        return (
          <NyangkkureomiUpsellScreen
            isPaymentAvailable={payments.isAvailable}
            isPurchasing={payments.isPurchasing}
            onBack={() => handleTabChange(upsellSource === 'map' ? 'map' : 'my')}
            onPurchasePackage={payments.purchase}
            onRestorePurchases={payments.restore}
            onShowPaymentSetup={handleShowPaymentSetup}
            paymentErrorMessage={payments.errorMessage}
            paymentPackages={payments.packages}
            source={upsellSource}
          />
        );
      case 'ranking':
        return (
          <NeighborhoodRankingScreen
            collections={publicCollections}
            isLoading={isSocialLoading}
            onBack={() => handleTabChange('dex')}
            onOpenCollection={handleOpenPublicCollection}
          />
        );
      case 'publicCollection':
        return (
          <PublicCollectionScreen
            collection={selectedPublicCollection}
            isLoading={isSocialLoading}
            isSaving={isSaving}
            onBack={handleOpenCollectionRankings}
            onToggleFollow={handleToggleCollectionFollow}
            onToggleLike={handleToggleCollectionLike}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {!hasCompletedSplash || isRestoring ? (
        <SplashScreen />
      ) : isAuthenticated && currentUser ? (
        <AppShell bottomBar={<BottomTabBar activeTab={activeTab} onChange={handleTabChange} />}>
          {renderScreen()}
        </AppShell>
      ) : (
        <LoginScreen
          isRestoring={isRestoring}
          errorMessage={authErrorMessage}
          onLoginWithGoogle={loginWithGoogle}
          onLoginWithKakao={loginWithKakao}
          pendingProvider={pendingProvider}
        />
      )}
    </SafeAreaProvider>
  );
}
