import { useCallback, useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AlertCircle, ArrowLeft, Edit3, Flag, Heart, ImagePlus, Images, MessageCircle, PawPrint, Send, ShieldCheck, Trash2 } from 'lucide-react-native';
import { communityComposerTopicOptions, communityTopicLabel } from '@/features/community/community.constants';
import {
  blockCommunityUser,
  createCommunityComment,
  deleteCommunityComment,
  deleteCommunityPost,
  fetchCommunityPost,
  reportCommunityContent,
  toggleCommunityPostLike,
  updateCommunityComment,
  updateCommunityPost,
  type CommunityReportReason,
  type CommunityReportTarget,
} from '@/shared/api/community.api';
import { getUserFacingError, type UserFacingError } from '@/shared/errors/user-facing-error';
import { createShadow, theme } from '@/shared/styles/theme';
import type { CommunityComment, CommunityPost, CommunityPostImageDraft, CommunityTopic } from '@/shared/types/community';
import { getRarityLabel } from '@/shared/utils/catPresentation';

const MAX_POST_IMAGES = 5;

interface CommunityPostDetailScreenProps {
  postId: string;
  currentUserId?: string | null;
  initiallyEditing?: boolean;
  onBack: () => void;
  onDeleted: () => void;
  onOpenCat: (catId: string) => void;
}

