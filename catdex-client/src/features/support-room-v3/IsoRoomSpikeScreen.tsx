import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
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
import type { FurnitureId } from '@/features/support-room-v2/domain/furniture';
import { syncRoomV2 } from '@/features/support-room-v2/support-room-v2.service';
import {
  loadStoredRoomV2,
  saveStoredRoomV2,
  type StoredRoomV2,
} from '@/features/support-room-v2/support-room-v2.storage';
import { formatBranch } from '@/features/home/components/CrewIdCard';
import {
  fetchVisitRecords,
  purchaseSupportRoomItem,
  recordSupportRoomVisit,
  type VisitRecord,
} from '@/shared/api/support-room-v2.api';
import { fetchMyCats } from '@/shared/api/cats.api';
import { getCurrentUserId } from '@/shared/api/auth.api';
import { fetchSupportRoomV3Placements, saveSupportRoomV3Placement } from '@/shared/api/support-room-v3.api';
import type { Cat } from '@/shared/types/cat';
import { useActiveNeighborhood } from '@/shared/neighborhood/useActiveNeighborhood';
import { nd } from '@/shared/styles/theme';
import { IsoContactShadow } from './components/IsoContactShadow';
import { IsoFurniture } from './components/IsoFurniture';
import { IsoRoom, type LocalGridBounds } from './components/IsoRoom';
import { RoomHud } from './components/RoomHud';
import {
  calculateShellFitScale,
  createProjection,
  type RoomViewport,
  useProjection,
} from './render/projection';
import { FURNITURE_ANCHORS } from './render/furniture-anchors.generated';
import { calculateIdleCatLayout } from './render/sprite-layout';
import { SHELL_GEOMETRY, type RoomStage } from './render/shells.generated';
import {
  createDefaultObservationLayout,
  validateObservationLayout,
  type ObservationPlacement,
} from './support-room-v3.layout';
import { loadV3Placements, saveV3Placements } from './support-room-v3.storage';
import { STAGE_LABELS } from './support-room-v3.assets';
import { assignBusyVisitors, assignIdleVisitor, todayStartMs, type RoomVisitor } from './support-room-v3.visitors';

/**
 * V3 아이소메트릭 고객지원실.
 * 방·가구·고양이·그림자는 단계별 공통 projection을 사용하고, 관찰 모드에서는
 * 격자를 숨긴다. 꾸미기 버튼을 눌렀을 때만 선택 가구 주변 국소 격자가 나타난다.
 */

