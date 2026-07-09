import { ChevronRight, Heart, Images, MessageCircle, PawPrint } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { communityTopicLabel } from '@/features/community/community.constants';
import { createShadow, theme } from '@/shared/styles/theme';
import type { CommunityPost } from '@/shared/types/community';

interface CommunityPostCardProps {
  post: CommunityPost;
  compact?: boolean;
  onPress: (postId: string) => void;
}

export function CommunityPostCard({ post, compact = false, onPress }: CommunityPostCardProps) {
  return (
    <Pressable
      accessibilityLabel={`${post.title} 게시글 보기`}
      accessibilityRole="button"
      onPress={() => onPress(post.id)}
      style={({ pressed }) => [styles.card, compact && styles.compactCard, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        <View style={styles.topicBadge}>
          <MessageCircle color={theme.colors.accent} size={13} />
          <Text style={styles.topicText}>{communityTopicLabel[post.topic]}</Text>
        </View>
        <Text numberOfLines={1} style={styles.timeText}>
          {post.author.nickname} · {post.createdAt}
        </Text>
      </View>

      <Text numberOfLines={compact ? 1 : 2} style={styles.title}>
        {post.title}
      </Text>
      <Text numberOfLines={compact ? 2 : 3} style={styles.body}>
        {post.body}
      </Text>

      {post.imageUrls.length > 0 ? (
        <View style={[styles.imageWrap, compact && styles.compactImageWrap]}>
          <Image source={{ uri: post.imageUrls[0] }} style={styles.postImage} />
          {post.imageUrls.length > 1 ? (
            <View style={styles.imageCountBadge}>
              <Images color="#FFF8F0" size={13} />
              <Text style={styles.imageCountText}>{post.imageUrls.length}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.contextRow}>
        {post.catName ? (
          <View style={styles.catLinkCard}>
            <View style={styles.catThumb}>
              {post.catImageUrl ? <Image source={{ uri: post.catImageUrl }} style={styles.catThumbImage} /> : <PawPrint color={theme.colors.primary} size={14} />}
            </View>
            <View style={styles.catLinkCopy}>
              <Text numberOfLines={1} style={styles.catPillText}>
                {post.catName}
              </Text>
              <Text numberOfLines={1} style={styles.catMetaText}>
                {[post.catType, post.catRarity ? `희귀도 ${post.catRarity}` : undefined].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </View>
        ) : null}
        <Text numberOfLines={1} style={styles.regionText}>
          {post.regionName ?? '동네'}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Heart color={theme.colors.primary} fill={post.likedByMe ? theme.colors.primary : 'transparent'} size={14} />
          <Text style={styles.statText}>공감 {post.likeCount}</Text>
        </View>
        <View style={styles.stat}>
          <MessageCircle color={theme.colors.accent} size={14} />
          <Text style={styles.statText}>댓글 {post.commentCount}</Text>
        </View>
        <ChevronRight color={theme.colors.primaryDark} size={16} style={styles.chevron} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
    ...createShadow(4),
  },
  compactCard: {
    padding: theme.spacing.sm,
  },
  pressed: {
    opacity: 0.82,
  },
  topRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  topicBadge: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 14,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: 'rgba(221,232,200,0.72)',
  },
  topicText: {
    color: theme.colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
  },
  timeText: {
    flexShrink: 1,
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'right',
  },
  title: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
  },
  body: {
    marginTop: 5,
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  imageWrap: {
    height: 154,
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: '#FFF0DC',
  },
  compactImageWrap: {
    height: 96,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  imageCountBadge: {
    position: 'absolute',
    right: 9,
    bottom: 9,
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 13,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: 'rgba(47,36,29,0.72)',
  },
  imageCountText: {
    color: '#FFF8F0',
    fontSize: 11,
    fontWeight: '900',
  },
  contextRow: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  catLinkCard: {
    maxWidth: '68%',
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderRadius: 21,
    paddingLeft: 5,
    paddingRight: theme.spacing.sm,
    backgroundColor: 'rgba(248,234,210,0.66)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  catThumb: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFF8EC',
  },
  catThumbImage: {
    width: '100%',
    height: '100%',
  },
  catLinkCopy: {
    flexShrink: 1,
    minWidth: 0,
  },
  catPillText: {
    flexShrink: 1,
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  catMetaText: {
    marginTop: 1,
    color: theme.colors.mutedText,
    fontSize: 10,
    fontWeight: '800',
  },
  regionText: {
    flex: 1,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
  },
  statsRow: {
    marginTop: theme.spacing.md,
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  chevron: {
    marginLeft: 'auto',
  },
});
