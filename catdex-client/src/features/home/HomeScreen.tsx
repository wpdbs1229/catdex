import {
  Award,
  Bell,
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Heart,
  IdCard,
  LocateFixed,
  MapPin,
  PawPrint,
  Star,
  Trash2,
  UserRound,
} from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { createShadow, theme } from '@/shared/styles/theme';
import type { AuthUser } from '@/shared/types/auth';
import type { Badge, ExplorerProfile } from '@/shared/types/badge';
import type { Cat, DexProgress, HomeSummary } from '@/shared/types/cat';
import type { CollectionSummary } from '@/shared/types/collection';
import { MAX_SAVED_NEIGHBORHOODS, type SavedNeighborhood } from '@/shared/types/neighborhood';
import { getCatIllustrationKey, type CatIllustrationKey } from '@/shared/utils/catPresentation';

interface HomeScreenProps {
  badges: Badge[];
  collectionSummary: CollectionSummary;
  currentUser: AuthUser | null;
  dexProgress: DexProgress;
  favoriteCats: Cat[];
  profile: ExplorerProfile;
  summary: HomeSummary;
  recentCats: Cat[];
  neighborhoodName: string;
  activeNeighborhoodId: string;
  neighborhoodCatCounts: Record<string, number>;
  savedNeighborhoods: SavedNeighborhood[];
  isDetectingNeighborhood: boolean;
  onOpenCat: (catId: string) => void;
  onOpenBadges: () => void;
  onGoCapture: () => void;
  onGoDex: () => void;
  onOpenNotifications: () => void;
  onDetectNeighborhood: () => void;
  onSelectNeighborhood: (neighborhoodId: string) => void;
  onRemoveNeighborhood: (neighborhoodId: string) => void;
}

const illustrations = {
  titleCat: require('../../../assets/illustrations/home-title-catdex-book.png'),
  profileAvatar: require('../../../assets/illustrations/default-profile-avatar.png'),
  orange: require('../../../assets/illustrations/cat-orange-clean.png'),
  dark: require('../../../assets/illustrations/cat-dark-clean.png'),
  tuxedo: require('../../../assets/illustrations/cat-tuxedo-clean.png'),
  gray: require('../../../assets/illustrations/cat-gray-clean.png'),
} satisfies Record<'titleCat' | 'profileAvatar' | CatIllustrationKey, ImageSourcePropType>;

function getCatImage(cat: Cat): ImageSourcePropType {
  if (cat.imageUrl) {
    return { uri: cat.imageUrl };
  }

  return illustrations[getCatIllustrationKey(cat.type)];
}

function percent(value: number, total: number) {
  return Math.min(100, Math.round((Math.max(0, value) / Math.max(1, total)) * 100));
}

