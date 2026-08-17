import { ChevronRight, Package, ShoppingBag, X } from 'lucide-react-native';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createNdShadow, nd, theme } from '@/shared/styles/theme';

interface SupplyEntrySheetProps {
  visible: boolean;
  /** 보유한 비품 수. 아직 못 읽었으면 null - 배지와 문구에서 숫자를 뺀다. */
  ownedCount: number | null;
  onClose: () => void;
  onOpenShop: () => void;
  onOpenInventory: () => void;
}

/**
 * 홈 비품 태그의 갈림길 시트. 새 비품을 사러 가는 상점과 산 것을 관리하는
 * 보관함(보유 비품)이 문 하나를 나눠 쓰므로, 태그를 누르면 먼저 묻는다.
 */
export function SupplyEntrySheet({
  visible,
  ownedCount,
  onClose,
  onOpenShop,
  onOpenInventory,
}: SupplyEntrySheetProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="닫기" onPress={onClose} style={styles.backdropTouch} />

        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.head}>
            <Text style={styles.title}>냥냥 비품</Text>
            <Pressable
              accessibilityLabel="닫기"
              accessibilityRole="button"
              hitSlop={10}
              onPress={onClose}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <X color={nd.colors.ink} size={22} strokeWidth={2} />
            </Pressable>
          </View>

          <Pressable
            accessibilityLabel="비품상점"
            accessibilityRole="button"
            onPress={onOpenShop}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.rowIcon}>
              <ShoppingBag color={theme.colors.primary} size={22} strokeWidth={2} />
            </View>
            <View style={styles.rowTexts}>
              <Text style={styles.rowTitle}>비품상점</Text>
              <Text style={styles.rowBody}>새로운 비품을 둘러봐요</Text>
            </View>
            <ChevronRight color={nd.colors.subtle} size={20} strokeWidth={2} />
          </Pressable>

          <Pressable
            accessibilityLabel="보유 비품"
            accessibilityRole="button"
            onPress={onOpenInventory}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.rowIcon}>
              <Package color={theme.colors.primary} size={22} strokeWidth={2} />
            </View>
            <View style={styles.rowTexts}>
              <Text style={styles.rowTitle}>보유 비품</Text>
              <Text style={styles.rowBody}>
                {ownedCount === null ? '장착 관리' : `구매한 비품 ${ownedCount}개 · 장착 관리`}
              </Text>
            </View>
            {ownedCount !== null && ownedCount > 0 ? (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{ownedCount}</Text>
              </View>
            ) : null}
            <ChevronRight color={nd.colors.subtle} size={20} strokeWidth={2} />
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17, 17, 17, 0.4)',
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: nd.radius.sheet,
    borderTopRightRadius: nd.radius.sheet,
    backgroundColor: nd.colors.bg,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  handle: {
    width: 40,
    height: 4,
    alignSelf: 'center',
    marginTop: 10,
    borderRadius: 2,
    backgroundColor: nd.colors.border,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.48,
    color: nd.colors.ink,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: nd.colors.border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    ...createNdShadow(0.04, 6),
  },
  rowIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: theme.colors.primarySoft,
  },
  rowTexts: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: nd.colors.ink,
  },
  rowBody: {
    fontSize: 13,
    letterSpacing: -0.33,
    color: nd.colors.sub,
  },
  countBadge: {
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 7,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.8,
  },
});
