import { BookOpen, ChevronLeft, Heart, Lock, Palette } from 'lucide-react-native';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { createShadow, theme } from '@/shared/styles/theme';
import type { AuthUser } from '@/shared/types/auth';
import type { Cat, CatType } from '@/shared/types/cat';
import type { CollectionProfile, CollectionSummary } from '@/shared/types/collection';
import type { PublicCollection } from '@/shared/types/social';

interface ExplorationHistoryScreenProps {
  cats: Cat[];
  onBack: () => void;
  onOpenCat: (catId: string) => void;
}

interface SharedCollectionsScreenProps {
  collectionProfile: CollectionProfile;
  collectionSummary: CollectionSummary;
  cats: Cat[];
  user: AuthUser;
  onBack: () => void;
  onOpenCat: (catId: string) => void;
  onOpenCollectionDrawer: () => void;
}

interface LikedCollectionsScreenProps {
  collections: PublicCollection[];
  isLoading: boolean;
  onBack: () => void;
  onOpenCollection: (ownerId: string) => void;
}

const illustrations = {
  orange: require('../../../assets/illustrations/cat-orange-clean.png'),
  dark: require('../../../assets/illustrations/cat-dark-clean.png'),
  tuxedo: require('../../../assets/illustrations/cat-tuxedo-clean.png'),
  gray: require('../../../assets/illustrations/cat-gray-clean.png'),
  profile: require('../../../assets/illustrations/profile-cat.png'),
} satisfies Record<string, ImageSourcePropType>;

