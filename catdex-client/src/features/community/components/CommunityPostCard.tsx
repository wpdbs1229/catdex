import { Heart, MessageCircle, MoreHorizontal, ShieldAlert, Trash2, Edit3 } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { theme } from '@/shared/styles/theme';
import { CommunityPostMediaViewer } from '@/features/community/components/CommunityPostMediaViewer';
import type { CommunityPost, CommunityPostMedia } from '@/features/community/types';

interface CommunityPostCardProps {
  post: CommunityPost;
  currentUserId?: string;
  onToggleLike: (post: CommunityPost) => void;
  onOpenComments: (post: CommunityPost) => void;
  onOpenPost: (post: CommunityPost) => void;
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
  onOpenPost,
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
    <View style={styles.post}>
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

      <CommunityPostMediaViewer mediaList={post.mediaList} onOpenMedia={post.mediaList.length > 0 ? onOpenMedia : undefined} />

      <View style={styles.actionRow}>
        <Pressable onPress={() => onToggleLike(post)} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
          <Heart
            color={post.isLikedByMe ? '#C85B5B' : theme.colors.primaryDark}
            fill={post.isLikedByMe ? '#C85B5B' : 'transparent'}
            size={20}
          />
        </Pressable>
        <Pressable onPress={() => onOpenComments(post)} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
          <MessageCircle color={theme.colors.primaryDark} size={20} />
        </Pressable>
      </View>

      <Pressable onPress={() => onOpenPost(post)} style={({ pressed }) => [styles.caption, pressed && styles.pressed]}>
        <Text style={styles.likeText}>좋아요 {post.likeCount}개</Text>
        {post.content.length > 0 ? (
          <Text numberOfLines={3} style={styles.contentText}>
            <Text style={styles.captionAuthor}>{post.authorNickname} </Text>
            {post.content}
          </Text>
        ) : null}
        <Text style={styles.commentText}>
          {post.commentCount > 0 ? `댓글 ${post.commentCount}개 모두 보기` : '첫 댓글 남기기'}
        </Text>
        <Text style={styles.timeText}>{formatRelativeTime(post.createdAt)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  post: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderColor: 'rgba(139,112,83,0.16)',
  },
  header: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
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
    marginRight: theme.spacing.md,
    marginBottom: theme.spacing.sm,
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
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingTop: 9,
  },
  actionButton: {
    width: 36,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  caption: {
    gap: 5,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  likeText: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  captionAuthor: {
    color: theme.colors.text,
    fontWeight: '900',
  },
  commentText: {
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.78,
  },
});
