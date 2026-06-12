import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppShell } from '@/shared/components/AppShell';
import { BottomTabBar } from '@/shared/components/BottomTabBar';
import { fetchMyRegions, fetchProfile, fetchRegions } from '@/shared/api/app.api';
import { fetchCatOptions, reportCat } from '@/shared/api/cats.api';
import { fetchSharedMapAccess, fetchSharedMapRegions, restoreSharedMapPurchase, startSharedMapPurchase } from '@/shared/api/shared-map.api';
import { coatOptions, personalityOptions } from '@/shared/constants/cat.constants';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { CaptureScreen } from '@/features/capture/CaptureScreen';
import { CatDetailScreen } from '@/features/cats/CatDetailScreen';
import { CatDexScreen } from '@/features/cats/CatDexScreen';
import { useCats } from '@/features/cats/hooks/useCats';
import { CommunityCommentsScreen } from '@/features/community/CommunityCommentsScreen';
import { CommunityFeedScreen } from '@/features/community/CommunityFeedScreen';
import { CommunityMediaScreen } from '@/features/community/CommunityMediaScreen';
import { CommunityPostCreateScreen } from '@/features/community/CommunityPostCreateScreen';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { MapScreen } from '@/features/map/MapScreen';
import { ExplorationHistoryScreen } from '@/features/my/MyLinkedCollectionScreens';
import { MyPageScreen } from '@/features/my/MyPageScreen';
import { ProfileEditScreen } from '@/features/my/ProfileEditScreen';
import { NotificationSettingsScreen } from '@/features/notifications/NotificationSettingsScreen';
import { SplashScreen } from '@/features/splash/SplashScreen';
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
  sendNotificationPreview,
} from '@/shared/notifications/notification.service';
import type { ProfileUpdateDraft } from '@/shared/types/auth';
import type { CatEncounterDraft, CaptureCatDraft, CatType, PersonalityTag } from '@/shared/types/cat';
import type { CommunityPost, CommunityPostMedia, CommunityReportReason } from '@/features/community/types';
import type { SharedMapAccess } from '@/shared/types/entitlement';
import type { NavigationState, TabScreen } from '@/shared/types/navigation';
import type { NotificationPermissionState, NotificationSettings } from '@/shared/types/notification';
import type { ExplorerProfile } from '@/shared/types/profile';
import type { Region } from '@/shared/types/region';

const emptyProfile: ExplorerProfile = {
  title: '동네 냥이 탐험가',
  level: 1,
  totalDiscoveries: 0,
  rediscoveries: 0,
  nextLevelProgress: 0,
  nextLevelLabel: '탐험 기록을 불러오는 중',
};

const defaultSharedMapAccess: SharedMapAccess = {
  hasLifetimeAccess: false,
  priceLabel: '15,900원',
};

