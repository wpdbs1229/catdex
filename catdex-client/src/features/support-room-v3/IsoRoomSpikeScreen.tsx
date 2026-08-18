import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ClientStackParamList } from '@/app/navigation/types';
import { CAT_ACTION_IMAGES } from '@/features/support-room/support-room.assets';
import type { FurnitureId } from '@/features/support-room-v2/domain/furniture';
import {
  V2_FURNITURE_IMAGES,
  V2_SURFACE_IMAGES,
} from '@/features/support-room-v2/support-room-v2.assets.generated';
import { nd } from '@/shared/styles/theme';

/**
 * 프롬프트 A - 아이소메트릭 컷어웨이 렌더 스파이크 (docs/16).
 *
 * 목적: 기존 표면 타일·가구 스프라이트가 아이소 방에서 성립하는지,
 * 세로 화면 가독성과 팬·핀치 감각을 실기에서 확인한다.
 * 에셋을 새로 굽지 않고 RN transform만으로 사영한다:
 *   바닥 = 반복 타일 사각형에 scaleY(0.5)·rotate(45°)
 *   벽   = 반복 타일 사각형에 skewY(±26.565°)  (tan 26.565° = 0.5)
 * 이 파일은 스파이크 전용이며 프롬프트 C에서 정식 렌더러로 대체한다.
 */

const COLS = 8;
const ROWS = 6;
/** 셀 다이아의 화면 폭. 높이는 항상 절반(2:1 아이소). */
const TILE_W = 64;
const TILE_H = TILE_W / 2;
/** 원본 타일 좌표계에서의 셀 한 변 */
const CELL_SRC = TILE_W / Math.SQRT2;
const WALL_H = 148;
const ISO_SKEW_DEG = 26.565;

const WORLD_W = 760;
const WORLD_H = 980;
const ORIGIN_X = WORLD_W / 2;
const ORIGIN_Y = 360;

function iso(x: number, y: number): { x: number; y: number } {
  return {
    x: ORIGIN_X + ((x - y) * TILE_W) / 2,
    y: ORIGIN_Y + ((x + y) * TILE_H) / 2,
  };
}

interface SpikePlacement {
  furnitureId: FurnitureId;
  gridX: number;
  gridY: number;
  cells: number;
  scale?: number;
}

const SPIKE_PLACEMENTS: SpikePlacement[] = [
  { furnitureId: 'swivel_chair_lavender', gridX: 1, gridY: 0.6, cells: 2 },
  { furnitureId: 'customer_water_station', gridX: 5.6, gridY: 0.4, cells: 2, scale: 0.95 },
  { furnitureId: 'plant_large_rubber', gridX: 0.4, gridY: 3.6, cells: 2, scale: 0.9 },
  { furnitureId: 'visitor_cushion_orange', gridX: 4.4, gridY: 3, cells: 2 },
  { furnitureId: 'low_bookshelf_honey', gridX: 2.8, gridY: 0.2, cells: 3, scale: 0.9 },
];

