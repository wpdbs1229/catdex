import type { LucideIcon } from 'lucide-react-native';
import { Bell, BookOpen, ChevronRight, IdCard, Info, LogOut, MessageCircle, Settings, ShieldCheck, Star, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { FeaturedCatManager } from '@/features/my/components/FeaturedCatManager';
import { ProgressBar } from '@/shared/components/ProgressBar';
import { DEFAULT_BADGE_CATALOG } from '@/shared/constants/badge.constants';
import { NYANGNYANGDAN_RANK_RULES } from '@/shared/profile/nyangnyangdan-rank';
import { createShadow, theme } from '@/shared/styles/theme';
import type { Badge, ExplorerProfile } from '@/shared/types/badge';
import type { AuthUser } from '@/shared/types/auth';
import type { Cat } from '@/shared/types/cat';
import type { CollectionSummary } from '@/shared/types/collection';
import { getCatIllustrationKey, type CatIllustrationKey } from '@/shared/utils/catPresentation';

interface MyPageScreenProps {
  profile: ExplorerProfile;
  badges: Badge[];
  myCats: Cat[];
  user: AuthUser;
  collectionSummary: CollectionSummary;
  neighborhoodName: string;
  isSigningOut: boolean;
  isWithdrawing: boolean;
  isSavingFeaturedCats?: boolean;
  onLogout: () => void;
  onWithdrawAccount: () => Promise<void> | void;
  onOpenCat: (catId: string) => void;
  onOpenBadges: () => void;
  onOpenCommunityPosts: () => void;
  onOpenExplorationHistory: () => void;
  onOpenNotifications: () => void;
  onOpenProfileEdit: () => void;
  onSaveFeaturedCats: (catIds: string[]) => Promise<void> | void;
}

const illustrations = {
  profile: require('../../../assets/illustrations/default-profile-avatar.png'),
  orange: require('../../../assets/illustrations/cat-orange-clean.png'),
  dark: require('../../../assets/illustrations/cat-dark-clean.png'),
  tuxedo: require('../../../assets/illustrations/cat-tuxedo-clean.png'),
  gray: require('../../../assets/illustrations/cat-gray-clean.png'),
} satisfies Record<'profile' | CatIllustrationKey, ImageSourcePropType>;

const badgeIcons = ['🐾', '🌿', '🦉', '💙'];

function getEmployeeNumber(user: AuthUser) {
  const source = `${user.provider}:${user.id}:${user.nickname}`;
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) % 10000;
  }

  return `NN-${String(hash).padStart(4, '0')}`;
}

function catImage(cat: Cat): ImageSourcePropType {
  if (cat.imageUrl) {
    return { uri: cat.imageUrl };
  }

  return illustrations[getCatIllustrationKey(cat.type)];
}

function formatNeighborhoodRank(neighborhoodName: string, rankTitle: string) {
  return `${neighborhoodName} ${rankTitle}`;
}

function formatNeighborhoodGoal(goalLabel: string, neighborhoodName: string) {
  return goalLabel.replaceAll('냥냥단', `${neighborhoodName} 냥냥단`);
}

