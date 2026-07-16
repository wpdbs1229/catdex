import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Award,
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Sparkles,
  Target,
  X,
} from 'lucide-react-native';
import { ProgressBar } from '@/shared/components/ProgressBar';
import { DEFAULT_BADGE_CATALOG } from '@/shared/constants/badge.constants';
import { createShadow, theme } from '@/shared/styles/theme';
import type { Badge, ExplorerProfile } from '@/shared/types/badge';
import type { Cat } from '@/shared/types/cat';

type BadgeFilter = 'earned' | 'inProgress' | 'all';

type BadgeCategory = 'record' | 'dex' | 'reunion' | 'neighborhood' | 'community' | 'season' | 'collection';

interface BadgeBookScreenProps {
  badges: Badge[];
  myCats: Cat[];
  profile: ExplorerProfile;
  neighborhoodName: string;
  onBack: () => void;
  onGoCapture: () => void;
  onGoDex: () => void;
  onGoMap: () => void;
}

interface BadgeProgress {
  current: number;
  target: number;
}

const filterOptions: Array<{ id: BadgeFilter; label: string }> = [
  { id: 'earned', label: '획득' },
  { id: 'inProgress', label: '도전중' },
  { id: 'all', label: '전체' },
];

const categoryOptions: Array<{ id: BadgeCategory | 'all'; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'record', label: '기록' },
  { id: 'dex', label: '도감' },
  { id: 'reunion', label: '재발견' },
  { id: 'neighborhood', label: '동네' },
  { id: 'community', label: '커뮤니티' },
  { id: 'season', label: '시즌' },
  { id: 'collection', label: '대표' },
];

const badgeIconMap: Record<string, string> = {
  'first-cat': '🐾',
  'first-sighting': '📍',
  'reunion-friend': '🔁',
  'familiar-friend': '👋',
  'regular-cat': '☕️',
  'longtime-friend': '🤎',
  'cheese-collector': '🧀',
  'tuxedo-detective': '🕵️',
  'calico-friend': '🌼',
  'old-town-wanderer': '🗺️',
  'neighborhood-regular': '🏘️',
  'careful-observer': '📝',
  'safety-reporter': '🛡️',
  'neighbor-verifier': '💬',
  'collection-starter': '🎨',
  'spring-alley-recorder': '🌱',
  'rainy-day-recorder': '☔️',
  'night-walk-watcher': '🌙',
  'month-later-reunion': '📆',
  'quiet-note-keeper': '🤫',
  'dex-10': '🔟',
  'dex-50': '⭐️',
  'rare-finder': '💎',
  'hundred-dex': '🏅',
};

const badgeCategoryById: Record<string, BadgeCategory> = {
  'first-cat': 'record',
  'first-sighting': 'community',
  'reunion-friend': 'reunion',
  'familiar-friend': 'reunion',
  'regular-cat': 'reunion',
  'longtime-friend': 'reunion',
  'cheese-collector': 'record',
  'tuxedo-detective': 'record',
  'calico-friend': 'record',
  'old-town-wanderer': 'neighborhood',
  'neighborhood-regular': 'neighborhood',
  'careful-observer': 'neighborhood',
  'safety-reporter': 'community',
  'neighbor-verifier': 'community',
  'collection-starter': 'collection',
  'spring-alley-recorder': 'season',
  'rainy-day-recorder': 'season',
  'night-walk-watcher': 'season',
  'month-later-reunion': 'reunion',
  'quiet-note-keeper': 'record',
  'dex-10': 'dex',
  'dex-50': 'dex',
  'rare-finder': 'record',
  'hundred-dex': 'dex',
};

const categoryLabels: Record<BadgeCategory, string> = {
  record: '기록',
  dex: '도감',
  reunion: '재발견',
  neighborhood: '동네',
  community: '커뮤니티',
  season: '시즌',
  collection: '대표',
};

function getBadgeCategory(badge: Badge) {
  return badgeCategoryById[badge.id] ?? 'record';
}

function getMaxEncounterCount(cats: Cat[]) {
  return cats.reduce((max, cat) => Math.max(max, cat.encounterCount), 0);
}

function countCatsByType(cats: Cat[], type: Cat['type']) {
  return cats.filter((cat) => cat.type === type).length;
}

