import { theme } from '@/shared/styles/theme';
import type { ImageSourcePropType } from 'react-native';

interface CollectionThemeLike {
  id?: string;
  palette?: string;
}

const coverBackgrounds = {
  sunsetHill: require('../../../assets/collection-covers/sunset-hill.png'),
  mossForest: require('../../../assets/collection-covers/moss-forest.png'),
  rainGarden: require('../../../assets/collection-covers/rain-garden.png'),
  summerRiver: require('../../../assets/collection-covers/summer-river.png'),
  autumnShrine: require('../../../assets/collection-covers/autumn-shrine.png'),
  snowVillage: require('../../../assets/collection-covers/snow-village.png'),
} satisfies Record<string, ImageSourcePropType>;

export function collectionPaletteStyle(palette?: string) {
  switch (palette) {
    case 'sunset-hill':
      return { backgroundColor: '#F7DFA7', borderColor: '#D99B67' };
    case 'moss-forest':
      return { backgroundColor: '#DCEBCF', borderColor: '#87A765' };
    case 'rain-garden':
      return { backgroundColor: '#E7E4F0', borderColor: '#9EA0BC' };
    case 'summer-river':
      return { backgroundColor: '#DCEFF4', borderColor: '#7CB1C4' };
    case 'autumn-shrine':
      return { backgroundColor: '#F1D8BD', borderColor: '#BE7653' };
    case 'snow-village':
      return { backgroundColor: '#EEF3F5', borderColor: '#AFC6CA' };
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

export function collectionCoverImageSource(collectionTheme?: CollectionThemeLike): ImageSourcePropType | null {
  switch (collectionTheme?.palette) {
    case 'sunset-hill':
      return coverBackgrounds.sunsetHill;
    case 'moss-forest':
      return coverBackgrounds.mossForest;
    case 'rain-garden':
      return coverBackgrounds.rainGarden;
    case 'summer-river':
      return coverBackgrounds.summerRiver;
    case 'autumn-shrine':
      return coverBackgrounds.autumnShrine;
    case 'snow-village':
      return coverBackgrounds.snowVillage;
  }

  switch (collectionTheme?.id) {
    case 'field-note':
    case 'spring-flower-alley':
      return coverBackgrounds.sunsetHill;
    case 'sunny-window':
    case 'summer-awning-shade':
      return coverBackgrounds.summerRiver;
    case 'storybook-forest-path':
      return coverBackgrounds.mossForest;
    case 'moonlight-lamp-alley':
    case 'night-alley':
      return coverBackgrounds.rainGarden;
    case 'prague-rooftop':
    case 'sticker-drawer':
      return coverBackgrounds.autumnShrine;
    case 'winter-blanket':
      return coverBackgrounds.snowVillage;
    default:
      return null;
  }
}
