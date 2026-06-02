import { Crown, Palette, PawPrint, Sparkles, Star, Trophy } from 'lucide-react-native';
import { Image, ImageBackground, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { createShadow, theme } from '@/shared/styles/theme';
import { collectionCoverImageSource, collectionPaletteStyle } from '@/shared/utils/collectionTheme';
import { seasonStampImageSource } from '@/shared/utils/seasonStamp';
import type { Cat, CatType, DexProgress } from '@/shared/types/cat';
import type { CollectionProfile, CollectionSummary, CollectionTheme } from '@/shared/types/collection';

interface CollectionCoverHeaderProps {
  collectionTheme?: CollectionTheme;
  onCustomize: () => void;
  onExplore: () => void;
  profile: CollectionProfile;
  progress: DexProgress;
  summary: CollectionSummary;
}

const illustrations = {
  orange: require('../../../../assets/illustrations/cat-orange-clean.png'),
  dark: require('../../../../assets/illustrations/cat-dark-clean.png'),
  tuxedo: require('../../../../assets/illustrations/cat-tuxedo-clean.png'),
  gray: require('../../../../assets/illustrations/cat-gray-clean.png'),
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

function FeaturedCat({ cat }: { cat: Cat }) {
  return (
    <View style={styles.featuredCat}>
      <Image resizeMode="cover" source={imageForType(cat.type, cat.imageUrl)} style={styles.featuredImage} />
      <Text numberOfLines={1} style={styles.featuredName}>
        {cat.name}
      </Text>
    </View>
  );
}

export function CollectionCoverHeader({ collectionTheme, onCustomize, onExplore, profile, progress, summary }: CollectionCoverHeaderProps) {
  const featuredCats = summary.featuredCats.slice(0, summary.hasNyangkkureomi ? 3 : 1);
  const selectedBadges = summary.selectedBadges.slice(0, summary.hasNyangkkureomi ? 4 : 2);
  const selectedStamps = summary.selectedStamps.slice(0, summary.hasNyangkkureomi ? 3 : 1);
  const progressPercent = Math.min(100, Math.max(0, (progress.collected / Math.max(progress.total, 1)) * 100));
  const coverImage = collectionCoverImageSource(collectionTheme ?? { id: profile.coverThemeId });
  const coverStyle = [styles.cover, coverImage ? styles.coverWithImage : collectionPaletteStyle(collectionTheme?.palette)];
  const coverContent = (
    <>
      {coverImage ? <View pointerEvents="none" style={styles.coverImageOverlay} /> : null}
      <View style={styles.coverContent}>
        <View style={styles.topRow}>
          <View style={styles.eyebrowRow}>
            <PawPrint color={theme.colors.primaryDark} size={15} />
            <Text style={styles.eyebrow}>도감 표지</Text>
          </View>
          <View style={styles.actionCluster}>
            <Pressable onPress={onExplore} style={({ pressed }) => [styles.customizeButton, pressed ? styles.pressed : null]}>
              <Trophy color={theme.colors.primaryDark} size={14} />
              <Text style={styles.customizeText}>동네 도감</Text>
            </Pressable>
            <Pressable onPress={onCustomize} style={({ pressed }) => [styles.customizeButton, pressed ? styles.pressed : null]}>
              <Palette color={theme.colors.primaryDark} size={14} />
              <Text style={styles.customizeText}>꾸미기</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.planPill, summary.hasNyangkkureomi ? styles.premiumPill : null]}>
          {summary.hasNyangkkureomi ? <Crown color={theme.colors.primary} size={13} /> : null}
          <Text style={styles.planText}>{summary.planName}</Text>
        </View>

        <Text numberOfLines={2} style={styles.title}>
          {profile.displayTitle}
        </Text>
        <Text numberOfLines={2} style={styles.intro}>
          {profile.intro}
        </Text>

        <View style={styles.themeRow}>
          <Sparkles color={theme.colors.primaryDark} size={15} />
          <Text numberOfLines={1} style={styles.themeName}>
            {collectionTheme?.name ?? summary.coverThemeName}
          </Text>
        </View>

        {selectedBadges.length > 0 ? (
          <View style={styles.selectedBadgeRow}>
            {selectedBadges.map((badge) => (
              <View key={badge.id} style={styles.selectedBadgePill}>
                <Star color={theme.colors.warning} fill={theme.colors.warning} size={12} />
                <Text numberOfLines={1} style={styles.selectedBadgeText}>
                  {badge.name}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {selectedStamps.length > 0 ? (
          <View style={styles.selectedStampRow}>
            {selectedStamps.map((stamp) => {
              const stampImage = seasonStampImageSource(stamp);

              return (
                <View key={stamp.id} style={styles.selectedStampPill}>
                  {stampImage ? <Image resizeMode="contain" source={stampImage} style={styles.selectedStampImage} /> : <Text style={styles.selectedStampIcon}>◦</Text>}
                  <Text numberOfLines={1} style={styles.selectedStampText}>
                    {stamp.name}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={styles.featuredRow}>
          {featuredCats.length > 0 ? (
            featuredCats.map((cat) => <FeaturedCat cat={cat} key={cat.id} />)
          ) : (
            <View style={styles.emptyFeatured}>
              <PawPrint color="#B99A73" size={18} />
              <Text style={styles.emptyFeaturedText}>우리 도감 주인공을 기다리는 중</Text>
            </View>
          )}
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>수집 현황</Text>
            <Text style={styles.metaValue}>
              {progress.collected} / {progress.total}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>골목 배지</Text>
            <Text style={styles.metaValue}>{summary.achievedBadgeCount}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>냥발 도장</Text>
            <Text style={styles.metaValue}>{summary.achievedStampCount}</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>
    </>
  );

  return coverImage ? (
    <ImageBackground imageStyle={styles.coverBackgroundImage} resizeMode="cover" source={coverImage} style={coverStyle}>
      {coverContent}
    </ImageBackground>
  ) : (
    <View style={coverStyle}>{coverContent}</View>
  );
}

const styles = StyleSheet.create({
  cover: {
    position: 'relative',
    minHeight: 356,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.md,
    overflow: 'hidden',
    ...createShadow(8),
  },
  coverWithImage: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  coverBackgroundImage: {
    borderRadius: theme.radius.lg,
    width: '100%',
    height: '100%',
  },
  coverImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 248, 236, 0.32)',
  },
  coverContent: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
    justifyContent: 'flex-start',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyebrow: {
    color: '#8B6956',
    fontSize: 12,
    fontWeight: '900',
  },
  planPill: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    minHeight: 28,
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: 'rgba(255, 253, 246, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(139, 105, 86, 0.18)',
  },
  premiumPill: {
    backgroundColor: '#FFF0DC',
    borderColor: 'rgba(201, 121, 73, 0.28)',
  },
  planText: {
    flexShrink: 1,
    color: theme.colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
  },
  customizeButton: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 9,
    backgroundColor: 'rgba(255, 253, 246, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(139, 105, 86, 0.2)',
  },
  actionCluster: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  customizeText: {
    color: theme.colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.78,
  },
  title: {
    marginTop: 7,
    color: theme.colors.text,
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 28,
  },
  intro: {
    marginTop: 6,
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
  },
  themeRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  themeName: {
    flex: 1,
    minWidth: 0,
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  selectedBadgeRow: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectedBadgePill: {
    maxWidth: '48%',
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: 'rgba(255, 247, 222, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(199, 142, 63, 0.28)',
  },
  selectedBadgeText: {
    flexShrink: 1,
    color: theme.colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
  },
  selectedStampRow: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectedStampPill: {
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
  selectedStampIcon: {
    color: theme.colors.primaryDark,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 18,
  },
  selectedStampImage: {
    width: 22,
    height: 22,
  },
  selectedStampText: {
    flexShrink: 1,
    color: theme.colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
  },
  featuredRow: {
    minHeight: 60,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'stretch',
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
    height: 36,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceAlt,
  },
  featuredName: {
    marginTop: 4,
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyFeatured: {
    flex: 1,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(139, 105, 86, 0.18)',
    backgroundColor: 'rgba(255, 253, 246, 0.55)',
  },
  emptyFeaturedText: {
    color: '#8B6956',
    fontSize: 12,
    fontWeight: '800',
  },
  metaGrid: {
    marginTop: 10,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  metaItem: {
    flex: 1,
    minWidth: 0,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 253, 246, 0.58)',
  },
  metaLabel: {
    color: theme.colors.mutedText,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  metaValue: {
    marginTop: 3,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  progressTrack: {
    height: 7,
    marginTop: 10,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 253, 246, 0.68)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
  },
});