function getBadgeProgress(badge: Badge, cats: Cat[], profile: ExplorerProfile): BadgeProgress | null {
  if (badge.achieved) {
    return { current: 1, target: 1 };
  }

  const maxEncounterCount = getMaxEncounterCount(cats);
  const rareCats = cats.filter((cat) => cat.rarity >= 4).length;

  switch (badge.id) {
    case 'first-cat':
      return { current: profile.totalDiscoveries, target: 1 };
    case 'reunion-friend':
      return { current: profile.rediscoveries, target: 1 };
    case 'familiar-friend':
      return { current: maxEncounterCount, target: 3 };
    case 'regular-cat':
      return { current: maxEncounterCount, target: 5 };
    case 'longtime-friend':
      return { current: maxEncounterCount, target: 10 };
    case 'cheese-collector':
      return { current: countCatsByType(cats, '치즈냥'), target: 3 };
    case 'tuxedo-detective':
      return { current: countCatsByType(cats, '턱시도'), target: 3 };
    case 'calico-friend':
      return { current: countCatsByType(cats, '삼색이'), target: 1 };
    case 'rare-finder':
      return { current: rareCats, target: 1 };
    case 'dex-10':
      return { current: profile.totalDiscoveries, target: 10 };
    case 'dex-50':
      return { current: profile.totalDiscoveries, target: 50 };
    case 'hundred-dex':
      return { current: profile.totalDiscoveries, target: 100 };
    default:
      return null;
  }
}

function getProgressPercent(progress: BadgeProgress | null, achieved: boolean) {
  if (achieved) {
    return 100;
  }

  if (!progress) {
    return 0;
  }

  return Math.min(99, Math.round((progress.current / Math.max(1, progress.target)) * 100));
}

function getBadgeStatus(badge: Badge, progress: BadgeProgress | null) {
  if (badge.achieved) {
    return '획득';
  }

  if (progress && progress.current > 0) {
    return '도전중';
  }

  return '잠김';
}

function getActionLabel(badge: Badge) {
  const category = getBadgeCategory(badge);

  if (badge.achieved) {
    return '도감 보러가기';
  }

  if (category === 'neighborhood' || category === 'community') {
    return '동네 보러가기';
  }

  if (category === 'dex') {
    return '도감 채우기';
  }

  return '기록하러 가기';
}

function sortBadges(badges: Badge[], cats: Cat[], profile: ExplorerProfile) {
  return [...badges].sort((left, right) => {
    if (left.achieved !== right.achieved) {
      return left.achieved ? -1 : 1;
    }

    const rightProgress = getProgressPercent(getBadgeProgress(right, cats, profile), right.achieved);
    const leftProgress = getProgressPercent(getBadgeProgress(left, cats, profile), left.achieved);

    return rightProgress - leftProgress || left.name.localeCompare(right.name);
  });
}

