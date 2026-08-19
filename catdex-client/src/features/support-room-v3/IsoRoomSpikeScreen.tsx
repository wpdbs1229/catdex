import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CAT_ACTION_IMAGES } from '@/features/support-room/support-room.assets';
import type { CharacterAssetKey } from '@/features/support-room/support-room.assets';
import { RecordsSheet } from '@/features/support-room-v2/components/RecordsSheet';
import { ShopSheet, type ShopEntry } from '@/features/support-room-v2/components/ShopSheet';
import { syncRoomV2 } from '@/features/support-room-v2/support-room-v2.service';
import { formatBranch } from '@/features/home/components/CrewIdCard';
import { purchaseSupportRoomItem } from '@/shared/api/support-room-v2.api';
import { getCurrentUserId } from '@/shared/api/auth.api';
import { useActiveNeighborhood } from '@/shared/neighborhood/useActiveNeighborhood';
import { nd } from '@/shared/styles/theme';
import { IsoFurniture } from './components/IsoFurniture';
import { IsoRoom } from './components/IsoRoom';
import { RoomHud } from './components/RoomHud';
import {
  calculateShellFitScale,
  createProjection,
  type RoomViewport,
  useProjection,
} from './render/projection';
import { calculateIdleCatLayout } from './render/sprite-layout';
import { SHELL_GEOMETRY, type RoomStage } from './render/shells.generated';
import {
  createDefaultObservationLayout,
  DEFAULT_BUSY_CATS,
  DEFAULT_IDLE_CATS,
} from './support-room-v3.layout';
import { STAGE_LABELS } from './support-room-v3.assets';

/**
 * V3 아이소메트릭 고객지원실.
 * 방·가구·고양이·그림자는 단계별 공통 projection을 사용하고, 관찰 모드에서는
 * 격자를 숨긴다. 꾸미기 버튼을 눌렀을 때만 선택 가구 주변 국소 격자가 나타난다.
 */

const STAGE: RoomStage = 'stage0';
const PLACEMENTS = createDefaultObservationLayout();

function IdleCat({
  catKey,
  gridX,
  gridY,
}: {
  catKey: CharacterAssetKey;
  gridX: number;
  gridY: number;
}) {
  const projection = useProjection();
  const layout = calculateIdleCatLayout(projection, gridX, gridY);
  return (
    <>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: layout.shadowLeft,
          top: layout.shadowTop,
          width: layout.shadowWidth,
          height: layout.shadowHeight,
          borderRadius: layout.shadowHeight / 2,
          backgroundColor: 'rgba(73, 44, 20, 0.14)',
          zIndex: layout.zIndex - 1,
        }}
      />
      <Image
        resizeMode="contain"
        source={CAT_ACTION_IMAGES[catKey].idle}
        style={{
          position: 'absolute',
          left: layout.left,
          top: layout.top,
          width: layout.imageSize,
          height: layout.imageSize,
          zIndex: layout.zIndex,
        }}
      />
    </>
  );
}