const STAGE: RoomStage = 'stage0';

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
      <IsoContactShadow layout={layout} />
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
  const [storedRoom, setStoredRoom] = useState<StoredRoomV2 | null>(null);
  const [visitRecords, setVisitRecords] = useState<VisitRecord[]>([]);
  const [visitorCats, setVisitorCats] = useState<Cat[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [consultedEventIds, setConsultedEventIds] = useState<Set<string>>(new Set());
  const [placements, setPlacements] = useState<ObservationPlacement[]>(() => [
    ...createDefaultObservationLayout(),
  ]);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<FurnitureId | null>(null);

  useEffect(() => {
    let active = true;
    syncRoomV2()
      .then((result) => {
        if (!active) return;
        setBalance(result.balance);
        setInventory(result.inventory);
        setStoredRoom(result.stored);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const [id, cats, records, cached] = await Promise.all([
        getCurrentUserId(),
        fetchMyCats().catch(() => []),
        fetchVisitRecords(50).catch(() => []),
        loadV3Placements(),
      ]);
      if (!active) return;
      setUserId(id);
      setVisitorCats(cats);
      setVisitRecords(records);
      // 오프라인 캐시를 먼저 보여주고, 서버 값이 오면 정본으로 덮어쓴다.
      if (cached) setPlacements(cached);

      try {
        const serverOverrides = await fetchSupportRoomV3Placements();
        if (!active) return;
        const merged = createDefaultObservationLayout().map((placement) => {
          const override = serverOverrides.get(placement.furnitureId);
          return override ? { ...placement, gridX: override.gridX, gridY: override.gridY } : placement;
        });
        if (validateObservationLayout(merged).length === 0) {
          setPlacements(merged);
          void saveV3Placements(merged);
        }
      } catch (error) {
        console.warn('[support-room-v3] 서버 배치 조회 실패, 캐시로 대체', error);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const dayStartMs = todayStartMs();

  useEffect(() => {
    const eventIds = new Set(visitRecords.map((record) => record.eventId));
    setConsultedEventIds(eventIds);
  }, [visitRecords]);

  // 오늘 이미 상담 완료된 고양이 개체. 슬롯이 아니라 개체 기준으로 걸러야
  // 방금 끝난 고객이 idle 자리나 다른 자리에 곧바로 재등장하지 않는다.
  const consultedCatIdsToday = useMemo(() => {
    if (!userId) return new Set<string>();
    const prefix = `${userId}:${dayStartMs}:`;
    return new Set(
      visitRecords.filter((record) => record.eventId.startsWith(prefix)).map((record) => record.catId),
    );
  }, [visitRecords, userId, dayStartMs]);

  const busyVisitors = useMemo<RoomVisitor[]>(() => {
    if (!userId) return [];
    return assignBusyVisitors(visitorCats, userId, dayStartMs, consultedEventIds, consultedCatIdsToday);
  }, [visitorCats, userId, dayStartMs, consultedEventIds, consultedCatIdsToday]);

  const idleVisitor = useMemo(() => {
    if (!userId) return null;
    const busyIds = new Set(busyVisitors.map((visitor) => visitor.catId));
    return assignIdleVisitor(visitorCats, userId, dayStartMs, consultedCatIdsToday, busyIds);
  }, [visitorCats, userId, dayStartMs, consultedCatIdsToday, busyVisitors]);

  const unreadCount = visitRecords.filter(
    (record) => record.createdAt > (storedRoom?.lastReadEventAt ?? 0),
  ).length;

  const openRecords = useCallback(() => {
    setRecordsOpen(true);
    const now = Date.now();
    setStoredRoom((current) => (current ? { ...current, lastReadEventAt: now } : current));
    void (async () => {
      const latest = await loadStoredRoomV2();
      await saveStoredRoomV2({ ...latest, lastReadEventAt: now });
    })();
  }, []);

  const consultVisitor = useCallback(
    (visitor: RoomVisitor) => {
      Alert.alert(`${visitor.catName} 고객 상담을 완료할까요?`, '상담일지에 기록되고, 오늘은 이 자리가 비어요.', [
        { style: 'cancel', text: '취소' },
        {
          onPress: () => {
            void (async () => {
              try {
                const result = await recordSupportRoomVisit({
                  behaviorId: visitor.behavior,
                  catId: visitor.catId,
                  catName: visitor.catName,
                  characterAssetKey: visitor.key,
                  eventId: visitor.eventId,
                  furnitureId: visitor.on,
                  live: true,
                  scheduledAt: visitor.scheduledAt,
                  slot: visitor.slot,
                });
                setBalance(result.balance);
                setConsultedEventIds((current) => new Set(current).add(visitor.eventId));
                setVisitRecords(await fetchVisitRecords(50));
              } catch {
                Alert.alert('상담을 기록하지 못했어요', '연결을 확인하고 다시 시도해주세요.');
              }
            })();
          },
          text: '완료',
        },
      ]);
    },
    [],
  );

  // 드래그 시작 시점의 위치. 화면 델타를 매번 여기 더해서 다음 위치를 낸다
  // (전 위치에 델타를 계속 누적하면 반올림 오차가 쌓인다).
  const dragStartRef = useRef<{ furnitureId: FurnitureId; gridX: number; gridY: number } | null>(null);

  const handleDragStart = useCallback((furnitureId: FurnitureId) => {
    setPlacements((current) => {
      const found = current.find((placement) => placement.furnitureId === furnitureId);
      if (found) {
        dragStartRef.current = { furnitureId, gridX: found.gridX, gridY: found.gridY };
      }
      return current;
    });
    setSelectedFurnitureId(furnitureId);
  }, []);

  const handleDragMove = useCallback((furnitureId: FurnitureId, dxGrid: number, dyGrid: number) => {
    const start = dragStartRef.current;
    if (!start || start.furnitureId !== furnitureId) return;
    const anchor = FURNITURE_ANCHORS[furnitureId];
    const nextX = Math.min(Math.max(start.gridX + dxGrid, 0), 8 - anchor.footprintW);
    const nextY = Math.min(Math.max(start.gridY + dyGrid, 0), 6 - anchor.footprintD);
    setPlacements((current) =>
      current.map((placement) =>
        placement.furnitureId === furnitureId ? { ...placement, gridX: nextX, gridY: nextY } : placement,
      ),
    );
  }, []);

  const handleDragEnd = useCallback((furnitureId: FurnitureId) => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    setPlacements((current) => {
      const moved = current.find((placement) => placement.furnitureId === furnitureId);
      if (!moved) return current;
      // 0.5칸 단위로 스냅해서 내려놓는다.
      const snapped = {
        ...moved,
        gridX: Math.round(moved.gridX * 2) / 2,
        gridY: Math.round(moved.gridY * 2) / 2,
      };
      const next = current.map((placement) =>
        placement.furnitureId === furnitureId ? snapped : placement,
      );
      if (validateObservationLayout(next).length > 0) {
        // 겹침·통로 막힘 등 규칙을 어기면 드래그 시작 위치로 되돌린다.
        if (!start) return current;
        return current.map((placement) =>
          placement.furnitureId === furnitureId
            ? { ...placement, gridX: start.gridX, gridY: start.gridY }
            : placement,
        );
      }
      void saveSupportRoomV3Placement(snapped.furnitureId, snapped.gridX, snapped.gridY).catch((error) => {
        console.warn('[support-room-v3] 배치 저장 실패, 로컬 캐시만 반영됨', error);
      });
      void saveV3Placements(next);
      return next;
    });
  }, []);

  const selectedPlacement = placements.find((p) => p.furnitureId === selectedFurnitureId);
  const editGridBounds: LocalGridBounds | undefined =
    editing && selectedPlacement
      ? {
          depth: FURNITURE_ANCHORS[selectedPlacement.furnitureId].footprintD,
          width: FURNITURE_ANCHORS[selectedPlacement.furnitureId].footprintW,
          x: selectedPlacement.gridX,
          y: selectedPlacement.gridY,
        }
      : undefined;

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

      {editing && !selectedFurnitureId ? (
        <Text style={styles.editHint}>가구를 눌러서 옮겨보세요</Text>
      ) : null}

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
          pinchGestureEnabled={!editing}
          ref={scrollRef}
          scrollEnabled={!editing}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          style={styles.world}
        >
          <IsoRoom gridBounds={editGridBounds} scale={scale} stage={STAGE}>
            {placements.map((placement) => {
              const occupant = busyVisitors.find((visitor) => visitor.on === placement.furnitureId);
              return (
                <IsoFurniture
                  accessibilityLabel={
                    editing
                      ? `${placement.furnitureId} 선택`
                      : occupant
                        ? `${occupant.catName} 고객 상담`
                        : undefined
                  }
                  compositeBehavior={occupant?.behavior}
                  compositeSource={occupant ? CAT_ACTION_IMAGES[occupant.key][occupant.behavior] : undefined}
                  draggable={editing}
                  furnitureId={placement.furnitureId}
                  gridX={placement.gridX}
                  gridY={placement.gridY}
                  key={placement.furnitureId}
                  onDragEnd={() => handleDragEnd(placement.furnitureId)}
                  onDragMove={(dx, dy) => handleDragMove(placement.furnitureId, dx, dy)}
                  onDragStart={() => handleDragStart(placement.furnitureId)}
                  onPress={
                    editing
                      ? () => setSelectedFurnitureId(placement.furnitureId)
                      : occupant
                        ? () => consultVisitor(occupant)
                        : undefined
                  }
                  selected={editing && placement.furnitureId === selectedFurnitureId}
                />
              );
            })}
            {idleVisitor ? (
              <IdleCat catKey={idleVisitor.key} gridX={idleVisitor.gridX} gridY={idleVisitor.gridY} />
            ) : null}
          </IsoRoom>
        </ScrollView>

        <RoomHud
          hasNewSupply={inventory.size > 0}
          onEdit={() => {
            setEditing((current) => !current);
            setSelectedFurnitureId(null);
          }}
          onOpenRecords={openRecords}
          onOpenSupplies={() => setShopOpen(true)}
          unreadRecords={unreadCount}
        />

        {editing && selectedFurnitureId ? (
          <View style={styles.editToolbar}>
            <Pressable onPress={() => setSelectedFurnitureId(null)} style={styles.editDoneButton}>
              <Text style={styles.editDoneText}>완료</Text>
            </Pressable>
          </View>
        ) : null}
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
  editHint: {
    alignSelf: 'center',
    marginBottom: 4,
    fontSize: 12,
    color: '#8B7A66',
  },
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
  editToolbar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
  },
  editDoneButton: {
    height: 44,
    borderRadius: 22,
    backgroundColor: nd.colors.accent,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editDoneText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
