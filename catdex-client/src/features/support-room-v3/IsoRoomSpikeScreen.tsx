import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import * as Haptics from 'expo-haptics';
import { CAT_ACTION_IMAGES } from '@/features/support-room/support-room.assets';
import type { CharacterAssetKey } from '@/features/support-room/support-room.assets';
import { RecordsSheet } from '@/features/support-room-v2/components/RecordsSheet';
import { ShopSheet, type ShopEntry } from '@/features/support-room-v2/components/ShopSheet';
import { specLookup } from '@/features/support-room-v2/domain/fixtures';
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
import { EditToolbar } from './components/EditToolbar';
import { IsoContactShadow } from './components/IsoContactShadow';
import { IsoFootprintOverlay } from './components/IsoFootprintOverlay';
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
  primaryIssueText,
  validateObservationLayout,
  type ObservationPlacement,
} from './support-room-v3.layout';
import { calculateExpansionProgress } from './support-room-v3.progress';
import { CAT_ONLY_ACTION_IMAGES } from './support-room-v3.cat-actions';
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
  const [storedRoom, setStoredRoom] = useState<StoredRoomV2 | null>(null);
  const [visitRecords, setVisitRecords] = useState<VisitRecord[]>([]);
  const [visitorCats, setVisitorCats] = useState<Cat[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [consultedEventIds, setConsultedEventIds] = useState<Set<string>>(new Set());
  const [placements, setPlacements] = useState<ObservationPlacement[]>(() => [
    ...createDefaultObservationLayout(),
  ]);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<FurnitureId | null>(null);

  /**
   * 꾸미기 세션. 편집 중에는 draft만 바꾸고 방은 draft를 그린다.
   * 취소하면 baseline으로 통째로 되돌아가고, 저장할 때만 서버로 나간다.
   */
  const [draft, setDraft] = useState<ObservationPlacement[] | null>(null);
  const [stored, setStored] = useState<FurnitureId[]>([]);
  /** 서버에 보관 상태로 저장돼 있는 가구. 꾸미기를 시작할 때 트레이에 채운다. */
  const [storedOnServer, setStoredOnServer] = useState<FurnitureId[]>([]);
  const [undoStack, setUndoStack] = useState<
    Array<{ placements: ObservationPlacement[]; stored: FurnitureId[] }>
  >([]);
  const [issueText, setIssueText] = useState<string | null>(null);
  const shown = draft ?? placements;

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
        const defaults = createDefaultObservationLayout();
        const merged = defaults
          .map((placement) => {
            const override = serverOverrides.get(placement.furnitureId);
            return override
              ? {
                  ...placement,
                  gridX: override.gridX,
                  gridY: override.gridY,
                  flipX: override.flipX,
                  stored: override.stored,
                }
              : { ...placement, stored: false };
          })
          .filter((placement) => !placement.stored)
          .map(({ stored: _stored, ...placement }) => placement);
        // 보관함에 넣어 둔 가구도 되살린다. 안 그러면 꾸미기에 다시 들어갔을 때
        // 뺀 가구를 어디서도 꺼낼 수 없다.
        setStoredOnServer(
          defaults
            .filter((placement) => serverOverrides.get(placement.furnitureId)?.stored)
            .map((placement) => placement.furnitureId),
        );
        // 격자 규칙만 본다. 화면 폭 기준 safe area로 거르면 좁은 기기에서
        // 사용자가 저장해 둔 배치가 조용히 사라진다.
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
  const [draggingFurnitureId, setDraggingFurnitureId] = useState<FurnitureId | null>(null);
  /** 드래그 중인 자리가 규칙에 맞는지. footprint 색을 실시간으로 바꾼다. */
  const [dragValid, setDragValid] = useState(true);
  /** 이번 드래그에서 칸이 실제로 바뀌었는지. 탭과 드래그를 가른다. */
  const movedDuringDragRef = useRef(false);

  /** 되돌리기용 스냅숏. 상태를 바꾸기 직전에 부른다. */
  /** 화면 폭까지 반영한 배치 검사. 드래그·저장이 모두 이걸 쓴다. */
  const checkLayout = useCallback(
    (next: readonly ObservationPlacement[]) =>
      validateObservationLayout(next, {
        projection: createProjection(STAGE, calculateShellFitScale(SHELL_GEOMETRY[STAGE], roomViewport)),
        viewportWidth: roomViewport.width,
      }),
    [roomViewport],
  );

  const pushUndo = useCallback(() => {
    setUndoStack((current) => {
      const snapshot = { placements: [...(draft ?? placements)], stored: [...stored] };
      return [...current, snapshot].slice(-10);
    });
  }, [draft, placements, stored]);

  const enterEdit = useCallback(() => {
    setDraft([...placements]);
    setStored([...storedOnServer]);
    setUndoStack([]);
    setIssueText(null);
    setSelectedFurnitureId(null);
  }, [placements, storedOnServer]);

  const cancelEdit = useCallback(() => {
    setDraft(null);
    setStored([...storedOnServer]);
    setUndoStack([]);
    setIssueText(null);
    setSelectedFurnitureId(null);
    setDraggingFurnitureId(null);
  }, [storedOnServer]);

  const saveEdit = useCallback(() => {
    const next = draft ?? placements;
    const issues = checkLayout(next);
    if (issues.length > 0) {
      setIssueText(primaryIssueText(issues));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setPlacements(next);
    setDraft(null);
    setStoredOnServer([...stored]);
    setUndoStack([]);
    setIssueText(null);
    setSelectedFurnitureId(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    void saveV3Placements(next);

    // 놓인 것과 보관한 것을 함께 보낸다. 놓인 것만 보내면 보관이 사라진다.
    const rows = [
      ...next.map((placement) => ({
        furnitureId: placement.furnitureId,
        gridX: placement.gridX,
        gridY: placement.gridY,
        flipX: placement.flipX ?? false,
        stored: false,
      })),
      ...stored.map((furnitureId) => {
        const previous = placements.find((placement) => placement.furnitureId === furnitureId);
        return {
          furnitureId,
          gridX: previous?.gridX ?? 0,
          gridY: previous?.gridY ?? 0,
          flipX: previous?.flipX ?? false,
          stored: true,
        };
      }),
    ];
    for (const row of rows) {
      void saveSupportRoomV3Placement(row.furnitureId, row.gridX, row.gridY, {
        flipX: row.flipX,
        stored: row.stored,
      }).catch((error) =>
        console.warn('[support-room-v3] 배치 저장 실패, 로컬 캐시만 반영됨', error),
      );
    }
  }, [draft, placements, stored, checkLayout]);

  const undo = useCallback(() => {
    setUndoStack((current) => {
      const previous = current[current.length - 1];
      if (!previous) return current;
      setDraft(previous.placements);
      setStored(previous.stored);
      setIssueText(null);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return current.slice(0, -1);
    });
  }, []);

  const flipSelected = useCallback(() => {
    if (!selectedFurnitureId) return;
    pushUndo();
    setDraft((current) =>
      (current ?? placements).map((placement) =>
        placement.furnitureId === selectedFurnitureId
          ? { ...placement, flipX: !placement.flipX }
          : placement,
      ),
    );
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [selectedFurnitureId, placements, pushUndo]);

  const storeSelected = useCallback(() => {
    if (!selectedFurnitureId) return;
    pushUndo();
    setDraft((current) =>
      (current ?? placements).filter((placement) => placement.furnitureId !== selectedFurnitureId),
    );
    setStored((current) => [...current, selectedFurnitureId]);
    setSelectedFurnitureId(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [selectedFurnitureId, placements, pushUndo]);

  /** 보관함에서 다시 꺼낸다. 빈 칸을 찾아 놓고, 없으면 이유를 알린다. */
  const placeStored = useCallback(
    (furnitureId: FurnitureId) => {
      const current = draft ?? placements;
      const anchor = FURNITURE_ANCHORS[furnitureId];
      for (let y = 0; y + anchor.footprintD <= SHELL_GEOMETRY[STAGE].rows; y += 1) {
        for (let x = 0; x + anchor.footprintW <= SHELL_GEOMETRY[STAGE].cols; x += 1) {
          const candidate = [...current, { furnitureId, gridX: x, gridY: y }];
          if (checkLayout(candidate).length === 0) {
            pushUndo();
            setDraft(candidate);
            setStored((list) => list.filter((id) => id !== furnitureId));
            setSelectedFurnitureId(furnitureId);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            return;
          }
        }
      }
      setIssueText('놓을 자리가 없어요. 다른 가구를 먼저 옮겨 주세요');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
    [draft, placements, pushUndo, checkLayout],
  );

  const handleDragStart = useCallback(
    (furnitureId: FurnitureId) => {
      const found = (draft ?? placements).find(
        (placement) => placement.furnitureId === furnitureId,
      );
      if (found) {
        dragStartRef.current = { furnitureId, gridX: found.gridX, gridY: found.gridY };
      }
      // 여기서 스냅숏을 쌓으면 탭만 해도 되돌리기가 한 칸씩 낭비된다.
      // 실제로 칸이 바뀐 순간(handleDragMove)에만 쌓는다.
      movedDuringDragRef.current = false;
      setSelectedFurnitureId(furnitureId);
      setDraggingFurnitureId(furnitureId);
      setIssueText(null);
      setDragValid(true);
    },
    [draft, placements, pushUndo],
  );

  // 드래그가 아니라 짧은 탭으로 끝나면 onDragEnd가 안 불리므로, 탭 쪽에서
  // 드래그 중 표시(전체 격자)를 직접 꺼준다.
  const selectFurniture = useCallback((furnitureId: FurnitureId | null) => {
    setSelectedFurnitureId(furnitureId);
    setDraggingFurnitureId(null);
  }, []);

  const handleDragMove = useCallback(
    (furnitureId: FurnitureId, dxGrid: number, dyGrid: number) => {
      const start = dragStartRef.current;
      if (!start || start.furnitureId !== furnitureId) return;
      const anchor = FURNITURE_ANCHORS[furnitureId];
      // 칸 단위로 미리 스냅해서 끌고 다니는 동안에도 정면이 격자선에 딱
      // 맞물리는 게 바로 보이게 한다.
      const nextX = Math.min(
        Math.max(Math.round(start.gridX + dxGrid), 0),
        SHELL_GEOMETRY[STAGE].cols - anchor.footprintW,
      );
      const nextY = Math.min(
        Math.max(Math.round(start.gridY + dyGrid), 0),
        SHELL_GEOMETRY[STAGE].rows - anchor.footprintD,
      );
      if (nextX === start.gridX && nextY === start.gridY) return;
      if (!movedDuringDragRef.current) {
        movedDuringDragRef.current = true;
        pushUndo();
      }
      setDraft((current) => {
        const base = current ?? placements;
        const next = base.map((placement) =>
          placement.furnitureId === furnitureId
            ? { ...placement, gridX: nextX, gridY: nextY }
            : placement,
        );
        const issues = checkLayout(next);
        setDragValid(issues.length === 0);
        setIssueText(primaryIssueText(issues));
        return next;
      });
    },
    [placements, checkLayout, pushUndo],
  );

  const handleDragEnd = useCallback(
    (furnitureId: FurnitureId) => {
      const start = dragStartRef.current;
      dragStartRef.current = null;
      setDraggingFurnitureId(null);
      setDraft((current) => {
        const base = current ?? placements;
        const issues = checkLayout(base);
        if (issues.length === 0) {
          setIssueText(null);
          setDragValid(true);
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          return base;
        }
        // 조용히 되돌리지 않는다 - 왜 안 되는지 말해 주고 진동으로도 알린다.
        setIssueText(primaryIssueText(issues));
        setDragValid(true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        if (!start) return base;
        return base.map((placement) =>
          placement.furnitureId === furnitureId
            ? { ...placement, gridX: start.gridX, gridY: start.gridY }
            : placement,
        );
      });
    },
    [placements, checkLayout],
  );

  // 배치 검사에 화면 폭을 함께 넘겨야 "화면 밖으로 잘림"까지 잡힌다.
  // projection은 아래에서 만들어지므로 여기서는 지연 평가로 감싼다.
  const editing = draft !== null;
  const selectedPlacement = shown.find((p) => p.furnitureId === selectedFurnitureId);
  const expansion = calculateExpansionProgress(balance, STAGE);
  // 끌고 다니는 동안엔 바닥 전체 격자를 보여줘서 어느 칸에 놓일지 보이게
  // 하고, 선택만 하고 안 끌 때는 그 가구 크기만큼만 좁게 보여준다.
  const editGridBounds: LocalGridBounds | undefined = draggingFurnitureId
    ? { depth: SHELL_GEOMETRY[STAGE].rows, width: SHELL_GEOMETRY[STAGE].cols, x: 0, y: 0 }
    : editing && selectedPlacement
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
            {editing && selectedPlacement ? (
              <IsoFootprintOverlay
                depth={FURNITURE_ANCHORS[selectedPlacement.furnitureId].footprintD}
                gridX={selectedPlacement.gridX}
                gridY={selectedPlacement.gridY}
                valid={dragValid}
                width={FURNITURE_ANCHORS[selectedPlacement.furnitureId].footprintW}
              />
            ) : null}
            {shown.map((placement) => {
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
                  catSource={occupant ? CAT_ONLY_ACTION_IMAGES[occupant.key][occupant.behavior] : undefined}
                  draggable={editing}
                  flipX={placement.flipX}
                  furnitureId={placement.furnitureId}
                  gridX={placement.gridX}
                  gridY={placement.gridY}
                  key={placement.furnitureId}
                  onDragEnd={() => handleDragEnd(placement.furnitureId)}
                  onDragMove={(dx, dy) => handleDragMove(placement.furnitureId, dx, dy)}
                  onDragStart={() => handleDragStart(placement.furnitureId)}
                  onPress={
                    editing
                      ? () => selectFurniture(placement.furnitureId)
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
          onEdit={() => (editing ? cancelEdit() : enterEdit())}
          onOpenRecords={openRecords}
          onOpenSupplies={() => setShopOpen(true)}
          unreadRecords={unreadCount}
        />

        {editing ? (
          <EditToolbar
            canFlip={specLookup(selectedFurnitureId ?? 'visitor_cushion_orange')?.canFlipX ?? false}
            canUndo={undoStack.length > 0}
            issueText={issueText}
            onCancel={cancelEdit}
            onFlip={flipSelected}
            onPlaceStored={placeStored}
            onSave={saveEdit}
            onStore={storeSelected}
            onUndo={undo}
            selectedFurnitureId={selectedFurnitureId}
            stored={stored}
          />
        ) : null}
      </View>

      <RecordsSheet onClose={() => setRecordsOpen(false)} visible={recordsOpen} />
      <ShopSheet
        balance={balance}
        expansion={
          expansion.nextStage
            ? {
                cost: expansion.cost,
                name: STAGE_LABELS[expansion.nextStage],
                percent: expansion.percent,
                remaining: expansion.remaining,
              }
            : null
        }
        onClose={() => setShopOpen(false)}
        onPurchase={(entry) => void purchase(entry)}
        ownedCount={(id) => inventory.get(id) ?? 0}
        placements={[]}
        purchasing={purchasing}
        visible={shopOpen}
      />

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
});
