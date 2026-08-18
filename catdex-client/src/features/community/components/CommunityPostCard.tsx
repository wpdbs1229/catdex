import { ArrowUpDown, Heart, MessageCircle, PawPrint } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DEFAULT_PROFILE_AVATAR } from '@/shared/constants/profile.constants';
import { nd, theme } from '@/shared/styles/theme';
import type { CommunityPost } from '@/shared/types/community';

interface CommunityPostCardProps {
  post: CommunityPost;
  isLikePending: boolean;
  onOpenPost: (post: CommunityPost) => void;
  onToggleLike: (post: CommunityPost) => void;
  onOpenComments: (post: CommunityPost) => void;
}

function formatCount(value: number) {
  return String(Math.max(0, value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return '';
  }

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));

  if (elapsedMinutes < 1) {
    return '방금';
  }

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}분`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `${elapsedHours}시간`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);

  if (elapsedDays < 7) {
    return `${elapsedDays}일`;
  }

  const date = new Date(timestamp);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function AuthorAvatar({ imageUrl, nickname }: { imageUrl?: string; nickname: string }) {
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [imageUrl]);

  const hasPhoto = Boolean(imageUrl) && !hasImageError;

  return (
    <Image
      accessibilityLabel={`${nickname} ${hasPhoto ? '프로필' : '기본 프로필'}`}
      onError={() => setHasImageError(true)}
      source={hasPhoto ? { uri: imageUrl } : DEFAULT_PROFILE_AVATAR}
      style={styles.authorAvatar}
    />
  );
}

function PostImages({ imageUrls }: { imageUrls: string[] }) {
  if (imageUrls.length === 0) {
    return null;
  }

  if (imageUrls.length === 1) {
    return (
      <Image
        accessibilityLabel="게시글 사진"
        resizeMode="cover"
        source={{ uri: imageUrls[0] }}
        style={styles.singleImage}
      />
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.imageRow}
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
    >
      {imageUrls.map((imageUrl, index) => (
        <Image
          accessibilityLabel={`게시글 사진 ${index + 1}`}
          key={`${imageUrl}-${index}`}
          resizeMode="cover"
          source={{ uri: imageUrl }}
          style={styles.gridImage}
        />
      ))}
    </ScrollView>
  );
}

export function CommunityPostCard({
  post,
  isLikePending,
  onOpenPost,
  onToggleLike,
  onOpenComments,
}: CommunityPostCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.avatarRail}>
        <AuthorAvatar imageUrl={post.author.profileImageUrl} nickname={post.author.nickname} />

        {post.linkedCat ? (
          <>
            <ArrowUpDown color={nd.colors.sub} size={16} strokeWidth={1.6} />
            {post.linkedCat.imageUrl ? (
              <Image
                accessibilityLabel={`${post.linkedCat.name} 사진`}
                source={{ uri: post.linkedCat.imageUrl }}
                style={styles.catAvatar}
              />
            ) : (
              <View style={[styles.catAvatar, styles.avatarFallback]}>
                <PawPrint color={nd.colors.sub} size={16} strokeWidth={1.7} />
              </View>
            )}
          </>
        ) : null}
      </View>

      <View style={styles.content}>
        <Pressable
          accessibilityLabel={`${post.author.nickname}의 게시글 상세 보기`}
          accessibilityRole="button"
          onPress={() => onOpenPost(post)}
          style={({ pressed }) => [styles.copy, pressed && styles.pressed]}
        >
          <View style={styles.authorMeta}>
            <Text numberOfLines={1} style={styles.nickname}>
              {post.author.nickname}
            </Text>
            <Text style={styles.time}>{formatRelativeTime(post.createdAt)}</Text>
          </View>
          <Text style={styles.body}>{post.content}</Text>
        </Pressable>

        <Pressable onPress={() => onOpenPost(post)}>
          <PostImages imageUrls={post.imageUrls} />
        </Pressable>

        <View style={styles.metrics}>
          <Pressable
            accessibilityLabel={post.isLikedByMe ? '공감 취소' : '공감하기'}
            accessibilityRole="button"
            disabled={isLikePending}
            hitSlop={6}
            onPress={() => onToggleLike(post)}
            style={({ pressed }) => [styles.metric, pressed && styles.pressed]}
          >
            <Heart
              color={post.isLikedByMe ? theme.colors.accent : '#505050'}
              fill={post.isLikedByMe ? theme.colors.accent : 'transparent'}
              size={20}
              strokeWidth={1.7}
            />
            <Text style={styles.metricText}>{formatCount(post.likeCount)}</Text>
          </Pressable>

          <Pressable
            accessibilityLabel={`댓글 ${post.commentCount}개 보기`}
            accessibilityRole="button"
            hitSlop={6}
            onPress={() => onOpenComments(post)}
            style={({ pressed }) => [styles.metric, pressed && styles.pressed]}
          >
            <MessageCircle color="#505050" size={20} strokeWidth={1.7} />
            <Text style={styles.metricText}>{formatCount(post.commentCount)}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 16,
  },
  avatarRail: {
    width: 42,
    alignItems: 'center',
    gap: 4,
  },
  authorAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: nd.colors.field,
  },
  catAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F1F5',
    backgroundColor: nd.colors.bg,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    minWidth: 0,
    alignItems: 'stretch',
    gap: 12,
  },
  copy: {
    gap: 2,
  },
  authorMeta: {
    gap: 2,
  },
  nickname: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.375,
    color: nd.colors.ink,
  },
  time: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.35,
    color: nd.colors.sub,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  singleImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    backgroundColor: nd.colors.field,
  },
  imageRow: {
    gap: 8,
  },
  gridImage: {
    width: 160,
    height: 160,
    borderRadius: 16,
    backgroundColor: nd.colors.field,
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metric: {
    width: 56,
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  metricText: {
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.325,
    color: '#505050',
  },
  pressed: {
    opacity: 0.72,
  },
});
