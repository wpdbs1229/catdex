import { Heart, MessageCircle, MoreHorizontal, ShieldAlert, Trash2, Edit3 } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Card } from '@/shared/components/Card';
import { theme } from '@/shared/styles/theme';
import { CommunityPostMediaViewer } from '@/features/community/components/CommunityPostMediaViewer';
import type { CommunityPost, CommunityPostMedia } from '@/features/community/types';

interface CommunityPostCardProps {
  post: CommunityPost;
  currentUserId?: string;
  onToggleLike: (post: CommunityPost) => void;
  onOpenComments: (post: CommunityPost) => void;
  onOpenMedia: (media: CommunityPostMedia) => void;
  onDeletePost: (post: CommunityPost) => void;
  onReportPost: (post: CommunityPost) => void;
  onEditPost: (post: CommunityPost) => void;
  openMenuPostId: string | null;
  onToggleMenu: (postId: string) => void;
}

const illustrations = {
  profile: require('../../../../assets/illustrations/profile-cat.png'),
} satisfies Record<string, ImageSourcePropType>;

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));

  if (minutes < 1) {
    return '방금 전';
  }

  if (minutes < 60) {
    return `${minutes}분 전`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}시간 전`;
  }

  const days = Math.floor(hours / 24);

  return `${days}일 전`;
}

export function CommunityPostCard({
  post,
  currentUserId,
  onToggleLike,
  onOpenComments,
  onOpenMedia,
  onDeletePost,
  onReportPost,
  onEditPost,
  openMenuPostId,
  onToggleMenu,
}: CommunityPostCardProps) {
  const isMine = currentUserId === post.authorId;
  const isMenuOpen = openMenuPostId === post.id;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Image
          resizeMode="cover"
          source={post.authorProfileImageUrl ? { uri: post.authorProfileImageUrl } : illustrations.profile}
          style={styles.avatar}
        />
        <View style={styles.authorCopy}>
          <Text numberOfLines={1} style={styles.nickname}>
            {post.authorNickname}
          </Text>
          <Text style={styles.timeText}>{formatRelativeTime(post.createdAt)}</Text>
        </View>
        <Pressable
          accessibilityLabel="게시글 메뉴"
          onPress={() => onToggleMenu(post.id)}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <MoreHorizontal color={theme.colors.primaryDark} size={21} />
        </Pressable>
      </View>

      {isMenuOpen ? (
        <View style={styles.menu}>
          {isMine ? (
            <>
              <Pressable onPress={() => onEditPost(post)} style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}>
                <Edit3 color={theme.colors.primaryDark} size={15} />
                <Text style={styles.menuText}>수정</Text>
              </Pressable>
              <Pressable onPress={() => onDeletePost(post)} style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}>
                <Trash2 color="#A84E3D" size={15} />
                <Text style={[styles.menuText, styles.dangerText]}>삭제</Text>
              </Pressable>
            </>
          ) : (
            <Pressable onPress={() => onReportPost(post)} style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}>
              <ShieldAlert color="#A84E3D" size={15} />
              <Text style={[styles.menuText, styles.dangerText]}>신고</Text>
            </Pressable>
          )}
        </View>
      ) : null}

      {post.content.length > 0 ? <Text style={styles.contentText}>{post.content}</Text> : null}

      <CommunityPostMediaViewer mediaList={post.mediaList} onOpenMedia={onOpenMedia} />

      <View style={styles.actionRow}>
        <Pressable onPress={() => onToggleLike(post)} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
          <Heart
            color={post.isLikedByMe ? '#C85B5B' : theme.colors.primaryDark}
            fill={post.isLikedByMe ? '#C85B5B' : 'transparent'}
            size={20}
          />
          <Text style={[styles.actionText, post.isLikedByMe && styles.likedText]}>좋아요 {post.likeCount}</Text>
        </Pressable>
        <Pressable onPress={() => onOpenComments(post)} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
          <MessageCircle color={theme.colors.primaryDark} size={20} />
          <Text style={styles.actionText}>댓글 {post.commentCount}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: 'rgba(201,121,73,0.2)',
  },
  authorCopy: {
    flex: 1,
    minWidth: 0,
  },
  nickname: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  timeText: {
    marginTop: 2,
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '700',
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: {
    alignSelf: 'flex-end',
    minWidth: 124,
    overflow: 'hidden',
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(255,253,246,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.16)',
  },
  menuItem: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  menuText: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
  },
  dangerText: {
    color: '#A84E3D',
  },
  contentText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  actionButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 18,
    paddingHorizontal: theme.spacing.sm,
  },
  actionText: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
  },
  likedText: {
    color: '#C85B5B',
  },
  pressed: {
    opacity: 0.78,
  },
});