function imageForType(type: CatType, imageUrl?: string): ImageSourcePropType {
  if (imageUrl) {
    return { uri: imageUrl };
  }

  if (type === '턱시도') {
    return illustrations.tuxedo;
  }

  if (type === '흰냥') {
    return illustrations.gray;
  }

  if (type === '삼색이' || type === '검은냥') {
    return illustrations.dark;
  }

  return illustrations.orange;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function Header({ icon: Icon, onBack, subtitle, title }: { icon: typeof BookOpen; onBack: () => void; subtitle: string; title: string }) {
  return (
    <View style={styles.header}>
      <Pressable accessibilityLabel="뒤로 가기" onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
        <ChevronLeft color={theme.colors.primaryDark} size={22} />
      </Pressable>
      <View style={styles.headerCopy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.headerIcon}>
        <Icon color={theme.colors.primaryDark} size={20} />
      </View>
    </View>
  );
}

export function ExplorationHistoryScreen({ cats, onBack, onOpenCat }: ExplorationHistoryScreenProps) {
  const sortedCats = [...cats].sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Header icon={BookOpen} onBack={onBack} subtitle="최근 만남과 재발견 횟수를 확인해요." title="탐험 기록" />
      {sortedCats.length > 0 ? (
        <View style={styles.list}>
          {sortedCats.map((cat) => (
            <Pressable key={cat.id} onPress={() => onOpenCat(cat.id)} style={({ pressed }) => [styles.historyItem, pressed && styles.pressed]}>
              <Image resizeMode="cover" source={imageForType(cat.type, cat.imageUrl)} style={styles.catThumb} />
              <View style={styles.itemCopy}>
                <Text numberOfLines={1} style={styles.itemTitle}>
                  {cat.name}
                </Text>
                <Text numberOfLines={1} style={styles.itemMeta}>
                  마지막 만남 {formatDate(cat.lastSeenAt)} · {cat.relationshipLevel}
                </Text>
              </View>
              <Text style={styles.countPill}>{cat.encounterCount}회</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <EmptyState text="촬영하거나 미확인 제보를 남기면 탐험 기록이 쌓여요." title="아직 탐험 기록이 없어요" />
      )}
    </ScrollView>
  );
}

export function SharedCollectionsScreen({
  collectionProfile,
  collectionSummary,
  cats,
  user,
  onBack,
  onOpenCat,
  onOpenCollectionDrawer,
}: SharedCollectionsScreenProps) {
  const featuredCats = collectionSummary.featuredCats.length > 0 ? collectionSummary.featuredCats : cats.slice(0, 3);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Header icon={Palette} onBack={onBack} subtitle="공개 도감 상태와 대표 고양이를 확인해요." title="내가 공유한 도감" />
      <Card style={styles.summaryCard}>
        <View style={styles.profileRow}>
          <Image resizeMode="cover" source={user.profileImageUrl ? { uri: user.profileImageUrl } : illustrations.profile} style={styles.avatar} />
          <View style={styles.itemCopy}>
            <Text numberOfLines={1} style={styles.itemTitle}>
              {collectionProfile.displayTitle}
            </Text>
            <Text numberOfLines={2} style={styles.itemMeta}>
              {collectionProfile.intro}
            </Text>
          </View>
        </View>
        <View style={styles.shareStats}>
          <Stat label="공개 상태" value={collectionProfile.isPublic ? '공개' : '비공개'} />
          <Stat label="대표 고양이" value={`${collectionSummary.featuredCats.length}마리`} />
          <Stat label="배지" value={`${collectionSummary.achievedBadgeCount}개`} />
        </View>
        {!collectionProfile.isPublic ? (
          <View style={styles.privateNotice}>
            <Lock color={theme.colors.primaryDark} size={16} />
            <Text style={styles.privateText}>현재 도감은 비공개라 다른 사용자에게 노출되지 않아요.</Text>
          </View>
        ) : null}
        <Button onPress={onOpenCollectionDrawer} variant="secondary">
          고양이 서랍에서 공개 설정 변경
        </Button>
      </Card>

      {featuredCats.length > 0 ? (
        <View style={styles.grid}>
          {featuredCats.map((cat) => (
            <Pressable key={cat.id} onPress={() => onOpenCat(cat.id)} style={({ pressed }) => [styles.catCard, pressed && styles.pressed]}>
              <Image resizeMode="cover" source={imageForType(cat.type, cat.imageUrl)} style={styles.catImage} />
              <Text numberOfLines={1} style={styles.catName}>
                {cat.name}
              </Text>
              <Text numberOfLines={1} style={styles.catMeta}>
                No.{String(cat.number).padStart(3, '0')} · {cat.type}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <EmptyState text="고양이를 등록한 뒤 우리 도감 주인공으로 설정해 보세요." title="공유할 고양이가 없어요" />
      )}
    </ScrollView>
  );
}

export function LikedCollectionsScreen({ collections, isLoading, onBack, onOpenCollection }: LikedCollectionsScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Header icon={Heart} onBack={onBack} subtitle="좋아요한 공개 도감을 다시 찾아가요." title="좋아요한 도감" />
      {isLoading ? (
        <EmptyState text="좋아요한 도감 목록을 불러오고 있어요." title="불러오는 중" />
      ) : collections.length > 0 ? (
        <View style={styles.list}>
          {collections.map((collection) => (
            <Pressable
              key={collection.ownerId}
              onPress={() => onOpenCollection(collection.ownerId)}
              style={({ pressed }) => [styles.collectionItem, pressed && styles.pressed]}
            >
              <Image
                resizeMode="cover"
                source={collection.profileImageUrl ? { uri: collection.profileImageUrl } : illustrations.profile}
                style={styles.avatarSmall}
              />
              <View style={styles.itemCopy}>
                <Text numberOfLines={1} style={styles.itemTitle}>
                  {collection.profile.displayTitle}
                </Text>
                <Text numberOfLines={1} style={styles.itemMeta}>
                  {collection.nickname} · 좋아요 {collection.stats.likeCount}
                </Text>
              </View>
              <Heart color={theme.colors.accent} fill={theme.colors.accent} size={18} />
            </Pressable>
          ))}
        </View>
      ) : (
        <EmptyState text="동네 도감 랭킹에서 마음에 드는 도감에 좋아요를 눌러보세요." title="좋아요한 도감이 없어요" />
      )}
    </ScrollView>
  );
}

function EmptyState({ text, title }: { text: string; title: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
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

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 132,
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,253,246,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.86)',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 3,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
  },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#FFF0DC',
  },
  list: {
    gap: theme.spacing.sm,
  },
  historyItem: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(255,253,246,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
    ...createShadow(5),
  },
  collectionItem: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
  },
  catThumb: {
    width: 58,
    height: 58,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surfaceAlt,
  },
  avatarSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceAlt,
  },
  itemCopy: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  itemMeta: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  countPill: {
    minWidth: 48,
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFF0DC',
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  summaryCard: {
    gap: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.92)',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  shareStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  statItem: {
    flex: 1,
    minWidth: 92,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: '#EAD9C4',
  },
  statLabel: {
    color: theme.colors.mutedText,
    fontSize: 10,
    fontWeight: '800',
  },
  statValue: {
    marginTop: 5,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  privateNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    backgroundColor: '#FFF0DC',
  },
  privateText: {
    flex: 1,
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  grid: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  catCard: {
    flexBasis: '48%',
    maxWidth: '48%',
    borderRadius: theme.radius.md,
    padding: 10,
    backgroundColor: 'rgba(255,253,246,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
  },
  catImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceAlt,
  },
  catName: {
    marginTop: 8,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  catMeta: {
    marginTop: 2,
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 6,
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.84,
  },
});