export function IsoRoomSpikeScreen() {
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const { neighborhood } = useActiveNeighborhood();
  const scrollRef = useRef<ScrollView>(null);
  const [roomViewport, setRoomViewport] = useState<RoomViewport>({
    width: viewportWidth,
    height: viewportHeight * 0.62,
  });
  const [balance, setBalance] = useState(0);
  const [inventory, setInventory] = useState<Map<string, number>>(new Map());
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let active = true;
    syncRoomV2()
      .then((result) => {
        if (!active) return;
        setBalance(result.balance);
        setInventory(result.inventory);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const geometry = SHELL_GEOMETRY[STAGE];
  const scale = calculateShellFitScale(geometry, roomViewport);
  const projection = createProjection(STAGE, scale);
  const contentWidth = Math.max(roomViewport.width, projection.displayW);
  const centeredOffsetX = Math.max(0, (contentWidth - roomViewport.width) / 2);

  const centerRoom = useCallback(() => {
    scrollRef.current?.scrollTo({ x: centeredOffsetX, y: 0, animated: false });
  }, [centeredOffsetX]);

  useEffect(() => {
    const frame = requestAnimationFrame(centerRoom);
    return () => cancelAnimationFrame(frame);
  }, [centerRoom]);

  const onRoomLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setRoomViewport((current) => {
      if (Math.abs(current.width - width) < 1 && Math.abs(current.height - height) < 1) {
        return current;
      }
      return { width, height };
    });
  }, []);

  const purchase = useCallback(
    async (entry: ShopEntry) => {
      if (purchasing) return;
      setPurchasing(true);
      try {
        const userId = await getCurrentUserId();
        const key = `shop:${userId ?? 'anon'}:${entry.id}:${Date.now()}`;
        const result = await purchaseSupportRoomItem(key, entry.id);
        setBalance(result.balance);
        setInventory((previous) => new Map(previous).set(entry.id, result.ownedQuantity));
        Alert.alert('구매 완료', `${entry.name}을(를) 보관함에 넣어 뒀어요.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        Alert.alert(
          '구매하지 못했어요',
          message.includes('부족')
            ? '복지포인트가 부족해요. 고객을 수집하면 포인트가 모여요.'
            : message || '연결을 확인하고 다시 시도해주세요.',
        );
      } finally {
        setPurchasing(false);
      }
    },
    [purchasing],
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>고객지원실</Text>
          <Text style={styles.headerSub}>
            {formatBranch(neighborhood?.city)} · {STAGE_LABELS[STAGE]}
          </Text>
        </View>
        <View style={styles.balance}>
          <Text style={styles.balanceText}>{balance.toLocaleString()} BP</Text>
        </View>
      </View>

      <View style={styles.rewardChip}>
        <Text style={styles.rewardChipText}>
          새 고객 등록 <Text style={styles.rewardChipAccent}>+500 BP</Text>
        </Text>
      </View>

      <View onLayout={onRoomLayout} style={styles.roomArea}>
        <ScrollView
          bouncesZoom
          contentContainerStyle={[
            styles.roomContent,
            {
              width: contentWidth,
              minHeight: roomViewport.height,
            },
          ]}
          contentOffset={{ x: centeredOffsetX, y: 0 }}
          maximumZoomScale={2.3}
          minimumZoomScale={0.8}
          onContentSizeChange={centerRoom}
          ref={scrollRef}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          style={styles.world}
        >
          <IsoRoom
            gridBounds={editing ? { x: 2.7, y: 0, width: 5, depth: 4 } : undefined}
            scale={scale}
            stage={STAGE}
          >
            {PLACEMENTS.map((placement) => {
              const busy = DEFAULT_BUSY_CATS.find((cat) => cat.on === placement.furnitureId);
              return (
                <IsoFurniture
                  compositeBehavior={busy?.behavior}
                  compositeSource={busy ? CAT_ACTION_IMAGES[busy.key][busy.behavior] : undefined}
                  furnitureId={placement.furnitureId}
                  gridX={placement.gridX}
                  gridY={placement.gridY}
                  key={placement.furnitureId}
                  selected={editing && placement.furnitureId === 'consultation_desk_honey'}
                />
              );
            })}
            {DEFAULT_IDLE_CATS.map((cat) => (
              <IdleCat catKey={cat.key} gridX={cat.gridX} gridY={cat.gridY} key={cat.key} />
            ))}
          </IsoRoom>
        </ScrollView>

        <RoomHud
          hasNewSupply={inventory.size > 0}
          onEdit={() => setEditing((current) => !current)}
          onOpenRecords={() => setRecordsOpen(true)}
          onOpenSupplies={() => setShopOpen(true)}
          unreadRecords={3}
        />
      </View>

      <RecordsSheet onClose={() => setRecordsOpen(false)} visible={recordsOpen} />
      <ShopSheet
        balance={balance}
        onClose={() => setShopOpen(false)}
        onPurchase={(entry) => void purchase(entry)}
        ownedCount={(id) => inventory.get(id) ?? 0}
        placements={[]}
        purchasing={purchasing}
        visible={shopOpen}
      />

      <View style={styles.footer}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>
            {STAGE_LABELS.stage1}까지 <Text style={styles.progressAccent}>1,760 BP</Text>
          </Text>
          <Text style={styles.progressPercent}>41%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '41%' }]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6EEE0' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#3A2E22' },
  headerSub: { fontSize: 13, color: '#8B7A66', marginTop: 2 },
  balance: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#F0C89B',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    minHeight: 40,
    justifyContent: 'center',
  },
  balanceText: { fontSize: 15, fontWeight: '700', color: nd.colors.accent },
  rewardChip: {
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginBottom: 4,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3D0',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  rewardChipText: { fontSize: 13, color: '#5C4B39' },
  rewardChipAccent: { color: nd.colors.accent, fontWeight: '800' },
  roomArea: { flex: 1, minHeight: 0 },
  world: { flex: 1 },
  roomContent: { justifyContent: 'center', alignItems: 'center' },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 8 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  progressLabel: { fontSize: 14, color: '#5C4B39' },
  progressAccent: { color: nd.colors.accent, fontWeight: '700' },
  progressPercent: { fontSize: 15, fontWeight: '800', color: nd.colors.accent },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E6DCCB',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: nd.colors.accent },
});
