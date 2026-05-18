import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppShell } from '@/shared/components/AppShell';
import { BottomTabBar } from '@/shared/components/BottomTabBar';
import { fetchAchievedBadges, fetchProfile, fetchRegions } from '@/shared/api/app.api';
import {
  fetchCollectionCustomization,
  hasActiveNyangkkureomi,
  saveCollectionProfile,
  saveFeaturedCat,
} from '@/shared/api/collection.api';
import { fetchCatOptions, reportCat } from '@/shared/api/cats.api';
import { coatOptions, personalityOptions } from '@/shared/data/cats.mock';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { CaptureScreen } from '@/features/capture/CaptureScreen';
import { CollectionDrawerScreen } from '@/features/collection/CollectionDrawerScreen';
import { CatDetailScreen } from '@/features/cats/CatDetailScreen';
import { CatDexScreen } from '@/features/cats/CatDexScreen';
import { useCats } from '@/features/cats/hooks/useCats';
import { HomeScreen } from '@/features/home/HomeScreen';
import { MapScreen } from '@/features/map/MapScreen';
import { MyPageScreen } from '@/features/my/MyPageScreen';
import { SplashScreen } from '@/features/splash/SplashScreen';
import type { Badge, ExplorerProfile } from '@/shared/types/badge';
import type { CaptureCatDraft } from '@/shared/types/cat';
import type { CatType, PersonalityTag } from '@/shared/types/cat';
import type { CollectionCustomizationState, CollectionProfile, CollectionSummary } from '@/shared/types/collection';
import type { NavigationState, TabScreen } from '@/shared/types/navigation';
import type { Region } from '@/shared/types/region';

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
  const [badges, setBadges] = useState<Badge[]>([]);
  const [profile, setProfile] = useState<ExplorerProfile>(emptyProfile);
  const [customization, setCustomization] = useState<CollectionCustomizationState>(emptyCustomization);
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

  const activeTab: TabScreen = navigation.screen === 'detail' ? 'dex' : navigation.screen === 'drawer' ? 'my' : navigation.screen;

  useEffect(() => {
    const timerId = setTimeout(() => {
      setHasCompletedSplash(true);
    }, 1400);

    return () => {
      clearTimeout(timerId);
    };
  }, []);

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

  useEffect(() => {
    if (isAuthenticated) {
      reloadAppResources();
    }
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
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecordEncounter = async () => {
    if (!selectedCat) {
      return;
    }

    await addEncounter(selectedCat.id);
    await reloadAppResources();
  };

  const handleRecordExistingCat = async (catId: string) => {
    setIsSaving(true);

    try {
      await addEncounter(catId);
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

  const handleShowNyangkkureomiUpsell = () => {
    Alert.alert(
      '냥꾸러미',
      '월 3,900원 또는 연 39,000원으로 프리미엄 표지, 우리 도감 주인공 3마리, 시즌 냥발 도장을 사용할 수 있어요. 실제 결제는 스토어 상품 설정 후 연결합니다.',
    );
  };

  const collectionSummary: CollectionSummary = {
    planName: hasActiveNyangkkureomi(customization.entitlement) ? '냥꾸러미 사용 중' : '무료 서랍',
    hasNyangkkureomi: hasActiveNyangkkureomi(customization.entitlement),
    coverThemeName:
      customization.themes.find((theme) => theme.id === customization.profile.coverThemeId)?.name ?? '골목 관찰 노트',
    featuredCats: customization.featuredCatSlots
      .map((slot) => myCats.find((cat) => cat.id === slot.catId))
      .filter((cat): cat is NonNullable<typeof cat> => Boolean(cat)),
    achievedBadgeCount: customization.alleyBadges.filter((badge) => badge.achieved).length,
    achievedStampCount: customization.seasonStamps.filter((stamp) => stamp.achieved).length,
  };

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
            existingCats={recentCats}
            isSubmitting={isSaving}
            onRecordExisting={handleRecordExistingCat}
            onSave={handleSaveCapture}
            onSaveSighting={handleSaveSighting}
            personalityOptions={apiPersonalityOptions}
          />
        );
      case 'map':
        return <MapScreen regions={regions} />;
      case 'my':
        return currentUser ? (
          <MyPageScreen
            badges={badges}
            collectionSummary={collectionSummary}
            isSigningOut={isSigningOut}
            myCats={myCats}
            onOpenCollectionDrawer={() =>
              setNavigation({
                screen: 'drawer',
                selectedCatId: null,
              })
            }
            onOpenCat={handleOpenCat}
            onLogout={logout}
            profile={profile}
            user={currentUser}
          />
        ) : null;
      case 'drawer':
        return (
          <CollectionDrawerScreen
            customization={customization}
            isSaving={isSaving}
            myCats={myCats}
            onBack={() => handleTabChange('my')}
            onSaveFeaturedCat={handleSaveFeaturedCat}
            onSaveProfile={handleSaveCollectionProfile}
            onShowUpsell={handleShowNyangkkureomiUpsell}
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
