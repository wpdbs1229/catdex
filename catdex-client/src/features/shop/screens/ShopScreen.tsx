import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Check, Package, RotateCcw, ShoppingBag } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '@/app/navigation/types';
import { useGoBackOrHome } from '@/app/navigation/useGoBackOrHome';
import {
  equipShopItem,
  fetchMyEquipment,
  fetchMyShopPurchaseIds,
  fetchShopItems,
  unequipShopCategory,
} from '@/shared/api/shop.api';
import { restorePurchases } from '@/shared/purchases/revenuecat';
import { createNdShadow, nd, theme } from '@/shared/styles/theme';
import type { ShopItem, ShopItemCategory, UserEquipment } from '@/shared/types/shop';

function toEquippedIds(equipment: UserEquipment) {
  return new Set(
    [equipment.background?.id, equipment.case?.id, equipment.label?.id].filter(
      (id): id is string => Boolean(id),
    ),
  );
}

type CategoryFilter = 'all' | ShopItemCategory;

const CATEGORY_TABS: Array<{ id: CategoryFilter; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'background', label: '배경지' },
  { id: 'case', label: '파일 케이스' },
  { id: 'label', label: '라벨·도장' },
];

function formatPrice(priceKrw: number) {
  return `${priceKrw.toLocaleString('ko-KR')}원`;
}

