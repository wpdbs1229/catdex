import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { BookOpen, Camera, Home, Map, User } from 'lucide-react-native';

import { CameraScreen } from '../../features/capture/screens/CameraScreen';
import { CaptureReviewScreen } from '../../features/capture/screens/CaptureReviewScreen';
import { theme } from '../../shared/styles/theme';
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

function MainTabNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.tabMuted,
      }}
    >
      <MainTab.Screen
        name="HomeTab"
        component={PlaceholderScreen}
        options={{ title: '홈', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
      />
      <MainTab.Screen
        name="MapTab"
        component={PlaceholderScreen}
        options={{ title: '지도', tabBarIcon: ({ color, size }) => <Map color={color} size={size} /> }}
      />
      <MainTab.Screen
        name="CaptureTab"
        component={PlaceholderScreen}
        options={{ title: '촬영', tabBarIcon: ({ color, size }) => <Camera color={color} size={size} /> }}
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
        options={{ title: '도감', tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} /> }}
      />
      <MainTab.Screen
        name="MyTab"
        component={PlaceholderScreen}
        options={{ title: '마이', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
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
