import { Trash2 } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { theme } from '@/shared/styles/theme';
import type { CommunityComment } from '@/features/community/types';

interface CommunityCommentItemProps {
  comment: CommunityComment;
  currentUserId?: string;
  onDelete: (comment: CommunityComment) => void;
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

  return hours < 24 ? `${hours}시간 전` : `${Math.floor(hours / 24)}일 전`;
}

export function CommunityCommentItem({ comment, currentUserId, onDelete }: CommunityCommentItemProps) {
  const canDelete = currentUserId === comment.authorId;

  return (
    <View style={styles.container}>
      <Image
        resizeMode="cover"
        source={comment.authorProfileImageUrl ? { uri: comment.authorProfileImageUrl } : illustrations.profile}
        style={styles.avatar}
      />
      <View style={styles.body}>
        <View style={styles.metaRow}>
          <Text numberOfLines={1} style={styles.nickname}>
            {comment.authorNickname}
          </Text>
          <Text style={styles.timeText}>{formatRelativeTime(comment.createdAt)}</Text>
        </View>
        <Text style={styles.contentText}>{comment.content}</Text>
      </View>
      {canDelete ? (
        <Pressable onPress={() => onDelete(comment)} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
          <Trash2 color="#A84E3D" size={16} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.66)',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: 'rgba(201,121,73,0.2)',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  nickname: {
    flexShrink: 1,
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  timeText: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '700',
  },
  contentText: {
    marginTop: 4,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