/** 마이페이지 > 냥냥 비품상점. 고객 파일의 배경지·케이스·라벨을 판다. */
export function ShopScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Shop'>>();
  const goBack = useGoBackOrHome();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(() => new Set());
  const [equippedIds, setEquippedIds] = useState<Set<string>>(() => new Set());
  const [hasLoaded, setHasLoaded] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  // 시안의 "보유 비품" - 별도 화면 대신 같은 목록을 보유한 것만 걸러 보여준다.
  // 홈의 비품 태그는 보관함(owned: true)부터 열고, 마이페이지 메뉴는 전체 상점부터 연다.
  const [showOwnedOnly, setShowOwnedOnly] = useState(route.params?.owned ?? false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isEquipping, setIsEquipping] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      Promise.all([fetchShopItems(), fetchMyShopPurchaseIds(), fetchMyEquipment()])
        .then(([nextItems, nextOwnedIds, equipment]) => {
          if (!isActive) {
            return;
          }

          setItems(nextItems);
          setOwnedIds(nextOwnedIds);
          setEquippedIds(toEquippedIds(equipment));
          setHasLoaded(true);
        })
        .catch((error: unknown) => {
          console.warn('[shop] load failed', error);
          if (isActive) {
            setHasLoaded(true);
          }
        });

      return () => {
        isActive = false;
      };
    }, []),
  );

  const visibleItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (categoryFilter === 'all' || item.category === categoryFilter) &&
          (!showOwnedOnly || ownedIds.has(item.id)),
      ),
    [categoryFilter, items, ownedIds, showOwnedOnly],
  );

  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;

  // 보유 비품에서는 카드를 누르는 게 곧 장착이다. 장착 중인 카드를 다시
  // 누르면 기본(순정)으로 돌아간다. 전체 목록에서는 눌러서 고르기만 하고,
  // 적용해 보기로 미리 본 뒤 사거나 장착한다.
  const handlePressItem = (item: ShopItem) => {
    setSelectedItemId(item.id);

    if (!showOwnedOnly || !ownedIds.has(item.id) || isEquipping) {
      return;
    }

    const wasEquipped = equippedIds.has(item.id);

    setIsEquipping(true);

    (wasEquipped ? unequipShopCategory(item.category) : equipShopItem(item.id))
      .then(() => fetchMyEquipment())
      .then((equipment) => setEquippedIds(toEquippedIds(equipment)))
      .catch((error: unknown) => {
        console.warn('[shop] equip failed', error);
        Alert.alert(wasEquipped ? '해제하지 못했어요' : '장착하지 못했어요', '잠시 후 다시 시도해 주세요.');
      })
      .finally(() => setIsEquipping(false));
  };

  // 기기를 바꾸거나 다시 설치했을 때 이미 산 상품을 되찾는다. 스토어 심사
  // 정책상 반드시 눈에 띄는 자리에 있어야 한다.
  const handleRestore = () => {
    if (isRestoring) {
      return;
    }

    setIsRestoring(true);

    restorePurchases()
      .then(() => fetchMyShopPurchaseIds())
      .then((nextOwnedIds) => {
        setOwnedIds(nextOwnedIds);
        Alert.alert('복원했어요', '이미 산 상품을 다시 불러왔어요.');
      })
      .catch((error: unknown) => {
        console.warn('[shop] restore failed', error);
        Alert.alert('복원하지 못했어요', '잠시 후 다시 시도해 주세요.');
      })
      .finally(() => setIsRestoring(false));
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="뒤로 가기"
          accessibilityRole="button"
          onPress={goBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <ArrowLeft color={nd.colors.ink} size={20} strokeWidth={1.8} />
        </Pressable>
        <Text style={styles.title}>{showOwnedOnly ? '보유 비품' : '냥냥 비품상점'}</Text>
        <Pressable
          accessibilityLabel={showOwnedOnly ? '전체 상품 보기' : '보유 비품만 보기'}
          accessibilityRole="button"
          onPress={() => setShowOwnedOnly((previous) => !previous)}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={[styles.ownedLink, showOwnedOnly && styles.ownedLinkActive]}>
            {showOwnedOnly ? '상점 보기' : '보유 비품'}
          </Text>
        </Pressable>
      </View>

      {showOwnedOnly ? (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryOwned}>
            보유 <Text style={styles.summaryStrong}>{ownedIds.size}개</Text>
          </Text>
          <Text style={styles.summaryEquipped}>장착 중 {equippedIds.size}개</Text>
        </View>
      ) : null}

      <View style={styles.tabsRow}>
        {CATEGORY_TABS.map(({ id, label }) => {
          const isActive = categoryFilter === id;

          return (
            <Pressable
              accessibilityLabel={label}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              key={id}
              onPress={() => setCategoryFilter(id)}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityLabel="구매 복원"
        accessibilityRole="button"
        disabled={isRestoring}
        onPress={handleRestore}
        style={({ pressed }) => [styles.restoreRow, pressed && styles.pressed]}
      >
        {isRestoring ? (
          <ActivityIndicator color={nd.colors.sub} size="small" />
        ) : (
          <RotateCcw color={nd.colors.sub} size={13} strokeWidth={2} />
        )}
        <Text style={styles.restoreText}>구매 복원</Text>
      </Pressable>

      {!hasLoaded ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : visibleItems.length === 0 ? (
        <View style={styles.centered}>
          <Package color={nd.colors.subtle} size={38} strokeWidth={1.6} />
          <Text style={styles.emptyTitle}>
            {showOwnedOnly ? '아직 보유한 비품이 없어요' : '아직 등록된 상품이 없어요'}
          </Text>
          <Text style={styles.emptyText}>
            {showOwnedOnly ? '상품을 사면 여기 모여요.' : '새 비품이 들어오면 여기에 채워져요.'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          <View style={styles.gridRow}>
            {visibleItems.map((item) => {
              const isSelected = item.id === selectedItemId;
              const isOwned = ownedIds.has(item.id);
              const isEquipped = equippedIds.has(item.id);

              return (
                <Pressable
                  accessibilityLabel={`${item.name} ${formatPrice(item.priceKrw)}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={item.id}
                  onPress={() => handlePressItem(item)}
                  // 보관함(보유 비품)은 시안처럼 스와치가 왼쪽, 이름·상태가 오른쪽인 가로형이다.
                  style={[
                    styles.itemCard,
                    showOwnedOnly && styles.itemCardHorizontal,
                    (isSelected || isEquipped) && styles.itemCardSelected,
                  ]}
                >
                  <View style={[styles.swatch, showOwnedOnly && styles.swatchCompact]}>
                    {item.swatchImageUrl || item.assetImageUrl ? (
                      <Image
                        resizeMode="cover"
                        source={{ uri: item.swatchImageUrl ?? item.assetImageUrl }}
                        style={styles.swatchImage}
                      />
                    ) : (
                      <Package color={nd.colors.subtle} size={28} strokeWidth={1.6} />
                    )}
                    {/* 시안처럼 장착 중이면 체크가 항상 붙는다. 고른 것만 됐을 때도 같은 표시를 쓴다. */}
                    {isSelected || isEquipped ? (
                      <View style={styles.selectedMark}>
                        <Check color="#FFFFFF" size={13} strokeWidth={2.6} />
                      </View>
                    ) : null}
                  </View>
                  <View style={showOwnedOnly ? styles.itemTextsHorizontal : styles.itemTextsVertical}>
                    <Text numberOfLines={showOwnedOnly ? 2 : 1} style={styles.itemName}>
                      {item.name}
                    </Text>
                    {isEquipped ? (
                      <Text style={styles.equippedTag}>장착 중</Text>
                    ) : isOwned ? (
                      <Text style={styles.ownedTag}>보유 중</Text>
                    ) : (
                      <Text style={styles.itemPrice}>{formatPrice(item.priceKrw)}</Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Pressable
          accessibilityLabel="선택한 상품 적용해 보기"
          accessibilityRole="button"
          disabled={!selectedItem}
          onPress={() => {
            if (selectedItem) {
              navigation.navigate('ShopPreview', { itemId: selectedItem.id });
            }
          }}
          style={({ pressed }) => [
            styles.ctaButton,
            !selectedItem && styles.ctaButtonDisabled,
            pressed && selectedItem && styles.pressed,
          ]}
        >
          <ShoppingBag color="#FFFFFF" size={18} strokeWidth={2} />
          <Text style={styles.ctaText}>적용해 보기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nd.colors.bgSecondary,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.43,
    color: nd.colors.ink,
  },
  ownedLink: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.33,
    color: nd.colors.sub,
  },
  ownedLinkActive: {
    color: theme.colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  restoreRow: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 2,
  },
  restoreText: {
    fontSize: 12,
    letterSpacing: -0.28,
    color: nd.colors.sub,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: nd.radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: nd.colors.border,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.33,
    color: nd.colors.sub,
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  emptyTitle: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '600',
    color: nd.colors.ink,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: nd.colors.sub,
  },
  grid: {
    padding: 16,
    paddingBottom: 100,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  itemCard: {
    width: '47%',
    borderRadius: nd.radius.input,
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...createNdShadow(0.05, 6),
  },
  itemCardSelected: {
    borderColor: theme.colors.primary,
  },
  swatch: {
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nd.colors.field,
    overflow: 'hidden',
  },
  swatchImage: {
    width: '100%',
    height: '100%',
  },
  selectedMark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  itemTextsVertical: {
    marginTop: 8,
  },
  // 보관함 카드의 오른쪽 글 기둥. 스와치 옆에 이름과 상태가 나란히 선다.
  itemTextsHorizontal: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  itemCardHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  swatchCompact: {
    width: 64,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  summaryOwned: {
    fontSize: 15,
    letterSpacing: -0.38,
    color: nd.colors.ink,
  },
  summaryStrong: {
    fontWeight: '800',
  },
  summaryEquipped: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.33,
    color: nd.colors.sub,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  itemPrice: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.33,
    color: theme.colors.primary,
  },
  ownedTag: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: nd.colors.sub,
  },
  equippedTag: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: theme.colors.primary,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: nd.colors.bgSecondary,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: nd.radius.pill,
    backgroundColor: theme.colors.primary,
    ...createNdShadow(0.16, 12),
  },
  ctaButtonDisabled: {
    backgroundColor: nd.colors.subtle,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: '#FFFFFF',
  },
});
