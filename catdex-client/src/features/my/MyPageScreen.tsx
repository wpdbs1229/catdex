import type { LucideIcon } from 'lucide-react-native';
import { Bell, BookOpen, ChevronRight, LogOut, Settings } from 'lucide-react-native';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { ProgressBar } from '@/shared/components/ProgressBar';
import { createShadow, theme } from '@/shared/styles/theme';
import type { AuthUser } from '@/shared/types/auth';
import type { Cat } from '@/shared/types/cat';
import type { ExplorerProfile } from '@/shared/types/profile';

interface MyPageScreenProps {
  profile: ExplorerProfile;
  myCats: Cat[];
  user: AuthUser;
  isSigningOut: boolean;
  onLogout: () => void;
  onOpenCat: (catId: string) => void;
  onOpenExplorationHistory: () => void;
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
  myCats,
  user,
  isSigningOut,
  onLogout,
  onOpenCat,
  onOpenExplorationHistory,
  onOpenNotifications,
  onOpenProfileEdit,
}: MyPageScreenProps) {
  const recentCats = [...myCats].sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()).slice(0, 3);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <View style={styles.profileRow}>
          <Image resizeMode="cover" source={user.profileImageUrl ? { uri: user.profileImageUrl } : illustrations.profile} style={styles.avatar} />
          <View style={styles.profileCopy}>
            <Text numberOfLines={1} style={styles.nickname}>
              {user.nickname}
            </Text>
            <Text style={styles.levelText}>레벨 {profile.level}</Text>
            <ProgressBar value={profile.nextLevelProgress} />
          </View>
        </View>
        <Pressable onPress={onOpenProfileEdit} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Settings color={theme.colors.primaryDark} size={20} />
        </Pressable>
      </View>

      <View style={styles.statPanel}>
        <Stat label="도감 수집" value={String(profile.totalDiscoveries)} />
        <Stat label="재발견 횟수" value={String(profile.rediscoveries)} />
        <Stat label="내 고양이" value={`${myCats.length}마리`} />
        <Stat label="다음 레벨" value={`${Math.round(profile.nextLevelProgress)}%`} />
      </View>

      {recentCats.length > 0 ? (
        <View style={styles.recentPanel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>최근 만난 고양이</Text>
            <Pressable onPress={onOpenExplorationHistory} style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}>
              <Text style={styles.linkText}>전체 보기</Text>
              <ChevronRight color={theme.colors.accent} size={16} />
            </Pressable>
          </View>
          <View style={styles.featuredRow}>
            {recentCats.map((cat) => (
              <Pressable key={cat.id} onPress={() => onOpenCat(cat.id)} style={({ pressed }) => [styles.featuredCat, pressed && styles.pressed]}>
                <Image resizeMode="cover" source={catImage(cat)} style={styles.featuredImage} />
                <Text numberOfLines={1} style={styles.featuredName}>
                  {cat.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.menuPanel}>
        <MenuItem icon={BookOpen} label="탐험 기록" onPress={onOpenExplorationHistory} />
        <MenuItem icon={Bell} label="알림 설정" onPress={onOpenNotifications} />
        <MenuItem disabled={isSigningOut} icon={LogOut} label={isSigningOut ? '로그아웃 중...' : '로그아웃'} onPress={onLogout} />
      </View>

      <View pointerEvents="none">
        <Image resizeMode="contain" source={illustrations.bottom} style={styles.bottomCat} />
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.statValue}>
        {value}
      </Text>
    </View>
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
    minWidth: 0,
  },
  nickname: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
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
  recentPanel: {
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  panelTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  linkText: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '800',
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
    width: 132,
    height: 100,
    alignSelf: 'flex-end',
    marginTop: theme.spacing.md,
    marginRight: 2,
    opacity: 0.92,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.5,
  },
});
