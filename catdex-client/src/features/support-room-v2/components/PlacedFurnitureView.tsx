import { useMemo, useRef } from 'react';
import { Animated, Image, PanResponder, Pressable, StyleSheet } from 'react-native';
import type { FurnitureSpec } from '../domain/furniture';
import type { Placement } from '../domain/placement';
import { renderSortKey } from '../domain/placement';
import {
  CELL_WIDTH,
  FLOOR_ROW_HEIGHT,
  WALL_ROW_HEIGHT,
  WORLD,
  placementRect,
  snapToCell,
} from '../render/projection';
import { V2_FURNITURE_IMAGES } from '../support-room-v2.assets.generated';
import type { GridPoint } from '../domain/grid';

interface PlacedFurnitureViewProps {
  placement: Placement;
  spec: FurnitureSpec;
  /** 원본 픽셀 → 화면 픽셀 배율 */
  scale: number;
  editing: boolean;
  selected: boolean;
  onSelect: (placementId: string) => void;
  onDragStateChange: (dragging: boolean) => void;
  /** 드래그를 놓았을 때 스냅된 셀. 유효하지 않으면 원위치로 돌아간다. */
  onDrop: (placementId: string, cell: GridPoint) => void;
}

/**
 * 배치된 가구 하나. 편집 모드에서 드래그로 이동한다.
 * pan(스크롤)과 드래그의 우선순위: 편집 모드에서 가구 위에서 시작한 터치는
 * 드래그가 가져가고, 빈 곳에서 시작한 터치는 ScrollView pan이 가져간다.
 */
export function PlacedFurnitureView({
  placement,
  spec,
  scale,
  editing,
  selected,
  onSelect,
  onDragStateChange,
  onDrop,
}: PlacedFurnitureViewProps) {
  const rect = placementRect(placement, spec);
  const translate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const editingRef = useRef(editing);
  editingRef.current = editing;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => editingRef.current,
        onMoveShouldSetPanResponder: () => editingRef.current,
        onPanResponderGrant: () => {
          onSelect(placement.placementId);
          onDragStateChange(true);
        },
        onPanResponderMove: (_event, gesture) => {
          translate.setValue({ x: gesture.dx, y: gesture.dy });
        },
        onPanResponderRelease: (_event, gesture) => {
          onDragStateChange(false);
          translate.setValue({ x: 0, y: 0 });
          // 배치 원점 셀의 원본 픽셀 좌표에 드래그 이동량을 더해 스냅한다.
          const band = placement.surface === 'wall' ? WORLD.wallBand : WORLD.floorBand;
          const rowHeight = placement.surface === 'wall' ? WALL_ROW_HEIGHT : FLOOR_ROW_HEIGHT;
          const dropped = snapToCell(
            placement.surface,
            placement.gridX * CELL_WIDTH + gesture.dx / scale,
            band.top + placement.gridY * rowHeight + gesture.dy / scale,
            spec,
          );
          onDrop(placement.placementId, dropped);
        },
        onPanResponderTerminate: () => {
          onDragStateChange(false);
          translate.setValue({ x: 0, y: 0 });
        },
      }),
    [placement, spec, scale, onSelect, onDragStateChange, onDrop, translate],
  );

  const body = (
    <Image
      accessibilityIgnoresInvertColors
      resizeMode="contain"
      source={V2_FURNITURE_IMAGES[placement.furnitureId]}
      style={[styles.image, placement.flipX && styles.flipped]}
    />
  );

  return (
    <Animated.View
      {...(editing ? panResponder.panHandlers : {})}
      accessibilityLabel={`${spec.name}${selected ? ', 선택됨' : ''}`}
      accessibilityRole={editing ? 'button' : 'image'}
      style={[
        styles.wrap,
        {
          left: rect.left * scale,
          top: rect.top * scale,
          width: rect.width * scale,
          height: rect.height * scale,
          zIndex: renderSortKey(placement, spec),
          transform: translate.getTranslateTransform(),
        },
        selected && styles.selected,
      ]}
    >
      {editing ? (
        <Pressable onPress={() => onSelect(placement.placementId)} style={styles.touch}>
          {body}
        </Pressable>
      ) : (
        body
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
  },
  touch: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  flipped: {
    transform: [{ scaleX: -1 }],
  },
  selected: {
    borderWidth: 2,
    borderColor: 'rgba(224, 124, 51, 0.9)',
    borderRadius: 6,
  },
});
