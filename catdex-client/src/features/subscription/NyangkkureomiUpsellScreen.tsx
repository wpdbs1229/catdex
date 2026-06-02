import { ChevronLeft, Crown, Heart, Map, Sparkles, Users } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { createShadow, theme } from '@/shared/styles/theme';
import type { NyangkkureomiPackage } from '@/shared/types/payments';

interface NyangkkureomiUpsellScreenProps {
  isPaymentAvailable: boolean;
  isPurchasing: boolean;
  onBack?: () => void;
  onPurchasePackage: (nextPackage: NyangkkureomiPackage) => void;
  onRestorePurchases: () => void;
  onShowPaymentSetup: () => void;
  paymentErrorMessage: string | null;
  paymentPackages: NyangkkureomiPackage[];
  source: 'map' | 'social' | 'drawer';
}

const sourceCopy = {
  map: {
    title: '공유 지도는 냥꾸러미에서 열려요',
    subtitle: '혼자 모은 냥도감은 그대로 쓰고, 구독하면 동네 사람들이 공유한 고양이까지 지도에서 볼 수 있어요.',
  },
  social: {
    title: '사람들의 도감은 냥꾸러미에서 만나요',
    subtitle: '내 도감을 꾸민 뒤, 구독하면 공개 도감을 둘러보고 좋아요와 팔로우로 연결할 수 있어요.',
  },
  drawer: {
    title: '고양이 서랍을 더 넓혀요',
    subtitle: '기본 수집은 그대로 유지하고, 구독하면 표지와 도장, 공유 기능이 함께 열려요.',
  },
} satisfies Record<NyangkkureomiUpsellScreenProps['source'], { title: string; subtitle: string }>;

const benefits = [
  {
    icon: Map,
    title: '공유 도감 지도',
    text: '동네 단위로 공유된 고양이를 지도에서 확인해요.',
  },
  {
    icon: Users,
    title: '사람들의 공개 도감',
    text: '다른 사용자의 도감 표지와 대표 고양이를 둘러봐요.',
  },
  {
    icon: Heart,
    title: '좋아요와 팔로우',
    text: '마음에 드는 도감을 저장하고 다시 찾아가요.',
  },
  {
    icon: Sparkles,
    title: '프리미엄 꾸미기',
    text: '프리미엄 표지, 냥발 도장, 주인공 3마리를 사용해요.',
  },
];

export function NyangkkureomiUpsellScreen({
  isPaymentAvailable,
  isPurchasing,
  onBack,
  onPurchasePackage,
  onRestorePurchases,
  onShowPaymentSetup,
  paymentErrorMessage,
  paymentPackages,
  source,
}: NyangkkureomiUpsellScreenProps) {
  const primaryPackage = paymentPackages[0] ?? null;
  const copy = sourceCopy[source];

  const handlePrimaryPress = () => {
    if (primaryPackage) {
      onPurchasePackage(primaryPackage);
      return;
    }

    onShowPaymentSetup();
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {onBack ? (
        <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}>
          <ChevronLeft color={theme.colors.primaryDark} size={17} />
          <Text style={styles.backButtonText}>돌아가기</Text>
        </Pressable>
      ) : null}

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Crown color={theme.colors.primaryDark} size={28} />
        </View>
        <Text style={styles.kicker}>냥꾸러미</Text>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
      </View>

      <View style={styles.benefitGrid}>
        {benefits.map(({ icon: Icon, title, text }) => (
          <Card key={title} style={styles.benefitCard}>
            <View style={styles.benefitIcon}>
              <Icon color={theme.colors.primaryDark} size={20} />
            </View>
            <View style={styles.benefitCopy}>
              <Text style={styles.benefitTitle}>{title}</Text>
              <Text style={styles.benefitText}>{text}</Text>
            </View>
          </Card>
        ))}
      </View>

      <Card style={styles.purchaseCard}>
        <Text style={styles.purchaseTitle}>구독하면 바로 열리는 기능</Text>
        <Text style={styles.purchaseText}>
          지도에서 공유 고양이를 보고, 사람들의 도감을 방문하고, 내 도감은 프리미엄 표지와 도장으로 꾸밀 수 있어요.
        </Text>
        {paymentPackages.length > 0 ? (
          <View style={styles.packageList}>
            {paymentPackages.map((nextPackage) => (
              <Pressable
                key={nextPackage.id}
                disabled={isPurchasing}
                onPress={() => onPurchasePackage(nextPackage)}
                style={({ pressed }) => [styles.packageButton, pressed ? styles.pressed : null, isPurchasing ? styles.disabled : null]}
              >
                <View style={styles.packageCopy}>
                  <Text style={styles.packagePeriod}>{nextPackage.periodLabel}</Text>
                  <Text style={styles.packageTitle}>{nextPackage.title}</Text>
                </View>
                <Text style={styles.packagePrice}>{nextPackage.price}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.placeholderPrice}>월 3,900원 / 연 39,000원 기준으로 준비 중이에요.</Text>
        )}
        <Button disabled={isPurchasing} onPress={handlePrimaryPress}>
          {primaryPackage ? `${primaryPackage.periodLabel} 구독하기` : isPaymentAvailable ? '구독 상품 불러오기' : '구독 준비 상태 보기'}
        </Button>
        <Button disabled={isPurchasing} onPress={onRestorePurchases} variant="secondary">
          구매 복원
        </Button>
        {paymentErrorMessage ? <Text style={styles.errorText}>{paymentErrorMessage}</Text> : null}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 132,
    gap: theme.spacing.lg,
  },
  backButton: {
    alignSelf: 'flex-start',
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    paddingRight: theme.spacing.md,
    backgroundColor: 'rgba(255, 253, 246, 0.78)',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  backButtonText: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  hero: {
    minHeight: 248,
    justifyContent: 'flex-end',
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(139, 112, 83, 0.18)',
    padding: theme.spacing.lg,
    backgroundColor: '#F7E5C9',
    overflow: 'hidden',
    ...createShadow(8),
  },
  heroIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    backgroundColor: 'rgba(255,253,246,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(139, 105, 86, 0.18)',
  },
  kicker: {
    marginTop: theme.spacing.lg,
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  title: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 35,
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedText,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 22,
  },
  benefitGrid: {
    gap: theme.spacing.md,
  },
  benefitCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  benefitIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: theme.colors.accentSoft,
  },
  benefitCopy: {
    flex: 1,
    minWidth: 0,
  },
  benefitTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  benefitText: {
    marginTop: 5,
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  purchaseCard: {
    gap: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.92)',
  },
  purchaseTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  purchaseText: {
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
  },
  packageList: {
    gap: theme.spacing.sm,
  },
  packageButton: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(139, 105, 86, 0.18)',
    padding: theme.spacing.md,
    backgroundColor: '#FFF8EC',
  },
  packageCopy: {
    flex: 1,
    minWidth: 0,
  },
  packagePeriod: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  packageTitle: {
    marginTop: 4,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  packagePrice: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  placeholderPrice: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 20,
  },
  errorText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.84,
  },
  disabled: {
    opacity: 0.55,
  },
});
