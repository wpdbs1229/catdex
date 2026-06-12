import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ImageSourcePropType } from 'react-native';
import { ChevronLeft, Send } from 'lucide-react-native';
import { CommunityCommentItem } from '@/features/community/components/CommunityCommentItem';
import { CommunityErrorState } from '@/features/community/components/CommunityStates';
import { CommunityPostMediaViewer } from '@/features/community/components/CommunityPostMediaViewer';
import { theme } from '@/shared/styles/theme';
import type { AuthUser } from '@/shared/types/auth';
import type { CommunityComment, CommunityPost, CommunityPostMedia } from '@/features/community/types';

interface CommunityCommentsScreenProps {
  currentUser: AuthUser | null;
  post: CommunityPost | null;
  onBack: () => void;
  onLoadComments: (postId: string) => Promise<CommunityComment[]>;
  onCreateComment: (postId: string, content: string, author: AuthUser) => Promise<CommunityComment> | CommunityComment;
  onDeleteComment: (postId: string, commentId: string, user: AuthUser) => Promise<void> | void;
  onOpenMedia?: (post: CommunityPost, media: CommunityPostMedia) => void;
}

const illustrations = {
  profile: require('../../../assets/illustrations/profile-cat.png'),
} satisfies Record<string, ImageSourcePropType>;

export function CommunityCommentsScreen({
  currentUser,
  post,
  onBack,
  onLoadComments,
  onCreateComment,
  onDeleteComment,
  onOpenMedia,
}: CommunityCommentsScreenProps) {
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const canSubmit = Boolean(input.trim()) && !isSubmitting;

  const loadComments = useCallback(async () => {
    if (!post) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      setComments(await onLoadComments(post.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '댓글을 불러오지 못했어요.');
    } finally {
      setIsLoading(false);
    }
  }, [onLoadComments, post]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const requireLogin = () => {
    Alert.alert('로그인이 필요해요', '댓글 작성은 로그인 후 이용할 수 있어요.');
  };

  const handleSubmit = async () => {
    if (!post) {
      return;
    }

    if (!currentUser) {
      requireLogin();
      return;
    }

    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);

    try {
      const createdComment = await onCreateComment(post.id, input.trim(), currentUser);
      setComments((previous) => [...previous, createdComment]);
      setInput('');
    } catch (error) {
      Alert.alert('댓글 등록 실패', error instanceof Error ? error.message : '댓글을 등록하지 못했어요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (comment: CommunityComment) => {
    if (!post || !currentUser) {
      requireLogin();
      return;
    }

    Alert.alert('댓글 삭제', '이 댓글을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await onDeleteComment(post.id, comment.id, currentUser);
            setComments((previous) => previous.filter((item) => item.id !== comment.id));
          } catch (error) {
            Alert.alert('삭제 실패', error instanceof Error ? error.message : '댓글을 삭제하지 못했어요.');
          }
        },
      },
    ]);
  };

  if (!post) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <ChevronLeft color={theme.colors.primaryDark} size={22} />
          </Pressable>
          <Text style={styles.title}>게시글</Text>
          <View style={styles.headerSpacer} />
        </View>
        <CommunityErrorState message="게시글을 찾지 못했어요." onRetry={onBack} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <ChevronLeft color={theme.colors.primaryDark} size={22} />
        </Pressable>
        <Text style={styles.title}>게시글</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.commentList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.postBlock}>
          <View style={styles.postHeader}>
            <Image
              resizeMode="cover"
              source={post.authorProfileImageUrl ? { uri: post.authorProfileImageUrl } : illustrations.profile}
              style={styles.avatar}
            />
            <View style={styles.postAuthorBlock}>
              <Text numberOfLines={1} style={styles.postAuthor}>
                {post.authorNickname}
              </Text>
              <Text style={styles.postMeta}>좋아요 {post.likeCount}개 · 댓글 {post.commentCount}개</Text>
            </View>
          </View>
          <CommunityPostMediaViewer mediaList={post.mediaList} onOpenMedia={onOpenMedia ? (media) => onOpenMedia(post, media) : undefined} />
          {post.content.length > 0 ? (
            <View style={styles.postCaption}>
              <Text style={styles.postContent}>
                <Text style={styles.postAuthorInline}>{post.authorNickname} </Text>
                {post.content}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.commentsSection}>
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.colors.primaryDark} />
            <Text style={styles.loadingText}>댓글을 불러오는 중...</Text>
          </View>
        ) : errorMessage ? (
          <CommunityErrorState message={errorMessage} onRetry={loadComments} />
        ) : comments.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>아직 댓글이 없어요.</Text>
            <Text style={styles.emptyText}>첫 댓글을 남겨보세요.</Text>
          </View>
        ) : (
          comments.map((comment) => (
            <CommunityCommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUser?.id}
              onDelete={handleDelete}
            />
          ))
        )}
        </View>
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          editable={!isSubmitting}
          onChangeText={setInput}
          placeholder="댓글을 입력하세요..."
          placeholderTextColor="#B59680"
          style={styles.input}
          value={input}
        />
        <Pressable
          disabled={!canSubmit}
          onPress={handleSubmit}
          style={({ pressed }) => [styles.sendButton, canSubmit && styles.sendButtonActive, pressed && canSubmit && styles.pressed]}
        >
          <Send color={canSubmit ? '#FFF8F0' : theme.colors.mutedText} size={18} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: theme.spacing.md,
    paddingBottom: 112,
    gap: theme.spacing.md,
  },
  header: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,253,246,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.82)',
  },
  title: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 42,
  },
  commentList: {
    paddingBottom: theme.spacing.lg,
  },
  postBlock: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderColor: 'rgba(139,112,83,0.16)',
  },
  postHeader: {
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
  postAuthorBlock: {
    flex: 1,
    minWidth: 0,
  },
  postAuthor: {
    color: theme.colors.primaryDark,
    fontSize: 14,
    fontWeight: '900',
  },
  postMeta: {
    marginTop: 2,
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '700',
  },
  postCaption: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  postContent: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  postAuthorInline: {
    fontWeight: '900',
  },
  commentsSection: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  loadingBox: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  loadingText: {
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyBox: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  emptyText: {
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
  },
  composer: {
    marginHorizontal: theme.spacing.lg,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: 27,
    paddingLeft: theme.spacing.lg,
    paddingRight: 6,
    backgroundColor: 'rgba(255,253,246,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
  },
  input: {
    flex: 1,
    minHeight: 46,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232,211,183,0.45)',
  },
  sendButtonActive: {
    backgroundColor: theme.colors.primaryDark,
  },
  pressed: {
    opacity: 0.82,
  },
});
