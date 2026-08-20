import Svg, { Polygon } from 'react-native-svg';
import { useProjection } from '../render/projection';

/**
 * 선택한 가구가 차지하는 바닥 칸을 그대로 덮는 마름모.
 * 놓을 수 있으면 초록, 못 놓으면 빨강 - 손을 떼기 전에 결과를 보여주는 게 목적이다.
 */
export function IsoFootprintOverlay({
  gridX,
  gridY,
  width,
  depth,
  valid,
}: {
  gridX: number;
  gridY: number;
  width: number;
  depth: number;
  valid: boolean;
}) {
  const projection = useProjection();
  const footprint = projection.footprint(gridX, gridY, width, depth);
  const points = footprint.corners
    .map((corner) => `${corner.x - footprint.minX},${corner.y - footprint.minY}`)
    .join(' ');

  const stroke = valid ? '#2F9E5E' : '#D94F4F';
  const fill = valid ? 'rgba(47, 158, 94, 0.22)' : 'rgba(217, 79, 79, 0.24)';

  return (
    <Svg
      height={footprint.height}
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: footprint.minX,
        top: footprint.minY,
        // 바닥 표시라 가구보다 뒤, 방 배경보다는 앞이다.
        zIndex: 5,
      }}
      width={footprint.width}
    >
      <Polygon fill={fill} points={points} stroke={stroke} strokeWidth={2.5} />
    </Svg>
  );
}
