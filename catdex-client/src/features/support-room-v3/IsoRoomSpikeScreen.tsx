import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ClientStackParamList } from '@/app/navigation/types';
import { CAT_ACTION_IMAGES } from '@/features/support-room/support-room.assets';
import type { FurnitureId } from '@/features/support-room-v2/domain/furniture';
import { V2_FURNITURE_IMAGES } from '@/features/support-room-v2/support-room-v2.assets.generated';
import { V3_FIXTURE_IMAGES } from './support-room-v3.assets';
import { nd } from '@/shared/styles/theme';
import { IsoRoom, type IsoFixture } from './components/IsoRoom';
import { ISO, isoDepth, isoPoint } from './render/iso';

/**
 * 프롬프트 A - 아이소메트릭 컷어웨이 렌더 스파이크 (docs/16).
 * 시안(docs/17) 룩을 신규 아트 없이 어디까지 재현할 수 있는지 확인한다.
 * 프롬프트 C에서 편집·서버 연결과 함께 정식 화면으로 승격한다.
 */

const COLS = 8;
const ROWS = 6;

const FIXTURES: readonly IsoFixture[] = [
  // 셸에서 추출한 구조물
  { key: 'door-ext', source: V3_FIXTURE_IMAGES.door_exterior, wall: 'left', cell: 3.4, cells: 1.9, lift: 0, height: 132 },
  { key: 'win-left', source: V3_FIXTURE_IMAGES.window_arch_left, wall: 'left', cell: 0.7, cells: 1.7, lift: 52, height: 78 },
  { key: 'win-right', source: V3_FIXTURE_IMAGES.window_arch_right, wall: 'right', cell: 2.2, cells: 1.7, lift: 52, height: 82 },
  { key: 'door-int', source: V3_FIXTURE_IMAGES.door_interior, wall: 'right', cell: 5.6, cells: 1.7, lift: 0, height: 118 },
  { key: 'lamp', source: V3_FIXTURE_IMAGES.wall_lamp, wall: 'right', cell: 0.9, cells: 0.6, lift: 78, height: 36 },
  // 기존 벽 장식 가구도 같은 방식으로 붙는다
  { key: 'clock', source: V2_FURNITURE_IMAGES.wall_clock_agency, wall: 'left', cell: 1.9, cells: 1.1, lift: 82, height: 40 },
  { key: 'board', source: V2_FURNITURE_IMAGES.bulletin_board_customer, wall: 'right', cell: 3.9, cells: 1.5, lift: 66, height: 46 },
];

interface SpikePlacement {
  furnitureId: FurnitureId;
  gridX: number;
  gridY: number;
  cells: number;
  scale?: number;
}

const PLACEMENTS: readonly SpikePlacement[] = [
  { furnitureId: 'low_bookshelf_honey', gridX: 4.6, gridY: 0.2, cells: 3, scale: 0.92 },
  { furnitureId: 'file_cabinet_olive', gridX: 0.15, gridY: 1.2, cells: 2, scale: 0.9 },
  { furnitureId: 'consultation_desk_honey', gridX: 2.6, gridY: 1.9, cells: 3, scale: 0.98 },
  { furnitureId: 'customer_water_station', gridX: 6.1, gridY: 1.6, cells: 2, scale: 0.9 },
  { furnitureId: 'visitor_cushion_orange', gridX: 1.1, gridY: 3.5, cells: 2 },
  { furnitureId: 'paper_basket_cream', gridX: 5.4, gridY: 3.6, cells: 2, scale: 0.95 },
  { furnitureId: 'plant_large_rubber', gridX: 3.3, gridY: 4.4, cells: 2, scale: 0.88 },
];

const CATS = [
  { key: 'tabby_orange', behavior: 'press_bell', gridX: 3.5, gridY: 3.2, size: 70 },
  { key: 'solid_gray', behavior: 'use_cushion', gridX: 1.4, gridY: 3.8, size: 62 },
  { key: 'bicolor_tuxedo', behavior: 'hide_paper_basket', gridX: 5.7, gridY: 3.9, size: 62 },
] as const;

export function IsoRoomSpikeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ClientStackParamList>>();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();

  // 진입 시 방 중앙이 화면 중앙에 오도록 초기 스크롤을 맞춘다.
  const center = isoPoint(COLS / 2, ROWS / 2);
  const initialOffset = {
    x: Math.max(0, center.x - viewportWidth / 2),
    y: Math.max(0, center.y - (viewportHeight - 260) / 2),
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>고객지원실</Text>
          <Text style={styles.headerSub}>행운동지부 · 임시 상담실</Text>
        </View>
        <View style={styles.balance}>
          <Text style={styles.balanceText}>1,240 BP</Text>
        </View>
      </View>

      <ScrollView
        bouncesZoom
        contentContainerStyle={{ width: ISO.worldW, height: ISO.worldH }}
        contentOffset={initialOffset}
        maximumZoomScale={2.5}
        minimumZoomScale={0.55}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        style={styles.world}
      >
        <View style={{ width: ISO.worldW, height: ISO.worldH }}>
          <IsoRoom
            cols={COLS}
            fixtures={FIXTURES}
            floorSurfaceId="flooring_honey_oak"
            rows={ROWS}
            wallSurfaceId="wallpaper_cream_plaster"
          >
            {PLACEMENTS.map((placement) => {
              const size = placement.cells * ISO.tileW * 0.74 * (placement.scale ?? 1);
              const anchor = isoPoint(
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
                    left: anchor.x - size / 2,
                    top: anchor.y - size + ISO.tileH / 2,
                    width: size,
                    height: size,
                    zIndex: isoDepth(placement.gridX, placement.gridY),
                  }}
                />
              );
            })}

            {CATS.map((cat) => {
              const anchor = isoPoint(cat.gridX, cat.gridY);
              return (
                <Image
                  key={cat.key}
                  resizeMode="contain"
                  source={
                    CAT_ACTION_IMAGES[cat.key as keyof typeof CAT_ACTION_IMAGES][
                      cat.behavior as 'idle'
                    ]
                  }
                  style={{
                    position: 'absolute',
                    left: anchor.x - cat.size / 2,
                    top: anchor.y - cat.size + ISO.tileH / 2,
                    width: cat.size,
                    height: cat.size,
                    zIndex: isoDepth(cat.gridX, cat.gridY) + 1,
                  }}
                />
              );
            })}
          </IsoRoom>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>
            정식 고객지원실까지 <Text style={styles.progressAccent}>1,760 BP</Text>
          </Text>
          <Text style={styles.progressPercent}>41%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '41%' }]} />
        </View>
        <Pressable
          accessibilityLabel="닫기"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
        >
          <Text style={styles.closeText}>닫기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6EEE0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3A2E22',
  },
  headerSub: {
    fontSize: 13,
    color: '#8B7A66',
    marginTop: 2,
  },
  balance: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#F0C89B',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    minHeight: 40,
    justifyContent: 'center',
  },
  balanceText: {
    fontSize: 15,
    fontWeight: '700',
    color: nd.colors.accent,
  },
  world: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 8,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  progressLabel: {
    fontSize: 14,
    color: '#5C4B39',
  },
  progressAccent: {
    color: nd.colors.accent,
    fontWeight: '700',
  },
  progressPercent: {
    fontSize: 15,
    fontWeight: '800',
    color: nd.colors.accent,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E6DCCB',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: nd.colors.accent,
  },
  closeButton: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  closeText: {
    fontSize: 14,
    color: nd.colors.sub,
  },
  pressed: {
    opacity: 0.7,
  },
});
