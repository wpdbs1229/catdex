import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { BookOpen, Camera, Home, Map, User } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';

import { CameraScreen } from '../../features/capture/screens/CameraScreen';
import { CaptureReviewScreen } from '../../features/capture/screens/CaptureReviewScreen';
import { createShadow, theme } from '../../shared/styles/theme';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import type { CaptureStackParamList, MainTabParamList, RootStackParamList } from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const CaptureStack = createNativeStackNavigator<CaptureStackParamList>();

function CaptureNavigator() {
  return (
    <CaptureStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <CaptureStack.Screen name="Camera" component={CameraScreen} />
      <CaptureStack.Screen name="CaptureReview" component={CaptureReviewScreen} />
    </CaptureStack.Navigator>
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
        component={PlaceholderScreen}
        options={{ title: '홈', tabBarIcon: tabBarIcon(Home) }}
      />
      <MainTab.Screen
        name="MapTab"
        component={PlaceholderScreen}
        options={{ title: '지도', tabBarIcon: tabBarIcon(Map) }}
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
        component={PlaceholderScreen}
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
  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Main" component={MainTabNavigator} />
        <RootStack.Screen
          name="CaptureFlow"
          component={CaptureNavigator}
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
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