export function BadgeBookScreen({
  badges,
  myCats,
  profile,
  neighborhoodName,
  onBack,
  onGoCapture,
  onGoDex,
  onGoMap,
}: BadgeBookScreenProps) {
  const [activeFilter, setActiveFilter] = useState<BadgeFilter>('all');
  const [activeCategory, setActiveCategory] = useState<BadgeCategory | 'all'>('all');
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const badgeCatalog = useMemo<Badge[]>(
    () => (badges.length > 0 ? badges : DEFAULT_BADGE_CATALOG.map((badge) => ({ ...badge, achieved: false }))),
    [badges],
  );
  const achievedBadges = useMemo(() => badgeCatalog.filter((badge) => badge.achieved), [badgeCatalog]);
  const sortedBadges = useMemo(() => sortBadges(badgeCatalog, myCats, profile), [badgeCatalog, myCats, profile]);
  const nextBadge = useMemo(
    () =>
      sortedBadges.find((badge) => {
        const progress = getBadgeProgress(badge, myCats, profile);
        return !badge.achieved && progress && progress.current > 0;
      }) ?? sortedBadges.find((badge) => !badge.achieved),
    [myCats, profile, sortedBadges],
  );
  const recentBadge = achievedBadges[0] ?? null;

  const filteredBadges = sortedBadges.filter((badge) => {
    const progress = getBadgeProgress(badge, myCats, profile);
    const isInProgress = !badge.achieved && Boolean(progress && progress.current > 0);
    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'earned' && badge.achieved) ||
      (activeFilter === 'inProgress' && isInProgress);
    const matchesCategory = activeCategory === 'all' || getBadgeCategory(badge) === activeCategory;

    return matchesFilter && matchesCategory;
  });

  const selectedProgress = selectedBadge ? getBadgeProgress(selectedBadge, myCats, profile) : null;
  const selectedPercent = selectedBadge ? getProgressPercent(selectedProgress, selectedBadge.achieved) : 0;

  const handlePrimaryAction = (badge: Badge) => {
    setSelectedBadge(null);

    if (badge.achieved || getBadgeCategory(badge) === 'dex') {
      onGoDex();
      return;
    }

    if (getBadgeCategory(badge) === 'neighborhood' || getBadgeCategory(badge) === 'community') {
      onGoMap();
      return;
    }

    onGoCapture();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="이전 화면으로 돌아가기" accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <ChevronLeft color={theme.colors.primaryDark} size={20} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>NYANGNYANGDAN BADGE BOOK</Text>
          <Text style={styles.title}>냥냥단 배지북</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryPanel}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryLabel}>획득 배지</Text>
              <Text style={styles.summaryValue}>
                {achievedBadges.length} / {badgeCatalog.length}
              </Text>
            </View>
            <View style={styles.summarySeal}>
              <Award color={theme.colors.primaryDark} size={24} />
            </View>
          </View>
          <ProgressBar value={badgeCatalog.length > 0 ? (achievedBadges.length / badgeCatalog.length) * 100 : 0} />
          <Text style={styles.summaryHint}>{neighborhoodName}에서 남긴 기록이 배지로 쌓여요.</Text>
        </View>

        <View style={styles.focusRow}>
          <Pressable
            accessibilityLabel={recentBadge ? `최근 획득 배지 ${recentBadge.name}` : '최근 획득 배지 없음'}
            accessibilityRole="button"
            onPress={() => recentBadge && setSelectedBadge(recentBadge)}
            style={({ pressed }) => [styles.focusCard, pressed && recentBadge && styles.pressed]}
          >
            <View style={styles.focusIcon}>
              <CheckCircle2 color={theme.colors.success} size={18} />
            </View>
            <Text style={styles.focusLabel}>최근 획득</Text>
            <Text numberOfLines={1} style={styles.focusTitle}>{recentBadge?.name ?? '아직 없어요'}</Text>
            <Text numberOfLines={1} style={styles.focusMeta}>{recentBadge?.achievedAt ?? '첫 기록을 남겨보세요'}</Text>
          </Pressable>

          <Pressable
            accessibilityLabel={nextBadge ? `다음 목표 배지 ${nextBadge.name}` : '다음 목표 배지 없음'}
            accessibilityRole="button"
            onPress={() => nextBadge && setSelectedBadge(nextBadge)}
            style={({ pressed }) => [styles.focusCard, pressed && nextBadge && styles.pressed]}
          >
            <View style={styles.focusIcon}>
              <Target color={theme.colors.accent} size={18} />
            </View>
            <Text style={styles.focusLabel}>다음 목표</Text>
            <Text numberOfLines={1} style={styles.focusTitle}>{nextBadge?.name ?? '모두 획득'}</Text>
            <Text numberOfLines={1} style={styles.focusMeta}>
              {nextBadge ? `${getProgressPercent(getBadgeProgress(nextBadge, myCats, profile), nextBadge.achieved)}% 진행` : '완료'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.filterRow}>
          {filterOptions.map((option) => {
            const isActive = activeFilter === option.id;

            return (
              <Pressable
                accessibilityLabel={`${option.label} 배지 보기`}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                key={option.id}
                onPress={() => setActiveFilter(option.id)}
                style={({ pressed }) => [styles.filterChip, isActive && styles.filterChipActive, pressed && styles.pressed]}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView contentContainerStyle={styles.categoryRow} horizontal showsHorizontalScrollIndicator={false}>
          {categoryOptions.map((option) => {
            const isActive = activeCategory === option.id;

            return (
              <Pressable
                accessibilityLabel={`${option.label} 카테고리 배지 보기`}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                key={option.id}
                onPress={() => setActiveCategory(option.id)}
                style={({ pressed }) => [styles.categoryChip, isActive && styles.categoryChipActive, pressed && styles.pressed]}
              >
                <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.grid}>
          {filteredBadges.length > 0 ? (
            filteredBadges.map((badge) => {
              const progress = getBadgeProgress(badge, myCats, profile);
              const percent = getProgressPercent(progress, badge.achieved);
              const status = getBadgeStatus(badge, progress);

              return (
                <Pressable
                  accessibilityLabel={`${badge.name} 배지 ${status}`}
                  accessibilityRole="button"
                  key={badge.id}
                  onPress={() => setSelectedBadge(badge)}
                  style={({ pressed }) => [styles.badgeCard, !badge.achieved && styles.badgeCardLocked, pressed && styles.pressed]}
                >
                  <View style={styles.badgeCardHeader}>
                    <View style={[styles.badgeIcon, !badge.achieved && styles.badgeIconLocked]}>
                      <Text style={styles.badgeEmoji}>{badgeIconMap[badge.id] ?? '🏅'}</Text>
                    </View>
                    <View style={[styles.statusPill, badge.achieved ? styles.statusPillEarned : styles.statusPillLocked]}>
                      <Text style={[styles.statusText, badge.achieved && styles.statusTextEarned]}>{status}</Text>
                    </View>
                  </View>
                  <Text numberOfLines={1} style={styles.badgeName}>{badge.name}</Text>
                  <Text numberOfLines={2} style={styles.badgeDescription}>{badge.description}</Text>
                  {progress ? (
                    <View style={styles.cardProgress}>
                      <ProgressBar value={percent} />
                      <Text style={styles.progressText}>
                        {badge.achieved ? '획득 완료' : `${Math.min(progress.current, progress.target)} / ${progress.target}`}
                      </Text>
                    </View>
                  ) : (
                    <Text numberOfLines={1} style={styles.lockedHint}>조건을 확인해 보세요</Text>
                  )}
                </Pressable>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Sparkles color="#D4B989" size={28} />
              <Text style={styles.emptyTitle}>해당 배지가 아직 없어요</Text>
              <Text style={styles.emptyText}>다른 필터나 카테고리를 선택해 보세요.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal animationType="fade" onRequestClose={() => setSelectedBadge(null)} transparent visible={selectedBadge !== null}>
        <View style={styles.modalBackdrop}>
          {selectedBadge ? (
            <View style={styles.detailSheet}>
              <View style={styles.detailHeader}>
                <View style={[styles.detailIcon, !selectedBadge.achieved && styles.badgeIconLocked]}>
                  <Text style={styles.detailEmoji}>{badgeIconMap[selectedBadge.id] ?? '🏅'}</Text>
                </View>
                <Pressable accessibilityLabel="배지 상세 닫기" accessibilityRole="button" onPress={() => setSelectedBadge(null)} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
                  <X color={theme.colors.primaryDark} size={18} />
                </Pressable>
              </View>
              <Text style={styles.detailCategory}>{categoryLabels[getBadgeCategory(selectedBadge)]} 배지</Text>
              <Text style={styles.detailTitle}>{selectedBadge.name}</Text>
              <Text style={styles.detailDescription}>{selectedBadge.description}</Text>

              <View style={styles.detailProgressBox}>
                <View style={styles.detailProgressRow}>
                  <Text style={styles.detailProgressLabel}>{selectedBadge.achieved ? '획득 완료' : '진행도'}</Text>
                  <Text style={styles.detailProgressValue}>{selectedBadge.achieved ? selectedBadge.achievedAt : `${selectedPercent}%`}</Text>
                </View>
                <ProgressBar value={selectedPercent} />
                <Text style={styles.detailProgressHint}>
                  {selectedProgress && !selectedBadge.achieved
                    ? `${Math.min(selectedProgress.current, selectedProgress.target)} / ${selectedProgress.target}까지 왔어요.`
                    : selectedBadge.achieved
                      ? '사원증에 기록된 배지예요.'
                      : '앱에서 조건을 만족하면 자동으로 지급돼요.'}
                </Text>
              </View>

              <Pressable accessibilityLabel={getActionLabel(selectedBadge)} accessibilityRole="button" onPress={() => handlePrimaryAction(selectedBadge)} style={({ pressed }) => [styles.detailAction, pressed && styles.pressed]}>
                {getBadgeCategory(selectedBadge) === 'neighborhood' || getBadgeCategory(selectedBadge) === 'community' ? (
                  <MapPin color="#FFF8F0" size={17} />
                ) : selectedBadge.achieved || getBadgeCategory(selectedBadge) === 'dex' ? (
                  <BookOpen color="#FFF8F0" size={17} />
                ) : (
                  <Camera color="#FFF8F0" size={17} />
                )}
                <Text style={styles.detailActionText}>{getActionLabel(selectedBadge)}</Text>
                <ChevronRight color="#FFF8F0" size={16} />
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,253,246,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '900',
    color: theme.colors.primary,
  },
  title: {
    marginTop: 3,
    fontSize: 25,
    fontWeight: '900',
    color: theme.colors.text,
  },
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: 124,
  },
  summaryPanel: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
    ...createShadow(8),
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.mutedText,
  },
  summaryValue: {
    marginTop: 3,
    fontSize: 30,
    fontWeight: '900',
    color: theme.colors.text,
  },
  summarySeal: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.badge,
    borderWidth: 1,
    borderColor: 'rgba(201,121,73,0.18)',
  },
  summaryHint: {
    marginTop: theme.spacing.sm,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.mutedText,
  },
  focusRow: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  focusCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.75)',
  },
  focusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248,234,210,0.7)',
  },
  focusLabel: {
    marginTop: theme.spacing.sm,
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.mutedText,
  },
  focusTitle: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: '900',
    color: theme.colors.text,
  },
  focusMeta: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  filterRow: {
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  filterChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,253,246,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.75)',
  },
  filterChipActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '900',
    color: theme.colors.mutedText,
  },
  filterTextActive: {
    color: '#FFF8F0',
  },
  categoryRow: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  categoryChip: {
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248,234,210,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
  },
  categoryChipActive: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: 'rgba(111,131,77,0.32)',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.mutedText,
  },
  categoryTextActive: {
    color: theme.colors.primaryDark,
  },
  grid: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  badgeCard: {
    width: '48.5%',
    minHeight: 196,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
  },
  badgeCardLocked: {
    backgroundColor: 'rgba(255,253,246,0.64)',
  },
  badgeCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1C57C',
    borderWidth: 1,
    borderColor: '#C9954A',
  },
  badgeIconLocked: {
    opacity: 0.48,
    backgroundColor: 'rgba(245,227,191,0.58)',
    borderColor: 'rgba(139,112,83,0.18)',
  },
  badgeEmoji: {
    fontSize: 23,
  },
  statusPill: {
    minHeight: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139,112,83,0.1)',
  },
  statusPillEarned: {
    backgroundColor: theme.colors.accentSoft,
  },
  statusPillLocked: {
    backgroundColor: 'rgba(139,112,83,0.1)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    color: theme.colors.mutedText,
  },
  statusTextEarned: {
    color: theme.colors.accent,
  },
  badgeName: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.text,
  },
  badgeDescription: {
    marginTop: 5,
    minHeight: 38,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    color: theme.colors.mutedText,
  },
  cardProgress: {
    marginTop: 'auto',
    gap: 6,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  lockedHint: {
    marginTop: 'auto',
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.mutedText,
  },
  emptyState: {
    width: '100%',
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    backgroundColor: 'rgba(255,253,246,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.75)',
  },
  emptyTitle: {
    marginTop: theme.spacing.sm,
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.text,
  },
  emptyText: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.mutedText,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(33,25,18,0.36)',
  },
  detailSheet: {
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    backgroundColor: theme.colors.surface,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1C57C',
    borderWidth: 2,
    borderColor: '#C9954A',
  },
  detailEmoji: {
    fontSize: 31,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248,234,210,0.72)',
  },
  detailCategory: {
    marginTop: theme.spacing.lg,
    fontSize: 12,
    fontWeight: '900',
    color: theme.colors.primary,
  },
  detailTitle: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.text,
  },
  detailDescription: {
    marginTop: theme.spacing.sm,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    color: theme.colors.mutedText,
  },
  detailProgressBox: {
    marginTop: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(248,234,210,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  detailProgressRow: {
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailProgressLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: theme.colors.text,
  },
  detailProgressValue: {
    fontSize: 13,
    fontWeight: '900',
    color: theme.colors.accent,
  },
  detailProgressHint: {
    marginTop: theme.spacing.sm,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.mutedText,
  },
  detailAction: {
    marginTop: theme.spacing.lg,
    minHeight: 52,
    borderRadius: theme.radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primaryDark,
  },
  detailActionText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFF8F0',
  },
  pressed: {
    opacity: 0.72,
  },
});