export function MyPageScreen({
  profile,
  badges,
  myCats,
  user,
  collectionSummary,
  neighborhoodName,
  isSigningOut,
  isWithdrawing,
  isSavingFeaturedCats = false,
  onLogout,
  onWithdrawAccount,
  onOpenCat,
  onOpenBadges,
  onOpenCommunityPosts,
  onOpenExplorationHistory,
  onOpenNotifications,
  onOpenProfileEdit,
  onSaveFeaturedCats,
}: MyPageScreenProps) {
  const [isRankGuideOpen, setIsRankGuideOpen] = useState(false);
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);
  const [isFeaturedManagerOpen, setIsFeaturedManagerOpen] = useState(false);
  const badgeCatalog = badges.length > 0 ? badges : DEFAULT_BADGE_CATALOG.map((badge) => ({ ...badge, achieved: false }));
  const achievedBadges = badgeCatalog.filter((badge) => badge.achieved);
  const displayBadges = achievedBadges.length > 0 ? achievedBadges.slice(0, 4) : badgeCatalog.slice(0, 4);
  const selectedFeaturedCatIds = collectionSummary.featuredCats.map((cat) => cat.id);
  const featuredCats = collectionSummary.featuredCats.length > 0 ? collectionSummary.featuredCats.slice(0, 3) : myCats.slice(0, 3);
  const employeeRank = profile.title;
  const localizedEmployeeRank = formatNeighborhoodRank(neighborhoodName, employeeRank);
  const localizedNextLevelLabel = formatNeighborhoodGoal(profile.nextLevelLabel, neighborhoodName);
  const employeeNumber = getEmployeeNumber(user);
  const isAccountActionDisabled = isSigningOut || isWithdrawing;

  const handleConfirmWithdrawal = async () => {
    try {
      await onWithdrawAccount();
      setIsWithdrawalOpen(false);
    } catch {
      // The app-level handler shows the user-facing error.
    }
  };

  const handleSaveFeaturedCats = async (catIds: string[]) => {
    await onSaveFeaturedCats(catIds);
    setIsFeaturedManagerOpen(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.idHeaderRow}>
        <View style={styles.idHeaderCopy}>
          <Text style={styles.idHeaderKicker}>NYANGNYANGDAN OFFICE</Text>
          <Text style={styles.idHeaderTitle}>냥냥단 사원증</Text>
        </View>
        <Pressable onPress={onOpenProfileEdit} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Settings color={theme.colors.primaryDark} size={20} />
        </Pressable>
      </View>

      <View style={styles.employeeCard}>
        <View style={styles.idCardTop}>
          <View style={styles.idBadge}>
            <IdCard color={theme.colors.primaryDark} size={16} />
            <Text style={styles.idBadgeText}>OFFICIAL ID</Text>
          </View>
          <View style={styles.securityMark}>
            <ShieldCheck color={theme.colors.accent} size={16} />
            <Text style={styles.securityText}>위치 보호</Text>
          </View>
        </View>

        <View style={styles.idProfileRow}>
          <View style={styles.idPhotoFrame}>
            <Image resizeMode="cover" source={user.profileImageUrl ? { uri: user.profileImageUrl } : illustrations.profile} style={styles.idPhoto} />
          </View>
          <View style={styles.idInfo}>
            <Text style={styles.idLabel}>냥냥단</Text>
            <Text numberOfLines={1} style={styles.idName}>
              {user.nickname}
            </Text>
            <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={1} style={styles.idRank}>
              {localizedEmployeeRank}
            </Text>
          </View>
        </View>

        <View style={styles.idMetaGrid}>
          <View style={styles.idMeta}>
            <Text style={styles.idMetaLabel}>사원번호</Text>
            <Text selectable style={styles.idMetaValue}>{employeeNumber}</Text>
          </View>
          <View style={styles.idMeta}>
            <Text style={styles.idMetaLabel}>담당 동네</Text>
            <Text numberOfLines={1} style={styles.idMetaValue}>{neighborhoodName}</Text>
          </View>
        </View>

        <Pressable onPress={() => setIsRankGuideOpen(true)} style={({ pressed }) => [styles.idProgressBlock, pressed && styles.pressed]}>
          <View style={styles.idProgressRow}>
            <View style={styles.idProgressLabelRow}>
              <Text style={styles.idProgressLabel}>다음 직급까지</Text>
              <Info color={theme.colors.primaryDark} size={14} />
            </View>
            <Text style={styles.idProgressValue}>{Math.round(profile.nextLevelProgress)}%</Text>
          </View>
          <ProgressBar value={profile.nextLevelProgress} />
          <Text numberOfLines={1} style={styles.idProgressCopy}>{localizedNextLevelLabel}</Text>
        </Pressable>

        <View style={styles.idPolicyStrip}>
          <Text style={styles.idPolicyText}>고양이 방해 금지 · 정확한 위치 보호 · 조용히 기록</Text>
        </View>
      </View>

      <View style={styles.statPanel}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>수집 임무</Text>
          <Text style={styles.statValue}>{profile.totalDiscoveries}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>재발견</Text>
          <Text style={styles.statValue}>{profile.rediscoveries}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>등록 고양이</Text>
          <Text style={styles.statValue}>{myCats.length}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>획득 배지</Text>
          <Text style={styles.statValue}>{collectionSummary.achievedBadgeCount}개</Text>
        </View>
      </View>

      <Pressable accessibilityLabel="전체 배지북 보기" accessibilityRole="button" onPress={onOpenBadges} style={({ pressed }) => [styles.badgePanel, pressed && styles.pressed]}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>획득 배지</Text>
          <View style={styles.panelAction}>
            <Text style={styles.panelCount}>{collectionSummary.achievedBadgeCount} / {badgeCatalog.length}</Text>
            <ChevronRight color={theme.colors.accent} size={15} />
          </View>
        </View>
        <View style={styles.badgeRow}>
          {displayBadges.map((badge, index) => (
            <View key={badge.id} style={styles.badgeItem}>
              <View style={[styles.badgeCircle, !badge.achieved && styles.badgeCircleLocked]}>
                <Text style={styles.badgeEmoji}>{badgeIcons[index] ?? '🏅'}</Text>
              </View>
              <Text numberOfLines={1} style={styles.badgeLabel}>
                {badge.name}
              </Text>
            </View>
          ))}
        </View>
      </Pressable>

      <View style={styles.featuredPanel}>
        <View style={styles.featuredPanelHeader}>
          <View style={styles.featuredHeaderCopy}>
            <View style={styles.featuredTitleRow}>
              <Star color={theme.colors.accent} size={16} />
              <Text style={styles.featuredPanelTitle}>우리 도감 주인공</Text>
            </View>
            <Text style={styles.featuredPanelText}>
              {selectedFeaturedCatIds.length > 0 ? `${selectedFeaturedCatIds.length}마리를 대표로 설정했어요.` : '대표 고양이를 고르면 홈과 MY에 먼저 보여요.'}
            </Text>
          </View>
          <Pressable accessibilityLabel="대표 고양이 관리" accessibilityRole="button" onPress={() => setIsFeaturedManagerOpen(true)} style={({ pressed }) => [styles.featuredManageButton, pressed && styles.pressed]}>
            <Text style={styles.featuredManageText}>관리</Text>
          </Pressable>
        </View>

        {featuredCats.length > 0 ? (
          <View style={styles.featuredRow}>
            {featuredCats.map((cat) => (
              <Pressable key={cat.id} onPress={() => onOpenCat(cat.id)} style={({ pressed }) => [styles.featuredCat, pressed && styles.pressed]}>
                <Image resizeMode="cover" source={catImage(cat)} style={styles.featuredImage} />
                <Text numberOfLines={1} style={styles.featuredName}>
                  {cat.name}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyFeaturedCard}>
            <Text style={styles.emptyFeaturedTitle}>등록된 고양이가 없어요</Text>
            <Text style={styles.emptyFeaturedText}>촬영 화면에서 첫 고양이를 등록하면 대표로 고를 수 있어요.</Text>
          </View>
        )}
      </View>

      <View style={styles.menuPanel}>
        <MenuItem icon={BookOpen} label="근무 기록" onPress={onOpenExplorationHistory} />
        <MenuItem icon={MessageCircle} label="내 게시글" onPress={onOpenCommunityPosts} />
        <MenuItem icon={Bell} label="알림 설정" onPress={onOpenNotifications} />
        <MenuItem disabled={isAccountActionDisabled} icon={LogOut} label={isSigningOut ? '로그아웃 중...' : '로그아웃'} onPress={onLogout} />
        <MenuItem
          disabled={isAccountActionDisabled}
          icon={Trash2}
          label={isWithdrawing ? '탈퇴 처리 중...' : '회원탈퇴'}
          onPress={() => setIsWithdrawalOpen(true)}
          tone="danger"
        />
      </View>

      <FeaturedCatManager
        cats={myCats}
        isSaving={isSavingFeaturedCats}
        onClose={() => setIsFeaturedManagerOpen(false)}
        onSave={handleSaveFeaturedCats}
        selectedCatIds={selectedFeaturedCatIds}
        visible={isFeaturedManagerOpen}
      />

      <Modal animationType="fade" onRequestClose={() => setIsRankGuideOpen(false)} transparent visible={isRankGuideOpen}>
        <View style={styles.modalBackdrop}>
          <View style={styles.rankModal}>
            <View style={styles.rankModalHeader}>
              <View>
                <Text style={styles.rankModalKicker}>냥냥단 인사팀</Text>
                <Text style={styles.rankModalTitle}>직급 기준</Text>
              </View>
              <Pressable accessibilityLabel="직급 기준 닫기" onPress={() => setIsRankGuideOpen(false)} style={styles.modalCloseButton}>
                <X color={theme.colors.primaryDark} size={20} />
              </Pressable>
            </View>

            <View style={styles.currentRankCard}>
              <Text style={styles.currentRankLabel}>현재 직급</Text>
              <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={1} style={styles.currentRankTitle}>
                {localizedEmployeeRank}
              </Text>
              <Text style={styles.currentRankGoal}>{localizedNextLevelLabel}</Text>
              <ProgressBar value={profile.nextLevelProgress} />
            </View>

            <ScrollView contentContainerStyle={styles.rankList} showsVerticalScrollIndicator={false}>
              {NYANGNYANGDAN_RANK_RULES.map((rule) => {
                const isCurrent = rule.level === profile.level;
                const isAchieved = rule.level < profile.level;

                return (
                  <View key={rule.level} style={[styles.rankRuleRow, isCurrent && styles.rankRuleRowCurrent]}>
                    <View style={[styles.rankRuleMarker, (isCurrent || isAchieved) && styles.rankRuleMarkerActive]}>
                      <Text style={styles.rankRuleMarkerText}>{isAchieved ? '✓' : isCurrent ? '●' : ''}</Text>
                    </View>
                    <View style={styles.rankRuleCopy}>
                      <Text style={[styles.rankRuleTitle, isCurrent && styles.rankRuleTitleCurrent]}>
                        {formatNeighborhoodRank(neighborhoodName, rule.title)}
                      </Text>
                      <Text style={styles.rankRuleSummary}>{rule.summary}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" onRequestClose={() => setIsWithdrawalOpen(false)} transparent visible={isWithdrawalOpen}>
        <View style={styles.modalBackdrop}>
          <View style={styles.withdrawalModal}>
            <View style={styles.rankModalHeader}>
              <View style={styles.withdrawalHeaderCopy}>
                <Text style={styles.withdrawalKicker}>ACCOUNT WITHDRAWAL</Text>
                <Text style={styles.rankModalTitle}>회원탈퇴</Text>
              </View>
              <Pressable accessibilityLabel="회원탈퇴 닫기" disabled={isWithdrawing} onPress={() => setIsWithdrawalOpen(false)} style={styles.modalCloseButton}>
                <X color={theme.colors.primaryDark} size={20} />
              </Pressable>
            </View>

            <Text style={styles.withdrawalLead}>탈퇴하면 계정 복구가 어렵고, 냥도감 활동 내역이 삭제돼요.</Text>

            <View style={styles.withdrawalNotice}>
              <Text style={styles.withdrawalNoticeItem}>프로필, 이메일, 푸시토큰, 사원증 정보가 삭제됩니다.</Text>
              <Text style={styles.withdrawalNoticeItem}>내 도감, 관찰 기록, 배지, 알림 설정, 업로드한 이미지를 정리합니다.</Text>
              <Text style={styles.withdrawalNoticeItem}>작성한 동네 이야기와 댓글도 계정과 함께 삭제됩니다.</Text>
              <Text style={styles.withdrawalNoticeItem}>법령상 보존 의무가 있는 기록은 해당 기간 동안 분리 보관될 수 있습니다.</Text>
            </View>

            <View style={styles.withdrawalActions}>
              <Pressable disabled={isWithdrawing} onPress={() => setIsWithdrawalOpen(false)} style={({ pressed }) => [styles.withdrawalCancelButton, pressed && styles.pressed]}>
                <Text style={styles.withdrawalCancelText}>취소</Text>
              </Pressable>
              <Pressable disabled={isWithdrawing} onPress={handleConfirmWithdrawal} style={({ pressed }) => [styles.withdrawalConfirmButton, pressed && styles.pressed, isWithdrawing && styles.disabled]}>
                <Text style={styles.withdrawalConfirmText}>{isWithdrawing ? '처리 중...' : '회원탈퇴'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

interface MenuItemProps {
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  onPress?: () => void;
  tone?: 'default' | 'danger';
}

function MenuItem({ disabled = false, icon: Icon, label, onPress, tone = 'default' }: MenuItemProps) {
  const color = tone === 'danger' ? '#B55345' : theme.colors.primaryDark;

  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.menuItem, pressed && styles.pressed, disabled && styles.disabled]}>
      <Icon color={color} size={18} />
      <Text style={[styles.menuLabel, tone === 'danger' && styles.menuLabelDanger]}>{label}</Text>
      <ChevronRight color={theme.colors.mutedText} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 132,
  },
  idHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  idHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  idHeaderKicker: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: '900',
  },
  idHeaderTitle: {
    marginTop: 3,
    color: theme.colors.text,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '900',
  },
  employeeCard: {
    overflow: 'hidden',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    backgroundColor: '#FFF6E8',
    borderWidth: 1,
    borderColor: 'rgba(201,121,73,0.24)',
    ...createShadow(9),
  },
  idCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  idBadge: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: 'rgba(255,253,246,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.14)',
  },
  idBadgeText: {
    color: theme.colors.primaryDark,
    fontSize: 10,
    fontWeight: '900',
  },
  securityMark: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: 'rgba(221,232,200,0.68)',
  },
  securityText: {
    color: theme.colors.inkSoft,
    fontSize: 10,
    fontWeight: '900',
  },
  idProfileRow: {
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  idPhotoFrame: {
    width: 94,
    height: 112,
    borderRadius: 18,
    padding: 6,
    backgroundColor: 'rgba(255,253,246,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.16)',
  },
  idPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 13,
    backgroundColor: theme.colors.surfaceAlt,
  },
  idInfo: {
    flex: 1,
    minWidth: 0,
  },
  idLabel: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '900',
  },
  idName: {
    marginTop: 4,
    color: theme.colors.text,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
  },
  idRank: {
    marginTop: 5,
    color: theme.colors.primaryDark,
    fontSize: 14,
    fontWeight: '900',
  },
  idMetaGrid: {
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  idMeta: {
    flex: 1,
    minWidth: 0,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(255,253,246,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.72)',
  },
  idMetaLabel: {
    color: theme.colors.mutedText,
    fontSize: 10,
    fontWeight: '800',
  },
  idMetaValue: {
    marginTop: 4,
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  idProgressBlock: {
    marginTop: theme.spacing.md,
    gap: 7,
    borderRadius: theme.radius.md,
  },
  idProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  idProgressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  idProgressLabel: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  idProgressValue: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '900',
  },
  idProgressCopy: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '700',
  },
  idPolicyStrip: {
    marginTop: theme.spacing.md,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: 'rgba(221,232,200,0.5)',
  },
  idPolicyText: {
    color: theme.colors.inkSoft,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  profileRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: 'rgba(201,121,73,0.2)',
  },
  profileCopy: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nickname: {
    flex: 1,
    minWidth: 0,
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
  },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statPanel: {
    marginTop: theme.spacing.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
    ...createShadow(7),
  },
  statItem: {
    flexBasis: '47.5%',
    flexGrow: 1,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(255,248,236,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.62)',
    paddingHorizontal: theme.spacing.sm,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.mutedText,
  },
  statValue: {
    marginTop: theme.spacing.sm,
    fontSize: 21,
    fontWeight: '800',
    color: theme.colors.text,
  },
  badgePanel: {
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelAction: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 17,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.sm,
    backgroundColor: 'rgba(221,232,200,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(111,131,77,0.18)',
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  panelCount: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  badgeRow: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  badgeItem: {
    flex: 1,
    alignItems: 'center',
  },
  badgeCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1C57C',
    borderWidth: 2,
    borderColor: '#C9954A',
  },
  badgeCircleLocked: {
    opacity: 0.55,
  },
  badgeEmoji: {
    fontSize: 26,
  },
  badgeLabel: {
    marginTop: theme.spacing.sm,
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    textAlign: 'center',
  },
  featuredPanel: {
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
  },
  featuredPanelHeader: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  featuredHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  featuredTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featuredPanelTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  featuredPanelText: {
    marginTop: 5,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  featuredManageButton: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.primaryDark,
  },
  featuredManageText: {
    color: '#FFF8F0',
    fontSize: 12,
    fontWeight: '900',
  },
  featuredRow: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  featuredCat: {
    flex: 1,
    minWidth: 0,
    borderRadius: theme.radius.md,
    padding: 6,
    backgroundColor: 'rgba(255,253,246,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
  },
  featuredImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: theme.radius.sm,
  },
  featuredName: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.text,
  },
  emptyFeaturedCard: {
    marginTop: theme.spacing.md,
    minHeight: 82,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,248,236,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.62)',
  },
  emptyFeaturedTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  emptyFeaturedText: {
    marginTop: 5,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  menuPanel: {
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
  },
  menuItem: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139,112,83,0.14)',
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  menuLabelDanger: {
    color: '#B55345',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(47,36,29,0.36)',
  },
  rankModal: {
    maxHeight: '82%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: 34,
    backgroundColor: '#FFF8EC',
  },
  withdrawalModal: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: 34,
    backgroundColor: '#FFF8EC',
  },
  rankModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  rankModalKicker: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: '900',
  },
  rankModalTitle: {
    marginTop: 3,
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  withdrawalHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  withdrawalKicker: {
    color: '#B55345',
    fontSize: 11,
    fontWeight: '900',
  },
  withdrawalLead: {
    marginTop: theme.spacing.lg,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '900',
  },
  withdrawalNotice: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: '#FFF0EA',
    borderWidth: 1,
    borderColor: 'rgba(181,83,69,0.2)',
  },
  withdrawalNoticeItem: {
    color: theme.colors.inkSoft,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
  withdrawalActions: {
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  withdrawalCancelButton: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(255,253,246,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.16)',
  },
  withdrawalCancelText: {
    color: theme.colors.primaryDark,
    fontSize: 14,
    fontWeight: '900',
  },
  withdrawalConfirmButton: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: '#B55345',
  },
  withdrawalConfirmText: {
    color: '#FFF8F0',
    fontSize: 14,
    fontWeight: '900',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,253,246,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.14)',
  },
  currentRankCard: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    backgroundColor: '#FFF0DC',
    borderWidth: 1,
    borderColor: 'rgba(201,121,73,0.22)',
  },
  currentRankLabel: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
  },
  currentRankTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  currentRankGoal: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
  },
  rankList: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  rankRuleRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(255,253,246,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.72)',
  },
  rankRuleRowCurrent: {
    backgroundColor: 'rgba(221,232,200,0.66)',
    borderColor: 'rgba(97,122,67,0.22)',
  },
  rankRuleMarker: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(248,234,210,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
  },
  rankRuleMarkerActive: {
    backgroundColor: theme.colors.primaryDark,
  },
  rankRuleMarkerText: {
    color: '#FFF8F0',
    fontSize: 12,
    fontWeight: '900',
  },
  rankRuleCopy: {
    flex: 1,
    minWidth: 0,
  },
  rankRuleTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  rankRuleTitleCurrent: {
    color: theme.colors.primaryDark,
  },
  rankRuleSummary: {
    marginTop: 3,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.5,
  },
});
