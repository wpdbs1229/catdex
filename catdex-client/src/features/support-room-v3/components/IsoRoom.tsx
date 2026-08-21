import { Image, View } from 'react-native';
import { ProjectionProvider, createProjection, type IsoProjection } from '../render/projection';
import type { RoomStage } from '../render/shells.generated';
import type { SurfaceId } from '@/features/support-room-v2/domain/furniture';
import { V3_SHELL_IMAGES } from '../support-room-v3.assets';
import { V3_SURFACE_OVERLAYS } from '../support-room-v3.surfaces';

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
  /** 골라 둔 벽지·바닥재. 셸 위에 겹쳐 그린다. */
  wallSurfaceId?: SurfaceId;
  floorSurfaceId?: SurfaceId;
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

/**
 * bounds는 정수 격자가 아니라 선택한 가구의 실제(소수) footprint다.
 * 예전엔 Math.floor/ceil로 정수 칸에 스냅해서 그렸는데, 가구가 0.25·1.65
 * 같은 소수 좌표에 놓이면 격자선이 가구 가장자리와 어긋나 보였다(원점 근처
 * 가구는 방 가장자리 클램프까지 겹쳐 오버레이가 부풀어 보이는 문제도 있었다).
 * 지금은 클램프 없이 bounds를 footprintW×footprintD 칸으로 등분해서 그린다 -
 * 항상 가구 하나의 실제 크기·위치와 정확히 겹친다.
 */
function LocalGridOverlay({
  projection,
  bounds,
}: {
  projection: IsoProjection;
  bounds: LocalGridBounds;
}) {
  const cols = Math.max(1, Math.round(bounds.width));
  const rows = Math.max(1, Math.round(bounds.depth));
  const lines: React.JSX.Element[] = [];

  for (let row = 0; row <= rows; row += 1) {
    const y = bounds.y + (bounds.depth * row) / rows;
    lines.push(
      <GridLine
        from={projection.point(bounds.x, y)}
        key={`row-${row}`}
        to={projection.point(bounds.x + bounds.width, y)}
      />,
    );
  }
  for (let col = 0; col <= cols; col += 1) {
    const x = bounds.x + (bounds.width * col) / cols;
    lines.push(
      <GridLine
        from={projection.point(x, bounds.y)}
        key={`col-${col}`}
        to={projection.point(x, bounds.y + bounds.depth)}
      />,
    );
  }
  return <>{lines}</>;
}

export function IsoRoom({
  stage,
  scale,
  gridBounds,
  wallSurfaceId,
  floorSurfaceId,
  children,
}: IsoRoomProps) {
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
        {[floorSurfaceId, wallSurfaceId].map((surfaceId) =>
          surfaceId ? (
            <Image
              key={surfaceId}
              resizeMode="stretch"
              source={V3_SURFACE_OVERLAYS[stage][surfaceId]}
              style={{ position: 'absolute', ...projection.imageFrame }}
            />
          ) : null,
        )}
        {gridBounds ? <LocalGridOverlay bounds={gridBounds} projection={projection} /> : null}
        {children}
      </View>
    </ProjectionProvider>
  );
}
