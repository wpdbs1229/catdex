import { Check, Lock, Sparkles, Star } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { SectionHeader } from '@/shared/components/SectionHeader';
import { hasActiveNyangkkureomi } from '@/shared/api/collection.api';
import { createShadow, theme } from '@/shared/styles/theme';
import type { Cat } from '@/shared/types/cat';
import type { CollectionCustomizationState, CollectionProfile } from '@/shared/types/collection';

interface CollectionDrawerScreenProps {
  customization: CollectionCustomizationState;
  myCats: Cat[];
  isSaving: boolean;
  onBack: () => void;
  onSaveProfile: (profile: CollectionProfile) => void;
  onSaveFeaturedCat: (slot: number, catId: string | null) => void;
  onShowUpsell: () => void;
}

export function CollectionDrawerScreen({
  customization,
  myCats,
  isSaving,
  onBack,
  onSaveProfile,
  onSaveFeaturedCat,
  onShowUpsell,
}: CollectionDrawerScreenProps) {
  const hasNyangkkureomi = hasActiveNyangkkureomi(customization.entitlement);
  const selectedTheme = customization.themes.find((theme) => theme.id === customization.profile.coverThemeId);
  const selectedCatIds = new Set(customization.featuredCatSlots.map((slot) => slot.catId));

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

  const featuredCatBySlot = new Map(customization.featuredCatSlots.map((slot) => [slot.slot, slot.catId]));

  return (
    <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Button onPress={onBack} variant="ghost">
          MY로 돌아가기
        </Button>
        <View style={styles.headerBadge}>
          <Sparkles color={theme.colors.primaryDark} size={16} />
          <Text style={styles.headerBadgeText}>냥꾸러미</Text>
        </View>
        <Text style={styles.title}>고양이 서랍</Text>
        <Text style={styles.subtitle}>도감 표지, 골목 배지, 냥발 도장으로 내 냥도감을 꾸며요.</Text>
      </View>

      <Card style={[styles.coverCard, paletteStyle(selectedTheme?.palette)]}>
        <Text style={styles.coverEyebrow}>도감 표지</Text>
        <Text style={styles.coverTitle}>{customization.profile.displayTitle}</Text>
        <Text style={styles.coverIntro}>{customization.profile.intro}</Text>
        <Text style={styles.coverTheme}>{selectedTheme?.name ?? '골목 관찰 노트'}</Text>
      </Card>

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
                  paletteStyle(collectionTheme.palette),
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
        <SectionHeader subtitle="획득한 배지를 도감에 진열해요" title="골목 배지" />
        <View style={styles.badgeGrid}>
          {customization.alleyBadges.map((badge) => (
            <Card key={badge.id} style={[styles.badgeCard, badge.achieved ? styles.badgeAchieved : null]}>
              <Star color={badge.achieved ? theme.colors.warning : theme.colors.tabMuted} fill={badge.achieved ? theme.colors.warning : 'none'} size={18} />
              <Text style={styles.badgeName}>{badge.name}</Text>
              <Text style={styles.badgeDescription}>{badge.achieved ? badge.achievedAt : badge.description}</Text>
            </Card>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader subtitle="계절마다 모으는 작은 도장" title="냥발 도장" />
        <View style={styles.stampList}>
          {customization.seasonStamps.map((stamp) => {
            const isLocked = stamp.isPremium && !hasNyangkkureomi;

            return (
              <Card key={stamp.id} style={styles.stampCard}>
                <View style={styles.stampIcon}>
                  {isLocked ? <Lock color={theme.colors.primaryDark} size={18} /> : <Text style={styles.stampPaw}>◦</Text>}
                </View>
                <View style={styles.stampMeta}>
                  <Text style={styles.stampName}>{stamp.name}</Text>
                  <Text style={styles.stampDescription}>{stamp.achieved ? `${stamp.achievedAt} 획득` : stamp.description}</Text>
                </View>
                {stamp.isPremium ? <Text style={styles.premiumText}>냥꾸러미</Text> : null}
              </Card>
            );
          })}
        </View>
      </View>

      {!hasNyangkkureomi ? (
        <Card style={styles.upsellCard}>
          <Text style={styles.upsellTitle}>냥꾸러미로 서랍을 더 넓혀요</Text>
          <Text style={styles.upsellText}>프리미엄 표지, 주인공 3마리, 시즌 냥발 도장을 사용할 수 있어요.</Text>
          <Button onPress={onShowUpsell}>냥꾸러미 보기</Button>
        </Card>
      ) : null}
    </ScrollView>
  );
}

function paletteStyle(palette?: string) {
  switch (palette) {
    case 'green':
      return { backgroundColor: '#EEF3DE', borderColor: '#B9C59A' };
    case 'night':
      return { backgroundColor: '#E7E1D7', borderColor: '#7C6A5B' };
    case 'playful':
      return { backgroundColor: '#FFE9D2', borderColor: '#E2A76E' };
    case 'winter':
      return { backgroundColor: '#EAF1F2', borderColor: '#AFC6CA' };
    default:
      return { backgroundColor: theme.colors.surface, borderColor: theme.colors.border };
  }
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: 140,
  },
  header: {
    marginBottom: theme.spacing.lg,
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
    fontSize: 32,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedText,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 22,
  },
  coverCard: {
    minHeight: 168,
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
    fontSize: 28,
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
    marginTop: theme.spacing.lg,
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  section: {
    marginTop: theme.spacing.xl,
  },
  themeGrid: {
    gap: theme.spacing.md,
  },
  themeCard: {
    minHeight: 116,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.lg,
    ...createShadow(4),
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: theme.colors.primaryDark,
  },
  pressed: {
    opacity: 0.86,
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
    width: '47.5%',
    minHeight: 130,
    opacity: 0.64,
  },
  badgeAchieved: {
    opacity: 1,
    backgroundColor: '#FFF7DE',
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
});
