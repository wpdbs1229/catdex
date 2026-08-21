import { Animated } from 'react-native';
import Svg, { Defs, LinearGradient, Polygon, Stop } from 'react-native-svg';
import { useProjection } from '../render/projection';
import type { GridRect } from '../support-room-v3.layout';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

/**
 * 문이 열렸을 때 바닥에 드는 빛.
 *
 * 문짝은 방 그림에 구워져 있어 실제로 여닫을 수 없다(단계마다 door_open
 * 프레임이 따로 있어야 한다). 대신 문 앞 바닥에 빛이 들어왔다 사라지게
 * 해서 "문이 열리고 손님이 들어왔다"를 읽히게 한다.
 *
 * 빛은 격자에 맞춰 그리므로 어느 단계, 어느 문에서나 문 앞 두 칸에 정확히
 * 얹힌다.
 */
export function DoorwayLight({ rect, opacity }: { rect: GridRect; opacity: Animated.Value }) {
  const projection = useProjection();
  const corners = [
    projection.point(rect.x, rect.y),
    projection.point(rect.x + rect.width, rect.y),
    projection.point(rect.x + rect.width, rect.y + rect.depth),
    projection.point(rect.x, rect.y + rect.depth),
  ];
  const minX = Math.min(...corners.map((point) => point.x));
  const minY = Math.min(...corners.map((point) => point.y));
  const width = Math.max(...corners.map((point) => point.x)) - minX;
  const height = Math.max(...corners.map((point) => point.y)) - minY;
  const points = corners.map((point) => `${point.x - minX},${point.y - minY}`).join(' ');

  return (
    <AnimatedSvg
      height={height}
      pointerEvents="none"
      style={{ position: 'absolute', left: minX, top: minY, opacity, zIndex: 3 }}
      width={width}
    >
      <Defs>
        <LinearGradient id="doorway" x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor="#FFE6B0" stopOpacity="0.85" />
          <Stop offset="1" stopColor="#FFE6B0" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Polygon fill="url(#doorway)" points={points} />
    </AnimatedSvg>
  );
}
