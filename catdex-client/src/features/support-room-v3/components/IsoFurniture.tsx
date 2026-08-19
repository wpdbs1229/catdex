import { Image, Pressable, View } from 'react-native';
import type { FurnitureId } from '@/features/support-room-v2/domain/furniture';
import { V2_FURNITURE_IMAGES } from '@/features/support-room-v2/support-room-v2.assets.generated';
import {
  calculateFurnitureSpriteLayout,
  furnitureRenderMeta,
  type CompositeBehavior,
} from '../render/sprite-layout';
import { useProjection } from '../render/projection';
import { IsoContactShadow } from './IsoContactShadow';

export interface IsoFurnitureProps {
  furnitureId: FurnitureId;
  /** 고양이+가구가 한 장에 그려진 행동 합성본. 독립 가구 대신 이 그림만 렌더한다. */
  compositeSource?: ReturnType<typeof require>;
  compositeBehavior?: CompositeBehavior;
  gridX: number;
  gridY: number;
  selected?: boolean;
  /** 있으면 이 가구(또는 위에 앉은 고양이)를 누를 수 있다. */
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function IsoFurniture({
  furnitureId,
  compositeSource,
  compositeBehavior,
  gridX,
  gridY,
  selected = false,
  onPress,
  accessibilityLabel,
}: IsoFurnitureProps) {
  const projection = useProjection();
  const meta = furnitureRenderMeta(furnitureId);

  // 시점이 맞지 않는 일반 가구는 새 아트가 나오기 전 기본 장면에 억지로 넣지 않는다.
  if (meta.needsArtReexport && !compositeSource) return null;

  const layout = calculateFurnitureSpriteLayout({
    projection,
    furnitureId,
    gridX,
    gridY,
    compositeBehavior,
  });

  return (
    <>
      <IsoContactShadow layout={layout} />
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={onPress ? 'button' : undefined}
        onPress={onPress}
        pointerEvents={onPress ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          left: layout.left,
          top: layout.top,
          width: layout.imageSize,
          height: layout.imageSize,
          zIndex: layout.zIndex,
        }}
      >
        <Image
          resizeMode="contain"
          source={compositeSource ?? V2_FURNITURE_IMAGES[furnitureId]}
          style={{
            width: '100%',
            height: '100%',
            opacity: selected ? 0.88 : 1,
          }}
        />
        {selected ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              inset: 2,
              borderWidth: 2,
              borderColor: 'rgba(255, 108, 0, 0.72)',
              borderRadius: 10,
            }}
          />
        ) : null}
      </Pressable>
    </>
  );
}
