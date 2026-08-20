import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { nd } from '@/shared/styles/theme';
import { FURNITURE_CATALOG, SURFACE_CATALOG } from '../domain/catalog.generated';
import type { FurnitureId, SurfaceId } from '../domain/furniture';
import type { Placement } from '../domain/placement';
import { specLookup } from '../domain/fixtures';
import { placementRect, WORLD } from '../render/projection';
import {
  V2_FURNITURE_IMAGES,
  V2_FURNITURE_THUMBS,
  V2_ROOM_SHELL,
  V2_SURFACE_IMAGES,
  V2_SURFACE_OVERLAYS,
} from '../support-room-v2.assets.generated';

export interface ShopEntry {
  id: string;
  name: string;
  price: number;
  acquisition: 'starter' | 'welfarePoint';
  kind: 'furniture' | 'surface';
}

/** 방 확장 카드에 필요한 것. 상점이 진행도까지 보여 준다. */
export interface ShopExpansion {
  name: string;
  cost: number;
  remaining: number;
  percent: number;
}

interface ShopSheetProps {
  visible: boolean;
  balance: number;
  /** 다음 확장 단계. 마지막 단계면 없다. */
  expansion?: ShopExpansion | null;
  /** 이미 방에 놓여 있는 가구. 보관함에서 "놓기"를 잠그는 데 쓴다. */
  placedIds?: readonly FurnitureId[];
  /** 보관함에서 가구를 골라 방에 놓을 때. 없으면 보관함 탭을 숨긴다. */
  onPlace?: (id: FurnitureId) => void;
  ownedCount: (id: FurnitureId) => number;
  /** 미리보기 배경으로 쓸 현재 방 배치 */
  placements: readonly Placement[];
  purchasing: boolean;
  onPurchase: (entry: ShopEntry) => void;
  onClose: () => void;
}

/** 카탈로그의 판매 목록. 시작 지급은 카드에 표시만 하고 구매 버튼이 없다. */
const ENTRIES: ShopEntry[] = [
  ...FURNITURE_CATALOG.map<ShopEntry>((f) => ({
    id: f.id,
    name: f.name,
    price: f.price,
    acquisition: f.acquisition,
    kind: 'furniture',
  })),
  ...SURFACE_CATALOG.map<ShopEntry>((s) => ({
    id: s.id,
    name: s.type === 'wallpaper' ? '벽지' : '바닥재',
    price: s.price,
    acquisition: s.acquisition,
    kind: 'surface',
  })),
];

type ShopCategory = 'expansion' | 'furniture' | 'wall' | 'surface';

const CATEGORY_LABEL: Record<ShopCategory, string> = {
  expansion: '확장하기',
  furniture: '가구',
  wall: '벽 장식',
  surface: '벽지·바닥',
};

const CATEGORY_ORDER: readonly ShopCategory[] = ['expansion', 'furniture', 'wall', 'surface'];

function categoryOf(entry: ShopEntry): ShopCategory {
  if (entry.kind === 'surface') return 'surface';
  return specLookup(entry.id as FurnitureId)?.surface === 'wall' ? 'wall' : 'furniture';
}

