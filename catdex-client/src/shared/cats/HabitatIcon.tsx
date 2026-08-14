import { Home } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import type { CatHabitat } from '@/shared/cats/habitat';

interface HabitatIconProps {
  habitat: CatHabitat;
  color: string;
  size?: number;
  strokeWidth?: number;
}

/**
 * 거처 아이콘.
 *
 * 집냥이는 lucide의 집을 그대로 쓴다. 길·보호소는 lucide에 맞는 모양이 없어
 * 직접 그렸다. lucide와 같은 24 격자에 선만으로 그려서 셋이 나란히 있을 때
 * 굵기와 여백이 어긋나지 않는다.
 */
export function HabitatIcon({ habitat, color, size = 16, strokeWidth = 1.8 }: HabitatIconProps) {
  if (habitat === 'house') {
    return <Home color={color} size={size} strokeWidth={strokeWidth} />;
  }

  if (habitat === 'street') {
    return (
      <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
        {/* 멀어질수록 좁아지는 길 */}
        <Path
          d="M9 3h6l4 18H5L9 3Z"
          stroke={color}
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
        {/* 가운데 차선 */}
        <Path
          d="M12 6v2.5M12 11.5v2.5M12 17v2.5"
          stroke={color}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </Svg>
    );
  }

  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      {/* 지붕과 벽 */}
      <Path
        d="M3.5 10.5 12 4l8.5 6.5V20a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-9.5Z"
        stroke={color}
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      {/* 안에 든 발바닥 - 발가락 셋과 발바닥 */}
      <Path
        d="M9.6 12.6v.01M12 11.9v.01M14.4 12.6v.01"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={strokeWidth * 1.5}
      />
      <Path
        d="M12 14.6c1.7 0 2.6 1 2.6 2s-1.2 1.3-2.6 1.3-2.6-.3-2.6-1.3 0.9-2 2.6-2Z"
        stroke={color}
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
}
