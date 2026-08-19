import { Image, View } from 'react-native';
import { ProjectionProvider, createProjection, type IsoProjection } from '../render/projection';
import type { RoomStage } from '../render/shells.generated';
import { V3_SHELL_IMAGES } from '../support-room-v3.assets';

export interface LocalGridBounds {
  x: number;
  y: number;
  width: number;
  depth: number;
}

export interface IsoRoomProps {
  stage: RoomStage;
  /** 1254px 셸 원본 → 화면 배율 */
  scale: number;
  /** 관찰 모드에는 없고, 편집 중 선택 가구 주변에만 표시한다. */
  gridBounds?: LocalGridBounds;
  children?: React.ReactNode;
}

function GridLine({ from, to }: { from: { x: number; y: number }; to: { x: number; y: number } }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: (from.x + to.x) / 2 - length / 2,
        top: (from.y + to.y) / 2 - 0.75,
        width: length,
        height: 1.5,
        borderRadius: 1,
        backgroundColor: 'rgba(255, 108, 0, 0.55)',
        transform: [{ rotate: `${angle}deg` }],
        zIndex: 20,
      }}
    />
  );
}

function LocalGridOverlay({
  projection,
  bounds,
}: {
  projection: IsoProjection;
  bounds: LocalGridBounds;
}) {
  const startX = Math.max(0, Math.floor(bounds.x));
  const endX = Math.min(projection.geometry.cols, Math.ceil(bounds.x + bounds.width));
  const startY = Math.max(0, Math.floor(bounds.y));
  const endY = Math.min(projection.geometry.rows, Math.ceil(bounds.y + bounds.depth));
  const lines: React.JSX.Element[] = [];

  for (let y = startY; y <= endY; y += 1) {
    lines.push(
      <GridLine
        from={projection.point(startX, y)}
        key={`x-${y}`}
        to={projection.point(endX, y)}
      />,
    );
  }
  for (let x = startX; x <= endX; x += 1) {
    lines.push(
      <GridLine
        from={projection.point(x, startY)}
        key={`y-${x}`}
        to={projection.point(x, endY)}
      />,
    );
  }
  return <>{lines}</>;
}

export function IsoRoom({ stage, scale, gridBounds, children }: IsoRoomProps) {
  const projection = createProjection(stage, scale);

  return (
    <ProjectionProvider value={projection}>
      <View style={{ width: projection.displayW, height: projection.displayH }}>
        <Image
          resizeMode="stretch"
          source={V3_SHELL_IMAGES[stage]}
          style={{
            position: 'absolute',
            ...projection.imageFrame,
          }}
        />
        {gridBounds ? <LocalGridOverlay bounds={gridBounds} projection={projection} /> : null}
        {children}
      </View>
    </ProjectionProvider>
  );
}