/** 내 방(현재 배치) 위에 선택 상품을 얹어 보여 주는 축소 미리보기. */
function RoomPreview({ entry, placements }: { entry: ShopEntry; placements: readonly Placement[] }) {
  const previewWidth = 320;
  const scale = previewWidth / WORLD.width;
  const previewHeight = WORLD.height * scale;

  const ghost: Placement | null =
    entry.kind === 'furniture'
      ? {
          placementId: '__preview__',
          furnitureId: entry.id as FurnitureId,
          surface: specLookup(entry.id as FurnitureId)?.surface ?? 'floor',
          gridX: 13,
          gridY: specLookup(entry.id as FurnitureId)?.surface === 'wall' ? 1 : 4,
          flipX: false,
        }
      : null;

  return (
    <View style={[styles.preview, { width: previewWidth, height: previewHeight }]}>
      <Image source={V2_ROOM_SHELL} style={{ width: previewWidth, height: previewHeight }} />
      {entry.kind === 'surface' ? (
        <Image
          resizeMode="stretch"
          source={V2_SURFACE_OVERLAYS[entry.id as SurfaceId]}
          style={{ position: 'absolute', left: 0, top: 0, width: previewWidth, height: previewHeight }}
        />
      ) : null}
      {[...placements, ...(ghost ? [ghost] : [])].map((placement) => {
        const spec = specLookup(placement.furnitureId);
        if (!spec) return null;
        const rect = placementRect(placement, spec);
        return (
          <Image
            key={placement.placementId}
            resizeMode="contain"
            source={V2_FURNITURE_IMAGES[placement.furnitureId]}
            style={{
              position: 'absolute',
              left: rect.left * scale,
              top: rect.top * scale,
              width: rect.width * scale,
              height: rect.height * scale,
              opacity: placement.placementId === '__preview__' ? 1 : 0.85,
            }}
          />
        );
      })}
    </View>
  );
}

/**
 * 보관함. 가진 비품을 보여 주고 방에 놓게 한다.
 *
 * 예전에는 HUD 버튼 이름이 "비품 보관함"인데 상점이 열려서, 산 물건을
 * 어디서 꺼내는지 알 길이 없었다.
 */
function InventoryGrid({
  ownedCount,
  placedIds,
  onPlace,
}: {
  ownedCount: (id: FurnitureId) => number;
  placedIds: readonly FurnitureId[];
  onPlace: (id: FurnitureId) => void;
}) {
  // 방에 놓여 있는 건 무조건 포함한다. 카탈로그가 어긋나도 "방에는 있는데
  // 보관함에는 없는" 상태를 만들지 않기 위해서다.
  const owned = useMemo(
    () =>
      FURNITURE_CATALOG.filter(
        (f) =>
          f.acquisition === 'starter' ||
          ownedCount(f.id as FurnitureId) > 0 ||
          placedIds.includes(f.id as FurnitureId),
      ),
    [ownedCount, placedIds],
  );

  if (owned.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>아직 가진 비품이 없어요</Text>
        <Text style={styles.emptySub}>상점 칸에서 복지포인트로 사 오면 여기에 담겨요</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={owned}
      keyExtractor={(item) => item.id}
      numColumns={3}
      renderItem={({ item }) => {
        const id = item.id as FurnitureId;
        const placed = placedIds.includes(id);
        return (
          <Pressable
            accessibilityLabel={`${item.name} ${placed ? '이미 방에 있음' : '방에 놓기'}`}
            accessibilityRole="button"
            accessibilityState={{ disabled: placed }}
            disabled={placed}
            onPress={() => onPlace(id)}
            style={[styles.card, placed && styles.cardPlaced]}
          >
            <Image resizeMode="contain" source={V2_FURNITURE_THUMBS[id]} style={styles.thumb} />
            <Text numberOfLines={1} style={styles.cardName}>
              {item.name}
            </Text>
            <Text style={styles.cardPrice}>{placed ? '방에 있음' : '방에 놓기'}</Text>
          </Pressable>
        );
      }}
      style={styles.list}
    />
  );
}

/**
 * 방 확장 카드.
 *
 * 예전에는 화면 아래 진행 막대로 늘 떠 있었는데, 평소에는 볼 일이 없어
 * 자리만 차지했다. 상점 안 "확장하기" 칸으로 옮겨 필요할 때만 보게 한다.
 */
function ExpansionCard({
  balance,
  expansion,
}: {
  balance: number;
  expansion: ShopExpansion | null;
}) {
  if (!expansion) {
    return (
      <View style={styles.expansion}>
        <Text style={styles.expansionTitle}>마지막 단계까지 넓혔어요</Text>
      </View>
    );
  }

  const ready = expansion.remaining === 0;
  return (
    <View style={styles.expansion}>
      <Text style={styles.expansionTitle}>{expansion.name}</Text>
      <Text style={styles.expansionSub}>
        {ready
          ? '필요한 복지포인트를 다 모았어요'
          : `${expansion.remaining.toLocaleString()}P 더 모으면 넓힐 수 있어요`}
      </Text>
      <View style={styles.expansionTrack}>
        <View style={[styles.expansionFill, { width: `${expansion.percent}%` }]} />
      </View>
      <Text style={styles.expansionMeta}>
        {balance.toLocaleString()} / {expansion.cost.toLocaleString()}P · {expansion.percent}%
      </Text>
      <Text style={styles.expansionNote}>방 넓히기는 준비 중이에요</Text>
    </View>
  );
}

