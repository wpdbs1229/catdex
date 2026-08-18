import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ClientStackParamList } from '@/app/navigation/types';
import { useTabBarBottomGap, useTabBarInset } from '@/app/navigation/useTabBarInset';
import { ClientTabBar } from '@/features/cats/components/ClientTabBar';
import { nd } from '@/shared/styles/theme';
import { GridOverlay } from './components/GridOverlay';
import { InventorySheet } from './components/InventorySheet';
import { PlacedFurnitureView } from './components/PlacedFurnitureView';
import { FURNITURE_CATALOG } from './domain/catalog.generated';
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
  createInitialStoredRoomV2,
  loadRoomV2,
  saveRoomV2,
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

  const editing = editor !== null;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setPhase('loading');
      loadRoomV2()
        .then((room) => {
          if (active) {
            setStored(room);
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

  const placements = editing ? editor.placements : (stored?.placements ?? []);
  const wallSurfaceId = editSurfaces?.wall ?? stored?.wallSurfaceId ?? 'wallpaper_cream_plaster';
  const floorSurfaceId = editSurfaces?.floor ?? stored?.floorSurfaceId ?? 'flooring_honey_oak';

  const enterEdit = useCallback(() => {
    if (!stored) return;
    setEditor(createEditorState(stored.placements));
    setEditSurfaces({ wall: stored.wallSurfaceId, floor: stored.floorSurfaceId });
    setSelectedId(null);
    setBlocked({ surface: 'floor', cells: [] });
  }, [stored]);

  const exitEdit = useCallback(() => {
    setEditor(null);
    setEditSurfaces(null);
    setSelectedId(null);
    setBlocked({ surface: 'floor', cells: [] });
  }, []);

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
    [dispatch, editor, scale, viewportWidth],
  );

  const pickSurface = useCallback((id: SurfaceId) => {
    setEditSurfaces((current) => {
      if (!current) return current;
      return id.startsWith('wallpaper') ? { ...current, wall: id } : { ...current, floor: id };
    });
  }, []);

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
    if (!editor || !editSurfaces || !stored) return;
    const issues = validateLayout(editor.placements, specLookup, DEFAULT_ROOM_SHELL);
    if (issues.length > 0) {
      const first = issues[0];
      setBlocked({ surface: 'floor', cells: [...(first.cells ?? [])] });
      Alert.alert('아직 저장할 수 없어요', issues.map((i) => `· ${ISSUE_MESSAGE[i.code]}`).join('\n'));
      return;
    }
    const next: StoredRoomV2 = {
      ...(stored ?? createInitialStoredRoomV2()),
      placements: [...editor.placements],
      wallSurfaceId: editSurfaces.wall,
      floorSurfaceId: editSurfaces.floor,
    };
    setStored(next);
    await saveRoomV2(next);
    exitEdit();
  }, [editSurfaces, editor, exitEdit, stored]);

  const selectedSpec = useMemo(() => {
    if (!selectedId) return null;
    const target = placements.find((p) => p.placementId === selectedId);
    return target ? (specLookup(target.furnitureId) ?? null) : null;
  }, [placements, selectedId]);

  const placedCount = useCallback(
    (id: FurnitureId) => placements.filter((p) => p.furnitureId === id).length,
    [placements],
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
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
                accessibilityLabel="편집 취소"
                accessibilityRole="button"
                onPress={exitEdit}
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
            <Pressable
              accessibilityLabel="꾸미기 시작"
              accessibilityRole="button"
              onPress={enterEdit}
              style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
            >
              <Text style={styles.saveText}>꾸미기</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={[styles.roomViewport, { height: roomHeight }]}>
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

      {editing ? (
        <InventorySheet
          currentFloorSurfaceId={floorSurfaceId}
          currentWallSurfaceId={wallSurfaceId}
          onPickFurniture={placeFromInventory}
          onPickSurface={pickSurface}
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