export function CommunityPostDetailScreen({ postId, currentUserId, initiallyEditing = false, onBack, onDeleted, onOpenCat }: CommunityPostDetailScreenProps) {
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [error, setError] = useState<UserFacingError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [replyDraft, setReplyDraft] = useState('');
  const [isReplySubmitting, setIsReplySubmitting] = useState(false);
  const [isLikeSubmitting, setIsLikeSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTopic, setEditTopic] = useState<CommunityTopic>('SIGHTING');
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editImages, setEditImages] = useState<CommunityPostImageDraft[]>([]);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasAppliedInitialEdit, setHasAppliedInitialEdit] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentEditDraft, setCommentEditDraft] = useState('');
  const [submittingCommentId, setSubmittingCommentId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const canManagePost = Boolean(post && currentUserId && post.author.id === currentUserId);

  const reportReasonOptions: { id: CommunityReportReason; label: string }[] = [
    { id: 'SPAM', label: '스팸·광고예요' },
    { id: 'ABUSE', label: '욕설·혐오 표현이에요' },
    { id: 'ANIMAL_ABUSE', label: '동물 학대가 의심돼요' },
    { id: 'LOCATION_EXPOSURE', label: '위치·개인정보가 노출됐어요' },
    { id: 'ETC', label: '기타 부적절한 내용이에요' },
  ];

  const handleSubmitReport = (target: CommunityReportTarget) => {
    Alert.alert('신고 사유를 선택해 주세요', '접수된 신고는 운영자가 확인한 뒤 조치해요.', [
      ...reportReasonOptions.map((reason) => ({
        text: reason.label,
        onPress: () => {
          reportCommunityContent(target, reason.id)
            .then(() => {
              Alert.alert('신고가 접수됐어요', '알려주셔서 고마워요. 빠르게 확인할게요.');
            })
            .catch((reportError) => {
              const friendlyError = getUserFacingError(reportError, 'generic');
              Alert.alert(friendlyError.title, friendlyError.message);
            });
        },
      })),
      { text: '취소', style: 'cancel' as const },
    ]);
  };

  const handleBlockAuthor = (author: { id: string; nickname: string }, options?: { leaveAfterBlock?: boolean }) => {
    Alert.alert(
      `${author.nickname}님을 차단할까요?`,
      '차단하면 이 사용자의 게시글과 댓글이 더 이상 보이지 않아요. 사원증 → 차단한 사용자에서 언제든 해제할 수 있어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '차단하기',
          style: 'destructive',
          onPress: () => {
            blockCommunityUser(author.id)
              .then(() => {
                if (options?.leaveAfterBlock) {
                  onDeleted();
                  return;
                }

                void refreshPost();
              })
              .catch((blockError) => {
                const friendlyError = getUserFacingError(blockError, 'generic');
                Alert.alert(friendlyError.title, friendlyError.message);
              });
          },
        },
      ],
    );
  };

  const handleOpenPostModerationMenu = () => {
    if (!post) {
      return;
    }

    Alert.alert('신고·차단', '이 게시글이나 작성자에 대해 조치할 수 있어요.', [
      { text: '게시글 신고', onPress: () => handleSubmitReport({ type: 'POST', targetId: post.id }) },
      { text: '작성자 신고', onPress: () => handleSubmitReport({ type: 'USER', targetId: post.author.id }) },
      { text: '작성자 차단', style: 'destructive', onPress: () => handleBlockAuthor(post.author, { leaveAfterBlock: true }) },
      { text: '취소', style: 'cancel' },
    ]);
  };

  const handleOpenCommentModerationMenu = (comment: CommunityComment) => {
    Alert.alert('신고·차단', '이 댓글이나 작성자에 대해 조치할 수 있어요.', [
      { text: '댓글 신고', onPress: () => handleSubmitReport({ type: 'COMMENT', targetId: comment.id }) },
      { text: '작성자 차단', style: 'destructive', onPress: () => handleBlockAuthor(comment.author) },
      { text: '취소', style: 'cancel' },
    ]);
  };
  const trimmedEditTitle = editTitle.trim();
  const trimmedEditBody = editBody.trim();
  const canSaveEdit = trimmedEditBody.length >= 2 && !isEditSubmitting;

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

  useEffect(() => {
    setHasAppliedInitialEdit(false);
  }, [initiallyEditing, postId]);

  useEffect(() => {
    if (!post || isEditing) {
      return;
    }

    setEditTopic(post.topic);
    setEditTitle(post.title);
    setEditBody(post.body);
    setEditImages(post.images.map((image) => ({ id: image.id, uri: image.uri, storagePath: image.storagePath })));
  }, [isEditing, post]);

  useEffect(() => {
    if (!initiallyEditing || hasAppliedInitialEdit || !post || !canManagePost) {
      return;
    }

    setError(null);
    setEditTopic(post.topic);
    setEditTitle(post.title);
    setEditBody(post.body);
    setEditImages(post.images.map((image) => ({ id: image.id, uri: image.uri, storagePath: image.storagePath })));
    setIsEditing(true);
    setHasAppliedInitialEdit(true);
  }, [canManagePost, hasAppliedInitialEdit, initiallyEditing, post]);

  const handleStartEditing = () => {
    if (!post || !canManagePost) {
      return;
    }

    setError(null);
    setEditTopic(post.topic);
    setEditTitle(post.title);
    setEditBody(post.body);
    setEditImages(post.images.map((image) => ({ id: image.id, uri: image.uri, storagePath: image.storagePath })));
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    if (post) {
      setEditTopic(post.topic);
      setEditTitle(post.title);
      setEditBody(post.body);
      setEditImages(post.images.map((image) => ({ id: image.id, uri: image.uri, storagePath: image.storagePath })));
    }

    setError(null);
    setIsEditing(false);
  };

  const handlePickEditImages = async () => {
    if (editImages.length >= MAX_POST_IMAGES) {
      Alert.alert('사진은 5장까지', '게시글 사진은 최대 5장까지 첨부할 수 있어요.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('사진 접근 권한 필요', '게시글 사진을 바꾸려면 사진 접근을 허용해 주세요.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ['images'],
      quality: 0.84,
      selectionLimit: MAX_POST_IMAGES - editImages.length,
    });

    if (result.canceled) {
      return;
    }

    const nextImages = result.assets.map((asset) => ({
      uri: asset.uri,
      mimeType: asset.mimeType,
    }));

    setError(null);
    setEditImages((current) => [...current, ...nextImages].slice(0, MAX_POST_IMAGES));
  };

  const handleRemoveEditImage = (index: number) => {
    setError(null);
    setEditImages((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleSaveEdit = async () => {
    if (!post || !canManagePost || !canSaveEdit) {
      return;
    }

    setIsEditSubmitting(true);
    setError(null);

    try {
      await updateCommunityPost(post.id, {
        topic: editTopic,
        title: trimmedEditTitle,
        body: trimmedEditBody,
        images: editImages,
      });
      setIsEditing(false);
      await refreshPost();
    } catch (nextError) {
      console.warn('[community] detail update failed', nextError);
      setError(getUserFacingError(nextError, 'community.update'));
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const deletePost = async () => {
    if (!post || !canManagePost || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteCommunityPost(post.id);
      onDeleted();
    } catch (nextError) {
      console.warn('[community] detail delete failed', nextError);
      setError(getUserFacingError(nextError, 'community.delete'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeletePost = () => {
    if (!post || !canManagePost) {
      return;
    }

    Alert.alert('게시글 삭제', '삭제하면 게시글과 댓글, 공감 기록이 함께 사라져요. 계속할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          void deletePost();
        },
      },
    ]);
  };

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

  const handleStartCommentEdit = (comment: CommunityComment) => {
    setError(null);
    setEditingCommentId(comment.id);
    setCommentEditDraft(comment.body);
  };

  const handleCancelCommentEdit = () => {
    setEditingCommentId(null);
    setCommentEditDraft('');
  };

  const handleSaveCommentEdit = async (commentId: string) => {
    const body = commentEditDraft.trim();

    if (!body || submittingCommentId) {
      return;
    }

    setSubmittingCommentId(commentId);
    setError(null);

    try {
      await updateCommunityComment(commentId, body);
      setEditingCommentId(null);
      setCommentEditDraft('');
      await refreshPost();
    } catch (nextError) {
      console.warn('[community] comment update failed', nextError);
      setError(getUserFacingError(nextError, 'community.comment'));
    } finally {
      setSubmittingCommentId(null);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (deletingCommentId) {
      return;
    }

    setDeletingCommentId(commentId);
    setError(null);

    try {
      await deleteCommunityComment(commentId);
      await refreshPost();
    } catch (nextError) {
      console.warn('[community] comment delete failed', nextError);
      setError(getUserFacingError(nextError, 'community.comment'));
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleDeleteComment = (comment: CommunityComment) => {
    Alert.alert('댓글 삭제', '이 댓글을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          void deleteComment(comment.id);
        },
      },
    ]);
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

              {isEditing ? null : <Text style={styles.title}>{post.title}</Text>}
              <Text style={styles.authorText}>{post.author.nickname} · {post.regionName ?? '동네'}</Text>

              {!canManagePost && currentUserId && !isEditing ? (
                <View style={styles.ownerActionRow}>
                  <Pressable
                    accessibilityLabel="게시글 신고 또는 작성자 차단"
                    accessibilityRole="button"
                    onPress={handleOpenPostModerationMenu}
                    style={({ pressed }) => [styles.ownerActionButton, pressed && styles.pressed]}
                  >
                    <Flag color={theme.colors.primaryDark} size={14} />
                    <Text style={styles.ownerActionText}>신고·차단</Text>
                  </Pressable>
                </View>
              ) : null}

              {canManagePost && !isEditing ? (
                <View style={styles.ownerActionRow}>
                  <Pressable
                    accessibilityLabel="게시글 수정"
                    accessibilityRole="button"
                    onPress={handleStartEditing}
                    style={({ pressed }) => [styles.ownerActionButton, pressed && styles.pressed]}
                  >
                    <Edit3 color={theme.colors.primaryDark} size={14} />
                    <Text style={styles.ownerActionText}>수정</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel="게시글 삭제"
                    accessibilityRole="button"
                    disabled={isDeleting}
                    onPress={handleDeletePost}
                    style={({ pressed }) => [styles.ownerActionButton, styles.deleteActionButton, isDeleting && styles.disabledOwnerActionButton, pressed && styles.pressed]}
                  >
                    <Trash2 color={theme.colors.primary} size={14} />
                    <Text style={styles.deleteActionText}>{isDeleting ? '삭제 중' : '삭제'}</Text>
                  </Pressable>
                </View>
              ) : null}

              {isEditing ? (
                <View style={styles.editPanel}>
                  <Text style={styles.editLabel}>주제</Text>
                  <View style={styles.editTopicRow}>
                    {communityComposerTopicOptions.map((option) => {
                      const isActive = editTopic === option.id;

                      return (
                        <Pressable
                          accessibilityLabel={`수정 주제 ${option.label}`}
                          accessibilityRole="button"
                          key={option.id}
                          onPress={() => setEditTopic(option.id)}
                          style={({ pressed }) => [styles.editTopicChip, isActive && styles.editTopicChipActive, pressed && styles.pressed]}
                        >
                          <Text style={[styles.editTopicText, isActive && styles.editTopicTextActive]}>{option.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={styles.editLabel}>제목</Text>
                  <TextInput
                    accessibilityLabel="게시글 제목 수정"
                    onChangeText={setEditTitle}
                    placeholder="제목"
                    placeholderTextColor="#A99178"
                    style={styles.editInput}
                    value={editTitle}
                  />

                  <Text style={styles.editLabel}>내용</Text>
                  <TextInput
                    accessibilityLabel="게시글 내용 수정"
                    multiline
                    onChangeText={setEditBody}
                    placeholder="내용"
                    placeholderTextColor="#A99178"
                    style={styles.editTextarea}
                    textAlignVertical="top"
                    value={editBody}
                  />
                  <Text style={[styles.editHelperText, trimmedEditBody.length < 2 && styles.editRequiredText]}>내용은 2자 이상 필요해요.</Text>

                  <View style={styles.editPhotoSection}>
                    <View style={styles.editPhotoHeader}>
                      <Text style={styles.editLabel}>사진</Text>
                      <Text style={styles.editPhotoCount}>{editImages.length}/{MAX_POST_IMAGES}</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.editPhotoRow}>
                      <Pressable
                        accessibilityLabel="게시글 사진 추가 또는 교체"
                        accessibilityRole="button"
                        disabled={editImages.length >= MAX_POST_IMAGES}
                        onPress={handlePickEditImages}
                        style={({ pressed }) => [styles.editAddPhotoButton, editImages.length >= MAX_POST_IMAGES && styles.editAddPhotoButtonDisabled, pressed && styles.pressed]}
                      >
                        <ImagePlus color={theme.colors.primary} size={21} />
                        <Text style={styles.editAddPhotoText}>사진 추가</Text>
                      </Pressable>
                      {editImages.map((image, index) => (
                        <View key={`${image.storagePath ?? image.uri}-${index}`} style={styles.editPhotoThumb}>
                          <Image source={{ uri: image.uri }} style={styles.editPhotoImage} />
                          <Pressable accessibilityLabel={`${index + 1}번째 게시글 사진 삭제`} accessibilityRole="button" onPress={() => handleRemoveEditImage(index)} style={styles.editRemovePhotoButton}>
                            <Trash2 color="#FFF8F0" size={14} />
                          </Pressable>
                        </View>
                      ))}
                    </ScrollView>
                    <Text style={styles.editHelperText}>삭제한 사진은 저장할 때 게시글에서 빠지고, 새 사진은 저장 후 표시돼요.</Text>
                  </View>

                  <View style={styles.editActionRow}>
                    <Pressable accessibilityLabel="게시글 수정 취소" accessibilityRole="button" onPress={handleCancelEditing} style={({ pressed }) => [styles.editCancelButton, pressed && styles.pressed]}>
                      <Text style={styles.editCancelText}>취소</Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel="게시글 수정 저장"
                      accessibilityRole="button"
                      disabled={!canSaveEdit}
                      onPress={handleSaveEdit}
                      style={({ pressed }) => [styles.editSaveButton, !canSaveEdit && styles.editSaveButtonDisabled, pressed && styles.pressed]}
                    >
                      {isEditSubmitting ? <ActivityIndicator color="#FFF8F0" size="small" /> : null}
                      <Text style={styles.editSaveText}>{isEditSubmitting ? '저장 중' : '저장'}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Text style={styles.body}>{post.body}</Text>
              )}

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
              {post.comments.map((comment) => {
                const canManageComment = Boolean(currentUserId && comment.author.id === currentUserId);
                const isCommentEditing = editingCommentId === comment.id;
                const isCommentSubmitting = submittingCommentId === comment.id;
                const isCommentDeleting = deletingCommentId === comment.id;

                return (
                  <View key={comment.id} style={styles.commentBubble}>
                    <View style={styles.commentMetaRow}>
                      <Text numberOfLines={1} style={styles.commentAuthor}>
                        {comment.author.nickname}
                      </Text>
                      <View style={styles.commentMetaRight}>
                        <Text style={styles.commentTime}>{comment.createdAt}</Text>
                        {!canManageComment && currentUserId ? (
                          <Pressable
                            accessibilityLabel="댓글 신고 또는 작성자 차단"
                            accessibilityRole="button"
                            hitSlop={8}
                            onPress={() => handleOpenCommentModerationMenu(comment)}
                            style={({ pressed }) => pressed && styles.pressed}
                          >
                            <Flag color={theme.colors.mutedText} size={13} />
                          </Pressable>
                        ) : null}
                      </View>
                    </View>

                    {isCommentEditing ? (
                      <View style={styles.commentEditPanel}>
                        <TextInput
                          accessibilityLabel="댓글 내용 수정"
                          multiline
                          onChangeText={setCommentEditDraft}
                          placeholder="댓글을 입력해 주세요"
                          placeholderTextColor="#A99178"
                          style={styles.commentEditInput}
                          value={commentEditDraft}
                        />
                        <View style={styles.commentEditActions}>
                          <Pressable accessibilityLabel="댓글 수정 취소" accessibilityRole="button" disabled={isCommentSubmitting} onPress={handleCancelCommentEdit} style={({ pressed }) => [styles.commentCancelButton, pressed && styles.pressed]}>
                            <Text style={styles.commentCancelText}>취소</Text>
                          </Pressable>
                          <Pressable
                            accessibilityLabel="댓글 수정 저장"
                            accessibilityRole="button"
                            disabled={!commentEditDraft.trim() || isCommentSubmitting}
                            onPress={() => handleSaveCommentEdit(comment.id)}
                            style={({ pressed }) => [styles.commentSaveButton, (!commentEditDraft.trim() || isCommentSubmitting) && styles.commentSaveButtonDisabled, pressed && styles.pressed]}
                          >
                            {isCommentSubmitting ? <ActivityIndicator color="#FFF8F0" size="small" /> : null}
                            <Text style={styles.commentSaveText}>{isCommentSubmitting ? '저장 중' : '저장'}</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <Text style={styles.commentBody}>{comment.body}</Text>
                    )}

                    {canManageComment && !isCommentEditing ? (
                      <View style={styles.commentActionRow}>
                        <Pressable accessibilityLabel="댓글 수정" accessibilityRole="button" onPress={() => handleStartCommentEdit(comment)} style={({ pressed }) => [styles.commentActionButton, pressed && styles.pressed]}>
                          <Edit3 color={theme.colors.primaryDark} size={13} />
                          <Text style={styles.commentActionText}>수정</Text>
                        </Pressable>
                        <Pressable
                          accessibilityLabel="댓글 삭제"
                          accessibilityRole="button"
                          disabled={isCommentDeleting}
                          onPress={() => handleDeleteComment(comment)}
                          style={({ pressed }) => [styles.commentActionButton, styles.commentDeleteButton, isCommentDeleting && styles.commentActionButtonDisabled, pressed && styles.pressed]}
                        >
                          <Trash2 color={theme.colors.primary} size={13} />
                          <Text style={styles.commentDeleteText}>{isCommentDeleting ? '삭제 중' : '삭제'}</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                );
              })}

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
  ownerActionRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  ownerActionButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 18,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(221,232,200,0.56)',
    borderWidth: 1,
    borderColor: 'rgba(111,131,77,0.12)',
  },
  deleteActionButton: {
    backgroundColor: 'rgba(255,239,221,0.72)',
    borderColor: 'rgba(196,122,66,0.18)',
  },
  disabledOwnerActionButton: {
    opacity: 0.5,
  },
  ownerActionText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  deleteActionText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  editPanel: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  editLabel: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  editTopicRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  editTopicChip: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(248,234,210,0.54)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  editTopicChipActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  editTopicText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  editTopicTextActive: {
    color: '#FFF8F0',
  },
  editInput: {
    minHeight: 44,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(248,234,210,0.54)',
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  editTextarea: {
    minHeight: 132,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    backgroundColor: 'rgba(248,234,210,0.54)',
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },
  editHelperText: {
    color: theme.colors.mutedText,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
  },
  editRequiredText: {
    color: theme.colors.primary,
  },
  editPhotoSection: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  editPhotoHeader: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  editPhotoCount: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '900',
  },
  editPhotoRow: {
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.lg,
  },
  editAddPhotoButton: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(248,234,210,0.54)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(139,112,83,0.28)',
  },
  editAddPhotoButtonDisabled: {
    opacity: 0.48,
  },
  editAddPhotoText: {
    color: theme.colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
  },
  editPhotoThumb: {
    width: 88,
    height: 88,
    overflow: 'hidden',
    borderRadius: theme.radius.lg,
    backgroundColor: '#FFF0DC',
  },
  editPhotoImage: {
    width: '100%',
    height: '100%',
  },
  editRemovePhotoButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: 'rgba(47,36,29,0.72)',
  },
  editActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  editCancelButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
  },
  editCancelText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  editSaveButton: {
    minHeight: 40,
    minWidth: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.primaryDark,
  },
  editSaveButtonDisabled: {
    opacity: 0.42,
  },
  editSaveText: {
    color: '#FFF8F0',
    fontSize: 12,
    fontWeight: '900',
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
  commentMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
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
  commentEditPanel: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  commentEditInput: {
    minHeight: 72,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    backgroundColor: 'rgba(248,234,210,0.54)',
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  commentEditActions: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  commentCancelButton: {
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
  },
  commentCancelText: {
    color: theme.colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
  },
  commentSaveButton: {
    minHeight: 32,
    minWidth: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 16,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.primaryDark,
  },
  commentSaveButtonDisabled: {
    opacity: 0.46,
  },
  commentSaveText: {
    color: '#FFF8F0',
    fontSize: 11,
    fontWeight: '900',
  },
  commentActionRow: {
    minHeight: 32,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  commentActionButton: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 15,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: 'rgba(221,232,200,0.56)',
    borderWidth: 1,
    borderColor: 'rgba(111,131,77,0.12)',
  },
  commentDeleteButton: {
    backgroundColor: 'rgba(255,239,221,0.72)',
    borderColor: 'rgba(196,122,66,0.18)',
  },
  commentActionButtonDisabled: {
    opacity: 0.5,
  },
  commentActionText: {
    color: theme.colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
  },
  commentDeleteText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '900',
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
