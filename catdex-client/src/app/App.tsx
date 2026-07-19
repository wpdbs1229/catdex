import { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fetchAchievedBadges, fetchProfile, fetchRegions, uploadCatObservationImage } from '@/shared/api/app.api';
import { fetchCollectionCustomization, saveFeaturedCats } from '@/shared/api/collection.api';
import {
  createCatObservation,
  fetchCatMatchCandidates,
  fetchCatOptions,
  reportCat,
  resolveCatObservation,
} from '@/shared/api/cats.api';
import { fetchRemoteNotificationSettings, registerNotificationDevice, saveRemoteNotificationSettings } from '@/shared/api/notifications.api';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { ProfileSetupScreen } from '@/features/auth/ProfileSetupScreen';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { CaptureScreen } from '@/features/capture/CaptureScreen';
import { CatDetailScreen } from '@/features/cats/CatDetailScreen';
import { CatDexScreen } from '@/features/cats/CatDexScreen';
import { CatEditScreen } from '@/features/cats/CatEditScreen';
import { useCats } from '@/features/cats/hooks/useCats';
import { CommunityBoardScreen } from '@/features/community/CommunityBoardScreen';
import { CommunityComposerScreen } from '@/features/community/CommunityComposerScreen';
import { MyCommunityPostsScreen } from '@/features/community/MyCommunityPostsScreen';
import { CommunityPostDetailScreen } from '@/features/community/CommunityPostDetailScreen';
import { HomeScreen } from '@/features/home/HomeScreen';
import { NeighborhoodDexScreen } from '@/features/map/NeighborhoodDexScreen';
import { NeighborhoodMapScreen } from '@/features/map/NeighborhoodMapScreen';
import { BlockedUsersScreen } from '@/features/my/BlockedUsersScreen';
import { ExplorationHistoryScreen } from '@/features/my/MyLinkedCollectionScreens';
import { BadgeBookScreen } from '@/features/my/BadgeBookScreen';
import { MyPageScreen } from '@/features/my/MyPageScreen';
import { ProfileEditScreen } from '@/features/my/ProfileEditScreen';
import { NotificationInboxScreen } from '@/features/notifications/NotificationInboxScreen';
import { NotificationSettingsScreen } from '@/features/notifications/NotificationSettingsScreen';
import { SplashScreen } from '@/features/splash/SplashScreen';
import { AppShell } from '@/shared/components/AppShell';
import { BottomTabBar } from '@/shared/components/BottomTabBar';
import { coatOptions, personalityOptions } from '@/shared/constants/cat.constants';
import { getUserFacingError } from '@/shared/errors/user-facing-error';
import { detectCurrentNeighborhood } from '@/shared/neighborhood/neighborhood-location';
import { isMatchingNeighborhoodName, uniqueNeighborhoodRegionNames } from '@/shared/neighborhood/neighborhood-match';
import { loadNeighborhoodState, saveNeighborhoodState } from '@/shared/neighborhood/neighborhood-storage';
import {
  addNotificationTapListener,
  applyNotificationSettings,
  defaultNotificationSettings,
  getExpoPushTokenForDevice,
  getInitialNotificationTap,
  getNotificationDevicePlatform,
  getNotificationPermissionState,
  loadNotificationSettings,
  mergeNotificationSettings,
  requestNotificationPermissions,
  sendAchievementPreviewNotification,
  type NotificationTapPayload,
} from '@/shared/notifications/notification.service';
import type { ProfileUpdateDraft } from '@/shared/types/auth';
import type { Badge, ExplorerProfile } from '@/shared/types/badge';
import type { CatEncounter, CatProfileUpdateDraft, CaptureCatDraft, ProcessedCatPhoto } from '@/shared/types/cat';
import type { CatType, PersonalityTag } from '@/shared/types/cat';
import type { CollectionCustomizationState, CollectionSummary } from '@/shared/types/collection';
import type { NavigationState, TabScreen } from '@/shared/types/navigation';
import { MAX_SAVED_NEIGHBORHOODS, type SavedNeighborhood } from '@/shared/types/neighborhood';
import type { NotificationEvent, NotificationPermissionState, NotificationSettings } from '@/shared/types/notification';
import type { Region } from '@/shared/types/region';

const emptyProfile: ExplorerProfile = {
  title: '냥냥단 인턴',
  level: 1,
  totalDiscoveries: 0,
  rediscoveries: 0,
  nextLevelProgress: 0,
  nextLevelLabel: '첫 고양이를 기록하면 냥냥단 주임으로 승진',
};

const emptyCustomization: CollectionCustomizationState = {
  featuredCatSlots: [],
};

const UNSET_NEIGHBORHOOD_NAME = '동네 설정 전';

type NeighborhoodView = 'dex' | 'map' | 'board';
type CommunityReturnScreen = 'dex' | 'map' | 'board' | 'myCommunityPosts';

function isSameNeighborhood(left: SavedNeighborhood, right: SavedNeighborhood) {
  return (
    left.id === right.id ||
    (left.name === right.name && left.city === right.city && left.district === right.district)
  );
}

function buildNeighborhoodRegions(neighborhoods: SavedNeighborhood[]) {
  return neighborhoods.map<Region>((neighborhood) => ({
    id: neighborhood.id,
    name: neighborhood.name,
    lat: neighborhood.lat,
    lng: neighborhood.lng,
    radius: neighborhood.radius,
    catIds: [],
    cats: neighborhood.cats,
  }));
}

