import { Image, View } from 'react-native';
import type { FurnitureId } from '@/features/support-room-v2/domain/furniture';
import { V2_FURNITURE_IMAGES } from '@/features/support-room-v2/support-room-v2.assets.generated';
import { FURNITURE_ANCHORS } from '../render/furniture-anchors.generated';
import { ISO, isoDepth, isoPoint } from '../render/iso';

/**
 * footprint 다이아 위에 가구 스프라이트를 정확히 얹는다.
 *
 * 아이소에서 W×D footprint의 화면 폭은 (W+D)·tileW/2다. 칸 수에 타일 폭을 곱하면
 * 안 맞는다. 또 스프라이트마다 투명 여백이 달라(내용 폭 0.55~0.84) 이미지 사각형을
 * 그대로 쓰면 가구가 뜨거나 겹친다. 그래서 measure 스크립트가 잰 내용 영역과
 * 접지선을 써서, 내용의 밑변을 다이아 앞꼭짓점에 맞춘다.
 */

export interface IsoFurnitureProps {
  furnitureId: FurnitureId;
  /**
   * 가구 대신 그릴 이미지(고양이+가구 합성 행동). 지정하면 같은 footprint 위에
   * 합성본만 그린다 - 독립 가구를 함께 그리면 가구가 두 개로 보인다.
   */
  compositeSource?: ReturnType<typeof require>;
  /** footprint 좌상단 셀(0.5칸 단위 허용) */
  gridX: number;
  gridY: number;
  /**
   * footprint 다이아에 내접하는 비율. 기본 0.72(≈1/√2)는 정사각 바닥에 내접하는
   * 원이 다이아에서 갖는 폭이다. 1로 두면 대각 폭 전체를 차지해 가구가 커 보인다.
   */
  fill?: number;
  flipX?: boolean;
  selected?: boolean;
  onPress?: () => void;
}

export function IsoFurniture({
  furnitureId,
  compositeSource,
  gridX,
  gridY,
  fill = ISO.footprintFill,
  flipX = false,
  selected = false,
}: IsoFurnitureProps) {
  const anchor = FURNITURE_ANCHORS[furnitureId];
  const { footprintW: w, footprintD: d } = anchor;

  // footprint 다이아
  const diamondWidth = ((w + d) * ISO.tileW) / 2;
  const diamondHeight = ((w + d) * ISO.tileH) / 2;
  const center = isoPoint(gridX + w / 2, gridY + d / 2);

  // 합성본은 고양이가 얹혀 가구보다 크므로 여백을 조금 더 준다.
  const contentW = compositeSource ? anchor.contentW / 1.18 : anchor.contentW;
  // 내용이 다이아에 내접하도록 이미지 크기를 역산 (원본은 정사각)
  const imageSize = (diamondWidth * fill) / contentW;
  // 접지선은 다이아 중심에서 내접 영역의 앞 끝까지 내린 지점
  const baseY = center.y + (diamondHeight / 2) * fill;
  const top = baseY - anchor.baselineY * imageSize;
  const left0 = center.x - (anchor.contentX + anchor.contentW / 2) * imageSize;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: left0,
        top,
        width: imageSize,
        height: imageSize,
        zIndex: isoDepth(gridX + w, gridY + d),
      }}
    >
      <Image
        resizeMode="contain"
        source={compositeSource ?? V2_FURNITURE_IMAGES[furnitureId]}
        style={{
          width: '100%',
          height: '100%',
          transform: flipX ? [{ scaleX: -1 }] : undefined,
          opacity: selected ? 0.85 : 1,
        }}
      />
    </View>
  );
}

/** 편집용 footprint 하이라이트. 다이아 네 변을 선으로 그린다. */
export function IsoFootprint({
  gridX,
  gridY,
  width,
  depth,
  color,
}: {
  gridX: number;
  gridY: number;
  width: number;
  depth: number;
  color: string;
}) {
  const corners = [
    isoPoint(gridX, gridY),
    isoPoint(gridX + width, gridY),
    isoPoint(gridX + width, gridY + depth),
    isoPoint(gridX, gridY + depth),
  ];
  return (
    <>
      {corners.map((from, index) => {
        const to = corners[(index + 1) % corners.length];
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const lineWidth = Math.abs(dx);
        const sign = dx * dy > 0 ? '' : '-';
        return (
          <View
            key={index}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: (from.x + to.x) / 2 - lineWidth / 2,
              top: (from.y + to.y) / 2 - 1,
              width: lineWidth,
              height: 2,
              backgroundColor: color,
              zIndex: isoDepth(gridX + width, gridY + depth) - 1,
              transform: [{ skewY: `${sign}${ISO.skewDeg}deg` }],
            }}
          />
        );
      })}
    </>
  );
}
