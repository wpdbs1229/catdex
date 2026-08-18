import { Image, StyleSheet, View } from 'react-native';
import type { ImageStyle, StyleProp, ViewStyle } from 'react-native';
import type { SurfaceId } from '@/features/support-room-v2/domain/furniture';
import { V2_SURFACE_IMAGES } from '@/features/support-room-v2/support-room-v2.assets.generated';
import { ISO, isoPoint, type IsoWall } from '../render/iso';

/**
 * 아이소메트릭 컷어웨이 방 렌더러 (docs/16 프롬프트 C 기반, docs/17 시안 기준).
 *
 * 신규 아트 없이 시안 룩을 만든다:
 *   벽    = 상부 벽지 밴드 + 하부 와인스코트 + 우드 트림 3줄(캡·체어레일·걸레받이)
 *   바닥  = 반복 타일에 scaleY(0.5)·rotate(45°) + 우드 프레임과 두께 면
 *   문·창 = 셸 배경에서 추출한 정면 그림에 skewY(±26.565°)
 */

const WOOD = {
  cap: '#8A5A2B',
  capLight: '#B9843F',
  rail: '#A9773F',
  base: '#9C6B3A',
  baseDark: '#7A5028',
  frame: '#A87243',
  frameDark: '#7C5027',
};
const WAINSCOT = '#93A583';
const WAINSCOT_TOP = 'rgba(255, 255, 255, 0.18)';

/** 벽면별 명암. 왼쪽 면이 더 어둡다(광원 우상단). */
const WALL_TINT: Record<IsoWall, string> = {
  right: 'rgba(92, 70, 46, 0.04)',
  left: 'rgba(92, 70, 46, 0.15)',
};

export interface IsoFixture {
  key: string;
  /** 벽에 붙일 정면 그림. 추출 fixture든 벽 장식 가구든 상관없다. */
  source: ReturnType<typeof require>;
  wall: IsoWall;
  /** 벽을 따라가는 시작 칸 */
  cell: number;
  /** 차지하는 칸 수 */
  cells: number;
  /** 바닥에서 띄우는 높이(px). 창문은 양수, 문은 0 */
  lift: number;
  height: number;
}

export interface IsoRoomProps {
  cols: number;
  rows: number;
  wallSurfaceId: SurfaceId;
  floorSurfaceId: SurfaceId;
  fixtures: readonly IsoFixture[];
  children?: React.ReactNode;
}

/** 벽면 위 요소의 스타일. 벽을 따라가는 구간 [cell, cell+cells)와 높이 구간으로 지정한다. */
function wallBandStyle(
  wall: IsoWall,
  span: { from: number; to: number },
  band: { bottom: number; height: number },
): ViewStyle {
  const mid = (span.from + span.to) / 2;
  const anchor = wall === 'right' ? isoPoint(mid, 0) : isoPoint(0, mid);
  const width = ((span.to - span.from) * ISO.tileW) / 2;
  return {
    position: 'absolute',
    // skewY는 요소 중심을 기준으로 기울이므로 중심을 맞춰 배치한다.
    left: anchor.x - width / 2,
    top: anchor.y - band.bottom - band.height,
    width,
    height: band.height,
    transform: [{ skewY: `${wall === 'right' ? '' : '-'}${ISO.skewDeg}deg` }],
  };
}

