import { StyleSheet, View } from 'react-native';
import { FLOOR_GRID, WALL_GRID, type GridPoint, type Surface } from '../domain/grid';
import type { RoomShellConfig } from '../domain/room-shell';
import { CELL_WIDTH, FLOOR_ROW_HEIGHT, WALL_ROW_HEIGHT, WORLD, cellRect } from '../render/projection';

interface GridOverlayProps {
  /** 원본 픽셀 → 화면 픽셀 배율 */
  scale: number;
  shell: RoomShellConfig;
  /** 저장 검증에서 막힌 셀. 빨간색으로 강조한다. */
  blockedCells: readonly GridPoint[];
  blockedSurface: Surface;
}

/** 편집 모드에서만 보이는 그리드. 선은 얇은 View로 그린다(SVG 불필요). */
export function GridOverlay({ scale, shell, blockedCells, blockedSurface }: GridOverlayProps) {
  const lines: React.JSX.Element[] = [];

  const bands: Array<{ surface: Surface; top: number; bottom: number; rows: number; rowHeight: number }> = [
    { surface: 'wall', top: WORLD.wallBand.top, bottom: WORLD.wallBand.bottom, rows: WALL_GRID.rows, rowHeight: WALL_ROW_HEIGHT },
    { surface: 'floor', top: WORLD.floorBand.top, bottom: WORLD.floorBand.bottom, rows: FLOOR_GRID.rows, rowHeight: FLOOR_ROW_HEIGHT },
  ];

  for (const band of bands) {
    for (let column = 0; column <= FLOOR_GRID.columns; column += 1) {
      lines.push(
        <View
          key={`${band.surface}-v${column}`}
          pointerEvents="none"
          style={[
            styles.line,
            {
              left: column * CELL_WIDTH * scale,
              top: band.top * scale,
              width: StyleSheet.hairlineWidth,
              height: (band.bottom - band.top) * scale,
            },
          ]}
        />,
      );
    }
    for (let row = 0; row <= band.rows; row += 1) {
      lines.push(
        <View
          key={`${band.surface}-h${row}`}
          pointerEvents="none"
          style={[
            styles.line,
            {
              left: 0,
              top: (band.top + row * band.rowHeight) * scale,
              width: WORLD.width * scale,
              height: StyleSheet.hairlineWidth,
            },
          ]}
        />,
      );
    }
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {lines}
      {shell.doors.flatMap((door) =>
        door.clearanceCells.map((cell) => {
          const rect = cellRect('floor', cell);
          return (
            <View
              key={`${door.id}-${cell.x}-${cell.y}`}
              style={[
                styles.doorCell,
                {
                  left: rect.left * scale,
                  top: rect.top * scale,
                  width: rect.width * scale,
                  height: rect.height * scale,
                },
              ]}
            />
          );
        }),
      )}
      {blockedCells.map((cell) => {
        const rect = cellRect(blockedSurface, cell);
        return (
          <View
            key={`blocked-${cell.x}-${cell.y}`}
            style={[
              styles.blockedCell,
              {
                left: rect.left * scale,
                top: rect.top * scale,
                width: rect.width * scale,
                height: rect.height * scale,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    position: 'absolute',
    backgroundColor: 'rgba(17, 17, 17, 0.18)',
  },
  doorCell: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(224, 124, 51, 0.6)',
    backgroundColor: 'rgba(224, 124, 51, 0.12)',
  },
  blockedCell: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(220, 38, 38, 0.9)',
    backgroundColor: 'rgba(220, 38, 38, 0.25)',
  },
});
