import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  Share,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import type { ClientStackParamList } from '@/app/navigation/types';
import { useTabBarBottomGap, useTabBarInset } from '@/app/navigation/useTabBarInset';
import { ClientTabBar } from '@/features/cats/components/ClientTabBar';
import { nd } from '@/shared/styles/theme';
import { GridOverlay } from './components/GridOverlay';
import { InventorySheet } from './components/InventorySheet';
import { PlacedFurnitureView } from './components/PlacedFurnitureView';
import { FURNITURE_CATALOG, SURFACE_CATALOG } from './domain/catalog.generated';
import { applyCommand, createEditorState, type EditorState } from './domain/editor';
import { specLookup } from './domain/fixtures';
import type { FurnitureId, SurfaceId } from './domain/furniture';
import type { GridPoint, Surface } from './domain/grid';
import { FLOOR_GRID, WALL_GRID } from './domain/grid';
import type { Placement, PlacementIssue } from './domain/placement';
import { validatePlacement, validateLayout } from './domain/placement';
import { DEFAULT_ROOM_SHELL } from './domain/room-shell';
import { WORLD } from './render/projection';
import { V2_ROOM_SHELL, V2_SURFACE_IMAGES } from './support-room-v2.assets.generated';
import {
  fetchVisitRecords,
  purchaseSupportRoomItem,
  recordSupportRoomVisit,
  saveSupportRoomLayout,
} from '@/shared/api/support-room-v2.api';
import { fetchMyCats } from '@/shared/api/cats.api';
import { getCurrentUserId } from '@/shared/api/auth.api';
import { selectCharacter } from '@/features/support-room/character-matcher';
import { CatVisitView } from './components/CatVisitView';
import { RecordsSheet } from './components/RecordsSheet';
import { ShopSheet, type ShopEntry } from './components/ShopSheet';
import { planVisits, settleOfflineVisits, SETTLE_WINDOW_MS, type VisitScene } from './domain/scheduler';
import { syncRoomV2 } from './support-room-v2.service';
import {
  saveStoredRoomV2,
  type RoomDraft,
  type StoredRoomV2,
} from './support-room-v2.storage';

const ISSUE_MESSAGE: Record<PlacementIssue['code'], string> = {
  unknown_furniture: '알 수 없는 가구가 있어요.',
  surface_mismatch: '이 가구는 여기에 놓을 수 없어요.',
  flip_not_allowed: '이 가구는 좌우로 돌릴 수 없어요.',
  out_of_bounds: '방 밖으로는 놓을 수 없어요.',
  overlap: '다른 가구와 겹쳐요.',
  door_blocked: '출입문 앞이 막혀 있어요. 문 앞 칸을 비워주세요.',
  walkway_blocked: '고객이 지나다닐 좌우 통로가 끊겼어요. 길을 2칸 폭으로 비워주세요.',
  anchor_blocked: '고객이 행동 가구 앞까지 갈 수 없어요. 접근 칸을 비워주세요.',
};

type LoadPhase = 'loading' | 'ready' | 'failed';

/**
 * 고객지원실 V2 — 자유 배치 편집기 프로토타입.
 * EXPO_PUBLIC_SUPPORT_ROOM_V2=true일 때만 기존 라우트를 대체한다.
 * 저장은 아직 로컬 개발 fixture에만 반영한다(서버 정본은 프롬프트 3·4).
 * 고양이 자율 행동은 프롬프트 5에서 연결하므로 이 화면은 방·가구만 그린다.
 */
