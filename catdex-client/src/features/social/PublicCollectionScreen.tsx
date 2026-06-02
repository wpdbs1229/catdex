import { ChevronLeft, Heart, PawPrint, Star, UserPlus, Users } from 'lucide-react-native';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { createShadow, theme } from '@/shared/styles/theme';
import { collectionCoverImageSource, collectionPaletteStyle } from '@/shared/utils/collectionTheme';
import type { PublicCollection, PublicFeaturedCat } from '@/shared/types/social';

interface PublicCollectionScreenProps {
  collection: PublicCollection | null;
  isLoading: boolean;
  isSaving: boolean;
  onBack: () => void;
  onToggleFollow: () => void;
  onToggleLike: () => void;
}

const illustrations = {
  orange: require('../../../assets/illustrations/cat-orange-clean.png'),
  dark: require('../../../assets/illustrations/cat-dark-clean.png'),
  tuxedo: require('../../../assets/illustrations/cat-tuxedo-clean.png'),
  gray: require('../../../assets/illustrations/cat-gray-clean.png'),
} satisfies Record<string, ImageSourcePropType>;

function imageForCat(cat: PublicFeaturedCat): ImageSourcePropType {
  if (cat.imageUrl) {
    return { uri: cat.imageUrl };
  }

  if (cat.type === '턱시도') {
    return illustrations.tuxedo;
  }

  if (cat.type === '흰냥') {
    return illustrations.gray;
  }

  if (cat.type === '삼색이' || cat.type === '검은냥') {
    return illustrations.dark;
  }

  return illustrations.orange;
}

export function PublicCollectionScreen({
  collection,
  isLoading,
  isSaving,
  onBack,
  onToggleFollow,
  onToggleLike,
}: PublicCollectionScreenProps) {
  if (isLoading) {
    return (
      <View style={styles.centerState}>
        <PawPrint color="#D4B989" size={38} />
        <Text style={styles.centerTitle}>공개 도감을 불러오는 중</Text>
      </View>
    );
  }

  if (!collection) {
    return (
      <View style={styles.centerState}>
        <PawPrint color="#D4B989" size={38} />
        <Text style={styles.centerTitle}>볼 수 없는 도감이에요</Text>
        <Button onPress={onBack} variant="secondary">
          돌아가기
        </Button>
      </View>
    );
  }

  const coverImage = collectionCoverImageSource(collection.theme);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}>
        <ChevronLeft color={theme.colors.primaryDark} size={17} />
        <Text style={styles.backButtonText}>동네 도감</Text>
      </Pressable>

      <View style={[styles.cover, collectionPaletteStyle(collection.theme.palette)]}>
        {coverImage ? <Image resizeMode="cover" source={coverImage} style={styles.coverBackground} /> : null}
        {coverImage ? <View pointerEvents="none" style={styles.coverImageOverlay} /> : null}
        <View style={styles.coverContent}>
          <Text style={styles.owner}>{collection.nickname}의 도감</Text>
          <Text numberOfLines={2} style={styles.title}>
            {collection.profile.displayTitle}
          </Text>
          <Text numberOfLines={3} style={styles.intro}>
            {collection.profile.intro}
          </Text>
          <Text style={styles.themeName}>{collection.theme.name}</Text>

          <View style={styles.featuredRow}>
            {collection.featuredCats.length > 0 ? (
              collection.featuredCats.slice(0, collection.hasNyangkkureomi ? 3 : 1).map((cat) => (
                <View key={cat.id} style={styles.featuredCat}>
                  <Image resizeMode="cover" source={imageForCat(cat)} style={styles.featuredImage} />
                  <Text numberOfLines={1} style={styles.featuredName}>
                    {cat.name}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyFeatured}>아직 대표 고양이가 없어요.</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          disabled={isSaving || collection.viewer.isOwner}
          onPress={onToggleLike}
          style={({ pressed }) => [
            styles.actionButton,
            collection.viewer.liked ? styles.actionButtonActive : null,
            collection.viewer.isOwner ? styles.disabled : null,
            pressed ? styles.pressed : null,
          ]}
        >
          <Heart color={collection.viewer.liked ? '#FFFFFF' : theme.colors.primaryDark} fill={collection.viewer.liked ? '#FFFFFF' : 'none'} size={18} />
          <Text style={[styles.actionText, collection.viewer.liked ? styles.actionTextActive : null]}>
            좋아요 {collection.stats.likeCount}
          </Text>
        </Pressable>

        <Pressable
          disabled={isSaving || collection.viewer.isOwner}
          onPress={onToggleFollow}
          style={({ pressed }) => [
            styles.actionButton,
            collection.viewer.following ? styles.actionButtonActive : null,
            collection.viewer.isOwner ? styles.disabled : null,
            pressed ? styles.pressed : null,
          ]}
        >
          <UserPlus color={collection.viewer.following ? '#FFFFFF' : theme.colors.primaryDark} size={18} />
          <Text style={[styles.actionText, collection.viewer.following ? styles.actionTextActive : null]}>
            {collection.viewer.following ? '팔로잉' : '팔로우'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.statGrid}>
        <Card style={styles.statCard}>
          <PawPrint color={theme.colors.primaryDark} size={18} />
          <Text style={styles.statValue}>{collection.stats.collectedCount}</Text>
          <Text style={styles.statLabel}>수집 고양이</Text>
        </Card>
        <Card style={styles.statCard}>
          <Star color={theme.colors.warning} fill={theme.colors.warning} size={18} />
          <Text style={styles.statValue}>{collection.stats.badgeCount}</Text>
          <Text style={styles.statLabel}>골목 배지</Text>
        </Card>
        <Card style={styles.statCard}>
          <Users color={theme.colors.primaryDark} size={18} />
          <Text style={styles.statValue}>{collection.stats.followerCount}</Text>
          <Text style={styles.statLabel}>팔로워</Text>
        </Card>
      </View>

      <Card style={styles.noticeCard}>
        <Text style={styles.noticeTitle}>공개 도감 방문</Text>
        <Text style={styles.noticeText}>
          이 화면은 공개된 표지와 대표 정보만 보여줘요. 정확한 위치와 비공개 발견 기록은 공개하지 않아요.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 132,
  },
  centerState: {
    flex: 1,
    minHeight: 520,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  centerTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
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
  cover: {
    position: 'relative',
    minHeight: 260,
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.md,
    overflow: 'hidden',
    ...createShadow(8),
  },
  coverBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  coverImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 248, 236, 0.24)',
  },
  coverContent: {
    position: 'relative',
    zIndex: 1,
  },
  owner: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  title: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 31,
  },
  intro: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
  },
  themeName: {
    marginTop: theme.spacing.md,
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  featuredRow: {
    minHeight: 76,
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  featuredCat: {
    flex: 1,
    minWidth: 0,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(139, 105, 86, 0.18)',
    padding: 7,
    backgroundColor: 'rgba(255, 253, 246, 0.68)',
  },
  featuredImage: {
    width: '100%',
    height: 44,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceAlt,
  },
  featuredName: {
    marginTop: 5,
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyFeatured: {
    color: '#8B6956',
    fontSize: 13,
    fontWeight: '800',
  },
  actionRow: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(255,253,246,0.92)',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionButtonActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  actionText: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  actionTextActive: {
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.48,
  },
  statGrid: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 5,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  noticeCard: {
    marginTop: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.78)',
  },
  noticeTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  noticeText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.82,
  },
});
