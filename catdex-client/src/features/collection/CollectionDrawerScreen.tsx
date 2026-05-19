import { useEffect, useState } from 'react';
import { Check, ChevronLeft, Lock, Sparkles, Star } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { SectionHeader } from '@/shared/components/SectionHeader';
import { hasActiveNyangkkureomi } from '@/shared/api/collection.api';
import { createShadow, theme } from '@/shared/styles/theme';
import { collectionPaletteStyle } from '@/shared/utils/collectionTheme';
import type { Cat } from '@/shared/types/cat';
import type { CollectionCustomizationState, CollectionProfile } from '@/shared/types/collection';
import type { NyangkkureomiPackage } from '@/shared/types/payments';

interface CollectionDrawerScreenProps {
  customization: CollectionCustomizationState;
  myCats: Cat[];
  isSaving: boolean;
  paymentPackages: NyangkkureomiPackage[];
  isPaymentAvailable: boolean;
  isPurchasing: boolean;
  paymentErrorMessage: string | null;
  onBack: () => void;
  onSaveProfile: (profile: CollectionProfile) => void;
  onSaveFeaturedCat: (slot: number, catId: string | null) => void;
  onPurchasePackage: (nextPackage: NyangkkureomiPackage) => void;
  onRestorePurchases: () => void;
  onShowUpsell: () => void;
}

