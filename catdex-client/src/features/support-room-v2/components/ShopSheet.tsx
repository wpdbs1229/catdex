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

interface ShopSheetProps {
  visible: boolean;
  balance: number;
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
 * 복지포인트 상점. 목록 → 내 방 미리보기 → 구매 확인.
 * 가격·잔액 검증은 서버가 하고, 여기서는 표시와 요청 잠금만 담당한다.
 */
export function ShopSheet({
  visible,
  balance,
  ownedCount,
  placements,
  purchasing,
  onPurchase,
  onClose,
}: ShopSheetProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => ENTRIES.find((e) => e.id === selectedId) ?? null, [selectedId]);

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>비품 상점</Text>
            <Text accessibilityLabel={`보유 복지포인트 ${balance}점`} style={styles.balance}>
              {balance.toLocaleString()}P
            </Text>
            <Pressable accessibilityLabel="상점 닫기" accessibilityRole="button" onPress={onClose} style={styles.close}>
              <Text style={styles.closeText}>닫기</Text>
            </Pressable>
          </View>

          {selected ? <RoomPreview entry={selected} placements={placements} /> : null}

          <FlatList
            data={ENTRIES}
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
          />

          {selected && selected.acquisition !== 'starter' ? (
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