export function SupportRoomV2Screen() {
  const navigation = useNavigation<NativeStackNavigationProp<ClientStackParamList>>();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const tabBarBottomGap = useTabBarBottomGap();

  const [stored, setStored] = useState<StoredRoomV2 | null>(null);
  const [inventory, setInventory] = useState<Map<string, number>>(new Map());
  const [balance, setBalance] = useState(0);
  const [shopOpen, setShopOpen] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);
  /** 촬영 모드. HUD를 숨기고 현재 viewport를 세로형/정사각형으로 캡처한다. */
  const [cameraMode, setCameraMode] = useState<'portrait' | 'square' | null>(null);
  const [stampOn, setStampOn] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const captureViewRef = useRef<View>(null);
  const [unread, setUnread] = useState(0);
  /** 포커스마다 한 번만 미접속 정산을 돌린다. */
  const settledThisFocusRef = useRef(false);
  const [purchasing, setPurchasing] = useState(false);
  /** 구매 직후 '바로 배치'로 넘어올 때 편집 모드가 준비되면 놓을 가구 */
  const pendingPlaceRef = useRef<FurnitureId | null>(null);
  const [offline, setOffline] = useState(false);
  const [phase, setPhase] = useState<LoadPhase>('loading');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [editSurfaces, setEditSurfaces] = useState<{ wall: SurfaceId; floor: SurfaceId } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [blocked, setBlocked] = useState<{ surface: Surface; cells: GridPoint[] }>({
    surface: 'floor',
    cells: [],
  });
  const scrollRef = useRef<ScrollView>(null);
  const scrollXRef = useRef(0);
  const nextIdRef = useRef(1);
  /** 편집을 시작한 시점의 서버 layoutVersion. 저장 시 expectedVersion으로 보낸다. */
  const baseVersionRef = useRef(0);
  const [saving, setSaving] = useState(false);
  const [visit, setVisit] = useState<VisitScene | null>(null);
  const [interacting, setInteracting] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(true);
  /** 이미 재생한 장면. 같은 eventId를 두 번 재생하지 않는다. */
  const playedEventsRef = useRef(new Set<string>());

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => setMotionEnabled(!reduced))
      .catch(() => setMotionEnabled(true));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduced) =>
      setMotionEnabled(!reduced),
    );
    return () => subscription.remove();
  }, []);

  const editing = editor !== null;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      settledThisFocusRef.current = false;
      setPhase('loading');
      syncRoomV2()
        .then((result) => {
          if (active) {
            setStored(result.stored);
            setInventory(result.inventory);
            setBalance(result.balance);
            setOffline(result.offline);
            setPhase('ready');
          }
        })
        .catch(() => active && setPhase('failed'));
      return () => {
        active = false;
      };
    }, []),
  );

  const headerHeight = styles.header.height;
  const editBarSpace = editing ? styles.inventoryReserve.height : 0;
  const roomHeight = Math.max(240, viewportHeight - insets.top - headerHeight - tabBarInset - editBarSpace);
  const scale = Math.min((viewportWidth * WORLD.viewportMultiplier) / WORLD.width, roomHeight / WORLD.height);
  const roomWidth = WORLD.width * scale;
  const renderedRoomHeight = WORLD.height * scale;

  const snapshot = stored?.snapshot ?? null;
  const placements = editing ? editor.placements : (snapshot?.placements ?? []);
  const wallSurfaceId = editSurfaces?.wall ?? snapshot?.wallSurfaceId ?? 'wallpaper_cream_plaster';
  const floorSurfaceId = editSurfaces?.floor ?? snapshot?.floorSurfaceId ?? 'flooring_honey_oak';

  // 미접속 정산과 새 기록 배지. 포커스당 한 번, 서버가 닿을 때만.
  useEffect(() => {
    if (phase !== 'ready' || offline || !stored || settledThisFocusRef.current) return;
    settledThisFocusRef.current = true;
    let active = true;
    (async () => {
      try {
        const [userId, cats] = await Promise.all([getCurrentUserId(), fetchMyCats()]);
        if (!active || !userId) return;

        // 1) 지난 시간 창의 장면을 결정적으로 정산해 기록한다(멱등).
        const summaries =
          stored.lastSettledAt > 0 && stored.snapshot && cats.length > 0
            ? settleOfflineVisits(
                {
                  placements: stored.snapshot.placements,
                  lookup: specLookup,
                  shell: DEFAULT_ROOM_SHELL,
                  cats: cats.map((cat) => ({
                    catId: cat.id,
                    catName: cat.name,
                    characterAssetKey: selectCharacter(cat.coatColors, cat.coatPattern, cat.id).key,
                  })),
                  salt: userId,
                },
                stored.lastSettledAt,
                Date.now(),
              )
            : [];
        for (const scene of summaries) {
          try {
            await recordSupportRoomVisit({
              eventId: scene.eventId,
              catId: scene.catId,
              furnitureId: scene.furnitureId,
              behaviorId: scene.behaviorId,
              scheduledAt: scene.scheduledAt,
              slot: scene.slot,
              catName: scene.catName,
              characterAssetKey: scene.characterAssetKey,
            });
          } catch {
            // 일부 실패해도 다음 정산에서 같은 eventId로 재시도된다.
          }
        }
        setStored((prev) => {
          if (!prev) return prev;
          const next = { ...prev, lastSettledAt: Date.now() };
          void saveStoredRoomV2(next);
          return next;
        });
        if (active && summaries.length > 0) {
          Alert.alert(
            '부재 중 고객 방문',
            summaries
              .map(
                (scene) =>
                  `· ${scene.catName} 고객 — ${FURNITURE_CATALOG.find((f) => f.id === scene.furnitureId)?.name ?? '비품'}`,
              )
              .join('\n'),
          );
        }

        // 2) 서버 기록 기준 새 기록 배지
        const recent = await fetchVisitRecords(20);
        if (active) {
          setUnread(recent.filter((r) => r.createdAt > stored.lastReadEventAt).length);
        }
      } catch {
        // 정산 실패는 조용히 넘어간다. 다음 진입에서 다시 시도한다.
      }
    })();
    return () => {
      active = false;
    };
  }, [offline, phase, stored]);

  // 관찰 모드에서 자율 방문 한 건을 결정적으로 계획해 재생한다.
  // 편집 중에는 계획하지 않고, 같은 eventId는 두 번 재생하지 않는다.
  useEffect(() => {
    if (phase !== 'ready' || editing || visit || !snapshot || snapshot.placements.length === 0) {
      return;
    }
    let active = true;
    (async () => {
      try {
        const [userId, cats] = await Promise.all([getCurrentUserId(), fetchMyCats()]);
        if (!active || !userId || cats.length === 0) return;
        const visitCats = cats.map((cat) => ({
          catId: cat.id,
          catName: cat.name,
          characterAssetKey: selectCharacter(cat.coatColors, cat.coatPattern, cat.id).key,
        }));
        const scheduledAt = Math.floor(Date.now() / SETTLE_WINDOW_MS) * SETTLE_WINDOW_MS;
        const scenes = planVisits({
          placements: snapshot.placements,
          lookup: specLookup,
          shell: DEFAULT_ROOM_SHELL,
          cats: visitCats,
          scheduledAt,
          slots: 1,
          salt: userId,
        });
        const next = scenes.find((scene) => !playedEventsRef.current.has(scene.eventId));
        if (active && next) setVisit(next);
      } catch {
        // 방문 계획 실패는 조용히 넘어간다. 방은 그대로 보인다.
      }
    })();
    return () => {
      active = false;
    };
  }, [editing, phase, snapshot, visit]);

  /** draft가 있으면 이어서, 없으면 서버 스냅숏에서 편집을 시작한다. */
  const enterEdit = useCallback(() => {
    if (!stored) return;
    setVisit(null);
    setInteracting(false);
    const seed = stored.draft ?? {
      baseVersion: snapshot?.layoutVersion ?? 0,
      placements: snapshot?.placements ?? [],
      wallSurfaceId: snapshot?.wallSurfaceId ?? 'wallpaper_cream_plaster',
      floorSurfaceId: snapshot?.floorSurfaceId ?? 'flooring_honey_oak',
    };
    baseVersionRef.current = seed.baseVersion;
    setEditor(createEditorState(seed.placements));
    setEditSurfaces({ wall: seed.wallSurfaceId, floor: seed.floorSurfaceId });
    setSelectedId(null);
    setBlocked({ surface: 'floor', cells: [] });
  }, [snapshot, stored]);

  /** 닫기: 저장하지 않은 편집이 있으면 draft로 보존한다(유실 금지). */
  const exitEdit = useCallback(
    (keepDraft: boolean) => {
      if (keepDraft && editor && editSurfaces && stored) {
        const unchanged =
          snapshot !== null &&
          JSON.stringify(editor.placements) === JSON.stringify(snapshot.placements) &&
          editSurfaces.wall === snapshot.wallSurfaceId &&
          editSurfaces.floor === snapshot.floorSurfaceId;
        const draft: RoomDraft | null = unchanged
          ? null
          : {
              baseVersion: baseVersionRef.current,
              placements: [...editor.placements],
              wallSurfaceId: editSurfaces.wall,
              floorSurfaceId: editSurfaces.floor,
            };
        const next = { ...stored, draft };
        setStored(next);
        void saveStoredRoomV2(next);
      }
      setEditor(null);
      setEditSurfaces(null);
      setSelectedId(null);
      setBlocked({ surface: 'floor', cells: [] });
    },
    [editSurfaces, editor, snapshot, stored],
  );

  const dispatch = useCallback(
    (command: Parameters<typeof applyCommand>[1]) => {
      setEditor((current) => {
        if (!current) return current;
        const result = applyCommand(current, command, specLookup);
        if (result.issues.length > 0) {
          const first = result.issues[0];
          setBlocked({
            surface: command.type === 'place' ? command.surface : 'floor',
            cells: [...(first.cells ?? [])],
          });
        } else {
          setBlocked({ surface: 'floor', cells: [] });
        }
        return result.state;
      });
    },
    [],
  );

  /** 보관함에서 골랐을 때 화면 중앙에서 가장 가까운 유효 칸에 임시 배치한다. */
  const placeFromInventory = useCallback(
    (furnitureId: FurnitureId) => {
      const spec = specLookup(furnitureId);
      if (!spec || !editor) return;
      const owned = inventory.get(furnitureId) ?? 0;
      const placed = editor.placements.filter((p) => p.furnitureId === furnitureId).length;
      if (placed >= owned) {
        Alert.alert('보유 수량을 모두 배치했어요', '상점에서 구매하면 더 놓을 수 있어요.');
        return;
      }
      const grid = spec.surface === 'wall' ? WALL_GRID : FLOOR_GRID;
      const centerColumn = Math.round(
        (scrollXRef.current + viewportWidth / 2) / scale / (WORLD.width / FLOOR_GRID.columns),
      );
      const centerRow = Math.floor(grid.rows / 2);
      const candidates: GridPoint[] = [];
      for (let x = 0; x <= grid.columns - spec.footprint.width; x += 1) {
        for (let y = 0; y <= grid.rows - spec.footprint.depth; y += 1) {
          candidates.push({ x, y });
        }
      }
      candidates.sort(
        (a, b) =>
          Math.abs(a.x - centerColumn) + Math.abs(a.y - centerRow) -
          (Math.abs(b.x - centerColumn) + Math.abs(b.y - centerRow)),
      );
      for (const cell of candidates) {
        const candidate: Placement = {
          placementId: `p${nextIdRef.current}`,
          furnitureId,
          surface: spec.surface,
          gridX: cell.x,
          gridY: cell.y,
          flipX: false,
        };
        if (validatePlacement(candidate, editor.placements, specLookup).length === 0) {
          nextIdRef.current += 1;
          dispatch({
            type: 'place',
            placementId: candidate.placementId,
            furnitureId,
            surface: spec.surface,
            gridX: cell.x,
            gridY: cell.y,
          });
          setSelectedId(candidate.placementId);
          return;
        }
      }
      Alert.alert('빈자리가 없어요', '가구를 정리한 뒤 다시 놓아주세요.');
    },
    [dispatch, editor, inventory, scale, viewportWidth],
  );

  const pickSurface = useCallback(
    (id: SurfaceId) => {
      const entry = SURFACE_CATALOG.find((surface) => surface.id === id);
      const owned = entry?.acquisition === 'starter' || (inventory.get(id) ?? 0) > 0;
      if (!owned) {
        Alert.alert('아직 없는 상품이에요', '상점에서 구매하면 적용할 수 있어요.');
        return;
      }
      setEditSurfaces((current) => {
        if (!current) return current;
        return id.startsWith('wallpaper') ? { ...current, wall: id } : { ...current, floor: id };
      });
    },
    [inventory],
  );

  const moveSelected = useCallback(
    (dx: number, dy: number) => {
      if (!selectedId || !editor) return;
      const target = editor.placements.find((p) => p.placementId === selectedId);
      if (!target) return;
      dispatch({ type: 'move', placementId: selectedId, gridX: target.gridX + dx, gridY: target.gridY + dy });
    },
    [dispatch, editor, selectedId],
  );

  const onDrop = useCallback(
    (placementId: string, cell: GridPoint) => {
      dispatch({ type: 'move', placementId, gridX: cell.x, gridY: cell.y });
    },
    [dispatch],
  );

  const showInfo = useCallback(() => {
    if (!selectedId || !editor) return;
    const target = editor.placements.find((p) => p.placementId === selectedId);
    const entry = target ? FURNITURE_CATALOG.find((f) => f.id === target.furnitureId) : undefined;
    if (!target || !entry) return;
    const spec = specLookup(target.furnitureId);
    Alert.alert(
      entry.name,
      [
        entry.acquisition === 'starter' ? '시작 지급' : `${entry.price.toLocaleString()} 복지포인트`,
        `크기 ${entry.footprint[0]}×${entry.footprint[1]}`,
        entry.behaviors.length > 0 ? `고객 행동: ${entry.behaviors.join(', ')}` : '장식용 가구',
        spec?.canFlipX ? '좌우 반전 가능' : '좌우 반전 불가',
      ].join('\n'),
    );
  }, [editor, selectedId]);

  const save = useCallback(async () => {
    if (!editor || !editSurfaces || !stored || saving) return;
    const issues = validateLayout(editor.placements, specLookup, DEFAULT_ROOM_SHELL);
    if (issues.length > 0) {
      const first = issues[0];
      setBlocked({ surface: 'floor', cells: [...(first.cells ?? [])] });
      Alert.alert('아직 저장할 수 없어요', issues.map((i) => `· ${ISSUE_MESSAGE[i.code]}`).join('\n'));
      return;
    }

    const draft: RoomDraft = {
      baseVersion: baseVersionRef.current,
      placements: [...editor.placements],
      wallSurfaceId: editSurfaces.wall,
      floorSurfaceId: editSurfaces.floor,
    };

    setSaving(true);
    try {
      const result = await saveSupportRoomLayout(
        draft.baseVersion,
        draft.wallSurfaceId,
        draft.floorSurfaceId,
        draft.placements,
      );

      if (result.status === 'conflict') {
        // 서버본과 로컬안 둘 다 보존하고 사용자가 고른다. 자동 병합 금지.
        const next = { ...stored, draft };
        setStored(next);
        await saveStoredRoomV2(next);
        Alert.alert(
          '다른 기기에서 먼저 저장했어요',
          '어느 배치를 남길지 골라주세요. 어느 쪽도 사라지지 않아요.',
          [
            {
              text: '서버 최신본 불러오기',
              onPress: () => {
                const discarded = { ...next, draft: null };
                setStored(discarded);
                void saveStoredRoomV2(discarded);
                exitEdit(false);
                setPhase('loading');
                syncRoomV2()
                  .then((r) => {
                    setStored(r.stored);
                    setInventory(r.inventory);
                    setBalance(r.balance);
                    setOffline(r.offline);
                    setPhase('ready');
                  })
                  .catch(() => setPhase('failed'));
              },
            },
            {
              text: '내 배치를 유지',
              onPress: () => {
                // 다음 저장이 성공하도록 서버 버전 위에 로컬안을 새 draft로 올린다.
                baseVersionRef.current = result.serverVersion;
                const kept = { ...next, draft: { ...draft, baseVersion: result.serverVersion } };
                setStored(kept);
                void saveStoredRoomV2(kept);
              },
            },
          ],
        );
        return;
      }

      // 저장 성공: 스냅숏 갱신, draft와 Undo/Redo 제거.
      const next: StoredRoomV2 = {
        ...stored,
        snapshot: {
          layoutVersion: result.layoutVersion,
          placements: draft.placements,
          wallSurfaceId: draft.wallSurfaceId,
          floorSurfaceId: draft.floorSurfaceId,
        },
        draft: null,
      };
      setStored(next);
      await saveStoredRoomV2(next);
      exitEdit(false);
    } catch (error) {
      // 네트워크 실패: draft를 로컬에 남기고 재시도를 안내한다.
      console.warn('[support-room-v2] save failed', error);
      const next = { ...stored, draft };
      setStored(next);
      await saveStoredRoomV2(next);
      Alert.alert('저장하지 못했어요', '연결을 확인한 뒤 다시 저장을 눌러주세요. 편집안은 보관해 뒀어요.');
    } finally {
      setSaving(false);
    }
  }, [editSurfaces, editor, exitEdit, saving, stored]);

  const selectedSpec = useMemo(() => {
    if (!selectedId) return null;
    const target = placements.find((p) => p.placementId === selectedId);
    return target ? (specLookup(target.furnitureId) ?? null) : null;
  }, [placements, selectedId]);

  const placedCount = useCallback(
    (id: FurnitureId) => placements.filter((p) => p.furnitureId === id).length,
    [placements],
  );

  // 구매 직후 '바로 배치': 편집 모드가 열리면 대기 중인 가구를 놓는다.
  useEffect(() => {
    if (!editing || !pendingPlaceRef.current) return;
    const furnitureId = pendingPlaceRef.current;
    pendingPlaceRef.current = null;
    placeFromInventory(furnitureId);
  }, [editing, placeFromInventory]);

  const purchase = useCallback(
    async (entry: ShopEntry) => {
      if (purchasing) return;
      setPurchasing(true);
      try {
        const userId = await getCurrentUserId();
        // 중복 탭 잠금은 purchasing 플래그, 중복 요청 방지는 서버 멱등 키가 맡는다.
        const idempotencyKey = `shop:${userId ?? 'anon'}:${entry.id}:${Date.now()}`;
        const result = await purchaseSupportRoomItem(idempotencyKey, entry.id);
        setBalance(result.balance);
        setInventory((prev) => new Map(prev).set(entry.id, result.ownedQuantity));
        if (entry.kind === 'furniture') {
          Alert.alert('구매 완료', `${entry.name}을(를) 보관함에 넣어 뒀어요.`, [
            { text: '나중에' },
            {
              text: '바로 배치',
              onPress: () => {
                setShopOpen(false);
                pendingPlaceRef.current = entry.id as FurnitureId;
                enterEdit();
              },
            },
          ]);
        } else {
          Alert.alert('구매 완료', '꾸미기의 바닥·벽지에서 적용할 수 있어요.');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        Alert.alert(
          '구매하지 못했어요',
          message.includes('부족')
            ? '복지포인트가 부족해요. 고객 방문 기록으로 포인트를 모아보세요.'
            : message || '연결을 확인하고 다시 시도해주세요.',
        );
      } finally {
        setPurchasing(false);
      }
    },
    [enterEdit, purchasing],
  );

  const squareSide = Math.min(viewportWidth, roomHeight);

  const capture = useCallback(async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      const uri = await captureRef(captureViewRef, { format: 'jpg', quality: 0.92 });
      await Share.share({ url: uri });
    } catch (error) {
      console.warn('[support-room-v2] capture failed', error);
      Alert.alert('촬영하지 못했어요', '잠시 뒤 다시 시도해주세요.');
    } finally {
      setCapturing(false);
    }
  }, [capturing]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      {cameraMode ? (
        <View style={styles.header}>
          <View style={styles.headerRight}>
            <Pressable
              accessibilityLabel="세로형 구도"
              accessibilityRole="button"
              onPress={() => setCameraMode('portrait')}
              style={({ pressed }) => [styles.hudButton, cameraMode === 'portrait' && styles.hudButtonActive, pressed && styles.pressed]}
            >
              <Text style={styles.hudText}>세로형</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="정사각형 구도"
              accessibilityRole="button"
              onPress={() => setCameraMode('square')}
              style={({ pressed }) => [styles.hudButton, cameraMode === 'square' && styles.hudButtonActive, pressed && styles.pressed]}
            >
              <Text style={styles.hudText}>정사각</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`공사 도장 ${stampOn ? '끄기' : '켜기'}`}
              accessibilityRole="button"
              onPress={() => setStampOn((on) => !on)}
              style={({ pressed }) => [styles.hudButton, stampOn && styles.hudButtonActive, pressed && styles.pressed]}
            >
              <Text style={styles.hudText}>도장</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="촬영해서 공유"
              accessibilityRole="button"
              disabled={capturing}
              onPress={() => void capture()}
              style={({ pressed }) => [styles.saveButton, pressed && styles.pressed, capturing && styles.disabled]}
            >
              <Text style={styles.saveText}>촬영</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="촬영 모드 닫기"
              accessibilityRole="button"
              onPress={() => setCameraMode(null)}
              style={({ pressed }) => [styles.hudButton, pressed && styles.pressed]}
            >
              <Text style={styles.hudText}>닫기</Text>
            </Pressable>
          </View>
        </View>
      ) : (
      <View style={styles.header}>
        <View>
          <Text style={styles.headerCompany}>대한냥냥공사</Text>
          <Text style={styles.headerTitle}>고객지원실</Text>
        </View>
        <View style={styles.headerRight}>
          {editing ? (
            <>
              <Pressable
                accessibilityLabel="실행 취소"
                accessibilityRole="button"
                disabled={editor.past.length === 0}
                onPress={() => dispatch({ type: 'undo' })}
                style={({ pressed }) => [styles.hudButton, pressed && styles.pressed, editor.past.length === 0 && styles.disabled]}
              >
                <Text style={styles.hudText}>↩︎</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="다시 실행"
                accessibilityRole="button"
                disabled={editor.future.length === 0}
                onPress={() => dispatch({ type: 'redo' })}
                style={({ pressed }) => [styles.hudButton, pressed && styles.pressed, editor.future.length === 0 && styles.disabled]}
              >
                <Text style={styles.hudText}>↪︎</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="편집 닫기, 저장하지 않은 편집은 보관"
                accessibilityRole="button"
                onPress={() => exitEdit(true)}
                style={({ pressed }) => [styles.hudButton, pressed && styles.pressed]}
              >
                <Text style={styles.hudText}>닫기</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="배치 저장"
                accessibilityRole="button"
                onPress={() => void save()}
                style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
              >
                <Text style={styles.saveText}>저장</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                accessibilityLabel="촬영 모드 열기"
                accessibilityRole="button"
                onPress={() => setCameraMode('portrait')}
                style={({ pressed }) => [styles.hudButton, pressed && styles.pressed]}
              >
                <Text style={styles.hudText}>촬영</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`상담일지 열기, 새 기록 ${unread}개`}
                accessibilityRole="button"
                onPress={() => {
                  setRecordsOpen(true);
                  setUnread(0);
                  setStored((prev) => {
                    if (!prev) return prev;
                    const next = { ...prev, lastReadEventAt: Date.now() };
                    void saveStoredRoomV2(next);
                    return next;
                  });
                }}
                style={({ pressed }) => [styles.hudButton, pressed && styles.pressed]}
              >
                <Text style={styles.hudText}>기록</Text>
                {unread > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unread}</Text>
                  </View>
                ) : null}
              </Pressable>
              <Pressable
                accessibilityLabel={`비품 상점 열기, 보유 ${balance} 포인트`}
                accessibilityRole="button"
                onPress={() => setShopOpen(true)}
                style={({ pressed }) => [styles.hudButton, pressed && styles.pressed]}
              >
                <Text style={styles.hudText}>상점</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="꾸미기 시작"
                accessibilityRole="button"
                onPress={enterEdit}
                style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
              >
                <Text style={styles.saveText}>꾸미기</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
      )}

      {offline ? (
        <Text style={styles.banner}>오프라인이에요. 마지막 저장본을 보여드리고 있어요.</Text>
      ) : null}
      {!editing && stored?.draft ? (
        <Text style={styles.banner}>저장하지 않은 편집안이 있어요. 꾸미기를 누르면 이어서 편집해요.</Text>
      ) : null}

      <View
        collapsable={false}
        ref={captureViewRef}
        style={[
          styles.roomViewport,
          { height: cameraMode === 'square' ? squareSide : roomHeight },
        ]}
      >
        <View style={cameraMode === 'square' ? { marginTop: -(roomHeight - squareSide) / 2 } : null}>
        {phase === 'loading' ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={nd.colors.accent} />
          </View>
        ) : phase === 'failed' ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>고객지원실을 열지 못했다냥</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            onScroll={(event) => {
              scrollXRef.current = event.nativeEvent.contentOffset.x;
            }}
            ref={scrollRef}
            scrollEnabled={!dragging}
            scrollEventThrottle={32}
            showsHorizontalScrollIndicator={false}
          >
            <View style={{ width: roomWidth, height: renderedRoomHeight }}>
              <Image
                resizeMode="stretch"
                source={V2_ROOM_SHELL}
                style={{ width: roomWidth, height: renderedRoomHeight }}
              />

              {/* ponytail: 표면 타일은 건축 마스크 에셋이 없어 바닥만 사각 밴드로 덮는다.
                  벽지는 창·문을 가리므로 선택 저장만 하고 시각 적용은 마스크 납품 뒤에 한다. */}
              {floorSurfaceId !== 'flooring_honey_oak' ? (
                <Image
                  resizeMode="repeat"
                  source={V2_SURFACE_IMAGES[floorSurfaceId]}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: WORLD.floorBand.top * scale,
                    width: roomWidth,
                    height: (WORLD.floorBand.bottom - WORLD.floorBand.top) * scale,
                    opacity: 0.92,
                  }}
                />
              ) : null}

              {placements.map((placement) => {
                const spec = specLookup(placement.furnitureId);
                if (!spec) return null;
                // 합성 행동 재생 중에는 같은 자리의 독립 가구를 숨긴다(이중 표시 방지).
                if (interacting && visit && placement.placementId === visit.placementId) {
                  return null;
                }
                return (
                  <PlacedFurnitureView
                    editing={editing}
                    key={placement.placementId}
                    onDragStateChange={setDragging}
                    onDrop={onDrop}
                    onSelect={setSelectedId}
                    placement={placement}
                    scale={scale}
                    selected={editing && selectedId === placement.placementId}
                    spec={spec}
                  />
                );
              })}

              {!editing && visit
                ? (() => {
                    const target = placements.find((p) => p.placementId === visit.placementId);
                    const targetSpec = target ? specLookup(target.furnitureId) : undefined;
                    if (!target || !targetSpec) return null;
                    return (
                      <CatVisitView
                        motionEnabled={motionEnabled}
                        onDone={() => {
                          playedEventsRef.current.add(visit.eventId);
                          const done = visit;
                          setVisit(null);
                          setInteracting(false);
                          void recordSupportRoomVisit({
                            eventId: done.eventId,
                            catId: done.catId,
                            furnitureId: done.furnitureId,
                            behaviorId: done.behaviorId,
                            scheduledAt: done.scheduledAt,
                            slot: done.slot,
                            catName: done.catName,
                            characterAssetKey: done.characterAssetKey,
                          })
                            .then((result) => {
                              setBalance(result.balance);
                              if (result.status === 'ok') setUnread((count) => count + 1);
                            })
                            .catch(() => {
                              // 기록 실패 시 다음 정산에서 같은 eventId로 재시도된다.
                            });
                        }}
                        onInteractChange={setInteracting}
                        scale={scale}
                        scene={visit}
                        targetPlacement={target}
                        targetSpec={targetSpec}
                      />
                    );
                  })()
                : null}

              {editing ? (
                <GridOverlay
                  blockedCells={blocked.cells}
                  blockedSurface={blocked.surface}
                  scale={scale}
                  shell={DEFAULT_ROOM_SHELL}
                />
              ) : null}
            </View>
          </ScrollView>
        )}
        </View>

        {cameraMode && stampOn ? (
          <View pointerEvents="none" style={styles.stamp}>
            <Text style={styles.stampText}>대한냥냥공사</Text>
          </View>
        ) : null}

        {editing && selectedId ? (
          <View style={styles.toolbar}>
            <Pressable accessibilityLabel="왼쪽으로 한 칸" accessibilityRole="button" onPress={() => moveSelected(-1, 0)} style={styles.toolButton}>
              <Text style={styles.toolText}>◀</Text>
            </Pressable>
            <Pressable accessibilityLabel="위로 한 칸" accessibilityRole="button" onPress={() => moveSelected(0, -1)} style={styles.toolButton}>
              <Text style={styles.toolText}>▲</Text>
            </Pressable>
            <Pressable accessibilityLabel="아래로 한 칸" accessibilityRole="button" onPress={() => moveSelected(0, 1)} style={styles.toolButton}>
              <Text style={styles.toolText}>▼</Text>
            </Pressable>
            <Pressable accessibilityLabel="오른쪽으로 한 칸" accessibilityRole="button" onPress={() => moveSelected(1, 0)} style={styles.toolButton}>
              <Text style={styles.toolText}>▶</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="좌우 반전"
              accessibilityRole="button"
              disabled={selectedSpec ? !selectedSpec.canFlipX : true}
              onPress={() => selectedId && dispatch({ type: 'flip', placementId: selectedId })}
              style={[styles.toolButton, selectedSpec && !selectedSpec.canFlipX && styles.disabled]}
            >
              <Text style={styles.toolText}>반전</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="보관함에 넣기"
              accessibilityRole="button"
              onPress={() => {
                if (selectedId) {
                  dispatch({ type: 'store', placementId: selectedId });
                  setSelectedId(null);
                }
              }}
              style={styles.toolButton}
            >
              <Text style={styles.toolText}>보관</Text>
            </Pressable>
            <Pressable accessibilityLabel="가구 정보" accessibilityRole="button" onPress={showInfo} style={styles.toolButton}>
              <Text style={styles.toolText}>정보</Text>
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
        placements={snapshot?.placements ?? []}
        purchasing={purchasing}
        visible={shopOpen}
      />

      {editing ? (
        <InventorySheet
          currentFloorSurfaceId={floorSurfaceId}
          currentWallSurfaceId={wallSurfaceId}
          onPickFurniture={placeFromInventory}
          onPickSurface={pickSurface}
          ownedCount={(id) => inventory.get(id) ?? 0}
          placedCount={placedCount}
        />
      ) : (
        <View style={[styles.tabBarWrap, { paddingBottom: tabBarBottomGap }]}>
          <ClientTabBar
            active="consult"
            onHome={() => navigation.getParent()?.navigate('HomeTab' as never)}
            onOpenConsult={() => undefined}
            onOpenMap={() => navigation.navigate('ClientMap')}
            onOpenRoster={() => navigation.navigate('ClientRoster')}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nd.colors.bg,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hudButton: {
    minWidth: 44,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: nd.colors.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudText: {
    fontSize: 14,
    color: nd.colors.ink,
  },
  saveButton: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: nd.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.35,
  },
  roomViewport: {
    overflow: 'hidden',
  },
  hudButtonActive: {
    borderWidth: 1,
    borderColor: nd.colors.accent,
  },
  stamp: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(224, 60, 60, 0.75)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    transform: [{ rotate: '-8deg' }],
  },
  stampText: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgba(224, 60, 60, 0.8)',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: nd.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  banner: {
    fontSize: 12,
    color: nd.colors.sub,
    backgroundColor: nd.colors.bgSecondary,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  stateBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stateTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: nd.colors.ink,
  },
  toolbar: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: nd.colors.barBg,
    borderRadius: nd.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  toolButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  toolText: {
    fontSize: 14,
    color: nd.colors.ink,
  },
  /** 편집 모드에서 하단 보관함이 차지할 높이 예약 */
  inventoryReserve: {
    height: 176,
  },
  tabBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
