import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronLeft, Send } from 'lucide-react-native';
import { CommunityCommentItem } from '@/features/community/components/CommunityCommentItem';
import { CommunityErrorState } from '@/features/community/components/CommunityStates';
import { theme } from '@/shared/styles/theme';
import type { AuthUser } from '@/shared/types/auth';
import type { CommunityComment, CommunityPost } from '@/features/community/types';

interface CommunityCommentsScreenProps {
  currentUser: AuthUser | null;
  post: CommunityPost | null;
  onBack: () => void;
  onLoadComments: (postId: string) => Promise<CommunityComment[]>;
  onCreateComment: (postId: string, content: string, author: AuthUser) => Promise<CommunityComment> | CommunityComment;
  onDeleteComment: (postId: string, commentId: string, user: AuthUser) => Promise<void> | void;
}

export function CommunityCommentsScreen({
  currentUser,
  post,
  onBack,
  onLoadComments,
  onCreateComment,
  onDeleteComment,
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
          <Text style={styles.title}>댓글</Text>
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
        <Text style={styles.title}>댓글</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.commentList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.postSummary}>
          <Text numberOfLines={1} style={styles.postAuthor}>
            {post.authorNickname}
          </Text>
          <Text numberOfLines={2} style={styles.postContent}>
            {post.content || '미디어 게시글'}
          </Text>
        </View>

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
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 112,
    gap: theme.spacing.md,
  },
  header: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
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
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  postSummary: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.72)',
  },
  postAuthor: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  postContent: {
    marginTop: 4,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
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
