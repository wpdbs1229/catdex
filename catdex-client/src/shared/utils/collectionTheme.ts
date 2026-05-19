import { theme } from '@/shared/styles/theme';

export function collectionPaletteStyle(palette?: string) {
  switch (palette) {
    case 'spring':
      return { backgroundColor: '#FFF1F4', borderColor: '#E8A7B5' };
    case 'summer':
      return { backgroundColor: '#EAF4E7', borderColor: '#9FBE8A' };
    case 'green':
      return { backgroundColor: '#EEF3DE', borderColor: '#B9C59A' };
    case 'night':
      return { backgroundColor: '#E7E1D7', borderColor: '#7C6A5B' };
    case 'playful':
      return { backgroundColor: '#FFE9D2', borderColor: '#E2A76E' };
    case 'storybook':
      return { backgroundColor: '#F2EAD8', borderColor: '#BFA77A' };
    case 'pastel':
      return { backgroundColor: '#FCEAF2', borderColor: '#D9A6BF' };
    case 'europe':
      return { backgroundColor: '#EFE6DA', borderColor: '#B98C72' };
    case 'moon':
      return { backgroundColor: '#E7E8F1', borderColor: '#8F93B3' };
    case 'winter':
      return { backgroundColor: '#EAF1F2', borderColor: '#AFC6CA' };
    default:
      return { backgroundColor: theme.colors.surface, borderColor: theme.colors.border };
  }
}