export function CollectionDrawerScreen({
  customization,
  myCats,
  isSaving,
  paymentPackages,
  isPaymentAvailable,
  isPurchasing,
  paymentErrorMessage,
  onBack,
  onSaveProfile,
  onSaveFeaturedCat,
  onPurchasePackage,
  onRestorePurchases,
  onShowUpsell,
}: CollectionDrawerScreenProps) {
  const hasNyangkkureomi = hasActiveNyangkkureomi(customization.entitlement);
  const selectedTheme = customization.themes.find((theme) => theme.id === customization.profile.coverThemeId);
  const selectedCatIds = new Set(customization.featuredCatSlots.map((slot) => slot.catId));
  const selectedBadgeIds = new Set(customization.profile.selectedBadgeIds);
  const selectedBadges = customization.profile.selectedBadgeIds
    .map((badgeId) => customization.alleyBadges.find((badge) => badge.id === badgeId && badge.achieved))
    .filter((badge): badge is NonNullable<typeof badge> => Boolean(badge));
  const badgeDisplayLimit = hasNyangkkureomi ? 4 : 2;
  const selectedStampIds = new Set(customization.profile.selectedStampIds);
  const selectedStamps = customization.profile.selectedStampIds
    .map((stampId) => customization.seasonStamps.find((stamp) => stamp.id === stampId && stamp.achieved))
    .filter((stamp): stamp is NonNullable<typeof stamp> => Boolean(stamp));
  const stampDisplayLimit = hasNyangkkureomi ? 3 : 1;
  const [draftTitle, setDraftTitle] = useState(customization.profile.displayTitle);
  const [draftIntro, setDraftIntro] = useState(customization.profile.intro);

  useEffect(() => {
    setDraftTitle(customization.profile.displayTitle);
    setDraftIntro(customization.profile.intro);
  }, [customization.profile.displayTitle, customization.profile.intro]);

  const trimmedTitle = draftTitle.trim();
  const trimmedIntro = draftIntro.trim();
  const canSaveCopy =
    trimmedTitle.length > 0 &&
    trimmedIntro.length > 0 &&
    (trimmedTitle !== customization.profile.displayTitle || trimmedIntro !== customization.profile.intro);

  const handleThemePress = (themeId: string, isPremium: boolean) => {
    if (isPremium && !hasNyangkkureomi) {
      onShowUpsell();
      return;
    }

    onSaveProfile({
      ...customization.profile,
      coverThemeId: themeId,
    });
  };

  const handleFeaturedPress = (slot: number, catId: string) => {
    if (slot > 1 && !hasNyangkkureomi) {
      onShowUpsell();
      return;
    }

    onSaveFeaturedCat(slot, catId);
  };

  const handleSaveCopy = () => {
    if (!canSaveCopy) {
      return;
    }

    onSaveProfile({
      ...customization.profile,
      displayTitle: trimmedTitle,
      intro: trimmedIntro,
    });
  };

  const handleTogglePublic = () => {
    onSaveProfile({
      ...customization.profile,
      isPublic: !customization.profile.isPublic,
    });
  };

  const handleBadgePress = (badgeId: string, achieved: boolean) => {
    if (!achieved) {
      return;
    }

    const nextBadgeIds = customization.profile.selectedBadgeIds.includes(badgeId)
      ? customization.profile.selectedBadgeIds.filter((selectedBadgeId) => selectedBadgeId !== badgeId)
      : [...customization.profile.selectedBadgeIds, badgeId];

    if (nextBadgeIds.length > badgeDisplayLimit) {
      if (!hasNyangkkureomi) {
        onShowUpsell();
      }
      return;
    }

    onSaveProfile({
      ...customization.profile,
      selectedBadgeIds: nextBadgeIds,
    });
  };

  const handleStampPress = (stampId: string, achieved: boolean, isPremium: boolean) => {
    if (!achieved) {
      return;
    }

    if (isPremium && !hasNyangkkureomi) {
      onShowUpsell();
      return;
    }

    const nextStampIds = customization.profile.selectedStampIds.includes(stampId)
      ? customization.profile.selectedStampIds.filter((selectedStampId) => selectedStampId !== stampId)
      : [...customization.profile.selectedStampIds, stampId];

    if (nextStampIds.length > stampDisplayLimit) {
      if (!hasNyangkkureomi) {
        onShowUpsell();
      }
      return;
    }

    onSaveProfile({
      ...customization.profile,
      selectedStampIds: nextStampIds,
    });
  };

  const featuredCatBySlot = new Map(customization.featuredCatSlots.map((slot) => [slot.slot, slot.catId]));

  return (
    <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}>
          <ChevronLeft color={theme.colors.primaryDark} size={17} />
          <Text style={styles.backButtonText}>MY</Text>
        </Pressable>
        <View style={styles.headerBadge}>
          <Sparkles color={theme.colors.primaryDark} size={16} />
          <Text style={styles.headerBadgeText}>냥꾸러미</Text>
        </View>
        <Text style={styles.title}>고양이 서랍</Text>
        <Text style={styles.subtitle}>도감 표지, 골목 배지, 냥발 도장으로 내 냥도감을 꾸며요.</Text>
      </View>

      <Card style={[styles.coverCard, collectionPaletteStyle(selectedTheme?.palette)]}>
        <Text style={styles.coverEyebrow}>도감 표지</Text>
        <Text numberOfLines={1} style={styles.coverTitle}>
          {customization.profile.displayTitle}
        </Text>
        <Text style={styles.coverIntro}>{customization.profile.intro}</Text>
        <Text style={styles.coverTheme}>{selectedTheme?.name ?? '골목 관찰 노트'}</Text>
        {selectedBadges.length > 0 ? (
          <View style={styles.coverBadgeRow}>
            {selectedBadges.slice(0, badgeDisplayLimit).map((badge) => (
              <View key={badge.id} style={styles.coverBadgePill}>
                <Star color={theme.colors.warning} fill={theme.colors.warning} size={12} />
                <Text numberOfLines={1} style={styles.coverBadgeText}>
                  {badge.name}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        {selectedStamps.length > 0 ? (
          <View style={styles.coverStampRow}>
            {selectedStamps.slice(0, stampDisplayLimit).map((stamp) => (
              <View key={stamp.id} style={styles.coverStampPill}>
                <Text style={styles.coverStampIcon}>◦</Text>
                <Text numberOfLines={1} style={styles.coverStampText}>
                  {stamp.name}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card>

      <View style={styles.section}>
        <SectionHeader subtitle="도감 화면에 그대로 보이는 제목과 소개예요" title="표지 문구" />
        <Card style={styles.copyCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>도감 제목</Text>
            <TextInput
              editable={!isSaving}
              maxLength={24}
              onChangeText={setDraftTitle}
              placeholder="나의 냥도감"
              placeholderTextColor={theme.colors.tabMuted}
              style={styles.textInput}
              value={draftTitle}
            />
            <Text style={styles.inputCount}>{draftTitle.length} / 24</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>소개 문구</Text>
            <TextInput
              editable={!isSaving}
              maxLength={70}
              multiline
              onChangeText={setDraftIntro}
              placeholder="오늘도 골목에서 만난 친구들을 기록해요."
              placeholderTextColor={theme.colors.tabMuted}
              style={[styles.textInput, styles.introInput]}
              textAlignVertical="top"
              value={draftIntro}
            />
            <Text style={styles.inputCount}>{draftIntro.length} / 70</Text>
          </View>

          <Button disabled={isSaving || !canSaveCopy} onPress={handleSaveCopy}>
            표지 문구 저장
          </Button>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader subtitle="공개하면 다른 사용자가 앱 안에서 내 도감 표지를 방문할 수 있어요" title="공개 설정" />
        <Pressable
          disabled={isSaving}
          onPress={handleTogglePublic}
          style={({ pressed }) => [styles.publicToggle, customization.profile.isPublic ? styles.publicToggleActive : null, pressed ? styles.pressed : null]}
        >
          <View style={[styles.toggleSwitch, customization.profile.isPublic ? styles.toggleSwitchActive : null]}>
            <View style={[styles.toggleKnob, customization.profile.isPublic ? styles.toggleKnobActive : null]} />
          </View>
          <View style={styles.publicCopy}>
            <Text style={styles.publicTitle}>{customization.profile.isPublic ? '공개 도감' : '나만 보기'}</Text>
            <Text style={styles.publicText}>
              {customization.profile.isPublic
                ? '동네 도감 랭킹과 공개 도감 방문 화면에 표지가 보여요.'
                : '내 도감 표지는 나에게만 보여요.'}
            </Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.section}>
        <SectionHeader subtitle="무료 표지와 냥꾸러미 표지를 골라보세요" title="도감 표지" />
        <View style={styles.themeGrid}>
          {customization.themes.map((collectionTheme) => {
            const isSelected = customization.profile.coverThemeId === collectionTheme.id;
            const isLocked = collectionTheme.isPremium && !hasNyangkkureomi;

            return (
              <Pressable
                key={collectionTheme.id}
                disabled={isSaving}
                onPress={() => handleThemePress(collectionTheme.id, collectionTheme.isPremium)}
                style={({ pressed }) => [
                  styles.themeCard,
                  collectionPaletteStyle(collectionTheme.palette),
                  isSelected ? styles.selectedCard : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <View style={styles.themeHeader}>
                  <Text style={styles.themeName}>{collectionTheme.name}</Text>
                  {isLocked ? <Lock color={theme.colors.primaryDark} size={16} /> : null}
                  {isSelected ? <Check color={theme.colors.success} size={18} /> : null}
                </View>
                <Text style={styles.themeDescription}>{collectionTheme.description}</Text>
                {collectionTheme.isPremium ? <Text style={styles.premiumText}>냥꾸러미</Text> : <Text style={styles.freeText}>기본</Text>}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader subtitle="무료 1마리, 냥꾸러미는 최대 3마리" title="우리 도감 주인공" />
        <View style={styles.slotList}>
          {[1, 2, 3].map((slot) => {
            const selectedCatId = featuredCatBySlot.get(slot);
            const isLocked = slot > 1 && !hasNyangkkureomi;

            return (
              <Card key={slot} style={styles.slotCard}>
                <View style={styles.slotHeader}>
                  <Text style={styles.slotTitle}>주인공 {slot}</Text>
                  {isLocked ? <Text style={styles.lockedLabel}>냥꾸러미 슬롯</Text> : null}
                </View>
                <View style={styles.catChoiceList}>
                  {myCats.slice(0, 6).map((cat) => {
                    const isSelected = selectedCatId === cat.id;
                    const isAlreadySelected = selectedCatIds.has(cat.id) && !isSelected;

                    return (
                      <Pressable
                        key={`${slot}-${cat.id}`}
                        disabled={isSaving || isAlreadySelected}
                        onPress={() => handleFeaturedPress(slot, cat.id)}
                        style={({ pressed }) => [
                          styles.catChoice,
                          isSelected ? styles.catChoiceSelected : null,
                          isAlreadySelected ? styles.catChoiceDisabled : null,
                          pressed ? styles.pressed : null,
                        ]}
                      >
                        <Text style={styles.catChoiceName}>{cat.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {selectedCatId ? (
                  <Button disabled={isSaving} onPress={() => onSaveFeaturedCat(slot, null)} variant="ghost">
                    슬롯 비우기
                  </Button>
                ) : null}
                {myCats.length === 0 ? <Text style={styles.emptyText}>내 도감에 수집한 고양이가 생기면 설정할 수 있어요.</Text> : null}
              </Card>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader subtitle={`획득한 배지를 도감 표지에 ${badgeDisplayLimit}개까지 진열해요`} title="골목 배지" />
        <View style={styles.badgeGrid}>
          {customization.alleyBadges.map((badge) => {
            const isSelected = selectedBadgeIds.has(badge.id);

            return (
              <Pressable
                key={badge.id}
                disabled={isSaving || !badge.achieved}
                onPress={() => handleBadgePress(badge.id, badge.achieved)}
                style={({ pressed }) => [
                  styles.badgeCard,
                  badge.achieved ? styles.badgeAchieved : null,
                  isSelected ? styles.badgeSelected : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <View style={styles.badgeHeader}>
                  <Star color={badge.achieved ? theme.colors.warning : theme.colors.tabMuted} fill={badge.achieved ? theme.colors.warning : 'none'} size={18} />
                  {isSelected ? <Check color={theme.colors.success} size={17} /> : null}
                </View>
                <Text style={styles.badgeName}>{badge.name}</Text>
                <Text style={styles.badgeDescription}>{badge.achieved ? `${badge.achievedAt} 진열 가능` : badge.description}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader subtitle={`획득한 도장을 도감 표지에 ${stampDisplayLimit}개까지 진열해요`} title="냥발 도장" />
        <View style={styles.stampList}>
          {customization.seasonStamps.map((stamp) => {
            const isLocked = stamp.isPremium && !hasNyangkkureomi;
            const isSelected = selectedStampIds.has(stamp.id);

            return (
              <Pressable
                key={stamp.id}
                disabled={isSaving || !stamp.achieved}
                onPress={() => handleStampPress(stamp.id, stamp.achieved, stamp.isPremium)}
                style={({ pressed }) => [
                  styles.stampCard,
                  stamp.achieved ? styles.stampAchieved : null,
                  isSelected ? styles.stampSelected : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <View style={styles.stampIcon}>
                  {isLocked ? <Lock color={theme.colors.primaryDark} size={18} /> : <Text style={styles.stampPaw}>◦</Text>}
                </View>
                <View style={styles.stampMeta}>
                  <Text style={styles.stampName}>{stamp.name}</Text>
                  <Text style={styles.stampDescription}>{stamp.achieved ? `${stamp.achievedAt} 진열 가능` : stamp.description}</Text>
                </View>
                {isSelected ? <Check color={theme.colors.success} size={17} /> : null}
                {stamp.isPremium ? <Text style={styles.stampPremiumPill}>냥꾸러미</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      {!hasNyangkkureomi ? (
        <Card style={styles.upsellCard}>
          <Text style={styles.upsellTitle}>냥꾸러미로 서랍을 더 넓혀요</Text>
          <Text style={styles.upsellText}>
            프리미엄 표지, 주인공 3마리, 시즌 냥발 도장을 사용할 수 있어요. 결제는 App Store와 Google Play 구독으로 처리됩니다.
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
                  <View style={styles.packageMeta}>
                    <Text style={styles.packagePeriod}>{nextPackage.periodLabel}</Text>
                    <Text style={styles.packageTitle}>{nextPackage.title}</Text>
                  </View>
                  <Text style={styles.packagePrice}>{nextPackage.price}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Button disabled={isPurchasing} onPress={isPaymentAvailable ? onShowUpsell : onShowUpsell}>
              냥꾸러미 준비 상태 보기
            </Button>
          )}
          <Button disabled={isPurchasing} onPress={onRestorePurchases} variant="secondary">
            구매 복원
          </Button>
          {paymentErrorMessage ? <Text style={styles.paymentError}>{paymentErrorMessage}</Text> : null}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: 132,
  },
  header: {
    marginBottom: theme.spacing.md,
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
  headerBadge: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 7,
    backgroundColor: theme.colors.badge,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  headerBadgeText: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
  },
  title: {
    marginTop: theme.spacing.md,
    color: theme.colors.text,
    fontSize: 29,
    fontWeight: theme.typography.titleWeight,
    letterSpacing: theme.typography.letterSpacing,
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedText,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 22,
  },
  coverCard: {
    minHeight: 152,
    justifyContent: 'flex-end',
  },
  coverEyebrow: {
    color: '#8B6956',
    fontSize: 12,
    fontWeight: '900',
  },
  coverTitle: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 25,
    fontWeight: '900',
  },
  coverIntro: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedText,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  coverTheme: {
    marginTop: theme.spacing.md,
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  coverBadgeRow: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  coverBadgePill: {
    maxWidth: '48%',
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: 'rgba(255, 247, 222, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(199, 142, 63, 0.28)',
  },
  coverBadgeText: {
    flexShrink: 1,
    color: theme.colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
  },
  coverStampRow: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  coverStampPill: {
    maxWidth: '48%',
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: 'rgba(234, 241, 242, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(126, 147, 152, 0.32)',
  },
  coverStampIcon: {
    color: theme.colors.primaryDark,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 18,
  },
  coverStampText: {
    flexShrink: 1,
    color: theme.colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  copyCard: {
    gap: theme.spacing.md,
  },
  inputGroup: {
    gap: 7,
  },
  inputLabel: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  textInput: {
    minHeight: 46,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  introInput: {
    minHeight: 88,
  },
  inputCount: {
    alignSelf: 'flex-end',
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '700',
  },
  publicToggle: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.88)',
    ...createShadow(4),
  },
  publicToggleActive: {
    backgroundColor: '#FFF0DC',
    borderColor: 'rgba(201,121,73,0.24)',
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 3,
    backgroundColor: 'rgba(168,140,120,0.28)',
  },
  toggleSwitchActive: {
    backgroundColor: theme.colors.primaryDark,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  publicCopy: {
    flex: 1,
    minWidth: 0,
  },
  publicTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  publicText: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  themeGrid: {
    gap: theme.spacing.md,
  },
  themeCard: {
    minHeight: 108,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md,
    ...createShadow(4),
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: theme.colors.primaryDark,
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.55,
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  themeName: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  themeDescription: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  premiumText: {
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  freeText: {
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
    color: theme.colors.success,
    fontSize: 12,
    fontWeight: '900',
  },
  slotList: {
    gap: theme.spacing.md,
  },
  slotCard: {
    gap: theme.spacing.md,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  slotTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  lockedLabel: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  catChoiceList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  catChoice: {
    maxWidth: '100%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
  },
  catChoiceSelected: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accent,
  },
  catChoiceDisabled: {
    opacity: 0.4,
  },
  catChoiceName: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  emptyText: {
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '600',
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  badgeCard: {
    flexBasis: '47.5%',
    flexGrow: 1,
    maxWidth: '48.8%',
    minHeight: 124,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    opacity: 0.64,
    ...createShadow(4),
  },
  badgeAchieved: {
    opacity: 1,
    backgroundColor: '#FFF7DE',
  },
  badgeSelected: {
    borderWidth: 2,
    borderColor: theme.colors.primaryDark,
    backgroundColor: '#FFF0DC',
  },
  badgeHeader: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  badgeName: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  badgeDescription: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  stampList: {
    gap: theme.spacing.md,
  },
  stampCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: 70,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    opacity: 0.7,
    ...createShadow(4),
  },
  stampAchieved: {
    opacity: 1,
  },
  stampSelected: {
    borderWidth: 2,
    borderColor: theme.colors.primaryDark,
    backgroundColor: '#F0F7F8',
  },
  stampIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.badge,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stampPaw: {
    color: theme.colors.primaryDark,
    fontSize: 24,
    fontWeight: '900',
  },
  stampMeta: {
    flex: 1,
    minWidth: 0,
  },
  stampName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  stampDescription: {
    marginTop: 3,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  stampPremiumPill: {
    flexShrink: 0,
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '900',
    backgroundColor: 'rgba(255, 239, 214, 0.9)',
  },
  upsellCard: {
    marginTop: theme.spacing.xl,
    gap: theme.spacing.md,
    backgroundColor: '#FFF0D9',
  },
  upsellTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  upsellText: {
    color: theme.colors.mutedText,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  packageList: {
    gap: theme.spacing.sm,
  },
  packageButton: {
    minHeight: 66,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  packageMeta: {
    flex: 1,
    minWidth: 0,
  },
  packagePeriod: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  packageTitle: {
    marginTop: 3,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
  },
  packagePrice: {
    flexShrink: 0,
    color: theme.colors.primaryDark,
    fontSize: 15,
    fontWeight: '900',
  },
  paymentError: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
});
