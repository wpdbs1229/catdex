import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '@/app/navigation/types';
import { useGoBackOrHome } from '@/app/navigation/useGoBackOrHome';
import { CUSTOMER_DOSSIER_ASPECT_RATIO, CustomerDossierCard } from '@/features/cats/components/CustomerDossierCard';
import { fetchCatEncounters, fetchMyCats } from '@/shared/api/cats.api';
import { fetchMyEquipment, fetchMyShopPurchaseIds, fetchShopItems, purchaseShopItemViaStore } from '@/shared/api/shop.api';
import { createNdShadow, nd, theme } from '@/shared/styles/theme';
import type { Cat, CatEncounter } from '@/shared/types/cat';
import type { ShopItem, UserEquipment } from '@/shared/types/shop';
import { getAffinity } from '@/shared/utils/catPresentation';

function getAffinityLabel(affinity: number) {
  if (affinity >= 67) {
    return '단짝';
  }

  if (affinity >= 34) {
    return '친구';
  }

  return '첫인사';
}

/** 상점 > 전체 미리보기. 아직 안 산 상품을 고객 파일에 입혀서 기본/적용을 견줘 본다. */
export function ShopPreviewScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ShopPreview'>>();
  const goBack = useGoBackOrHome();
  const { width: windowWidth } = useWindowDimensions();
  const [item, setItem] = useState<ShopItem | null>(null);
  const [equipment, setEquipment] = useState<UserEquipment>({});
  const [isOwned, setIsOwned] = useState(false);
  const [sampleCat, setSampleCat] = useState<Cat | null>(null);
  const [sampleEncounters, setSampleEncounters] = useState<CatEncounter[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isApplied, setIsApplied] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      Promise.all([fetchShopItems(), fetchMyEquipment(), fetchMyShopPurchaseIds(), fetchMyCats()])
        .then(async ([items, nextEquipment, ownedIds, myCats]) => {
          if (!isActive) {
            return;
          }

          const targetItem = items.find((candidate) => candidate.id === route.params.itemId) ?? null;
          const firstCat = myCats[0] ?? null;
          const encounters = firstCat ? await fetchCatEncounters(firstCat.id) : [];

          if (!isActive) {
            return;
          }

          setItem(targetItem);
          setEquipment(nextEquipment);
          setIsOwned(ownedIds.has(route.params.itemId));
          setSampleCat(firstCat);
          setSampleEncounters(encounters);
          setHasLoaded(true);
        })
        .catch((error: unknown) => {
          console.warn('[shop-preview] load failed', error);
          if (isActive) {
            setHasLoaded(true);
          }
        });

      return () => {
        isActive = false;
      };
    }, [route.params.itemId]),
  );

  const dossierWidth = Math.min(280, windowWidth - 80);
  const dossierHeight = dossierWidth * CUSTOMER_DOSSIER_ASPECT_RATIO;
  const previewEquipment: UserEquipment =
    isApplied && item ? { ...equipment, [item.category]: item } : equipment;
  const affinity = sampleCat ? getAffinity(sampleCat) : 0;

  const handlePurchase = () => {
    if (!item || isPurchasing) {
      return;
    }

    setIsPurchasing(true);

    purchaseShopItemViaStore(item)
      .then(() => {
        navigation.replace('ShopPurchaseComplete', { itemId: item.id });
      })
      .catch((error: unknown) => {
        console.warn('[shop-preview] purchase failed', error);

        // 사용자가 결제창을 직접 닫은 경우 실패로 알릴 일이 아니다.
        const wasCancelled =
          typeof error === 'object' && error !== null && 'userCancelled' in error && (error as { userCancelled?: boolean }).userCancelled;

        if (!wasCancelled) {
          Alert.alert(
            '구매하지 못했어요',
            error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.',
          );
        }
      })
      .finally(() => setIsPurchasing(false));
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
        <Text style={styles.title}>적용 모습 미리보기</Text>
        <View style={styles.headerSpacer} />
      </View>

      {!hasLoaded ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : !item ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>상품을 찾을 수 없어요.</Text>
        </View>
      ) : !sampleCat ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>아직 등록된 고객이 없어서{'\n'}미리 볼 카드가 없어요.</Text>
        </View>
      ) : (
        <>
          <View style={styles.previewArea}>
            <CustomerDossierCard
              affinityLabel={getAffinityLabel(affinity)}
              cat={sampleCat}
              encounters={sampleEncounters}
              equipment={previewEquipment}
              width={dossierWidth}
            />
          </View>

          <View style={styles.bottomSheet}>
            <View style={styles.toggleRow}>
              <Pressable
                accessibilityLabel="기본 모습 보기"
                accessibilityRole="button"
                accessibilityState={{ selected: !isApplied }}
                onPress={() => setIsApplied(false)}
                style={[styles.toggleButton, !isApplied && styles.toggleButtonActive]}
              >
                <Text style={[styles.toggleText, !isApplied && styles.toggleTextActive]}>기본</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="적용한 모습 보기"
                accessibilityRole="button"
                accessibilityState={{ selected: isApplied }}
                onPress={() => setIsApplied(true)}
                style={[styles.toggleButton, isApplied && styles.toggleButtonActive]}
              >
                <Text style={[styles.toggleText, isApplied && styles.toggleTextActive]}>적용</Text>
              </Pressable>
            </View>

            <Text style={styles.itemName}>{item.name}</Text>
            {item.description ? <Text style={styles.itemDescription}>{item.description}</Text> : null}

            {isOwned ? (
              <Text style={styles.ownedNotice}>이미 보유한 상품이에요</Text>
            ) : (
              <Text style={styles.itemPrice}>{item.priceKrw.toLocaleString('ko-KR')}원</Text>
            )}

            <Pressable
              accessibilityLabel={isOwned ? '보유 비품으로 돌아가기' : '구매하기'}
              accessibilityRole="button"
              disabled={isPurchasing}
              onPress={
                isOwned
                  ? () => navigation.navigate('ShopPurchaseComplete', { itemId: item.id })
                  : handlePurchase
              }
              style={({ pressed }) => [styles.ctaButton, pressed && styles.pressed]}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.ctaText}>{isOwned ? '장착하러 가기' : '구매하기'}</Text>
              )}
            </Pressable>
          </View>
        </>
      )}
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
  headerSpacer: {
    width: 44,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.43,
    color: nd.colors.ink,
  },
  pressed: {
    opacity: 0.85,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    color: nd.colors.sub,
  },
  previewArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheet: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 6,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 4,
    borderRadius: nd.radius.pill,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  toggleButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: nd.radius.pill,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: nd.colors.sub,
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  itemName: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: nd.colors.ink,
  },
  itemDescription: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: nd.colors.sub,
  },
  itemPrice: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  ownedNotice: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: nd.colors.sub,
  },
  ctaButton: {
    marginTop: 12,
    width: '100%',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: nd.radius.pill,
    backgroundColor: theme.colors.primary,
    ...createNdShadow(0.16, 12),
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: '#FFFFFF',
  },
});
