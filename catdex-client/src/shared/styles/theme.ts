import { Platform } from 'react-native';

export const theme = {
  colors: {
    background: '#FFF7EA',
    surface: '#FFFFFF',
    surfaceAlt: '#FFF3DF',
    primary: '#F59E0B',
    primaryDark: '#92400E',
    text: '#2F241D',
    mutedText: '#8A7468',
    border: '#F1DCC5',
    tabMuted: '#B89C88',
    shadow: '#7C5731',
    badge: '#F5E7D0',
    success: '#62966E',
    warning: '#D97706',
    mapBase: '#EFE4D6',
  },
  radius: {
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
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
      shadowOpacity: 0.12,
      shadowRadius: elevation,
      shadowOffset: {
        width: 0,
        height: Math.max(4, Math.floor(elevation / 2)),
      },
    },
    android: {
      elevation,
      shadowColor: theme.colors.shadow,
    },
    default: {},
  });
}
