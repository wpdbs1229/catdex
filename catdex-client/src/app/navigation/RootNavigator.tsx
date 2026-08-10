import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { BookOpen, Camera, Home, Map, User } from 'lucide-react-native';
import { useState, type ComponentType } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ProfileSetupScreen } from '../../features/auth/screens/ProfileSetupScreen';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { CameraScreen } from '../../features/capture/screens/CameraScreen';
import { CaptureMatchScreen } from '../../features/capture/screens/CaptureMatchScreen';
import { CaptureRegisterScreen } from '../../features/capture/screens/CaptureRegisterScreen';
import { CaptureReviewScreen } from '../../features/capture/screens/CaptureReviewScreen';
import { CatDetailScreen } from '../../features/cats/screens/CatDetailScreen';
import { CatDexScreen } from '../../features/cats/screens/CatDexScreen';
import { HomeScreen } from '../../features/home/screens/HomeScreen';
import { NotificationInboxScreen } from '../../features/notifications/screens/NotificationInboxScreen';
import { NotificationSettingsScreen } from '../../features/notifications/screens/NotificationSettingsScreen';
import { NeighborhoodDexScreen } from '../../features/map/screens/NeighborhoodDexScreen';
import { NeighborhoodMapScreen } from '../../features/map/screens/NeighborhoodMapScreen';
import { createShadow, theme } from '../../shared/styles/theme';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import type { CaptureStackParamList, MainTabParamList, MapStackParamList, RootStackParamList } from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const CaptureStack = createNativeStackNavigator<CaptureStackParamList>();
const MapStack = createNativeStackNavigator<MapStackParamList>();

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

function MapNavigator() {
  return (
    <MapStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <MapStack.Screen name="NeighborhoodDex" component={NeighborhoodDexScreen} />
      <MapStack.Screen name="NeighborhoodMap" component={NeighborhoodMapScreen} />
    </MapStack.Navigator>
  );
}

type TabIcon = ComponentType<{ color: string; size: number }>;

/** 선택된 탭만 연한 코랄 알약 위에 올린다. 시안의 탭바 규칙이다. */
function tabBarIcon(Icon: TabIcon) {
  return function TabBarIcon({ color, focused }: { color: string; focused: boolean }) {
    return (
      <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
        <Icon color={color} size={22} />
      </View>
    );
  };
}

function MainTabNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.tabMuted,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <MainTab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: '홈', tabBarIcon: tabBarIcon(Home) }}
      />
      <MainTab.Screen
        name="MapTab"
        component={MapNavigator}
        // 동네 흐름은 피그마 시안의 전용 하단 바(지도/동네 도감/커뮤니티)를 쓰므로 기본 탭바를 숨긴다.
        options={{ title: '지도', tabBarIcon: tabBarIcon(Map), tabBarStyle: { display: 'none' } }}
      />
      <MainTab.Screen
        name="CaptureTab"
        component={PlaceholderScreen}
        options={{ title: '촬영', tabBarIcon: tabBarIcon(Camera) }}
        listeners={({ navigation }) => ({
          // 탭으로 머무르지 않고 전체 화면 촬영으로 바로 넘어간다.
          tabPress: (event) => {
            event.preventDefault();
            navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('CaptureFlow');
          },
        })}
      />
      <MainTab.Screen
        name="CollectionTab"
        component={CatDexScreen}
        options={{ title: '도감', tabBarIcon: tabBarIcon(BookOpen) }}
      />
      <MainTab.Screen
        name="MyTab"
        component={PlaceholderScreen}
        options={{ title: '마이', tabBarIcon: tabBarIcon(User) }}
      />
    </MainTab.Navigator>
  );
}

export function RootNavigator() {
  const { currentUser, isAuthenticated, updateProfile } = useAuth();
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const needsProfileSetup = isAuthenticated && currentUser !== null && !currentUser.profileSetupCompleted;

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
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
    height: 64,
    paddingBottom: 0,
    borderTopWidth: 0,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    ...createShadow(16),
  },
  tabBarItem: {
    height: 64,
  },
  tabIcon: {
    width: 44,
    height: 36,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconFocused: {
    backgroundColor: theme.colors.accentSoft,
  },
});
