import type { LucideIcon } from 'lucide-react-native';
import { Bell, BookOpen, ChevronRight, Cloud, Heart, LogOut, Palette, Settings, Sparkles, Trophy } from 'lucide-react-native';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { ProgressBar } from '@/shared/components/ProgressBar';
import { createShadow, theme } from '@/shared/styles/theme';
import type { Badge, ExplorerProfile } from '@/shared/types/badge';
import type { AuthUser } from '@/shared/types/auth';
import type { Cat } from '@/shared/types/cat';
import type { CollectionSummary } from '@/shared/types/collection';

interface MyPageScreenProps {
  profile: ExplorerProfile;
  badges: Badge[];
  myCats: Cat[];
  user: AuthUser;
  collectionSummary: CollectionSummary;
  isSigningOut: boolean;
  onLogout: () => void;
  onOpenCat: (catId: string) => void;
  onOpenCollectionDrawer: () => void;
  onOpenCollectionRankings: () => void;
  onOpenNotifications: () => void;
  onOpenProfileEdit: () => void;
}

const illustrations = {
  profile: require('../../../assets/illustrations/profile-cat.png'),
  bottom: require('../../../assets/illustrations/my-bottom-cat.png'),
  orange: require('../../../assets/illustrations/cat-orange-clean.png'),
  dark: require('../../../assets/illustrations/cat-dark-clean.png'),
  tuxedo: require('../../../assets/illustrations/cat-tuxedo-clean.png'),
} satisfies Record<string, ImageSourcePropType>;

const badgeIcons = ['🐾', '🌿', '🦉', '💙'];

function catImage(cat: Cat): ImageSourcePropType {
  if (cat.imageUrl) {
    return { uri: cat.imageUrl };
  }

  if (cat.type === '턱시도') {
    return illustrations.tuxedo;
  }

  if (cat.type === '삼색이' || cat.type === '검은냥') {
    return illustrations.dark;
  }

  return illustrations.orange;
}

export function MyPageScreen({
  profile,
  badges,
  myCats,
  user,
  collectionSummary,
  isSigningOut,
  onLogout,
  onOpenCat,
  onOpenCollectionDrawer,
  onOpenCollectionRankings,
  onOpenNotifications,
  onOpenProfileEdit,
}: MyPageScreenProps) {
  const achievedBadges = badges.filter((badge) => badge.achieved);
  const displayBadges = achievedBadges.length > 0 ? achievedBadges.slice(0, 4) : badges.slice(0, 4);
  const featuredCats = collectionSummary.featuredCats.length > 0 ? collectionSummary.featuredCats.slice(0, 3) : myCats.slice(0, 3);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <View style={styles.profileRow}>
          <Image resizeMode="cover" source={user.profileImageUrl ? { uri: user.profileImageUrl } : illustrations.profile} style={styles.avatar} />
          <View style={styles.profileCopy}>
            <View style={styles.nameRow}>
              <Text numberOfLines={1} style={styles.nickname}>
                {user.nickname}
              </Text>
            </View>
            {collectionSummary.hasNyangkkureomi ? <Text style={styles.planPill}>{collectionSummary.planName}</Text> : null}
            <Text style={styles.levelText}>레벨 {profile.level}</Text>
            <ProgressBar value={profile.nextLevelProgress} />
          </View>
        </View>
        <Pressable onPress={onOpenProfileEdit} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Settings color={theme.colors.primaryDark} size={20} />
        </Pressable>
      </View>

      <View style={styles.statPanel}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>도감 수집</Text>
          <Text style={styles.statValue}>{profile.totalDiscoveries}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>재발견 횟수</Text>
          <Text style={styles.statValue}>{profile.rediscoveries}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>공유 수</Text>
          <Text style={styles.statValue}>{collectionSummary.featuredCats.length}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>연속 탐험</Text>
          <Text style={styles.statValue}>{collectionSummary.achievedStampCount}일</Text>
        </View>
      </View>

      <View style={styles.badgePanel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>획득한 배지</Text>
          <Text style={styles.panelCount}>{collectionSummary.achievedBadgeCount} / {badges.length || 24}</Text>
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
      ) : null}

      <Pressable onPress={onOpenCollectionDrawer} style={({ pressed }) => [styles.drawerButton, pressed && styles.pressed]}>
        <View style={styles.drawerIcon}>
          <Sparkles color={theme.colors.primaryDark} size={18} />
        </View>
        <View style={styles.drawerCopy}>
          <Text style={styles.drawerTitle}>고양이 서랍</Text>
          <Text numberOfLines={2} style={styles.drawerText}>
            표지, 우리 도감 주인공, 골목 배지와 냥발 도장을 꾸며요.
          </Text>
        </View>
        <ChevronRight color={theme.colors.primaryDark} size={19} />
      </Pressable>

      <View style={styles.menuPanel}>
        <MenuItem icon={Palette} label="고양이 서랍" onPress={onOpenCollectionDrawer} />
        <MenuItem icon={Trophy} label="동네 도감 랭킹" onPress={onOpenCollectionRankings} />
        <MenuItem icon={BookOpen} label="탐험 기록" />
        <MenuItem icon={Cloud} label="내가 공유한 도감" />
        <MenuItem icon={Heart} label="좋아요한 도감" />
        <MenuItem icon={Bell} label="알림 설정" onPress={onOpenNotifications} />
        <MenuItem disabled={isSigningOut} icon={LogOut} label={isSigningOut ? '로그아웃 중...' : '로그아웃'} onPress={onLogout} />
      </View>

      <View pointerEvents="none">
        <Image resizeMode="contain" source={illustrations.bottom} style={styles.bottomCat} />
      </View>
    </ScrollView>
  );
}

interface MenuItemProps {
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  onPress?: () => void;
}

function MenuItem({ disabled = false, icon: Icon, label, onPress }: MenuItemProps) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.menuItem, pressed && styles.pressed, disabled && styles.disabled]}>
      <Icon color={theme.colors.primaryDark} size={18} />
      <Text style={styles.menuLabel}>{label}</Text>
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
  planPill: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primary,
    backgroundColor: '#FFF0DC',
  },
  drawerButton: {
    minHeight: 92,
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: '#FFF0DC',
    borderWidth: 1,
    borderColor: 'rgba(201,121,73,0.25)',
    ...createShadow(6),
  },
  drawerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,253,246,0.74)',
    borderWidth: 1,
    borderColor: 'rgba(201,121,73,0.18)',
  },
  drawerCopy: {
    flex: 1,
    minWidth: 0,
  },
  drawerTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  drawerText: {
    marginTop: 5,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  levelText: {
    marginTop: theme.spacing.sm,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primaryDark,
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
  bottomCat: {
    width: 150,
    height: 130,
    alignSelf: 'flex-end',
    marginTop: -22,
    marginRight: -6,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.5,
  },
});
