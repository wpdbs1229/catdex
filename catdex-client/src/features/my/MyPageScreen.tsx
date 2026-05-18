import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { SectionHeader } from '@/shared/components/SectionHeader';
import type { Badge, ExplorerProfile } from '@/shared/types/badge';
import type { AuthProvider, AuthUser } from '@/shared/types/auth';
import type { Cat } from '@/shared/types/cat';
import type { CollectionSummary } from '@/shared/types/collection';
import { BadgeGrid } from '@/features/my/components/BadgeGrid';
import { UserLevelCard } from '@/features/my/components/UserLevelCard';
import { theme } from '@/shared/styles/theme';

const providerLabels: Record<AuthProvider, string> = {
  kakao: 'Kakao',
  google: 'Google',
};

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
}: MyPageScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>MY / 골목 배지</Text>
        </View>
        <Text style={styles.title}>탐험 기록</Text>
        <Text style={styles.subtitle}>레벨, 발견 수, 뱃지를 한 번에 확인하는 프로필 화면입니다.</Text>
      </View>

      <UserLevelCard profile={profile} />

      <Card style={styles.accountCard}>
        <View style={styles.accountHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.nickname.slice(0, 1)}</Text>
          </View>
          <View style={styles.accountMeta}>
            <Text style={styles.accountLabel}>로그인 사용자</Text>
            <Text style={styles.accountName}>{user.nickname}</Text>
            <Text style={styles.providerText}>{providerLabels[user.provider]}</Text>
          </View>
        </View>
        <View style={styles.logoutWrap}>
          <Button disabled={isSigningOut} onPress={onLogout} variant="secondary">
            {isSigningOut ? '로그아웃 중...' : '로그아웃'}
          </Button>
        </View>
      </Card>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>전체 발견 수</Text>
          <Text style={styles.statValue}>{profile.totalDiscoveries}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>재발견 횟수</Text>
          <Text style={styles.statValue}>{profile.rediscoveries}</Text>
        </Card>
      </View>

      <Card style={styles.drawerCard}>
        <View style={styles.drawerHeader}>
          <View>
            <Text style={styles.drawerLabel}>{collectionSummary.planName}</Text>
            <Text style={styles.drawerTitle}>고양이 서랍</Text>
          </View>
          <Text style={styles.drawerTheme}>{collectionSummary.coverThemeName}</Text>
        </View>
        <Text style={styles.drawerDescription}>
          우리 도감 주인공 {collectionSummary.featuredCats.length}마리 · 골목 배지 {collectionSummary.achievedBadgeCount}개 · 냥발 도장{' '}
          {collectionSummary.achievedStampCount}개
        </Text>
        <View style={styles.featuredPreview}>
          {collectionSummary.featuredCats.slice(0, 3).map((cat) => (
            <View key={cat.id} style={styles.featuredPill}>
              <Text style={styles.featuredPillText}>{cat.name}</Text>
            </View>
          ))}
          {collectionSummary.featuredCats.length === 0 ? <Text style={styles.drawerEmpty}>우리 도감 주인공을 골라보세요.</Text> : null}
        </View>
        <Button onPress={onOpenCollectionDrawer} variant="secondary">
          고양이 서랍 열기
        </Button>
      </Card>

      <View style={styles.section}>
        <SectionHeader subtitle="획득한 배지를 모아보세요" title="획득 골목 배지" />
        <BadgeGrid badges={badges.filter((badge) => badge.achieved)} />
      </View>

      <View style={styles.section}>
        <SectionHeader subtitle={`${myCats.length}마리 수집`} title="내 도감" />
        <View style={styles.catList}>
          {myCats.map((cat) => (
            <Card key={cat.id} style={styles.catRow}>
              <View style={styles.catMeta}>
                <Text style={styles.catNumber}>No.{String(cat.number).padStart(3, '0')}</Text>
                <Text style={styles.catName}>{cat.name}</Text>
                <Text style={styles.catSub}>
                  {cat.type} · 내 발견 {cat.encounterCount}회
                </Text>
              </View>
              <Button onPress={() => onOpenCat(cat.id)} variant="secondary">
                보기
              </Button>
            </Card>
          ))}
          {myCats.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>아직 내 도감에 수집한 고양이가 없어요.</Text>
            </Card>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: 140,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#916B53',
  },
  title: {
    marginTop: theme.spacing.md,
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.mutedText,
  },
  statsRow: {
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  accountCard: {
    marginTop: theme.spacing.lg,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7E4CA',
    borderWidth: 1,
    borderColor: '#E9D1B6',
  },
  avatarText: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  accountMeta: {
    flex: 1,
  },
  accountLabel: {
    color: '#8B6956',
    fontSize: 13,
    fontWeight: '700',
  },
  accountName: {
    marginTop: 4,
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  providerText: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
  },
  logoutWrap: {
    marginTop: theme.spacing.lg,
  },
  statCard: {
    width: '48.5%',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B6956',
  },
  statValue: {
    marginTop: theme.spacing.sm,
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
  },
  drawerCard: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.md,
    backgroundColor: '#FFF7DE',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  drawerLabel: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  drawerTitle: {
    marginTop: 4,
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  drawerTheme: {
    flexShrink: 1,
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  drawerDescription: {
    color: theme.colors.mutedText,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  featuredPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  featuredPill: {
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: '#B9C59A',
  },
  featuredPillText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  drawerEmpty: {
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    marginTop: theme.spacing.xl,
  },
  catList: {
    gap: theme.spacing.md,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  catMeta: {
    flex: 1,
  },
  catNumber: {
    color: '#8B6956',
    fontSize: 12,
    fontWeight: '700',
  },
  catName: {
    marginTop: 4,
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  catSub: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  emptyText: {
    color: theme.colors.mutedText,
    fontSize: 14,
    fontWeight: '600',
  },
});