export function IsoRoom({
  cols,
  rows,
  wallSurfaceId,
  floorSurfaceId,
  fixtures,
  children,
}: IsoRoomProps) {
  const walls: Array<{ side: IsoWall; cells: number }> = [
    { side: 'right', cells: cols },
    { side: 'left', cells: rows },
  ];

  const floorSpan = { width: cols * ISO.cellSrc, depth: rows * ISO.cellSrc };
  const floorCenter = isoPoint(cols / 2, rows / 2);
  const floorTransform = [{ scaleY: 0.5 }, { rotate: '45deg' }] as const;

  /** 바닥 프레임: 같은 중심에 조금 키운 다이아를 뒤에 깔아 테두리를 만든다. */
  const rim = ISO.floorRim;

  return (
    <>
      {/* ── 벽 ─────────────────────────────────────────────────────── */}
      {walls.map(({ side, cells }) => {
        const span = { from: 0, to: cells };
        return (
          <View key={side}>
            {/* 상부: 벽지 */}
            <Image
              resizeMode="repeat"
              source={V2_SURFACE_IMAGES[wallSurfaceId]}
              style={
                wallBandStyle(side, span, {
                  bottom: ISO.wainscotH,
                  height: ISO.wallH - ISO.wainscotH,
                }) as StyleProp<ImageStyle>
              }
            />
            {/* 하부: 와인스코트 */}
            <View
              style={[
                wallBandStyle(side, span, { bottom: 0, height: ISO.wainscotH }),
                { backgroundColor: WAINSCOT, borderTopWidth: 2, borderTopColor: WAINSCOT_TOP },
              ]}
            />
            {/* 면 음영 */}
            <View
              style={[
                wallBandStyle(side, span, { bottom: 0, height: ISO.wallH }),
                { backgroundColor: WALL_TINT[side] },
              ]}
              pointerEvents="none"
            />
            {/* 우드 트림: 상단 캡 / 체어레일 / 걸레받이 */}
            <View
              style={[
                wallBandStyle(side, span, { bottom: ISO.wallH, height: ISO.capH }),
                { backgroundColor: WOOD.cap, borderTopWidth: 2, borderTopColor: WOOD.capLight },
              ]}
            />
            <View
              style={[
                wallBandStyle(side, span, { bottom: ISO.wainscotH - 3, height: 5 }),
                { backgroundColor: WOOD.rail },
              ]}
            />
            <View
              style={[
                wallBandStyle(side, span, { bottom: 0, height: ISO.baseboardH }),
                { backgroundColor: WOOD.base, borderTopWidth: 1.5, borderTopColor: WOOD.rail },
              ]}
            />
          </View>
        );
      })}

      {/* ── 바닥 ───────────────────────────────────────────────────── */}
      <View
        style={{
          position: 'absolute',
          left: floorCenter.x - (floorSpan.width + rim) / 2,
          top: floorCenter.y - (floorSpan.depth + rim) / 2,
          width: floorSpan.width + rim,
          height: floorSpan.depth + rim,
          backgroundColor: WOOD.frame,
          transform: floorTransform,
        }}
      />
      <Image
        resizeMode="repeat"
        source={V2_SURFACE_IMAGES[floorSurfaceId]}
        style={{
          position: 'absolute',
          left: floorCenter.x - floorSpan.width / 2,
          top: floorCenter.y - floorSpan.depth / 2,
          width: floorSpan.width,
          height: floorSpan.depth,
          transform: floorTransform,
        }}
      />

      {/* 앞쪽 두 모서리의 두께 면 (컷어웨이 단면) */}
      {([
        { from: isoPoint(0, rows), to: isoPoint(cols, rows), sign: '' },
        { from: isoPoint(cols, rows), to: isoPoint(cols, 0), sign: '-' },
      ] as const).map((edge, index) => {
        const width = Math.abs(edge.to.x - edge.from.x);
        const cx = (edge.from.x + edge.to.x) / 2;
        const cy = (edge.from.y + edge.to.y) / 2;
        return (
          <View
            key={index}
            style={{
              position: 'absolute',
              left: cx - width / 2,
              top: cy,
              width,
              height: ISO.platformH,
              backgroundColor: index === 0 ? WOOD.frame : WOOD.frameDark,
              transform: [{ skewY: `${edge.sign}${ISO.skewDeg}deg` }],
            }}
          />
        );
      })}

      {/* ── 문·창·조명 (벽 부착) ───────────────────────────────────── */}
      {fixtures.map((fixture) => {
        const style = wallBandStyle(
          fixture.wall,
          { from: fixture.cell, to: fixture.cell + fixture.cells },
          { bottom: fixture.lift, height: fixture.height },
        );
        return (
          <Image
            key={fixture.key}
            resizeMode="stretch"
            source={fixture.source}
            style={style as StyleProp<ImageStyle>}
          />
        );
      })}

      {children}
    </>
  );
}

export const isoRoomStyles = StyleSheet.create({
  /** 방을 담는 월드 컨테이너. 자식은 전부 absolute. */
  world: {
    position: 'relative',
  },
});