function applySettledResource<T>(label: string, result: PromiseSettledResult<T>, apply: (value: T) => void) {
  if (result.status === 'fulfilled') {
    apply(result.value);
    return;
  }

  console.warn(`[catdex] ${label} 리소스 로드 실패`, result.reason);
}

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
  });
  const [hasCompletedSplash, setHasCompletedSplash] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiCoatOptions, setApiCoatOptions] = useState<CatType[]>(coatOptions);
  const [apiPersonalityOptions, setApiPersonalityOptions] = useState<PersonalityTag[]>(personalityOptions);
  const [regions, setRegions] = useState<Region[]>([]);
  const [myRegions, setMyRegions] = useState<Region[]>([]);
  const [sharedMapAccess, setSharedMapAccess] = useState<SharedMapAccess>(defaultSharedMapAccess);
  const [sharedMapRegions, setSharedMapRegions] = useState<Region[]>([]);
  const [isSharedMapPurchasePending, setIsSharedMapPurchasePending] = useState(false);
  const [profile, setProfile] = useState<ExplorerProfile>(emptyProfile);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [notificationPermissionState, setNotificationPermissionState] = useState<NotificationPermissionState>('undetermined');
  const [isNotificationSaving, setIsNotificationSaving] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const {
    addEncounter,
    cats,
    createCat,
    createCatSighting,
    dexProgress,
    myCats,
    selectedCat,
    selectedCatEncounters,
    undiscoveredDexSlots,
  } = useCats(navigation.selectedCatId, isAuthenticated);
  const community = useCommunity(currentUser);

  const activeTab: TabScreen =
    navigation.screen === 'detail'
      ? 'dex'
      : navigation.screen === 'communityPostCreate' || navigation.screen === 'communityComments' || navigation.screen === 'communityMedia'
        ? 'community'
      : navigation.screen === 'explorationHistory' || navigation.screen === 'profileEdit' || navigation.screen === 'notifications'
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

  const reloadAppResources = useCallback(async () => {
    const [nextOptions, nextRegions, nextMyRegions, nextProfile, nextSharedMapAccess] = await Promise.allSettled([
      fetchCatOptions(),
      fetchRegions(),
      fetchMyRegions(),
      fetchProfile(),
      fetchSharedMapAccess(),
    ]);

    const canLoadSharedMap = nextSharedMapAccess.status === 'fulfilled' && nextSharedMapAccess.value.hasLifetimeAccess;

    applySettledResource('고양이 옵션', nextOptions, (options) => {
      setApiCoatOptions(options.coatTypes);
      setApiPersonalityOptions(options.personalityTags);
    });
    applySettledResource('공유 지역', nextRegions, setRegions);
    applySettledResource('내 발견 지역', nextMyRegions, setMyRegions);
    applySettledResource('프로필', nextProfile, setProfile);
    applySettledResource('공유지도 권한', nextSharedMapAccess, setSharedMapAccess);

    if (nextSharedMapAccess.status === 'rejected') {
      setSharedMapAccess(defaultSharedMapAccess);
    }

    if (!canLoadSharedMap) {
      setSharedMapRegions([]);
      return;
    }

    try {
      setSharedMapRegions(await fetchSharedMapRegions());
    } catch (error) {
      console.warn('[catdex] 공유지도 지역 리소스 로드 실패', error);
      setSharedMapRegions([]);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      reloadAppResources();
      return;
    }

    setSharedMapAccess(defaultSharedMapAccess);
    setSharedMapRegions([]);
    setIsSharedMapPurchasePending(false);
  }, [isAuthenticated, reloadAppResources]);

  useEffect(() => {
    if (isAuthenticated && navigation.screen === 'home') {
      reloadAppResources();
    }
  }, [isAuthenticated, navigation.screen, reloadAppResources]);

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
      selectedCommunityPostId: null,
    });
  };

  const handleOpenCat = (catId: string) => {
    setNavigation({
      screen: 'detail',
      selectedCatId: catId,
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
      });
    } catch (error) {
      Alert.alert('도감 등록 실패', error instanceof Error ? error.message : '고양이를 도감에 등록하지 못했어요.');
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
      });
    } catch (error) {
      Alert.alert('제보 저장 실패', error instanceof Error ? error.message : '미확인 제보를 저장하지 못했어요.');
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

  const handleOpenExplorationHistory = () => {
    setNavigation({
      screen: 'explorationHistory',
      selectedCatId: null,
    });
  };

  const handleOpenNotifications = () => {
    setNavigation({
      screen: 'notifications',
      selectedCatId: null,
    });
  };

  const handleOpenProfileEdit = () => {
    setNavigation({
      screen: 'profileEdit',
      selectedCatId: null,
    });
  };

  const handleOpenCommunityPostCreate = () => {
    setNavigation({
      screen: 'communityPostCreate',
      selectedCatId: null,
      selectedCommunityPostId: null,
    });
  };

  const handleOpenCommunityComments = (post: CommunityPost) => {
    setNavigation({
      screen: 'communityComments',
      selectedCatId: null,
      selectedCommunityPostId: post.id,
    });
  };

  const handleOpenCommunityMedia = (
    post: CommunityPost,
    media: CommunityPostMedia,
    returnScreen: 'community' | 'communityComments' = 'community',
  ) => {
    setNavigation({
      screen: 'communityMedia',
      selectedCatId: null,
      selectedCommunityPostId: post.id,
      selectedCommunityMediaId: media.id,
      communityMediaReturnScreen: returnScreen,
    });
  };

  const handleCloseCommunityMedia = () => {
    if (navigation.communityMediaReturnScreen === 'communityComments' && navigation.selectedCommunityPostId) {
      setNavigation({
        screen: 'communityComments',
        selectedCatId: null,
        selectedCommunityPostId: navigation.selectedCommunityPostId,
      });
      return;
    }

    handleTabChange('community');
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

  const handleStartSharedMapPurchase = async () => {
    setIsSharedMapPurchasePending(true);

    try {
      const purchase = await startSharedMapPurchase();

      if (!purchase.hasLifetimeAccess) {
        Alert.alert('결제 미완료', purchase.message ?? '공유지도 평생 이용권 결제가 완료되지 않았어요.');
        return;
      }

      await reloadAppResources();
      setSharedMapAccess({
        hasLifetimeAccess: true,
        priceLabel: sharedMapAccess.priceLabel,
        source: 'revenuecat',
      });
      Alert.alert('구매 완료', '공유지도 평생 이용권이 활성화됐어요.');
    } catch (error) {
      Alert.alert('결제 실패', error instanceof Error ? error.message : '공유지도 결제를 완료하지 못했어요.');
    } finally {
      setIsSharedMapPurchasePending(false);
    }
  };

  const handleRestoreSharedMapPurchase = async () => {
    setIsSharedMapPurchasePending(true);

    try {
      const purchase = await restoreSharedMapPurchase();

      if (!purchase.hasLifetimeAccess) {
        Alert.alert('복원 내역 없음', purchase.message ?? '복원 가능한 공유지도 구매 내역이 없습니다.');
        return;
      }

      await reloadAppResources();
      setSharedMapAccess({
        hasLifetimeAccess: true,
        priceLabel: sharedMapAccess.priceLabel,
        source: 'revenuecat',
      });
      Alert.alert('복원 완료', '공유지도 평생 이용권이 복원됐어요.');
    } catch (error) {
      Alert.alert('복원 실패', error instanceof Error ? error.message : '공유지도 구매 내역을 복원하지 못했어요.');
    } finally {
      setIsSharedMapPurchasePending(false);
    }
  };

  const handleSaveProfile = async (draft: ProfileUpdateDraft) => {
    setIsProfileSaving(true);

    try {
      await updateProfile(draft);
      setNavigation({
        screen: 'my',
        selectedCatId: null,
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
      await sendNotificationPreview();
    } finally {
      setIsNotificationSaving(false);
    }
  };

  const renderScreen = () => {
    switch (navigation.screen) {
      case 'home':
        return (
          <MapScreen
            hasSharedMapAccess={sharedMapAccess.hasLifetimeAccess}
            isSharedMapPurchasePending={isSharedMapPurchasePending}
            onOpenCat={handleOpenCat}
            onRestoreSharedMapPurchase={handleRestoreSharedMapPurchase}
            onStartSharedMapPurchase={handleStartSharedMapPurchase}
            regions={myRegions}
            sharedMapPriceLabel={sharedMapAccess.priceLabel}
            sharedRegions={sharedMapRegions}
          />
        );
      case 'dex':
        return (
          <CatDexScreen
            cats={cats}
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
            onOpenMedia={(post, media) => handleOpenCommunityMedia(post, media, 'community')}
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
            onOpenMedia={(post, media) => handleOpenCommunityMedia(post, media, 'communityComments')}
            post={community.getPostById(navigation.selectedCommunityPostId)}
          />
        );
      case 'communityMedia':
        return (
          <CommunityMediaScreen
            onBack={handleCloseCommunityMedia}
            post={community.getPostById(navigation.selectedCommunityPostId)}
            selectedMediaId={navigation.selectedCommunityMediaId}
          />
        );
      case 'my':
        return currentUser ? (
          <MyPageScreen
            isSigningOut={isSigningOut}
            myCats={myCats}
            onOpenCat={handleOpenCat}
            onOpenExplorationHistory={handleOpenExplorationHistory}
            onOpenNotifications={handleOpenNotifications}
            onOpenProfileEdit={handleOpenProfileEdit}
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
        <AppShell
          bottomBar={<BottomTabBar activeTab={activeTab} onChange={handleTabChange} variant={activeTab === 'home' ? 'embedded' : 'floating'} />}
          bottomBarVariant={activeTab === 'home' ? 'docked' : 'floating'}
        >
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