/**
 * 복지포인트 상점. 목록 → 내 방 미리보기 → 구매 확인.
 * 가격·잔액 검증은 서버가 하고, 여기서는 표시와 요청 잠금만 담당한다.
 */
export function ShopSheet({
  visible,
  balance,
  expansion,
  placedIds = [],
  onPlace,
  ownedCount,
  placements,
  purchasing,
  onPurchase,
  onClose,
}: ShopSheetProps) {
  const [mode, setMode] = useState<'inventory' | 'shop'>(onPlace ? 'inventory' : 'shop');
  const [category, setCategory] = useState<ShopCategory>('furniture');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => ENTRIES.find((e) => e.id === selectedId) ?? null, [selectedId]);
  const shown = useMemo(() => ENTRIES.filter((entry) => categoryOf(entry) === category), [category]);

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{onPlace && mode === 'inventory' ? '비품 보관함' : '비품 상점'}</Text>
            <Text accessibilityLabel={`보유 복지포인트 ${balance}점`} style={styles.balance}>
              {balance.toLocaleString()}P
            </Text>
            <Pressable accessibilityLabel="상점 닫기" accessibilityRole="button" onPress={onClose} style={styles.close}>
              <Text style={styles.closeText}>닫기</Text>
            </Pressable>
          </View>

          {onPlace ? (
            <View style={styles.modes}>
              {(['inventory', 'shop'] as const).map((key) => (
                <Pressable
                  accessibilityLabel={key === 'inventory' ? '보관함 보기' : '상점 보기'}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: mode === key }}
                  key={key}
                  onPress={() => {
                    setMode(key);
                    setSelectedId(null);
                  }}
                  style={[styles.mode, mode === key && styles.modeActive]}
                >
                  <Text style={[styles.modeText, mode === key && styles.modeTextActive]}>
                    {key === 'inventory' ? '보관함' : '상점'}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {mode === 'inventory' ? (
            <InventoryGrid
              onPlace={(id) => onPlace?.(id)}
              ownedCount={ownedCount}
              placedIds={placedIds}
            />
          ) : (
          <>
          <View style={styles.tabs}>
            {CATEGORY_ORDER.map((key) => (
              <Pressable
                accessibilityLabel={`${CATEGORY_LABEL[key]} 보기`}
                accessibilityRole="tab"
                accessibilityState={{ selected: category === key }}
                key={key}
                onPress={() => {
                  setCategory(key);
                  setSelectedId(null);
                }}
                style={[styles.tab, category === key && styles.tabActive]}
              >
                <Text style={[styles.tabText, category === key && styles.tabTextActive]}>
                  {CATEGORY_LABEL[key]}
                </Text>
              </Pressable>
            ))}
          </View>

          {category === 'expansion' ? (
            <ExpansionCard balance={balance} expansion={expansion ?? null} />
          ) : null}

          {category !== 'expansion' && selected ? (
            <RoomPreview entry={selected} placements={placements} />
          ) : null}

          {category === 'expansion' ? null : <FlatList
            data={shown}
            keyExtractor={(item) => item.id}
            numColumns={3}
            renderItem={({ item }) => {
              const owned = item.kind === 'furniture' ? ownedCount(item.id as FurnitureId) : 0;
              const isStarter = item.acquisition === 'starter';
              return (
                <Pressable
                  accessibilityLabel={`${item.name}, ${isStarter ? '시작 지급' : `${item.price} 포인트`}${owned > 0 ? `, 보유 ${owned}개` : ''}`}
                  accessibilityRole="button"
                  onPress={() => setSelectedId(item.id)}
                  style={[styles.card, selectedId === item.id && styles.cardSelected]}
                >
                  <Image
                    resizeMode="contain"
                    source={
                      item.kind === 'furniture'
                        ? V2_FURNITURE_THUMBS[item.id as FurnitureId]
                        : V2_SURFACE_IMAGES[item.id as SurfaceId]
                    }
                    style={styles.thumb}
                  />
                  <Text numberOfLines={1} style={styles.cardName}>
                    {item.name}
                  </Text>
                  <Text style={styles.cardPrice}>
                    {isStarter ? '지급됨' : `${item.price.toLocaleString()}P`}
                    {owned > 0 ? ` · ${owned}개` : ''}
                  </Text>
                </Pressable>
              );
            }}
            style={styles.list}
          />}

          </>
          )}

          {mode === 'shop' && category !== 'expansion' && selected && selected.acquisition !== 'starter' ? (
            <Pressable
              accessibilityLabel={`${selected.name} ${selected.price} 포인트로 구매`}
              accessibilityRole="button"
              disabled={purchasing}
              onPress={() => onPurchase(selected)}
              style={[styles.buyButton, purchasing && styles.buyDisabled]}
            >
              {purchasing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buyText}>
                  {selected.price.toLocaleString()}P로 구매
                </Text>
              )}
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modes: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  mode: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1E7D7',
  },
  modeActive: { backgroundColor: '#3A2E22' },
  modeText: { fontSize: 14, fontWeight: '700', color: '#8B7A66' },
  modeTextActive: { color: '#FFFFFF' },
  cardPlaced: { opacity: 0.45 },
  empty: { paddingHorizontal: 24, paddingVertical: 40, gap: 6, alignItems: 'center' },
  emptyText: { fontSize: 15, fontWeight: '700', color: '#3A2E22' },
  emptySub: { fontSize: 13, color: '#8B7A66', textAlign: 'center' },
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 8 },
  tab: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    backgroundColor: '#F1E7D7',
  },
  tabActive: { backgroundColor: nd.colors.accent },
  tabText: { fontSize: 13, fontWeight: '600', color: '#8B7A66' },
  tabTextActive: { color: '#FFFFFF' },
  expansion: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3D0',
    gap: 8,
  },
  expansionTitle: { fontSize: 16, fontWeight: '800', color: '#3A2E22' },
  expansionSub: { fontSize: 13, color: '#5C4B39' },
  expansionTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E6DCCB',
    overflow: 'hidden',
  },
  expansionFill: { height: '100%', borderRadius: 999, backgroundColor: nd.colors.accent },
  expansionMeta: { fontSize: 12, fontWeight: '700', color: nd.colors.accent },
  expansionNote: { fontSize: 12, color: '#A2937F' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 17, 17, 0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: nd.colors.bg,
    borderTopLeftRadius: nd.radius.sheet,
    borderTopRightRadius: nd.radius.sheet,
    paddingBottom: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: nd.colors.ink,
    flex: 1,
  },
  balance: {
    fontSize: 15,
    fontWeight: '600',
    color: nd.colors.accent,
  },
  close: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  closeText: {
    fontSize: 14,
    color: nd.colors.sub,
  },
  preview: {
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  surfaceSwatch: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  list: {
    paddingHorizontal: 8,
  },
  card: {
    flex: 1 / 3,
    alignItems: 'center',
    margin: 6,
    padding: 8,
    borderRadius: 12,
    backgroundColor: nd.colors.bgSecondary,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: nd.colors.accent,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  cardName: {
    fontSize: 12,
    color: nd.colors.ink,
    marginTop: 4,
  },
  cardPrice: {
    fontSize: 11,
    color: nd.colors.sub,
  },
  buyButton: {
    marginHorizontal: 16,
    marginTop: 8,
    height: 48,
    borderRadius: 12,
    backgroundColor: nd.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyDisabled: {
    opacity: 0.6,
  },
  buyText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
