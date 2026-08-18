import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert } from 'react-native';

import { ProfileSetupScreen } from '../../features/auth/screens/ProfileSetupScreen';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { CameraScreen } from '../../features/capture/screens/CameraScreen';
import { CaptureMatchScreen } from '../../features/capture/screens/CaptureMatchScreen';
import { CaptureRegisterScreen } from '../../features/capture/screens/CaptureRegisterScreen';
import { CaptureReviewScreen } from '../../features/capture/screens/CaptureReviewScreen';
import { CatDetailScreen } from '../../features/cats/screens/CatDetailScreen';
import { CatDexScreen } from '../../features/cats/screens/CatDexScreen';
import { ClientMapScreen } from '../../features/cats/screens/ClientMapScreen';
import { SupportRoomScreen } from '../../features/support-room/SupportRoomScreen';
import { SupportRoomV2Screen } from '../../features/support-room-v2/SupportRoomV2Screen';
import { SUPPORT_ROOM_V2_ENABLED } from '../../shared/constants/support-room-v2.constants';
import { AttendanceMonthScreen } from '../../features/attendance/screens/AttendanceMonthScreen';
import { AttendanceScreen } from '../../features/attendance/screens/AttendanceScreen';
import { HomeScreen } from '../../features/home/screens/HomeScreen';
import { OnboardingCompleteScreen } from '../../features/home/screens/OnboardingCompleteScreen';
import { CommunityScreen } from '../../features/community/screens/CommunityScreen';
import { CommunityPostComposerScreen } from '../../features/community/screens/CommunityPostComposerScreen';
import { CommunityPostDetailScreen } from '../../features/community/screens/CommunityPostDetailScreen';
import { AnnouncementDetailScreen } from '../../features/announcements/screens/AnnouncementDetailScreen';
import { AnnouncementListScreen } from '../../features/announcements/screens/AnnouncementListScreen';
import { NotificationInboxScreen } from '../../features/notifications/screens/NotificationInboxScreen';
import { NotificationSettingsScreen } from '../../features/notifications/screens/NotificationSettingsScreen';
import { NeighborhoodDexScreen } from '../../features/map/screens/NeighborhoodDexScreen';
import { NeighborhoodMapScreen } from '../../features/map/screens/NeighborhoodMapScreen';
import { MyPageScreen } from '../../features/profile/screens/MyPageScreen';
import { MyPostsScreen } from '../../features/profile/screens/MyPostsScreen';
import { MyReportsScreen } from '../../features/profile/screens/MyReportsScreen';
import { ShopScreen } from '../../features/shop/screens/ShopScreen';
import { ShopPreviewScreen } from '../../features/shop/screens/ShopPreviewScreen';
import { ShopPurchaseCompleteScreen } from '../../features/shop/screens/ShopPurchaseCompleteScreen';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import { MainTabBar } from './MainTabBar';
import type {
  CaptureStackParamList,
  HomeStackParamList,
  MainTabParamList,
  ClientStackParamList,
  MapStackParamList,
  RootStackParamList,
} from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const CaptureStack = createNativeStackNavigator<CaptureStackParamList>();
const MapStack = createNativeStackNavigator<MapStackParamList>();
const ClientStack = createNativeStackNavigator<ClientStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

function CaptureNavigator() {
  return (
    <CaptureStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <CaptureStack.Screen name="Camera" component={CameraScreen} />
      <CaptureStack.Screen name="CaptureReview" component={CaptureReviewScreen} />
      <CaptureStack.Screen name="CaptureMatch" component={CaptureMatchScreen} />
      <CaptureStack.Screen name="CaptureRegister" component={CaptureRegisterScreen} />
    </CaptureStack.Navigator>
  );
}

function ClientNavigator() {
  return (
    <ClientStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <ClientStack.Screen name="ClientRoster" component={CatDexScreen} />
      <ClientStack.Screen name="ClientMap" component={ClientMapScreen} />
      {/* V2 검수 완료 전까지 기존 화면이 기본. 플래그를 켠 빌드만 V2로 들어간다. */}
      <ClientStack.Screen
        name="ClientSupportRoom"
        component={SUPPORT_ROOM_V2_ENABLED ? SupportRoomV2Screen : SupportRoomScreen}
      />
    </ClientStack.Navigator>
  );
}

