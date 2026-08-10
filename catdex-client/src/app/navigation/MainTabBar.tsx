import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Camera, Compass, User } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createNdShadow, nd, theme } from '@/shared/styles/theme';

type LucideIcon = ComponentType<{ color: string; size: number; fill?: string; strokeWidth?: number }>;

interface TabItem {
  route: string;
  label: string;
  /** lucide에 같은 글리프가 있는 경우 */
  icon?: LucideIcon;
  /** 없는 경우 시안에서 내보낸 자산 (기본 / 선택) */
  image?: [ImageSourcePropType, ImageSourcePropType];
}

/**
 * 피그마 '기본 하단바'(72:466). 항목 순서와 라벨이 시안 그대로다.
 * 홈과 내 도감은 lucide 글리프가 시안과 달라 내보낸 자산을 쓴다.
 */
const items: TabItem[] = [
  {
    route: 'HomeTab',
    label: '홈',
    image: [require('../../../assets/icons/tab-home.png'), require('../../../assets/icons/tab-home-active.png')],
  },
  {
    route: 'CollectionTab',
    label: '내 도감',
    image: [require('../../../assets/icons/tab-dex.png'), require('../../../assets/icons/tab-dex-active.png')],
  },
  { route: 'CaptureTab', label: '촬영', icon: Camera },
  { route: 'MapTab', label: '동네', icon: Compass },
  { route: 'MyTab', label: '마이페이지', icon: User },
];

export function MainTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeRoute = state.routes[state.index]?.name;

  // 동네 흐름은 시안의 전용 하단 바(지도/동네 도감/커뮤니티)를 쓴다.
  // 커스텀 탭바에서는 tabBarStyle이 먹지 않으므로 여기서 직접 숨긴다.
  if (activeRoute === 'MapTab') {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar}>
        {items.map(({ route, label, icon: Icon, image }) => {
          const isActive = activeRoute === route;
          const color = isActive ? theme.colors.accent : nd.colors.ink;

          return (
            <Pressable
              accessibilityLabel={label}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              key={route}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route, canPreventDefault: true });

                if (!isActive && !event.defaultPrevented) {
                  navigation.navigate(route);
                }
              }}
              style={styles.item}
            >
              {isActive ? <View style={styles.selectedPill} /> : null}
              <View style={styles.itemContent}>
                {Icon ? (
                  <Icon color={color} fill={isActive ? color : 'transparent'} size={24} strokeWidth={1.6} />
                ) : (
                  <Image resizeMode="contain" source={image![isActive ? 1 : 0]} style={styles.imageIcon} />
                )}
                <Text numberOfLines={1} style={styles.label}>
                  {label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingTop: 16,
  },
  // 시안: 335x60, 완전한 알약.
  // 시안은 바 위에 어두운 그라데이션 스크림을 깔아 흰색 60%로도 글자가 읽히지만,
  // 그라데이션에는 expo-linear-gradient(네이티브 모듈)가 필요하다. 대신 불투명도를
  // 올리고 옅은 그림자로 콘텐츠와 분리했다.
  bar: {
    width: 335,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    ...createNdShadow(0.12, 12),
  },
  item: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 선택된 항목 뒤의 회색 알약. 아이콘과 라벨을 함께 덮는다.
  selectedPill: {
    position: 'absolute',
    top: 4,
    width: 80,
    height: 52,
    borderRadius: 100,
    backgroundColor: 'rgba(17, 17, 17, 0.08)',
  },
  itemContent: {
    alignItems: 'center',
    gap: 0,
  },
  imageIcon: {
    width: 24,
    height: 24,
  },
  label: {
    marginTop: 1,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '500',
    letterSpacing: -0.25,
    color: nd.colors.ink,
  },
});
