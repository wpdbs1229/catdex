import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppShell } from '@/shared/components/AppShell';
import { BottomTabBar } from '@/shared/components/BottomTabBar';
import { fetchMyRegions, fetchProfile, fetchRegions } from '@/shared/api/app.api';
import { fetchCatOptions, reportCat } from '@/shared/api/cats.api';
import { coatOptions, personalityOptions } from '@/shared/constants/cat.constants';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { CaptureScreen } from '@/features/capture/CaptureScreen';
import { CatDetailScreen } from '@/features/cats/CatDetailScreen';
import { CatDexScreen } from '@/features/cats/CatDexScreen';
import { useCats } from '@/features/cats/hooks/useCats';
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

  const activeTab: TabScreen =
    navigation.screen === 'detail'
      ? 'dex'
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
    const [nextOptions, nextRegions, nextMyRegions, nextProfile] = await Promise.allSettled([
      fetchCatOptions(),
      fetchRegions(),
      fetchMyRegions(),
      fetchProfile(),
    ]);

    applySettledResource('고양이 옵션', nextOptions, (options) => {
      setApiCoatOptions(options.coatTypes);
      setApiPersonalityOptions(options.personalityTags);
    });
    applySettledResource('공유 지역', nextRegions, setRegions);
    applySettledResource('내 발견 지역', nextMyRegions, setMyRegions);
    applySettledResource('프로필', nextProfile, setProfile);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      reloadAppResources();
    }
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
        return <MapScreen regions={myRegions} />;
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
