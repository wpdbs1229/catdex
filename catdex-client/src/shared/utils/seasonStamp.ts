import type { ImageSourcePropType } from 'react-native';

const stampImages = {
  'spring-walk-2026': require('../../../assets/stamps/spring-walk-2026.png'),
  'summer-shade-2026': require('../../../assets/stamps/summer-shade-2026.png'),
  'autumn-alley-2026': require('../../../assets/stamps/autumn-alley-2026.png'),
  'winter-blanket-2026': require('../../../assets/stamps/winter-blanket-2026.png'),
} satisfies Record<string, ImageSourcePropType>;

export function seasonStampImageSource(stamp: { id: string }): ImageSourcePropType | undefined {
  return stampImages[stamp.id as keyof typeof stampImages];
}
