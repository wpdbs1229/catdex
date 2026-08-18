import { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { nd } from '@/shared/styles/theme';
import { FURNITURE_CATALOG, SURFACE_CATALOG } from '../domain/catalog.generated';
import type { FurnitureId, SurfaceId } from '../domain/furniture';
import { V2_FURNITURE_THUMBS, V2_SURFACE_IMAGES } from '../support-room-v2.assets.generated';

type TabId = 'all' | 'interactive' | 'office' | 'decor' | 'wall' | 'surface';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'interactive', label: '행동' },
  { id: 'office', label: '업무' },
  { id: 'decor', label: '장식' },
  { id: 'wall', label: '벽' },
  { id: 'surface', label: '바닥·벽지' },
];

interface InventorySheetProps {
  /** 배치된 수량(placementId 수). 카드에 표시한다. */
  placedCount: (id: FurnitureId) => number;
  /** 서버 보관함 보유 수량 */
  ownedCount: (id: FurnitureId) => number;
  currentWallSurfaceId: SurfaceId;
  currentFloorSurfaceId: SurfaceId;
  onPickFurniture: (id: FurnitureId) => void;
  onPickSurface: (id: SurfaceId) => void;
}

/** 편집 모드 하단 보관함. 보유 수량은 서버 inventory가 정본이다. */
export function InventorySheet({
  placedCount,
  ownedCount,
  currentWallSurfaceId,
  currentFloorSurfaceId,
  onPickFurniture,
  onPickSurface,
}: InventorySheetProps) {
  const [tab, setTab] = useState<TabId>('all');

  const furniture = useMemo(
    () => FURNITURE_CATALOG.filter((f) => tab === 'all' || f.group === tab),
    [tab],
  );

  return (
    <View style={styles.sheet}>
      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable
            accessibilityLabel={`${t.label} 카테고리`}
            accessibilityRole="button"
            key={t.id}
            onPress={() => setTab(t.id)}
            style={[styles.tab, tab === t.id && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'surface' ? (
        <FlatList
          data={SURFACE_CATALOG}
          horizontal
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const applied = item.id === currentWallSurfaceId || item.id === currentFloorSurfaceId;
            return (
              <Pressable
                accessibilityLabel={`${item.type === 'wallpaper' ? '벽지' : '바닥재'} ${item.id}${applied ? ', 적용 중' : ''}`}
                accessibilityRole="button"
                onPress={() => onPickSurface(item.id)}
                style={[styles.card, applied && styles.cardApplied]}
              >
                <Image resizeMode="cover" source={V2_SURFACE_IMAGES[item.id]} style={styles.thumb} />
                <Text numberOfLines={1} style={styles.cardName}>
                  {item.type === 'wallpaper' ? '벽지' : '바닥'}
                </Text>
                <Text style={styles.cardPrice}>
                  {item.acquisition === 'starter' ? '시작 지급' : `${item.price.toLocaleString()}P`}
                </Text>
              </Pressable>
            );
          }}
          showsHorizontalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={furniture}
          horizontal
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const placed = placedCount(item.id);
            const owned = ownedCount(item.id);
            const exhausted = owned === 0 || placed >= owned;
            return (
              <Pressable
                accessibilityLabel={`${item.name} 배치하기, 보유 ${owned}개, 배치 ${placed}개`}
                accessibilityRole="button"
                onPress={() => onPickFurniture(item.id)}
                style={[styles.card, exhausted && styles.cardExhausted]}
              >
                <Image resizeMode="contain" source={V2_FURNITURE_THUMBS[item.id]} style={styles.thumb} />
                <Text numberOfLines={1} style={styles.cardName}>
                  {item.name}
                </Text>
                <Text style={styles.cardPrice}>
                  {owned === 0
                    ? item.acquisition === 'starter'
                      ? '시작 지급'
                      : `${item.price.toLocaleString()}P`
                    : `보유 ${owned} · 배치 ${placed}`}
                </Text>
              </Pressable>
            );
          }}
          showsHorizontalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: nd.colors.barBg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: nd.colors.border,
    paddingVertical: 8,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 6,
    marginBottom: 8,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: nd.radius.pill,
    backgroundColor: nd.colors.field,
  },
  tabActive: {
    backgroundColor: nd.colors.accent,
  },
  tabText: {
    fontSize: 13,
    color: nd.colors.sub,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  card: {
    width: 92,
    marginHorizontal: 6,
    alignItems: 'center',
  },
  cardExhausted: {
    opacity: 0.45,
  },
  cardApplied: {
    borderWidth: 2,
    borderColor: nd.colors.accent,
    borderRadius: 10,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: nd.colors.field,
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
});