export function IsoRoomSpikeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ClientStackParamList>>();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  // 진입 시 방 중앙이 화면 중앙에 오도록 초기 스크롤을 맞춘다.
  const roomCenter = iso(COLS / 2, ROWS / 2);
  const initialOffset = {
    x: Math.max(0, roomCenter.x - viewportWidth / 2),
    y: Math.max(0, roomCenter.y - (viewportHeight - 200) / 2),
  };

  const floorW = COLS * CELL_SRC;
  const floorD = ROWS * CELL_SRC;
  const floorCenter = iso(COLS / 2, ROWS / 2);

  const rightWallW = (COLS * TILE_W) / 2;
  const leftWallW = (ROWS * TILE_W) / 2;
  const corner = iso(0, 0);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerCompany}>대한냥냥공사 · V3 스파이크</Text>
          <Text style={styles.headerTitle}>임시 상담실 8×6</Text>
        </View>
        <Pressable
          accessibilityLabel="뒤로"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Text style={styles.backText}>닫기</Text>
        </Pressable>
      </View>

      <ScrollView
        bouncesZoom
        contentContainerStyle={{ width: WORLD_W, height: WORLD_H }}
        contentOffset={initialOffset}
        maximumZoomScale={2.5}
        minimumZoomScale={0.55}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        style={styles.world}
      >
        <View style={{ width: WORLD_W, height: WORLD_H }}>
          {/* 뒷벽 두 면. 면별 음영 차이와 걸레받이로 입체를 읽게 한다. */}
          {([
            { descend: 1, width: rightWallW, left: corner.x, tint: 'rgba(96, 74, 52, 0.05)' },
            { descend: -1, width: leftWallW, left: corner.x - leftWallW, tint: 'rgba(96, 74, 52, 0.16)' },
          ] as const).map((wall) => {
            const skew = `${wall.descend * ISO_SKEW_DEG}deg`;
            const top = corner.y - WALL_H + wall.width / 4;
            return (
              <View key={skew}>
                <Image
                  resizeMode="repeat"
                  source={V2_SURFACE_IMAGES.wallpaper_cream_plaster}
                  style={{
                    position: 'absolute',
                    left: wall.left,
                    top,
                    width: wall.width,
                    height: WALL_H,
                    transform: [{ skewY: skew }],
                  }}
                />
                {/* 면 음영 */}
                <View
                  style={{
                    position: 'absolute',
                    left: wall.left,
                    top,
                    width: wall.width,
                    height: WALL_H,
                    backgroundColor: wall.tint,
                    transform: [{ skewY: skew }],
                  }}
                />
                {/* 걸레받이 */}
                <View
                  style={{
                    position: 'absolute',
                    left: wall.left,
                    top: top + WALL_H - 10,
                    width: wall.width,
                    height: 10,
                    backgroundColor: '#B99A6B',
                    borderTopWidth: 2,
                    borderTopColor: '#8A6B45',
                    transform: [{ skewY: skew }],
                  }}
                />
              </View>
            );
          })}

          {/* 바닥: 반복 타일 사각형을 다이아로 사영 */}
          <Image
            resizeMode="repeat"
            source={V2_SURFACE_IMAGES.flooring_honey_oak}
            style={{
              position: 'absolute',
              left: floorCenter.x - floorW / 2,
              top: floorCenter.y - floorD / 2,
              width: floorW,
              height: floorD,
              transform: [{ scaleY: 0.5 }, { rotate: '45deg' }],
            }}
          />

          {/* 가구: 기존 3/4뷰 스프라이트, footprint 중심 정렬 */}
          {SPIKE_PLACEMENTS.map((placement) => {
            const size = placement.cells * TILE_W * 0.74 * (placement.scale ?? 1);
            const center = iso(
              placement.gridX + placement.cells / 2,
              placement.gridY + placement.cells / 2,
            );
            return (
              <Image
                key={placement.furnitureId}
                resizeMode="contain"
                source={V2_FURNITURE_IMAGES[placement.furnitureId]}
                style={{
                  position: 'absolute',
                  left: center.x - size / 2,
                  top: center.y - size + TILE_H / 2,
                  width: size,
                  height: size,
                  zIndex: Math.round(placement.gridX + placement.gridY) + 10,
                }}
              />
            );
          })}

          {/* 고양이 */}
          <Image
            resizeMode="contain"
            source={CAT_ACTION_IMAGES.tabby_orange.idle}
            style={(() => {
              const size = 52;
              const center = iso(3.1, 4.3);
              return {
                position: 'absolute' as const,
                left: center.x - size / 2,
                top: center.y - size + TILE_H / 2,
                width: size,
                height: size,
                zIndex: 18,
              };
            })()}
          />
        </View>
      </ScrollView>

      <Text style={styles.hint}>핀치로 확대·축소, 확대 상태에서 드래그로 이동</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#EDE3CF',
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerCompany: {
    fontSize: 12,
    color: nd.colors.sub,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: nd.colors.ink,
  },
  backButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: nd.colors.field,
  },
  backText: {
    fontSize: 14,
    color: nd.colors.ink,
  },
  pressed: {
    opacity: 0.7,
  },
  world: {
    flex: 1,
  },
  hint: {
    textAlign: 'center',
    fontSize: 12.5,
    color: nd.colors.sub,
    paddingVertical: 10,
  },
});