export function HomeScreen({
  badges,
  collectionSummary,
  currentUser,
  dexProgress,
  favoriteCats,
  profile,
  summary,
  recentCats,
  neighborhoodName,
  activeNeighborhoodId,
  neighborhoodCatCounts,
  savedNeighborhoods,
  isDetectingNeighborhood,
  onOpenCat,
  onOpenBadges,
  onOpenNotifications,
  onGoCapture,
  onGoDex,
  onDetectNeighborhood,
  onSelectNeighborhood,
  onRemoveNeighborhood,
}: HomeScreenProps) {
  const [isNeighborhoodPanelOpen, setIsNeighborhoodPanelOpen] = useState(false);
  const earnedBadges = badges.filter((badge) => badge.achieved);
  const displayedBadges = earnedBadges.slice(0, 3);
  // 내 수집 기록 기준의 재발견 횟수만 사용한다.
  // (recentCats의 encounterCount는 공유 도감의 전체 만남 횟수라 다른 사용자의
  // 기록까지 섞여 값이 부풀려진다.)
  const rediscoveryCount = profile.rediscoveries;
  const completionPercent = percent(dexProgress.collected, dexProgress.total);
  const hasFavoriteCats = favoriteCats.length > 0;
  const featuredCats = hasFavoriteCats ? favoriteCats.slice(0, 3) : recentCats.slice(0, 3);
  const displayName = currentUser?.nickname ?? '냥냥단';
  const avatarSource: ImageSourcePropType = currentUser?.profileImageUrl
    ? { uri: currentUser.profileImageUrl }
    : illustrations.profileAvatar;
  const collectionStats = [
    { label: '수집한 고양이', value: `${summary.myTotalCollected}마리` },
    { label: '이번 주 기록', value: `${summary.myWeeklyCollected}마리` },
    { label: '다시 만남', value: `${rediscoveryCount}번` },
    { label: '획득 배지', value: `${earnedBadges.length}개` },
  ];
  const officerStats = [
    { label: '직급', value: profile.title },
    { label: '도감', value: `${dexProgress.collected}/${dexProgress.total}` },
    { label: '배지', value: `${collectionSummary.achievedBadgeCount || earnedBadges.length}` },
  ];

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.logoWrap}>
          <Text style={styles.logo}>냥도감</Text>
          <Image resizeMode="contain" source={illustrations.titleCat} style={styles.headerCat} />
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setIsNeighborhoodPanelOpen((current) => !current)}
            style={({ pressed }) => [styles.locationPill, pressed && styles.pressed]}
          >
            <MapPin color={theme.colors.accent} size={15} />
            <Text numberOfLines={1} style={styles.locationText}>
              {neighborhoodName}
            </Text>
            <ChevronDown color={theme.colors.primaryDark} size={14} />
          </Pressable>
          <Pressable
            accessibilityLabel="알림함 열기"
            accessibilityRole="button"
            onPress={onOpenNotifications}
            style={({ pressed }) => [styles.bellButton, pressed && styles.pressed]}
          >
            <Bell color={theme.colors.primaryDark} size={18} />
            <View style={styles.noticeDot} />
          </Pressable>
        </View>
      </View>

      {isNeighborhoodPanelOpen ? (
        <View style={styles.neighborhoodPanel}>
          <View style={styles.neighborhoodPanelHeader}>
            <View style={styles.neighborhoodPanelTitleBlock}>
              <Text style={styles.neighborhoodPanelKicker}>내 동네</Text>
              <Text style={styles.neighborhoodPanelTitle}>현재 활동 동네를 바꿔요</Text>
            </View>
            <View style={styles.neighborhoodCountBadge}>
              <Text style={styles.neighborhoodCountText}>
                {savedNeighborhoods.length}/{MAX_SAVED_NEIGHBORHOODS}
              </Text>
            </View>
          </View>

          <Pressable
            disabled={isDetectingNeighborhood}
            onPress={onDetectNeighborhood}
            style={({ pressed }) => [
              styles.detectNeighborhoodButton,
              isDetectingNeighborhood && styles.detectNeighborhoodButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            <LocateFixed color="#FFF8F0" size={18} />
            <Text style={styles.detectNeighborhoodText}>
              {isDetectingNeighborhood ? '현재 위치 확인 중' : '현재 위치로 동네 추가'}
            </Text>
          </Pressable>

          <View style={styles.neighborhoodList}>
            {savedNeighborhoods.length === 0 ? (
              <View style={styles.neighborhoodEmptyState}>
                <MapPin color={theme.colors.primaryDark} size={20} />
                <View style={styles.neighborhoodEmptyCopy}>
                  <Text style={styles.neighborhoodEmptyTitle}>아직 추가된 동네가 없어요</Text>
                  <Text style={styles.neighborhoodEmptyText}>현재 위치로 동네를 추가해 시작해 주세요.</Text>
                </View>
              </View>
            ) : (
              savedNeighborhoods.map((neighborhood) => {
                const isActive = neighborhood.id === activeNeighborhoodId;
                const canRemove = true;
                const catCount = neighborhoodCatCounts[neighborhood.id] ?? 0;

                return (
                  <Pressable
                    key={neighborhood.id}
                    onPress={() => onSelectNeighborhood(neighborhood.id)}
                    style={({ pressed }) => [
                      styles.neighborhoodRow,
                      isActive && styles.neighborhoodRowActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={[styles.neighborhoodRowIcon, isActive && styles.neighborhoodRowIconActive]}>
                      {isActive ? (
                        <CheckCircle2 color="#FFF8F0" size={17} />
                      ) : (
                        <MapPin color={theme.colors.primaryDark} size={17} />
                      )}
                    </View>
                    <View style={styles.neighborhoodRowCopy}>
                      <Text numberOfLines={1} style={styles.neighborhoodRowName}>
                        {neighborhood.name}
                      </Text>
                      <Text numberOfLines={1} style={styles.neighborhoodRowMeta}>
                        {neighborhood.city} {neighborhood.district}
                      </Text>
                    </View>
                    <Text style={styles.neighborhoodCatCount}>{catCount}마리</Text>
                    <Pressable
                      disabled={!canRemove}
                      onPress={(event) => {
                        event.stopPropagation();
                        onRemoveNeighborhood(neighborhood.id);
                      }}
                      style={({ pressed }) => [
                        styles.removeNeighborhoodButton,
                        !canRemove && styles.removeNeighborhoodButtonDisabled,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Trash2 color={canRemove ? '#9B5B42' : '#CCBBA5'} size={16} />
                    </Pressable>
                  </Pressable>
                );
              })
            )}
          </View>

          <Text style={styles.neighborhoodPolicyText}>
            목록에서 제거해도 고양이와 촬영 기록은 남고, 빠른 전환 동네에서만 빠져요.
          </Text>
        </View>
      ) : null}

      <Card style={styles.officerCard}>
        <View style={styles.officerHeader}>
          <View style={styles.avatarFrame}>
            <Image resizeMode="cover" source={avatarSource} style={styles.avatarImage} />
          </View>
          <View style={styles.officerCopy}>
            <View style={styles.officerKickerRow}>
              <IdCard color={theme.colors.primary} size={15} />
              <Text style={styles.officerKicker}>냥냥단 사원증</Text>
            </View>
            <Text numberOfLines={1} style={styles.officerName}>
              {displayName}
            </Text>
            <Text numberOfLines={1} style={styles.officerMeta}>
              {neighborhoodName} 근무
            </Text>
          </View>
        </View>

        <View style={styles.officerStatRow}>
          {officerStats.map((stat) => (
            <View key={stat.label} style={styles.officerStat}>
              <Text style={styles.officerStatLabel}>{stat.label}</Text>
              <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={1} style={styles.officerStatValue}>
                {stat.value}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.ctaRow}>
          <View style={styles.primaryCta}>
            <Button onPress={onGoCapture}>
              <Camera color="#FFF8F0" size={18} />
              <Text style={styles.primaryButtonText}>오늘 본 냥이 기록</Text>
            </Button>
          </View>
          <Pressable onPress={onGoDex} style={({ pressed }) => [styles.secondaryCta, pressed && styles.pressed]}>
            <BookOpen color={theme.colors.primaryDark} size={18} />
            <Text style={styles.secondaryCtaText}>도감</Text>
          </Pressable>
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionKicker}>내 냥도감</Text>
          <Text style={styles.sectionTitle}>수집 현황</Text>
        </View>
        <Text style={styles.sectionCounter}>{completionPercent}%</Text>
      </View>

      <Card style={styles.progressCard}>
        <View style={styles.progressTopRow}>
          <View style={styles.progressIcon}>
            <PawPrint color={theme.colors.primaryDark} size={20} />
          </View>
          <View style={styles.progressCopy}>
            <Text style={styles.progressTitle}>
              {dexProgress.collected}마리 수집했어요
            </Text>
            <Text style={styles.progressText}>
              이번 주에는 {summary.myWeeklyCollected}마리를 새로 도감에 남겼어요.
            </Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${completionPercent}%` }]} />
        </View>
        <View style={styles.statGrid}>
          {collectionStats.map((stat) => (
            <View key={stat.label} style={styles.statTile}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text numberOfLines={1} style={styles.statLabel}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionKicker}>관심 고양이</Text>
          <Text style={styles.sectionTitle}>{hasFavoriteCats ? '즐겨찾기한 고양이' : '최근 등록한 고양이'}</Text>
        </View>
        <Pressable onPress={onGoDex} style={({ pressed }) => [styles.headerLink, pressed && styles.pressed]}>
          <Text style={styles.headerLinkText}>전체</Text>
          <ChevronRight color={theme.colors.primaryDark} size={16} />
        </Pressable>
      </View>

      <View style={styles.catStack}>
        {featuredCats.length > 0 ? (
          featuredCats.map((cat) => (
            <Pressable key={cat.id} onPress={() => onOpenCat(cat.id)} style={({ pressed }) => [styles.catCard, pressed && styles.pressed]}>
              <View style={styles.catImagePaper}>
                <Image resizeMode="contain" source={getCatImage(cat)} style={styles.catImage} />
              </View>
              <View style={styles.catCopy}>
                <View style={styles.catTitleRow}>
                  {hasFavoriteCats ? <Heart color="#C86D5B" fill="#C86D5B" size={15} /> : <Star color={theme.colors.warning} size={15} />}
                  <Text numberOfLines={1} style={styles.catName}>
                    {cat.name}
                  </Text>
                </View>
                <Text numberOfLines={1} style={styles.catMeta}>
                  {cat.relationshipLevel} · 최근 {cat.lastSeenAt}
                </Text>
              </View>
            </Pressable>
          ))
        ) : (
          <View style={styles.emptyRecent}>
            <PawPrint color="#D4B989" size={30} />
            <Text style={styles.emptyRecentTitle}>아직 등록한 고양이가 없어요</Text>
            <Text style={styles.emptyRecentText}>첫 고양이를 기록하면 홈에 바로 올라와요.</Text>
          </View>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionKicker}>내 업적</Text>
          <Text style={styles.sectionTitle}>얻은 배지</Text>
        </View>
        <Pressable accessibilityLabel="전체 배지 보기" accessibilityRole="button" onPress={onOpenBadges} style={({ pressed }) => [styles.headerLink, pressed && styles.pressed]}>
          <Text style={styles.headerLinkText}>{earnedBadges.length}개</Text>
          <ChevronRight color={theme.colors.primaryDark} size={15} />
        </Pressable>
      </View>

      <Card style={styles.badgeCard}>
        {displayedBadges.length > 0 ? (
          <View style={styles.badgeList}>
            {displayedBadges.map((badge) => (
              <View key={badge.id} style={styles.badgeItem}>
                <View style={styles.badgeIcon}>
                  <Award color={theme.colors.primaryDark} size={18} />
                </View>
                <View style={styles.badgeCopy}>
                  <Text numberOfLines={1} style={styles.badgeName}>
                    {badge.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.badgeMeta}>
                    {badge.achievedAt ? `${badge.achievedAt} 획득` : badge.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyBadge}>
            <Award color="#D4B989" size={28} />
            <Text style={styles.emptyBadgeTitle}>아직 획득한 배지가 없어요</Text>
            <Text style={styles.emptyBadgeText}>첫 기록을 남기면 배지가 이곳에 쌓여요.</Text>
          </View>
        )}

        <View style={styles.nextGoal}>
          <View style={styles.nextGoalIcon}>
            <UserRound color={theme.colors.accent} size={17} />
          </View>
          <View style={styles.nextGoalCopy}>
            <Text style={styles.nextGoalTitle}>다음 목표</Text>
            <Text style={styles.nextGoalText}>{profile.nextLevelLabel}</Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 132,
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  logoWrap: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logo: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: theme.typography.titleWeight,
    letterSpacing: 0,
  },
  headerCat: {
    width: 38,
    height: 36,
    marginTop: 1,
  },
  headerActions: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  locationPill: {
    maxWidth: 170,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 18,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.13)',
  },
  locationText: {
    flexShrink: 1,
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
  bellButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeDot: {
    position: 'absolute',
    top: 8,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#D96D45',
  },
  neighborhoodPanel: {
    gap: theme.spacing.md,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.14)',
    ...createShadow(5),
  },
  neighborhoodPanelHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  neighborhoodPanelTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  neighborhoodPanelKicker: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  neighborhoodPanelTitle: {
    marginTop: 3,
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 23,
  },
  neighborhoodCountBadge: {
    minWidth: 48,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceAlt,
  },
  neighborhoodCountText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  detectNeighborhoodButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.accent,
  },
  detectNeighborhoodButtonDisabled: {
    opacity: 0.68,
  },
  detectNeighborhoodText: {
    flexShrink: 1,
    color: '#FFF8F0',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  neighborhoodList: {
    gap: theme.spacing.sm,
  },
  neighborhoodEmptyState: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: 'rgba(248,234,210,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(230,211,183,0.66)',
  },
  neighborhoodEmptyCopy: {
    flex: 1,
    minWidth: 0,
  },
  neighborhoodEmptyTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  neighborhoodEmptyText: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  neighborhoodRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(248,234,210,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(230,211,183,0.66)',
  },
  neighborhoodRowActive: {
    backgroundColor: 'rgba(221,232,200,0.72)',
    borderColor: 'rgba(97,122,67,0.25)',
  },
  neighborhoodRowIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: theme.colors.surface,
  },
  neighborhoodRowIconActive: {
    backgroundColor: theme.colors.accent,
  },
  neighborhoodRowCopy: {
    flex: 1,
    minWidth: 0,
  },
  neighborhoodRowName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  neighborhoodRowMeta: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '700',
  },
  neighborhoodCatCount: {
    minWidth: 42,
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'right',
  },
  removeNeighborhoodButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#FFF4E4',
  },
  removeNeighborhoodButtonDisabled: {
    backgroundColor: 'rgba(255,244,228,0.5)',
  },
  neighborhoodPolicyText: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  officerCard: {
    gap: theme.spacing.lg,
    overflow: 'hidden',
    borderRadius: theme.radius.xxl,
    backgroundColor: 'rgba(255,253,246,0.78)',
  },
  officerHeader: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatarFrame: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 38,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 2,
    borderColor: 'rgba(185,121,75,0.18)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 76,
    height: 76,
  },
  officerCopy: {
    flex: 1,
    minWidth: 0,
  },
  officerKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  officerKicker: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  officerName: {
    marginTop: 6,
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0,
  },
  officerMeta: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '800',
  },
  officerStatRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  officerStat: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: 'rgba(248,234,210,0.54)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  officerStatLabel: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
  },
  officerStatValue: {
    marginTop: 4,
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  ctaRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  primaryCta: {
    flex: 1,
    minWidth: 0,
  },
  primaryButtonText: {
    flexShrink: 1,
    color: '#FFF8F0',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  secondaryCta: {
    width: 74,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: theme.radius.xl,
    backgroundColor: 'rgba(255,253,246,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.13)',
    ...createShadow(3),
  },
  secondaryCtaText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  sectionHeader: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  sectionKicker: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  sectionTitle: {
    marginTop: 3,
    color: theme.colors.text,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 0,
  },
  sectionCounter: {
    minWidth: 46,
    color: theme.colors.primaryDark,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  progressCard: {
    gap: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.7)',
  },
  progressTopRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  progressIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: theme.colors.badge,
  },
  progressCopy: {
    flex: 1,
    minWidth: 0,
  },
  progressTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  progressText: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  progressTrack: {
    height: 10,
    overflow: 'hidden',
    borderRadius: 5,
    backgroundColor: 'rgba(248,234,210,0.82)',
  },
  progressFill: {
    height: '100%',
    minWidth: 8,
    borderRadius: 5,
    backgroundColor: theme.colors.accent,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  statTile: {
    width: '48.5%',
    minHeight: 72,
    justifyContent: 'center',
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(248,234,210,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.09)',
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    marginTop: 5,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
  },
  headerLink: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 17,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.sm,
    backgroundColor: 'rgba(255,253,246,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
  },
  headerLinkText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  catStack: {
    gap: theme.spacing.sm,
  },
  catCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(255,253,246,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
    ...createShadow(4),
  },
  catImagePaper: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(248,234,210,0.62)',
  },
  catImage: {
    width: 66,
    height: 66,
  },
  catCopy: {
    flex: 1,
    minWidth: 0,
  },
  catTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  catName: {
    flex: 1,
    minWidth: 0,
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  catMeta: {
    marginTop: 5,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyRecent: {
    minHeight: 128,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.62)',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyRecentTitle: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyRecentText: {
    marginTop: 5,
    color: theme.colors.mutedText,
    fontSize: 13,
    textAlign: 'center',
  },
  badgeCard: {
    gap: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.7)',
  },
  badgeList: {
    gap: theme.spacing.sm,
  },
  badgeItem: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: 'rgba(248,234,210,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  badgeIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: theme.colors.badge,
  },
  badgeCopy: {
    flex: 1,
    minWidth: 0,
  },
  badgeName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  badgeMeta: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyBadge: {
    minHeight: 116,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(248,234,210,0.32)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  emptyBadgeTitle: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyBadgeText: {
    marginTop: 5,
    color: theme.colors.mutedText,
    fontSize: 13,
    textAlign: 'center',
  },
  nextGoal: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(221,232,200,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(97,122,67,0.16)',
  },
  nextGoalIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: 'rgba(255,253,246,0.72)',
  },
  nextGoalCopy: {
    flex: 1,
    minWidth: 0,
  },
  nextGoalTitle: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '900',
  },
  nextGoalText: {
    marginTop: 4,
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.84,
  },
});
