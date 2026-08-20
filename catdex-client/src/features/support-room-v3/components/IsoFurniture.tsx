import { useRef } from 'react';
import { Image, PanResponder, View } from 'react-native';
import type { FurnitureId } from '@/features/support-room-v2/domain/furniture';
import { V2_FURNITURE_IMAGES } from '@/features/support-room-v2/support-room-v2.assets.generated';
import {
  calculateCatOnFurnitureLayout,
  calculateFurnitureSpriteLayout,
  furnitureRenderMeta,
  type CompositeBehavior,
} from '../render/sprite-layout';
import { useProjection } from '../render/projection';
import { IsoContactShadow } from './IsoContactShadow';

export interface IsoFurnitureProps {
  furnitureId: FurnitureId;
  /** 가구 위에 앉은 고양이 그림(가구 없는 단독 포즈). 가구와 따로 그린다. */
  catSource?: ReturnType<typeof require>;
  compositeBehavior?: CompositeBehavior;
  gridX: number;
  gridY: number;
  /** 좌우 반전해서 그린다. footprint는 대칭이라 충돌 판정은 바뀌지 않는다. */
  flipX?: boolean;
  selected?: boolean;
  /** 있으면 이 가구(또는 위에 앉은 고양이)를 누를 수 있다. 드래그가 아니었을 때만 불린다. */
  onPress?: () => void;
  accessibilityLabel?: string;
  /** 켜져 있으면 눌러서 바로 옮길 수 있다. */
  draggable?: boolean;
  /** 드래그 제스처가 시작된 순간(선택 처리용). */
  onDragStart?: () => void;
  /** 드래그 시작점 대비 누적 그리드 이동량. */
  onDragMove?: (dxGrid: number, dyGrid: number) => void;
  onDragEnd?: () => void;
}

const TAP_THRESHOLD_PX = 4;

export function IsoFurniture({
  furnitureId,
  catSource,
  compositeBehavior,
  gridX,
  gridY,
  flipX = false,
  selected = false,
  onPress,
  accessibilityLabel,
  draggable = false,
  onDragStart,
  onDragMove,
  onDragEnd,
}: IsoFurnitureProps) {
  const projection = useProjection();
  const meta = furnitureRenderMeta(furnitureId);

  // 최신 콜백/상태를 ref로 미러링한다 - PanResponder는 생성 시점 클로저를
  // 그대로 붙들고 있어서, 매 렌더마다 새로 만들지 않는 한 이 방법뿐이다.
  const draggableRef = useRef(draggable);
  draggableRef.current = draggable;
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;
  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;
  const onDragMoveRef = useRef(onDragMove);
  onDragMoveRef.current = onDragMove;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;
  const projectionRef = useRef(projection);
  projectionRef.current = projection;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => draggableRef.current || !!onPressRef.current,
      onPanResponderGrant: () => {
        if (draggableRef.current) onDragStartRef.current?.();
      },
      onPanResponderMove: (_evt, gesture) => {
        if (!draggableRef.current) return;
        const { dx, dy } = projectionRef.current.screenDeltaToGrid(gesture.dx, gesture.dy);
        onDragMoveRef.current?.(dx, dy);
      },
      onPanResponderRelease: (_evt, gesture) => {
        const moved = Math.hypot(gesture.dx, gesture.dy) >= TAP_THRESHOLD_PX;
        if (draggableRef.current && moved) {
          onDragEndRef.current?.();
        } else {
          onPressRef.current?.();
        }
      },
      onPanResponderTerminate: () => {
        if (draggableRef.current) onDragEndRef.current?.();
      },
      onStartShouldSetPanResponder: () => draggableRef.current || !!onPressRef.current,
    }),
  ).current;

  // 시점이 맞지 않는 일반 가구는 새 아트가 나오기 전 기본 장면에 억지로 넣지 않는다.
  if (meta.needsArtReexport && !catSource) return null;

  const layout = calculateFurnitureSpriteLayout({
    projection,
    furnitureId,
    gridX,
    gridY,
    compositeBehavior,
  });

  const interactive = draggable || !!onPress;

  return (
    <>
      <IsoContactShadow layout={layout} />
      <View
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={interactive ? 'button' : undefined}
        pointerEvents={interactive ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          left: layout.left,
          top: layout.top,
          width: layout.imageSize,
          height: layout.imageSize,
          zIndex: layout.zIndex,
        }}
        {...(interactive ? panResponder.panHandlers : null)}
      >
        <Image
          resizeMode="contain"
          source={V2_FURNITURE_IMAGES[furnitureId]}
          style={{
            width: '100%',
            height: '100%',
            opacity: selected ? 0.92 : 1,
            transform: flipX ? [{ scaleX: -1 }] : undefined,
          }}
        />
        {selected ? (
          // 스프라이트는 투명 여백이 넓어서 정사각형 전체에 테두리를 두르면
          // 가구 밖으로 한참 삐져나온다. 실제로 그려진 영역에만 두른다.
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: layout.visual.left - layout.left,
              top: layout.visual.top - layout.top,
              width: layout.visual.width,
              height: layout.visual.height,
              borderWidth: 2,
              borderColor: 'rgba(255, 108, 0, 0.72)',
              borderRadius: 8,
            }}
          />
        ) : null}
      </View>

      {catSource && compositeBehavior ? <CatOnFurniture
        behavior={compositeBehavior}
        furnitureId={furnitureId}
        gridX={gridX}
        gridY={gridY}
        source={catSource}
      /> : null}
    </>
  );
}

/**
 * 가구 위에 앉은 고양이. 가구와 별개의 스프라이트라 크기·anchor·깊이를 따로 갖는다.
 * 눌렀을 때의 상담 처리는 가구 쪽 pointer가 받으므로 여기는 그림만 그린다.
 */
function CatOnFurniture({
  furnitureId,
  gridX,
  gridY,
  behavior,
  source,
}: {
  furnitureId: FurnitureId;
  gridX: number;
  gridY: number;
  behavior: CompositeBehavior;
  source: ReturnType<typeof require>;
}) {
  const projection = useProjection();
  const layout = calculateCatOnFurnitureLayout(projection, furnitureId, gridX, gridY, behavior);

  return (
    <Image
      resizeMode="contain"
      source={source}
      style={{
        position: 'absolute',
        left: layout.left,
        top: layout.top,
        width: layout.imageSize,
        height: layout.imageSize,
        zIndex: layout.zIndex + 1,
      }}
    />
  );
}
