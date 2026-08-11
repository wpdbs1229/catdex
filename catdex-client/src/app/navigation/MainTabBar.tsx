import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Camera, Compass, User } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { TAB_BAR_TOP_GAP } from '@/app/navigation/useTabBarInset';
import { createNdShadow, nd } from '@/shared/styles/theme';

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
 * 홈과 내 고객은 lucide 글리프가 시안과 달라 내보낸 자산을 쓴다.
 */
const items: TabItem[] = [
  {
    route: 'HomeTab',
    label: '홈',
    image: [require('../../../assets/icons/tab-home.png'), require('../../../assets/icons/tab-home-active.png')],
  },
  {
    route: 'CollectionTab',
    label: '내 고객',
    image: [require('../../../assets/icons/tab-dex.png'), require('../../../assets/icons/tab-dex-active.png')],
  },
  { route: 'CaptureTab', label: '촬영', icon: Camera },
  { route: 'MapTab', label: '동네', icon: Compass },
  { route: 'MyTab', label: '마이페이지', icon: User },
];

export function MainTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeRoute = state.routes[state.index]?.name;

  // 동네와 고객 흐름은 각자 전용 하단 바를 쓴다.
  //   MapTab        -> NeighborhoodTabBar (지도/동네 도감/커뮤니티)
  //   CollectionTab -> ClientTabBar (고객 명부/고객 지도/고객 상담)
  // 커스텀 탭바에서는 tabBarStyle이 먹지 않으므로 여기서 직접 숨긴다.
  if (activeRoute === 'MapTab' || activeRoute === 'CollectionTab') {
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
          const color = isActive ? nd.colors.accent : nd.colors.ink;

          return (
            <Pressable
              accessibilityLabel={label}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              key={route}
              onPress={() => {
                // tabPress는 라우트 '키'로 배달된다. 이름을 넣으면 아무 리스너에도 닿지
                // 않아서, 촬영 탭이 전체 화면 카메라로 넘기는 리스너가 통째로 죽고
                // 빈 자리표시자만 뜬다. 눌린 탭이 이미 활성일 때 스택을 뿌리로 되감는
                // 기본 동작도 같은 이벤트를 타므로 함께 살아난다.
                const target = state.routes.find((item) => item.name === route)?.key;
                const event = navigation.emit({ type: 'tabPress', target, canPreventDefault: true });

                if (!isActive && !event.defaultPrevented) {
                  navigation.navigate(route);
                }
              }}
              style={({ pressed }) => [styles.item, isActive && styles.itemActive, pressed && styles.pressed]}
            >
              {Icon ? (
                <Icon color={color} fill={isActive ? color : 'transparent'} size={24} strokeWidth={isActive ? 2.2 : 1.8} />
              ) : (
                <Image resizeMode="contain" source={image![isActive ? 1 : 0]} style={styles.imageIcon} />
              )}
              {/* 큰 글자 설정에서도 '마이페이지'가 잘리지 않게 배율에 상한을 둔다.
                  표준 탭바가 큰 글자에서 배치를 바꾸는 것과 같은 취지다. */}
              <Text adjustsFontSizeToFit maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.label}>
                {label}
              </Text>
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
  // 동네 하단바(NeighborhoodTabBar)와 같은 처리를 쓴다.
  // 알약 안쪽에 4pt 여백을 두고 선택 배경을 항목 자체에 입히면, 첫·마지막
  // 항목의 선택 표시가 바 가장자리에 붙는 문제가 구조적으로 생기지 않는다.
  bar: {
    width: 335,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: nd.radius.pill,
    backgroundColor: nd.colors.barBg,
    padding: 4,
    ...createNdShadow(0.12, 12),
  },
  // 시안은 항목이 60pt 고정이지만 그러면 바 양 끝에 눌리지 않는 구간이 남는다.
  // 폭을 균등 분할해 틈을 없앤다.
  item: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: nd.radius.pill,
  },
  itemActive: {
    backgroundColor: nd.colors.scrim,
  },
  pressed: {
    opacity: 0.84,
  },
  imageIcon: {
    width: 24,
    height: 24,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: -0.25,
    color: nd.colors.ink,
  },
});