function MapNavigator() {
  return (
    <MapStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <MapStack.Screen name="NeighborhoodDex" component={NeighborhoodDexScreen} />
      <MapStack.Screen name="NeighborhoodMap" component={NeighborhoodMapScreen} />
      <MapStack.Screen name="NeighborhoodCommunity" component={CommunityScreen} />
      <MapStack.Screen name="CommunityPostDetail" component={CommunityPostDetailScreen} />
      <MapStack.Screen name="CommunityPostComposer" component={CommunityPostComposerScreen} />
    </MapStack.Navigator>
  );
}

// 출근 현황은 하단바를 그대로 둔 채 홈 위에 쌓인다. 루트 스택에 넣으면 하단바가 사라진다.
function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="Attendance" component={AttendanceScreen} />
      <HomeStack.Screen name="AttendanceMonth" component={AttendanceMonthScreen} />
      <HomeStack.Screen name="OnboardingComplete" component={OnboardingCompleteScreen} />
    </HomeStack.Navigator>
  );
}

function MainTabNavigator() {
  return (
    // 순서는 시안의 '기본 하단바'를 따른다: 홈 / 내 고객 / 촬영 / 동네 / 마이페이지
    <MainTab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <MainTabBar {...props} />}>
      <MainTab.Screen name="HomeTab" component={HomeNavigator} options={{ title: '홈' }} />
      <MainTab.Screen name="CollectionTab" component={ClientNavigator} options={{ title: '내 고객' }} />
      <MainTab.Screen
        name="CaptureTab"
        component={PlaceholderScreen}
        options={{ title: '촬영' }}
        listeners={({ navigation }) => ({
          // 탭으로 머무르지 않고 전체 화면 촬영으로 바로 넘어간다.
          tabPress: (event) => {
            event.preventDefault();
            navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('CaptureFlow');
          },
        })}
      />
      <MainTab.Screen
        name="MapTab"
        component={MapNavigator}
        // 동네 흐름은 시안의 전용 하단 바(지도/동네 도감/커뮤니티)를 쓰므로 기본 탭바를 숨긴다.
        options={{ title: '지부', tabBarStyle: { display: 'none' } }}
      />
      <MainTab.Screen name="MyTab" component={MyPageScreen} options={{ title: '마이페이지' }} />
    </MainTab.Navigator>
  );
}

export function RootNavigator() {
  const { currentUser, isAuthenticated, updateProfile } = useAuth();
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const needsProfileSetup =
    isAuthenticated && currentUser !== null && currentUser.profileSetupCompleted === false;

  if (needsProfileSetup && currentUser) {
    return (
      <ProfileSetupScreen
        isSaving={isProfileSaving}
        onComplete={async (draft) => {
          setIsProfileSaving(true);

          try {
            await updateProfile(draft);
          } catch (error) {
            Alert.alert('사원증 저장 실패', error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.');
          } finally {
            setIsProfileSaving(false);
          }
        }}
        user={currentUser}
      />
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Main" component={MainTabNavigator} />
        <RootStack.Screen
          name="CaptureFlow"
          component={CaptureNavigator}
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <RootStack.Screen
          name="CatDetail"
          component={CatDetailScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <RootStack.Screen
          name="NotificationInbox"
          component={NotificationInboxScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <RootStack.Screen
          name="NotificationSettings"
          component={NotificationSettingsScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <RootStack.Screen
          name="Announcements"
          component={AnnouncementListScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <RootStack.Screen
          name="AnnouncementDetail"
          component={AnnouncementDetailScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <RootStack.Screen
          name="MyPosts"
          component={MyPostsScreen}
          options={{ animation: 'slide_from_right' }}
        />
        {/* 지부 탭과 같은 상세 화면. 내 게시글에서 열 때는 루트 스택에 쌓아
            뒤로 가기가 마이페이지 흐름으로 돌아오게 한다. */}
        <RootStack.Screen
          name="MyPostDetail"
          component={CommunityPostDetailScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <RootStack.Screen
          name="MyReports"
          component={MyReportsScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <RootStack.Screen name="Shop" component={ShopScreen} options={{ animation: 'slide_from_right' }} />
        <RootStack.Screen
          name="ShopPreview"
          component={ShopPreviewScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <RootStack.Screen
          name="ShopPurchaseComplete"
          component={ShopPurchaseCompleteScreen}
          options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
