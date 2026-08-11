import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Camera, Compass, User } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { TAB_BAR_TOP_GAP } from '@/app/navigation/useTabBarInset';
import { nd, theme } from '@/shared/styles/theme';

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

  // 탭바 컨테이너가 이미 16pt를 띄워 주므로, 홈 인디케이터를 비켜 갈 만큼만 더한다.
  // 같은 계산을 useTabBarInset이 콘텐츠 여백용으로 다시 쓴다.
  const bottomGap = Math.max(insets.bottom - TAB_BAR_TOP_GAP, 8);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: bottomGap }]}>
      {/* 시안의 스크림: 위는 투명, 아래로 갈수록 rgba(17,17,17,0.3).
          흰색 60% 바 위의 글자가 콘텐츠에 묻히지 않게 잡아 준다. */}
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="tabBarScrim" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor="#111111" stopOpacity={0} />
            <Stop offset="1" stopColor="#111111" stopOpacity={0.3} />
          </LinearGradient>
        </Defs>
        <Rect fill="url(#tabBarScrim)" height="100%" width="100%" x="0" y="0" />
      </Svg>

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
                {/* 큰 글자 설정에서도 '마이페이지'가 잘리지 않게 배율에 상한을 둔다.
                    표준 탭바가 큰 글자에서 배치를 바꾸는 것과 같은 취지다. */}
                <Text adjustsFontSizeToFit maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.label}>
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
    paddingTop: TAB_BAR_TOP_GAP,
  },
  // 시안: 335x60, 완전한 알약.
  // 배경은 시안이 흰색 60%지만 0.9로 올렸다. 시안 목업은 바 뒤가 밝은 폴라로이드라
  // 60%로도 읽히는데, 실제로는 어두운 고양이 사진이 오면 라벨이 묻힌다.
  bar: {
    width: 335,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    // 알약 모서리까지 항목이 닿지 않도록 안쪽 여백만 준다.
    paddingHorizontal: 6,
  },
  // 시안은 항목이 60pt 고정이지만 그러면 5개(308pt)와 바(335pt) 사이에 남는
  // 양 끝 13.5pt가 눌리지 않는다. 폭을 균등 분할해 틈을 없앤다.
  // 아이콘·라벨은 항목 안에서 가운데 정렬이라 보이는 위치는 그대로다.
  item: {
    flex: 1,
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
