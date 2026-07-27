import { Platform } from 'react-native';

/**
 * 외주 디자인 시안 기준 팔레트.
 * 흰 배경 위에 따뜻한 주황을 주 강조색으로 쓰고, 좋아요·활성 탭처럼 시선을 끌어야
 * 하는 곳에만 코랄 레드를 쓴다. 두 색을 같은 위계로 섞지 않는 것이 이 시스템의 규칙이다.
 */
export const theme = {
  colors: {
    background: '#FFFFFF',
    /** 카드 뒤에 깔리는 따뜻한 미색 */
    backgroundSoft: '#FDF8F3',
    surface: '#FFFFFF',
    /** 검색창·칩처럼 눌리는 면 */
    surfaceMuted: '#F3F3F6',

    /** 주 강조색. 기본 동작 버튼과 강조 테두리 */
    primary: '#F5942F',
    primaryLight: '#FBC17A',
    /** 주황 계열 연한 배경 */
    primarySoft: '#FDEBD6',

    /** 좋아요·활성 탭처럼 시선을 끄는 지점에만 */
    accent: '#F0454E',
    accentSoft: '#FBDDD3',

    text: '#17171A',
    mutedText: '#8E8E93',
    subtleText: '#B4B4BA',
    border: '#ECECF0',
    tabMuted: '#B4B4BA',

    /** 촬영일 태그처럼 정보를 얹는 라벨 */
    tagBackground: '#E9E8FD',
    tagText: '#5B5BD6',

    success: '#3FA96B',
    warning: '#E8A33D',
    danger: '#E5484D',

    shadow: '#7C6350',
    overlay: 'rgba(23, 23, 26, 0.45)',

    // 지도 화면에서 쓰는 값. 지도 디자인이 확정되면 함께 정리한다.
    mapBase: '#F1EFEA',
    primaryDark: '#8A5A2B',
  },
  typography: {
    titleWeight: '800' as const,
    bodyWeight: '600' as const,
    letterSpacing: 0,
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
    pill: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
};

export function createShadow(elevation = 10) {
  return Platform.select({
    ios: {
      shadowColor: theme.colors.shadow,
      shadowOpacity: 0.1,
      shadowRadius: Math.max(6, elevation),
      shadowOffset: {
        width: 0,
        height: Math.max(3, Math.floor(elevation / 3)),
      },
    },
    android: {
      elevation: Math.max(1, Math.floor(elevation / 2)),
      shadowColor: theme.colors.shadow,
    },
    default: {},
  });
}
