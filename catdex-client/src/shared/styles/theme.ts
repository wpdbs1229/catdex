import { Platform } from 'react-native';

export const theme = {
  colors: {
    background: '#FFF7E8',
    surface: '#FFFDF6',
    surfaceAlt: '#F8EAD2',
    primary: '#B9794B',
    primaryDark: '#4E3425',
    accent: '#6F834D',
    accentSoft: '#DDE8C8',
    text: '#33261C',
    mutedText: '#7D6A58',
    border: '#EBD8B8',
    tabMuted: '#9C8068',
    shadow: '#6B4A2F',
    badge: '#F5E3BF',
    success: '#6F9B72',
    warning: '#D59C45',
    mapBase: '#E9DFC9',
    paperLine: '#F1DFC4',
    inkSoft: '#5F4A3B',
    watercolorGreen: '#9CAF78',
    watercolorBlue: '#B7C9C5',
    watercolorPeach: '#F2C69F',
  },
  typography: {
    titleWeight: '800' as const,
    bodyWeight: '600' as const,
    letterSpacing: 0,
  },
  radius: {
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
    xxl: 36,
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
      shadowOpacity: 0.08,
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
