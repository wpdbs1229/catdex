import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AlertCircle, ArrowLeft, Heart, Images, MessageCircle, PawPrint, Send, ShieldCheck } from 'lucide-react-native';
import { communityTopicLabel } from '@/features/community/community.constants';
import {
  createCommunityComment,
  fetchCommunityPost,
  toggleCommunityPostLike,
} from '@/shared/api/community.api';
import { getUserFacingError, type UserFacingError } from '@/shared/errors/user-facing-error';
import { createShadow, theme } from '@/shared/styles/theme';
import type { CommunityPost } from '@/shared/types/community';
import { getRarityLabel } from '@/shared/utils/catPresentation';

interface CommunityPostDetailScreenProps {
  postId: string;
  onBack: () => void;
  onOpenCat: (catId: string) => void;
}

export function CommunityPostDetailScreen({ postId, onBack, onOpenCat }: CommunityPostDetailScreenProps) {
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [error, setError] = useState<UserFacingError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [replyDraft, setReplyDraft] = useState('');
  const [isReplySubmitting, setIsReplySubmitting] = useState(false);
  const [isLikeSubmitting, setIsLikeSubmitting] = useState(false);

  const refreshPost = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextPost = await fetchCommunityPost(postId);
      setPost(nextPost);
    } catch (nextError) {
      console.warn('[community] detail load failed', nextError);
      setPost(null);
      setError(getUserFacingError(nextError, 'community.load'));
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void refreshPost();
  }, [refreshPost]);

  const handleToggleLike = async () => {
    if (!post || isLikeSubmitting) {
      return;
    }

    setIsLikeSubmitting(true);
    setPost((current) =>
      current
        ? {
            ...current,
            likedByMe: !current.likedByMe,
            likeCount: Math.max(0, current.likeCount + (current.likedByMe ? -1 : 1)),
          }
        : current,
    );

    try {
      await toggleCommunityPostLike(post.id, post.likedByMe);
    } catch (nextError) {
      console.warn('[community] detail like failed', nextError);
      setError(getUserFacingError(nextError, 'community.like'));
      await refreshPost();
    } finally {
      setIsLikeSubmitting(false);
    }
  };

  const handleSubmitReply = async () => {
    const body = replyDraft.trim();

    if (!post || !body || isReplySubmitting) {
      return;
    }

    setIsReplySubmitting(true);
    setError(null);

    try {
      await createCommunityComment(post.id, body);
      setReplyDraft('');
      await refreshPost();
    } catch (nextError) {
      console.warn('[community] detail comment failed', nextError);
      setError(getUserFacingError(nextError, 'community.comment'));
    } finally {
      setIsReplySubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable accessibilityLabel="게시판으로 돌아가기" accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <ArrowLeft color={theme.colors.text} size={20} />
          </Pressable>
          <Text style={styles.topTitle}>게시글</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        {isLoading && !post ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={theme.colors.primaryDark} />
            <Text style={styles.loadingText}>게시글을 불러오는 중</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <AlertCircle color={theme.colors.primary} size={18} />
            <View style={styles.errorCopy}>
              <Text style={styles.errorTitle}>{error.title}</Text>
              <Text style={styles.errorText}>{error.message}</Text>
            </View>
            <Pressable accessibilityLabel="게시글 다시 불러오기" accessibilityRole="button" onPress={() => refreshPost()} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
              <Text style={styles.retryText}>다시</Text>
            </Pressable>
          </View>
        ) : null}

        {post ? (
          <>
            <View style={styles.articleCard}>
              <View style={styles.articleMetaRow}>
                <View style={styles.topicBadge}>
                  <MessageCircle color={theme.colors.accent} size={13} />
                  <Text style={styles.topicText}>{communityTopicLabel[post.topic]}</Text>
                </View>
                <Text numberOfLines={1} style={styles.timeText}>
                  {post.createdAt}
                </Text>
              </View>

              <Text style={styles.title}>{post.title}</Text>
              <Text style={styles.authorText}>{post.author.nickname} · {post.regionName ?? '동네'}</Text>
              <Text style={styles.body}>{post.body}</Text>

              {post.imageUrls.length > 0 ? (
                <View style={styles.photoStack}>
                  <View style={styles.mainPhotoWrap}>
                    <Image source={{ uri: post.imageUrls[0] }} style={styles.mainPhoto} />
                    {post.imageUrls.length > 1 ? (
                      <View style={styles.imageCountBadge}>
                        <Images color="#FFF8F0" size={14} />
                        <Text style={styles.imageCountText}>{post.imageUrls.length}</Text>
                      </View>
                    ) : null}
                  </View>
                  {post.imageUrls.length > 1 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailRow}>
                      {post.imageUrls.slice(1).map((imageUrl, index) => (
                        <View key={`${imageUrl}-${index}`} style={styles.thumbnailWrap}>
                          <Image source={{ uri: imageUrl }} style={styles.thumbnailImage} />
                        </View>
                      ))}
                    </ScrollView>
                  ) : null}
                </View>
              ) : null}

              {post.catId ? (
                <Pressable
                  accessibilityLabel={`${post.catName ?? '관련 고양이'} 도감 보기`}
                  accessibilityRole="button"
                  onPress={() => onOpenCat(post.catId as string)}
                  style={({ pressed }) => [styles.catLinkCard, pressed && styles.pressed]}
                >
                  <View style={styles.catLinkIcon}>
                    {post.catImageUrl ? <Image source={{ uri: post.catImageUrl }} style={styles.catLinkImage} /> : <PawPrint color={theme.colors.primary} size={18} />}
                  </View>
                  <View style={styles.catLinkCopy}>
                    <Text style={styles.catLinkLabel}>연결된 도감</Text>
                    <Text numberOfLines={1} style={styles.catLinkName}>
                      {post.catName ?? '도감 고양이'}
                    </Text>
                    <Text numberOfLines={1} style={styles.catLinkMeta}>
                      {[post.catType, post.catRarity ? getRarityLabel(post.catRarity as 1 | 2 | 3 | 4 | 5) : undefined, post.regionName].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <Text style={styles.catLinkAction}>보기</Text>
                </Pressable>
              ) : null}

              <View style={styles.actionRow}>
                <Pressable
                  accessibilityLabel="게시글 공감"
                  accessibilityRole="button"
                  disabled={isLikeSubmitting}
                  onPress={handleToggleLike}
                  style={({ pressed }) => [styles.actionButton, post.likedByMe && styles.actionButtonActive, pressed && styles.pressed]}
                >
                  <Heart color={post.likedByMe ? '#FFF8F0' : theme.colors.primary} fill={post.likedByMe ? '#FFF8F0' : 'transparent'} size={16} />
                  <Text style={[styles.actionText, post.likedByMe && styles.actionTextActive]}>공감 {post.likeCount}</Text>
                </Pressable>
                <View style={styles.commentCountPill}>
                  <MessageCircle color={theme.colors.accent} size={16} />
                  <Text style={styles.commentCountText}>댓글 {post.commentCount}</Text>
                </View>
              </View>
            </View>

            <View style={styles.commentHeader}>
              <Text style={styles.commentTitle}>댓글</Text>
              <Text style={styles.commentMeta}>{post.commentCount}개</Text>
            </View>

            <View style={styles.commentStack}>
              {post.comments.map((comment) => (
                <View key={comment.id} style={styles.commentBubble}>
                  <View style={styles.commentMetaRow}>
                    <Text numberOfLines={1} style={styles.commentAuthor}>
                      {comment.author.nickname}
                    </Text>
                    <Text style={styles.commentTime}>{comment.createdAt}</Text>
                  </View>
                  <Text style={styles.commentBody}>{comment.body}</Text>
                </View>
              ))}

              {post.comments.length === 0 ? (
                <View style={styles.emptyCommentCard}>
                  <MessageCircle color="#CDB58F" size={24} />
                  <Text style={styles.emptyCommentText}>아직 댓글이 없어요. 첫 댓글을 남겨보세요.</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.safetyStrip}>
              <ShieldCheck color={theme.colors.accent} size={17} />
              <Text style={styles.safetyText}>정확한 위치, 급식소, 은신처는 댓글에도 남기지 않는 게 좋아요.</Text>
            </View>
          </>
        ) : null}
      </ScrollView>

      {post ? (
        <View style={styles.replyDock}>
          <TextInput
            accessibilityLabel="댓글 입력"
            onChangeText={setReplyDraft}
            placeholder="댓글을 남겨보세요"
            placeholderTextColor="#A99178"
            style={styles.replyInput}
            value={replyDraft}
          />
          <Pressable
            accessibilityLabel="댓글 보내기"
            accessibilityRole="button"
            disabled={!replyDraft.trim() || isReplySubmitting}
            onPress={handleSubmitReply}
            style={({ pressed }) => [styles.replySendButton, (!replyDraft.trim() || isReplySubmitting) && styles.replySendButtonDisabled, pressed && styles.pressed]}
          >
            <Send color="#FFF8F0" size={16} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 206,
  },
  topBar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255,253,246,0.78)',
  },
  backButtonPlaceholder: {
    width: 44,
  },
  topTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  loadingCard: {
    minHeight: 132,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.xl,
    backgroundColor: 'rgba(255,253,246,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  loadingText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  errorCard: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(255,239,221,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(196,122,66,0.18)',
  },
  errorCopy: {
    flex: 1,
    minWidth: 0,
  },
  errorTitle: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  errorText: {
    marginTop: 2,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  retryButton: {
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: 'rgba(255,253,246,0.78)',
  },
  retryText: {
    color: theme.colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
  },
  articleCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
    ...createShadow(5),
  },
  articleMetaRow: {
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
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    marginTop: theme.spacing.md,
    color: theme.colors.text,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '900',
  },
  authorText: {
    marginTop: 6,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
  },
  body: {
    marginTop: theme.spacing.lg,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '700',
  },
  photoStack: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  mainPhotoWrap: {
    height: 236,
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    backgroundColor: '#FFF0DC',
  },
  mainPhoto: {
    width: '100%',
    height: '100%',
  },
  imageCountBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 14,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: 'rgba(47,36,29,0.72)',
  },
  imageCountText: {
    color: '#FFF8F0',
    fontSize: 12,
    fontWeight: '900',
  },
  thumbnailRow: {
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.lg,
  },
  thumbnailWrap: {
    width: 74,
    height: 74,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: '#FFF0DC',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  catLinkCard: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
    backgroundColor: 'rgba(248,234,210,0.54)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  catLinkIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,253,246,0.78)',
  },
  catLinkImage: {
    width: '100%',
    height: '100%',
  },
  catLinkCopy: {
    flex: 1,
    minWidth: 0,
  },
  catLinkLabel: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  catLinkName: {
    marginTop: 3,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  catLinkMeta: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
  },
  catLinkAction: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  actionRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  actionButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 19,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
  },
  actionButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  actionText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  actionTextActive: {
    color: '#FFF8F0',
  },
  commentCountPill: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 19,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(221,232,200,0.58)',
  },
  commentCountText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  commentMeta: {
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '900',
  },
  commentStack: {
    gap: theme.spacing.sm,
  },
  commentBubble: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  commentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  commentAuthor: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  commentTime: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
  },
  commentBody: {
    marginTop: 6,
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  emptyCommentCard: {
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  emptyCommentText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  safetyStrip: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(221,232,200,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(111,131,77,0.12)',
  },
  safetyText: {
    flex: 1,
    color: theme.colors.primaryDark,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
  replyDock: {
    position: 'absolute',
    right: theme.spacing.lg,
    bottom: 94,
    left: theme.spacing.lg,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: 28,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(255,253,246,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.13)',
    ...createShadow(8),
  },
  replyInput: {
    flex: 1,
    minHeight: 40,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(248,234,210,0.54)',
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  replySendButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: theme.colors.primaryDark,
  },
  replySendButtonDisabled: {
    opacity: 0.42,
  },
  pressed: {
    opacity: 0.82,
  },
});