function getNeighborhoodRegions(regions: Region[], neighborhoodName: string) {
  return regions.filter((region) => isMatchingNeighborhoodName(region.name, neighborhoodName));
}

function getRegionCatKeys(region: Region) {
  return region.catIds.length > 0 ? region.catIds : region.cats;
}

function getNeighborhoodCatCount(regions: Region[], neighborhoodName: string) {
  return new Set(getNeighborhoodRegions(regions, neighborhoodName).flatMap(getRegionCatKeys)).size;
}

function getNeighborhoodRequiredAlert() {
  return {
    title: '동네를 먼저 설정해 주세요',
    message: '현재 위치로 동네를 추가한 뒤 고양이를 기록할 수 있어요.',
  };
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
    withdrawAccount,
    logout,
    isWithdrawing,
  } = useAuth();
  const [navigation, setNavigation] = useState<NavigationState>({
    screen: 'home',
    selectedCatId: null,
    selectedOwnerId: null,
    selectedCommunityCatId: null,
    selectedCommunityPostId: null,
  });
  const [neighborhoodView, setNeighborhoodView] = useState<NeighborhoodView>('dex');
  const [savedNeighborhoods, setSavedNeighborhoods] = useState<SavedNeighborhood[]>([]);
  const [activeNeighborhoodId, setActiveNeighborhoodId] = useState('');
  const [hasLoadedNeighborhoodState, setHasLoadedNeighborhoodState] = useState(false);
  const [isDetectingNeighborhood, setIsDetectingNeighborhood] = useState(false);
  const [hasCompletedSplash, setHasCompletedSplash] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiCoatOptions, setApiCoatOptions] = useState<CatType[]>(coatOptions);
  const [apiPersonalityOptions, setApiPersonalityOptions] = useState<PersonalityTag[]>(personalityOptions);
  const [regions, setRegions] = useState<Region[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [profile, setProfile] = useState<ExplorerProfile>(emptyProfile);
  const [customization, setCustomization] = useState<CollectionCustomizationState>(emptyCustomization);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [notificationPermissionState, setNotificationPermissionState] = useState<NotificationPermissionState>('undetermined');
  const [isNotificationSaving, setIsNotificationSaving] = useState(false);
  const [notificationReturnScreen, setNotificationReturnScreen] = useState<TabScreen>('my');
  const [communityReturnScreen, setCommunityReturnScreen] = useState<CommunityReturnScreen>('board');
  const [shouldEditCommunityPostOnOpen, setShouldEditCommunityPostOnOpen] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isFeaturedCatsSaving, setIsFeaturedCatsSaving] = useState(false);
  const [isCatProfileSaving, setIsCatProfileSaving] = useState(false);
  const {
    addEncounter,
    cats,
    createCat,
    removeEncounter,
    createCatSighting,
    dexProgress,
    homeSummary,
    myCats,
    selectedCat,
    selectedCatEncounters,
    undiscoveredDexSlots,
    updateCatProfile,
  } = useCats(navigation.selectedCatId, isAuthenticated);
  const activeNeighborhood =
    savedNeighborhoods.find((neighborhood) => neighborhood.id === activeNeighborhoodId) ??
    savedNeighborhoods[0] ??
    null;
  const hasActiveNeighborhood = activeNeighborhood !== null;
  const activeNeighborhoodName = activeNeighborhood?.name ?? UNSET_NEIGHBORHOOD_NAME;
  const activeNeighborhoodRegions = useMemo(
    () => (activeNeighborhood ? getNeighborhoodRegions(regions, activeNeighborhood.name) : []),
    [activeNeighborhood, regions],
  );
  const neighborhoodCatCounts = useMemo(
    () =>
      savedNeighborhoods.reduce<Record<string, number>>((acc, neighborhood) => {
        acc[neighborhood.id] = getNeighborhoodCatCount(regions, neighborhood.name);
        return acc;
      }, {}),
    [regions, savedNeighborhoods],
  );
  const visibleRegions = useMemo(
    () =>
      activeNeighborhood
        ? activeNeighborhoodRegions.length > 0
          ? activeNeighborhoodRegions
          : buildNeighborhoodRegions([activeNeighborhood])
        : [],
    [activeNeighborhood, activeNeighborhoodRegions],
  );
  const activeNeighborhoodRegionNames = useMemo(
    () =>
      activeNeighborhood
        ? uniqueNeighborhoodRegionNames(
            activeNeighborhoodName,
            activeNeighborhoodRegions.map((region) => region.name),
          )
        : [],
    [activeNeighborhood, activeNeighborhoodName, activeNeighborhoodRegions],
  );
  const visibleSelectedCat = selectedCat;
  const activeTab: TabScreen = (() => {
    switch (navigation.screen) {
      case 'detail':
      case 'catEdit':
        return 'dex';
      case 'communityPostDetail':
        return communityReturnScreen === 'myCommunityPosts' ? 'my' : 'map';
      case 'communityCompose':
        return 'map';
      case 'myCommunityPosts':
        return 'my';
      case 'explorationHistory':
      case 'blockedUsers':
      case 'badgeBook':
      case 'profileEdit':
      case 'notificationInbox':
      case 'notifications':
        return navigation.screen === 'notifications' || navigation.screen === 'notificationInbox' ? notificationReturnScreen : 'my';
      default:
        return navigation.screen;
    }
  })();
  const shouldHideBottomBar = activeTab === 'capture';

  useEffect(() => {
    const timerId = setTimeout(() => {
      setHasCompletedSplash(true);
    }, 1400);

    return () => {
      clearTimeout(timerId);
    };
  }, []);

  const currentUserId = currentUser?.id ?? null;

  useEffect(() => {
    let isMounted = true;

    // 계정별로 저장된 동네를 불러온다. 로그아웃 상태에서는 초기화한다.
    if (!currentUserId) {
      setSavedNeighborhoods([]);
      setActiveNeighborhoodId('');
      setHasLoadedNeighborhoodState(false);
      return;
    }

    loadNeighborhoodState(currentUserId)
      .then((nextState) => {
        if (!isMounted) {
          return;
        }

        setSavedNeighborhoods(nextState.savedNeighborhoods);
        setActiveNeighborhoodId(nextState.activeNeighborhoodId);
      })
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) {
          setHasLoadedNeighborhoodState(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!hasLoadedNeighborhoodState || !currentUserId) {
      return;
    }

    saveNeighborhoodState(
      {
        activeNeighborhoodId,
        savedNeighborhoods,
      },
      currentUserId,
    ).catch(() => undefined);
  }, [activeNeighborhoodId, currentUserId, hasLoadedNeighborhoodState, savedNeighborhoods]);

  const reloadAppResources = async () => {
    const [nextOptions, nextRegions, nextBadges, nextProfile, nextCustomization] = await Promise.all([
      fetchCatOptions(),
      fetchRegions(),
      fetchAchievedBadges(),
      fetchProfile(),
      fetchCollectionCustomization(),
    ]);

    setApiCoatOptions(nextOptions.coatTypes);
    setApiPersonalityOptions(nextOptions.personalityTags);
    setRegions(nextRegions);
    setBadges(nextBadges);
    setProfile(nextProfile);
    setCustomization(nextCustomization);
  };

  const reloadAppResourcesWithRetry = () => {
    reloadAppResources().catch((error) => {
      console.warn('[app] resource load failed', error);
      const friendlyError = getUserFacingError(error, 'generic');
      Alert.alert(friendlyError.title, friendlyError.message, [
        { text: '나중에', style: 'cancel' },
        { text: '다시 시도', onPress: () => reloadAppResourcesWithRetry() },
      ]);
    });
  };

  useEffect(() => {
    if (isAuthenticated) {
      reloadAppResourcesWithRetry();
      return;
    }

    // 로그아웃/탈퇴 시 이전 사용자 데이터가 다음 사용자에게 보이지 않도록 초기화한다.
    setApiCoatOptions(coatOptions);
    setApiPersonalityOptions(personalityOptions);
    setRegions([]);
    setBadges([]);
    setProfile(emptyProfile);
    setCustomization(emptyCustomization);
    setNotificationSettings(defaultNotificationSettings);
    setNavigation({
      screen: 'home',
      selectedCatId: null,
      selectedOwnerId: null,
      selectedCommunityCatId: null,
      selectedCommunityPostId: null,
    });
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

      // 권한이 이미 허용된 상태(재설치, 토큰 회전 포함)에서도 기기 토큰을
      // 서버에 등록해 푸시가 유실되지 않게 한다. 시뮬레이터 등 토큰을 못
      // 받는 환경에서는 조용히 건너뛴다.
      if (nextPermissionState === 'granted') {
        try {
          const expoPushToken = await getExpoPushTokenForDevice();
          await registerNotificationDevice(expoPushToken, getNotificationDevicePlatform());
        } catch (error) {
          console.warn('[notifications] device registration skipped', error);
        }
      }
    }

    loadNotifications().catch((error) => {
      // 알림 설정 로드 실패가 앱 진입을 막지 않도록 한다.
      console.warn('[notifications] load failed', error);
    });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const handleTabChange = (screen: TabScreen) => {
    if (screen === 'capture' && !hasActiveNeighborhood) {
      const alert = getNeighborhoodRequiredAlert();
      Alert.alert(alert.title, alert.message);
      return;
    }

    if (screen === 'map') {
      setNeighborhoodView('dex');
    }

    setNavigation({
      screen,
      selectedCatId: null,
      selectedOwnerId: null,
    });
  };

  const handleOpenCat = (catId: string) => {
    setNavigation({
      screen: 'detail',
      selectedCatId: catId,
      selectedOwnerId: null,
    });
  };

  const handleOpenCatEdit = (catId: string) => {
    setNavigation({
      screen: 'catEdit',
      selectedCatId: catId,
      selectedOwnerId: null,
    });
  };

  const handleOpenNeighborhoodDex = () => {
    setNeighborhoodView('dex');
    setNavigation({
      screen: 'map',
      selectedCatId: null,
      selectedOwnerId: null,
      selectedCommunityPostId: null,
    });
  };

  const handleOpenNeighborhoodMap = () => {
    setNeighborhoodView('map');
    setNavigation({
      screen: 'map',
      selectedCatId: null,
      selectedOwnerId: null,
      selectedCommunityPostId: null,
    });
  };

  const handleOpenCommunityBoard = () => {
    setNeighborhoodView('board');
    setNavigation({
      screen: 'map',
      selectedCatId: null,
      selectedOwnerId: null,
      selectedCommunityPostId: null,
    });
  };

  const handleOpenCommunityPost = (postId: string, returnScreen: CommunityReturnScreen = 'board', options?: { startEditing?: boolean }) => {
    setCommunityReturnScreen(returnScreen);
    setShouldEditCommunityPostOnOpen(Boolean(options?.startEditing));
    setNeighborhoodView('board');
    setNavigation({
      screen: 'communityPostDetail',
      selectedCatId: null,
      selectedOwnerId: null,
      selectedCommunityCatId: null,
      selectedCommunityPostId: postId,
    });
  };

  const handleOpenCommunityCompose = (catId?: string, returnScreen: CommunityReturnScreen = 'board') => {
    // 동네가 없으면 region_name이 '동네 설정 전'으로 저장되어
    // 어떤 동네 게시판에서도 글이 보이지 않게 되므로 촬영과 동일하게 막는다.
    if (!hasActiveNeighborhood) {
      const alert = getNeighborhoodRequiredAlert();
      Alert.alert(alert.title, alert.message);
      return;
    }

    setCommunityReturnScreen(returnScreen);
    setShouldEditCommunityPostOnOpen(false);
    setNeighborhoodView('board');
    setNavigation({
      screen: 'communityCompose',
      selectedCatId: null,
      selectedOwnerId: null,
      selectedCommunityCatId: catId ?? null,
      selectedCommunityPostId: null,
    });
  };

  const handleReturnFromCommunityPost = () => {
    setShouldEditCommunityPostOnOpen(false);

    if (communityReturnScreen === 'myCommunityPosts') {
      handleOpenMyCommunityPosts();
      return;
    }

    if (communityReturnScreen === 'dex') {
      handleOpenNeighborhoodDex();
      return;
    }

    if (communityReturnScreen === 'map') {
      handleOpenNeighborhoodMap();
      return;
    }

    handleOpenCommunityBoard();
  };

  const handleSelectNeighborhood = (neighborhoodId: string) => {
    setActiveNeighborhoodId(neighborhoodId);
  };

  const handleDetectNeighborhood = async () => {
    setIsDetectingNeighborhood(true);

    try {
      const result = await detectCurrentNeighborhood();
      const existingNeighborhood = savedNeighborhoods.find((neighborhood) => isSameNeighborhood(neighborhood, result.neighborhood));

      if (existingNeighborhood) {
        setSavedNeighborhoods((current) =>
          current.map((neighborhood) =>
            isSameNeighborhood(neighborhood, result.neighborhood)
              ? {
                  ...neighborhood,
                  lat: result.neighborhood.lat,
                  lng: result.neighborhood.lng,
                  radius: result.neighborhood.radius,
                  verifiedAt: result.neighborhood.verifiedAt,
                }
              : neighborhood,
          ),
        );
        setActiveNeighborhoodId(existingNeighborhood.id);
        Alert.alert('동네 전환', `${existingNeighborhood.name}으로 전환했어요.`);
        return;
      }

      if (savedNeighborhoods.length >= MAX_SAVED_NEIGHBORHOODS) {
        Alert.alert('동네는 5개까지', '새 동네를 추가하려면 쓰지 않는 동네를 먼저 목록에서 제거해주세요. 기존 기록은 삭제되지 않아요.');
        return;
      }

      setSavedNeighborhoods((current) => [result.neighborhood, ...current]);
      setActiveNeighborhoodId(result.neighborhood.id);
      Alert.alert('동네 추가', result.notice ?? `${result.neighborhood.name}을 내 동네에 추가했어요.`);
    } catch (error) {
      console.warn('[neighborhood] detect failed', error);
      const friendlyError = getUserFacingError(error, 'neighborhood.detect');
      Alert.alert(friendlyError.title, friendlyError.message);
    } finally {
      setIsDetectingNeighborhood(false);
    }
  };

  const handleRemoveNeighborhood = (neighborhoodId: string) => {
    const targetNeighborhood = savedNeighborhoods.find((neighborhood) => neighborhood.id === neighborhoodId);

    if (!targetNeighborhood) {
      return;
    }

    Alert.alert('동네 목록에서 제거', `${targetNeighborhood.name}을 빠른 전환 목록에서 제거할까요? 등록한 고양이와 관찰 기록은 그대로 남아요.`, [
      {
        text: '취소',
        style: 'cancel',
      },
      {
        text: '제거',
        style: 'destructive',
        onPress: () => {
          const nextNeighborhoods = savedNeighborhoods.filter((neighborhood) => neighborhood.id !== neighborhoodId);

          setSavedNeighborhoods(nextNeighborhoods);

          if (activeNeighborhoodId === neighborhoodId) {
            setActiveNeighborhoodId(nextNeighborhoods[0]?.id ?? '');
          }
        },
      },
    ]);
  };

  const handleProcessCapturedPhoto = async (processedPhoto: ProcessedCatPhoto) => {
    if (!hasActiveNeighborhood) {
      const alert = getNeighborhoodRequiredAlert();
      throw new Error(alert.message);
    }

    const [originalUpload, cutoutUpload] = await Promise.all([
      uploadCatObservationImage(processedPhoto.originalImageUri, 'original'),
      uploadCatObservationImage(processedPhoto.cutoutImageUri, 'cutout'),
    ]);
    const observation = await createCatObservation({
      originalImageUrl: originalUpload.imageUrl,
      cutoutImageUrl: cutoutUpload.imageUrl,
      regionName: activeNeighborhoodName,
      detectionConfidence: processedPhoto.confidence,
      boundingBox: processedPhoto.boundingBox,
      featureVector: processedPhoto.featureVector,
      isPreciseCutout: processedPhoto.isPreciseCutout,
      coatHints: processedPhoto.coatHints,
    });
    const candidates = await fetchCatMatchCandidates({
      observationId: observation.id,
      regionNames: activeNeighborhoodRegionNames,
      coatHints: processedPhoto.coatHints,
      limit: 5,
    });

    return {
      observationId: observation.id,
      cutoutImageUrl: cutoutUpload.imageUrl,
      candidates,
    };
  };

  // 저장 성공 이후의 후처리(관찰 기록 정리, 리소스 새로고침)가 실패해도
  // 저장 자체는 성공한 상태이므로, 실패를 삼키고 화면 이동은 진행한다.
  // (여기서 실패를 그대로 던지면 사용자가 재시도해 중복 등록이 생긴다.)
  const runPostSaveSteps = async (steps: () => Promise<void>) => {
    try {
      await steps();
    } catch (error) {
      console.warn('[capture] post-save refresh failed', error);
    }
  };

  const handleSaveCapture = async (draft: CaptureCatDraft) => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const nextCat = await createCat(draft);
      await runPostSaveSteps(async () => {
        if (draft.observationId) {
          await resolveCatObservation(draft.observationId, nextCat.id, 'new_cat');
        }
        await reloadAppResources();
      });
      setNavigation({
        screen: 'dex',
        selectedCatId: null,
        selectedOwnerId: null,
      });
    } catch (error) {
      console.warn('[capture] save failed', error);
      const friendlyError = getUserFacingError(error, 'capture.process');
      Alert.alert(friendlyError.title, friendlyError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSighting = async (draft: CaptureCatDraft) => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      await createCatSighting(draft);
      await runPostSaveSteps(async () => {
        if (draft.observationId) {
          await resolveCatObservation(draft.observationId, null, 'uncertain');
        }
        await reloadAppResources();
      });
      setNavigation({
        screen: 'dex',
        selectedCatId: null,
        selectedOwnerId: null,
      });
    } catch (error) {
      console.warn('[capture] sighting save failed', error);
      const friendlyError = getUserFacingError(error, 'capture.process');
      Alert.alert(friendlyError.title, friendlyError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecordExistingCat = async (catId: string, payload?: { observationId?: string; imageUrl?: string }) => {
    if (!hasActiveNeighborhood) {
      const alert = getNeighborhoodRequiredAlert();
      Alert.alert(alert.title, alert.message);
      return;
    }

    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      await addEncounter(catId, activeNeighborhoodName, payload?.imageUrl);
      await runPostSaveSteps(async () => {
        if (payload?.observationId) {
          await resolveCatObservation(payload.observationId, catId, 'linked');
        }
        await reloadAppResources();
      });
      setNavigation({
        screen: 'detail',
        selectedCatId: catId,
        selectedOwnerId: null,
      });
    } catch (error) {
      console.warn('[capture] encounter save failed', error);
      const friendlyError = getUserFacingError(error, 'capture.process');
      Alert.alert(friendlyError.title, friendlyError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMyEncounter = (encounter: CatEncounter) => {
    Alert.alert(
      '만남 기록을 분리할까요?',
      `${encounter.seenAt} 기록이 이 고양이에게서 분리(삭제)돼요. 마지막 기록이라면 도감 카드도 함께 정리돼요.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '분리하기',
          style: 'destructive',
          onPress: () => {
            removeEncounter(encounter.id)
              .then((result) => {
                reloadAppResources().catch(() => undefined);

                if (result.catRemoved) {
                  Alert.alert('기록 정리 완료', '마지막 기록이어서 도감 카드도 함께 정리했어요.');
                  handleTabChange('dex');
                  return;
                }

                Alert.alert('분리 완료', '만남 기록을 분리했어요.');
              })
              .catch((error) => {
                console.warn('[cats] encounter removal failed', error);
                const friendlyError = getUserFacingError(error, 'generic');
                Alert.alert(friendlyError.title, friendlyError.message);
              });
          },
        },
      ],
    );
  };

  const handleReportSelectedCat = async () => {
    if (!visibleSelectedCat) {
      return;
    }

    try {
      await reportCat({
        catId: visibleSelectedCat.id,
        reason: 'incorrect_info',
        memo: '앱에서 사용자 신고로 접수되었습니다.',
      });
      Alert.alert('신고 접수', '검토가 필요한 고양이 정보로 신고했어요.');
      // 신고 배지(안전 제보자)가 서버에서 즉시 지급되므로 리소스를 갱신한다.
      reloadAppResources().catch(() => undefined);
    } catch (error) {
      console.warn('[cats] report failed', error);
      const friendlyError = getUserFacingError(error, 'generic');
      Alert.alert(friendlyError.title, friendlyError.message);
    }
  };

  const handleSaveCatProfile = async (draft: CatProfileUpdateDraft) => {
    if (!visibleSelectedCat) {
      return;
    }

    setIsCatProfileSaving(true);

    try {
      const nextCat = await updateCatProfile(visibleSelectedCat.id, draft);
      setNavigation({
        screen: 'detail',
        selectedCatId: nextCat.id,
        selectedOwnerId: null,
      });
    } catch (error) {
      console.warn('[cats] profile update failed', error);
      const friendlyError = getUserFacingError(error, 'cat.update');
      Alert.alert(friendlyError.title, friendlyError.message);
    } finally {
      setIsCatProfileSaving(false);
    }
  };

  const handleOpenExplorationHistory = () => {
    setNavigation({
      screen: 'explorationHistory',
      selectedCatId: null,
      selectedOwnerId: null,
    });
  };

  const handleOpenMyCommunityPosts = () => {
    setShouldEditCommunityPostOnOpen(false);
    setNavigation({
      screen: 'myCommunityPosts',
      selectedCatId: null,
      selectedOwnerId: null,
      selectedCommunityCatId: null,
      selectedCommunityPostId: null,
    });
  };

  const handleOpenBadgeBook = () => {
    setNavigation({
      screen: 'badgeBook',
      selectedCatId: null,
      selectedOwnerId: null,
    });
  };

  const handleOpenNotifications = (returnScreen: TabScreen = 'my') => {
    setNotificationReturnScreen(returnScreen);
    setNavigation({
      screen: 'notifications',
      selectedCatId: null,
      selectedOwnerId: null,
    });
  };

  const handleOpenNotificationInbox = (returnScreen: TabScreen = 'home') => {
    setNotificationReturnScreen(returnScreen);
    setNavigation({
      screen: 'notificationInbox',
      selectedCatId: null,
      selectedOwnerId: null,
    });
  };

  const handleOpenNotificationEvent = (event: NotificationEvent) => {
    const catId = typeof event.data.catId === 'string' ? event.data.catId : null;
    const targetScreen = typeof event.data.screen === 'string' ? event.data.screen : null;

    if (catId) {
      handleOpenCat(catId);
      return;
    }

    if (targetScreen === 'capture') {
      handleTabChange('capture');
      return;
    }

    if (targetScreen === 'dex') {
      handleTabChange('dex');
      return;
    }

    if (targetScreen === 'map') {
      handleOpenNeighborhoodDex();
      return;
    }

    if (targetScreen === 'my') {
      handleTabChange('my');
      return;
    }

    handleTabChange(notificationReturnScreen);
  };

  // 알림(로컬/푸시) 탭 → 화면 이동. 리스너는 한 번만 등록하고, 최신 라우팅
  // 로직은 ref로 참조해 stale closure를 피한다.
  const handleNotificationTap = (payload: NotificationTapPayload) => {
    if (!isAuthenticated) {
      return;
    }

    if (payload.catId) {
      handleOpenCat(payload.catId);
      return;
    }

    switch (payload.screen) {
      case 'capture':
        handleTabChange('capture');
        return;
      case 'dex':
        handleTabChange('dex');
        return;
      case 'map':
        handleOpenNeighborhoodDex();
        return;
      case 'my':
        handleTabChange('my');
        return;
      default:
        setNotificationReturnScreen('home');
        setNavigation({
          screen: 'notificationInbox',
          selectedCatId: null,
          selectedOwnerId: null,
        });
    }
  };

  const notificationTapHandlerRef = useRef(handleNotificationTap);
  notificationTapHandlerRef.current = handleNotificationTap;

  useEffect(() => {
    const unsubscribe = addNotificationTapListener((payload) => {
      notificationTapHandlerRef.current(payload);
    });

    return unsubscribe;
  }, []);

  const hasHandledInitialNotificationTapRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || hasHandledInitialNotificationTapRef.current) {
      return;
    }

    hasHandledInitialNotificationTapRef.current = true;

    getInitialNotificationTap()
      .then((payload) => {
        if (payload) {
          notificationTapHandlerRef.current(payload);
        }
      })
      .catch(() => undefined);
  }, [isAuthenticated]);

  const handleOpenProfileEdit = () => {
    setNavigation({
      screen: 'profileEdit',
      selectedCatId: null,
      selectedOwnerId: null,
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
      console.warn('[profile] save failed', error);
      const friendlyError = getUserFacingError(error, 'profile.save');
      Alert.alert(friendlyError.title, friendlyError.message);
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleSaveFeaturedCats = async (catIds: string[]) => {
    setIsFeaturedCatsSaving(true);

    try {
      const nextCustomization = await saveFeaturedCats(catIds);
      setCustomization(nextCustomization);
      Alert.alert('대표 고양이 저장', '우리 도감 주인공을 업데이트했어요.');
    } catch (error) {
      console.warn('[collection] featured cats save failed', error);
      const friendlyError = getUserFacingError(error, 'generic');
      Alert.alert(friendlyError.title, friendlyError.message);
      throw error;
    } finally {
      setIsFeaturedCatsSaving(false);
    }
  };

  const handleCompleteProfileSetup = async (draft: ProfileUpdateDraft) => {
    setIsProfileSaving(true);

    try {
      await updateProfile(draft);
      setNavigation({
        screen: 'home',
        selectedCatId: null,
        selectedOwnerId: null,
      });
    } catch (error) {
      console.warn('[profile] setup failed', error);
      const friendlyError = getUserFacingError(error, 'profile.save');
      Alert.alert(friendlyError.title, friendlyError.message);
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleWithdrawAccount = async () => {
    try {
      await withdrawAccount();
      setNavigation({
        screen: 'home',
        selectedCatId: null,
        selectedOwnerId: null,
      });
    } catch (error) {
      console.warn('[auth] withdrawal failed', error);
      const friendlyError = getUserFacingError(error, 'account.withdraw');
      Alert.alert(friendlyError.title, friendlyError.message);
      throw error;
    }
  };

  const handleChangeNotificationSettings = async (nextSettings: NotificationSettings) => {
    setIsNotificationSaving(true);

    try {
      const appliedSettings = await applyNotificationSettings(nextSettings);
      await saveRemoteNotificationSettings(appliedSettings);
      setNotificationSettings(appliedSettings);
    } catch (error) {
      console.warn('[notifications] settings save failed', error);
      const friendlyError = getUserFacingError(error, 'notification.save');
      Alert.alert(friendlyError.title, friendlyError.message);
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

  const handleMarkCaptureUncertain = async (payload: {
    observationId?: string;
    cutoutImageUrl?: string;
    processedPhoto: ProcessedCatPhoto;
  }) => {
    try {
      if (payload.observationId) {
        await resolveCatObservation(payload.observationId, null, 'uncertain');
      }

      Alert.alert('미확인 기록 저장', '같은 고양이인지 판단하기 어려운 관찰로 남겼어요.');
      setNavigation({
        screen: 'dex',
        selectedCatId: null,
        selectedOwnerId: null,
      });
    } catch (error) {
      console.warn('[capture] uncertain mark failed', error);
      const friendlyError = getUserFacingError(error, 'capture.process');
      Alert.alert(friendlyError.title, friendlyError.message);
    }
  };

  const collectionSummary: CollectionSummary = {
    featuredCats: customization.featuredCatSlots
      .map((slot) => myCats.find((cat) => cat.id === slot.catId))
      .filter((cat): cat is NonNullable<typeof cat> => Boolean(cat)),
    achievedBadgeCount: badges.filter((badge) => badge.achieved).length,
  };

  const renderScreen = () => {
    switch (navigation.screen) {
      case 'home':
        return (
          <HomeScreen
            activeNeighborhoodId={activeNeighborhood?.id ?? ''}
            badges={badges}
            collectionSummary={collectionSummary}
            currentUser={currentUser}
            dexProgress={dexProgress}
            favoriteCats={collectionSummary.featuredCats}
            isDetectingNeighborhood={isDetectingNeighborhood}
            neighborhoodName={activeNeighborhoodName}
            onDetectNeighborhood={handleDetectNeighborhood}
            onGoCapture={() => handleTabChange('capture')}
            onGoDex={() => handleTabChange('dex')}
            onOpenBadges={handleOpenBadgeBook}
            onOpenCat={handleOpenCat}
            onOpenNotifications={() => handleOpenNotificationInbox('home')}
            onRemoveNeighborhood={handleRemoveNeighborhood}
            onSelectNeighborhood={handleSelectNeighborhood}
            profile={profile}
            recentCats={myCats.slice(0, 3)}
            neighborhoodCatCounts={neighborhoodCatCounts}
            savedNeighborhoods={savedNeighborhoods}
            summary={homeSummary}
          />
        );
      case 'dex':
        return (
          <CatDexScreen
            cats={myCats}
            onOpenCat={handleOpenCat}
            placeholders={undiscoveredDexSlots}
          />
        );
      case 'detail':
        return visibleSelectedCat ? (
          <CatDetailScreen
            cat={visibleSelectedCat}
            currentUserId={currentUser?.id ?? null}
            encounters={selectedCatEncounters}
            onBack={() => handleTabChange('dex')}
            onComposePost={() => handleOpenCommunityCompose(visibleSelectedCat.id)}
            onEditCat={() => handleOpenCatEdit(visibleSelectedCat.id)}
            onRemoveEncounter={handleRemoveMyEncounter}
            onReportCat={handleReportSelectedCat}
          />
        ) : (
          <CatDexScreen
            cats={myCats}
            onOpenCat={handleOpenCat}
            placeholders={undiscoveredDexSlots}
          />
        );
      case 'catEdit':
        return visibleSelectedCat ? (
          <CatEditScreen
            cat={visibleSelectedCat}
            isSaving={isCatProfileSaving}
            onBack={() => handleOpenCat(visibleSelectedCat.id)}
            onSave={handleSaveCatProfile}
            personalityOptions={apiPersonalityOptions}
          />
        ) : (
          <CatDexScreen
            cats={myCats}
            onOpenCat={handleOpenCat}
            placeholders={undiscoveredDexSlots}
          />
        );
      case 'capture':
        return (
          <CaptureScreen
            coatOptions={apiCoatOptions}
            isSubmitting={isSaving}
            neighborhoodName={activeNeighborhoodName}
            onBack={() => handleTabChange('home')}
            onMarkUncertain={handleMarkCaptureUncertain}
            onProcessPhoto={handleProcessCapturedPhoto}
            onRecordExisting={handleRecordExistingCat}
            onSave={handleSaveCapture}
            onSaveSighting={handleSaveSighting}
            personalityOptions={apiPersonalityOptions}
          />
        );
      case 'map':
        return neighborhoodView === 'board' ? (
          <CommunityBoardScreen
            neighborhoodName={activeNeighborhoodName}
            regionNames={activeNeighborhoodRegionNames}
            onComposePost={() => handleOpenCommunityCompose()}
            onOpenDex={handleOpenNeighborhoodDex}
            onOpenMap={handleOpenNeighborhoodMap}
            onOpenPost={handleOpenCommunityPost}
          />
        ) : neighborhoodView === 'map' ? (
          <NeighborhoodMapScreen
            cats={cats}
            neighborhoodName={activeNeighborhoodName}
            onGoCapture={() => handleTabChange('capture')}
            onOpenCat={handleOpenCat}
            onOpenCommunityBoard={handleOpenCommunityBoard}
            onOpenDex={handleOpenNeighborhoodDex}
            regions={visibleRegions}
          />
        ) : (
          <NeighborhoodDexScreen
            cats={cats}
            myCatIds={myCats.map((cat) => cat.id)}
            neighborhoodName={activeNeighborhoodName}
            onGoCapture={() => handleTabChange('capture')}
            onOpenCat={handleOpenCat}
            onOpenCommunityBoard={handleOpenCommunityBoard}
            onOpenCommunityPost={(postId) => handleOpenCommunityPost(postId, 'dex')}
            onOpenMap={handleOpenNeighborhoodMap}
            regions={visibleRegions}
            regionNames={activeNeighborhoodRegionNames}
            sightings={undiscoveredDexSlots}
          />
        );
      case 'communityPostDetail':
        return navigation.selectedCommunityPostId ? (
          <CommunityPostDetailScreen
            currentUserId={currentUser?.id ?? null}
            initiallyEditing={shouldEditCommunityPostOnOpen}
            onBack={handleReturnFromCommunityPost}
            onDeleted={handleReturnFromCommunityPost}
            onOpenCat={handleOpenCat}
            postId={navigation.selectedCommunityPostId}
          />
        ) : (
          <CommunityBoardScreen
            neighborhoodName={activeNeighborhoodName}
            regionNames={activeNeighborhoodRegionNames}
            onComposePost={() => handleOpenCommunityCompose()}
            onOpenDex={handleOpenNeighborhoodDex}
            onOpenMap={handleOpenNeighborhoodMap}
            onOpenPost={handleOpenCommunityPost}
          />
        );
      case 'communityCompose':
        return (
          <CommunityComposerScreen
            cats={myCats}
            initialCatId={navigation.selectedCommunityCatId}
            neighborhoodName={activeNeighborhoodName}
            onBack={
              communityReturnScreen === 'myCommunityPosts'
                ? handleOpenMyCommunityPosts
                : communityReturnScreen === 'dex'
                  ? handleOpenNeighborhoodDex
                  : communityReturnScreen === 'map'
                    ? handleOpenNeighborhoodMap
                  : handleOpenCommunityBoard
            }
            onCreated={(postId) => handleOpenCommunityPost(postId, communityReturnScreen)}
          />
        );
      case 'my':
        return currentUser ? (
          <MyPageScreen
            badges={badges}
            collectionSummary={collectionSummary}
            isSigningOut={isSigningOut}
            isSavingFeaturedCats={isFeaturedCatsSaving}
            isWithdrawing={isWithdrawing}
            myCats={myCats}
            neighborhoodName={activeNeighborhoodName}
            onOpenBlockedUsers={() =>
              setNavigation({
                screen: 'blockedUsers',
                selectedCatId: null,
                selectedOwnerId: null,
              })
            }
            onOpenExplorationHistory={handleOpenExplorationHistory}
            onOpenBadges={handleOpenBadgeBook}
            onOpenCommunityPosts={handleOpenMyCommunityPosts}
            onOpenNotifications={() => handleOpenNotifications('my')}
            onOpenProfileEdit={handleOpenProfileEdit}
            onSaveFeaturedCats={handleSaveFeaturedCats}
            onOpenCat={handleOpenCat}
            onLogout={logout}
            onWithdrawAccount={handleWithdrawAccount}
            profile={profile}
            user={currentUser}
          />
        ) : null;
      case 'myCommunityPosts':
        return (
          <MyCommunityPostsScreen
            onBack={() => handleTabChange('my')}
            onComposePost={() => handleOpenCommunityCompose(undefined, 'myCommunityPosts')}
            onEditPost={(postId) => handleOpenCommunityPost(postId, 'myCommunityPosts', { startEditing: true })}
            onOpenPost={(postId) => handleOpenCommunityPost(postId, 'myCommunityPosts')}
          />
        );
      case 'badgeBook':
        return (
          <BadgeBookScreen
            badges={badges}
            myCats={myCats}
            neighborhoodName={activeNeighborhoodName}
            onBack={() => handleTabChange('my')}
            onGoCapture={() => handleTabChange('capture')}
            onGoDex={() => handleTabChange('dex')}
            onGoMap={() => handleTabChange('map')}
            profile={profile}
          />
        );
      case 'explorationHistory':
        return (
          <ExplorationHistoryScreen
            cats={myCats}
            onBack={() => handleTabChange('my')}
            onOpenCat={handleOpenCat}
          />
        );
      case 'blockedUsers':
        return <BlockedUsersScreen onBack={() => handleTabChange('my')} />;
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
            onBack={() => handleTabChange(notificationReturnScreen)}
            onChangeSettings={handleChangeNotificationSettings}
            onRequestPermission={handleRequestNotificationPermission}
            onSendPreview={handleSendNotificationPreview}
            permissionState={notificationPermissionState}
            settings={notificationSettings}
          />
        );
      case 'notificationInbox':
        return (
          <NotificationInboxScreen
            currentUserId={currentUser?.id ?? null}
            onBack={() => handleTabChange(notificationReturnScreen)}
            onOpenEvent={handleOpenNotificationEvent}
            onOpenSettings={() => handleOpenNotifications(notificationReturnScreen)}
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
      ) : isAuthenticated && currentUser && !currentUser.profileSetupCompleted ? (
        <ProfileSetupScreen
          isSaving={isProfileSaving}
          onComplete={handleCompleteProfileSetup}
          user={currentUser}
        />
      ) : isAuthenticated && currentUser ? (
        <AppShell bottomBar={shouldHideBottomBar ? undefined : <BottomTabBar activeTab={activeTab} onChange={handleTabChange} />}>
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
