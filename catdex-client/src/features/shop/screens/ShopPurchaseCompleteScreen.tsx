import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CheckCircle2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '@/app/navigation/types';
import { fetchMyCats } from '@/shared/api/cats.api';
import { equipShopItem, fetchShopItems } from '@/shared/api/shop.api';
import { nd, theme } from '@/shared/styles/theme';
import type { ShopItem } from '@/shared/types/shop';

/** 받침 유무에 따라 "을"/"를"을 고른다. 상품명이 무엇으로 오든 안전해야 한다. */
function withObjectParticle(name: string) {
  const lastChar = name.trim().slice(-1);
  const code = lastChar.charCodeAt(0);

  if (code < 0xac00 || code > 0xd7a3) {
    return `${name}을(를)`;
  }

  const hasBatchim = (code - 0xac00) % 28 !== 0;

  return `${name}${hasBatchim ? '을' : '를'}`;
}

/** 상점 > 구매 완료. 바로 장착하거나 나중으로 미룬다. */
export function ShopPurchaseCompleteScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ShopPurchaseComplete'>>();
  const [item, setItem] = useState<ShopItem | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isEquipping, setIsEquipping] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      fetchShopItems()
        .then((items) => {
          if (isActive) {
            setItem(items.find((candidate) => candidate.id === route.params.itemId) ?? null);
            setHasLoaded(true);
          }
        })
        .catch((error: unknown) => {
          console.warn('[shop-purchase-complete] load failed', error);
          if (isActive) {
            setHasLoaded(true);
          }
        });

      return () => {
        isActive = false;
      };
    }, [route.params.itemId]),
  );

  const goToRoster = () => {
    // 명단 화면으로 돌아간다. 방금 산 상품이 이미 카드에 반영돼 있다.
    navigation.navigate('Main', { screen: 'CollectionTab', params: { screen: 'ClientRoster' } } as never);
  };

  const handleEquipNow = () => {
    if (!item || isEquipping) {
      return;
    }

    setIsEquipping(true);

    equipShopItem(item.id)
      .then(async () => {
        const myCats = await fetchMyCats();
        const firstCat = myCats[0];

        if (firstCat) {
          navigation.navigate('CatDetail', { catId: firstCat.id });
        } else {
          goToRoster();
        }
      })
      .catch((error: unknown) => {
        console.warn('[shop-purchase-complete] equip failed', error);
      })
      .finally(() => setIsEquipping(false));
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.screen}>
      <View style={styles.body}>
        {!hasLoaded ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <>
            <View style={styles.iconWrap}>
              <CheckCircle2 color={theme.colors.primary} size={28} strokeWidth={2} />
            </View>
            <Text style={styles.title}>구매가 완료됐어요</Text>
            {item ? (
              <Text style={styles.subtitle}>{withObjectParticle(item.name)} 보유 비품에 추가했어요</Text>
            ) : null}
          </>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityLabel="바로 장착"
          accessibilityRole="button"
          disabled={!item || isEquipping}
          onPress={handleEquipNow}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          {isEquipping ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>바로 장착</Text>}
        </Pressable>
        <Pressable
          accessibilityLabel="나중에"
          accessibilityRole="button"
          onPress={goToRoster}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>나중에</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nd.colors.bg,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: nd.colors.ink,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    color: nd.colors.sub,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 10,
  },
  pressed: {
    opacity: 0.85,
  },
  primaryButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: nd.radius.pill,
    backgroundColor: theme.colors.primary,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: '#FFFFFF',
  },
  secondaryButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: nd.colors.sub,
  },
});
