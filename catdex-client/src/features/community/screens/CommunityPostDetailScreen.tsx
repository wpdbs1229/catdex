import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  Circle,
  Heart,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  PawPrint,
  Send,
  StickyNote,
  UserRound,
  X,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MapStackParamList } from '@/app/navigation/types';
import {
  createCommunityComment,
  deleteCommunityPost,
  fetchCommunityPost,
  reportCommunityPost,
  setCommunityCommentLiked,
  setCommunityPostBookmarked,
  setCommunityPostLiked,
} from '@/shared/api/community.api';
import { getUserFacingError } from '@/shared/errors/user-facing-error';
import { nd } from '@/shared/styles/theme';
import type {
  CommunityAuthor,
  CommunityPostDetail,
  CommunityReportReason,
  CommunityTopic,
} from '@/shared/types/community';

const topicLabels: Record<CommunityTopic, string> = {
  SIGHTING: '고객 목격',
  VERIFY: '질문',
  STATUS: '상태 공유',
  INFO: '정보 공유',
};

const reportReasons: Array<{
  id: CommunityReportReason;
  label: string;
  description: string;
}> = [
  { id: 'SPAM', label: '스팸·광고', description: '반복 홍보나 상업성 내용이에요.' },
  { id: 'ABUSE', label: '욕설·괴롭힘', description: '다른 사용자를 공격하거나 불쾌하게 해요.' },
  { id: 'INAPPROPRIATE_IMAGE', label: '부적절한 이미지', description: '불쾌하거나 노골적인 이미지가 있어요.' },
  { id: 'PRIVACY', label: '개인정보 노출', description: '사람의 개인정보가 포함되어 있어요.' },
  { id: 'ANIMAL_ABUSE', label: '동물 학대', description: '동물에게 위험하거나 학대하는 내용이에요.' },
  { id: 'LOCATION_EXPOSURE', label: '민감한 위치 노출', description: '고양이의 안전을 해칠 수 있는 위치예요.' },
  { id: 'ETC', label: '기타', description: '다른 이유로 운영팀의 확인이 필요해요.' },
];

function formatDateTime(value: string | undefined) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return '';
  }

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

  return isToday
    ? `오늘 ${time}`
    : `${date.getMonth() + 1}.${String(date.getDate()).padStart(2, '0')} ${time}`;
}

function ProfileAvatar({ author, size = 42 }: { author: CommunityAuthor; size?: number }) {
  const [hasError, setHasError] = useState(false);

  return author.profileImageUrl && !hasError ? (
    <Image
      accessibilityLabel={`${author.nickname} 프로필`}
      onError={() => setHasError(true)}
      source={{ uri: author.profileImageUrl }}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: nd.colors.field }}
    />
  ) : (
    <View
      accessibilityLabel={`${author.nickname} 기본 프로필`}
      style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <UserRound color={nd.colors.sub} size={size * 0.48} strokeWidth={1.6} />
    </View>
  );
}

export function CommunityPostDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MapStackParamList>>();
  const route = useRoute<RouteProp<MapStackParamList, 'CommunityPostDetail'>>();
  const { width } = useWindowDimensions();
  const [post, setPost] = useState<CommunityPostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [pendingCommentLikeIds, setPendingCommentLikeIds] = useState<Set<string>>(new Set());
  const [isReportReasonOpen, setIsReportReasonOpen] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState<CommunityReportReason | null>(null);
  const [isReporting, setIsReporting] = useState(false);

  const loadPost = useCallback(async (refreshing = false) => {
    refreshing ? setIsRefreshing(true) : setIsLoading(true);
    setErrorMessage(null);

    try {
      setPost(await fetchCommunityPost(route.params.postId));
    } catch (error) {
      const userError = getUserFacingError(error, 'community.load');
      setErrorMessage(userError.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [route.params.postId]);

  useFocusEffect(
    useCallback(() => {
      void loadPost();
    }, [loadPost]),
  );

  const heroWidth = Math.max(240, width - 32);
  const displayAuthor = useMemo<CommunityAuthor | null>(() => {
    if (!post) {
      return null;
    }

    return post.linkedCat
      ? { id: post.linkedCat.id, nickname: post.linkedCat.name, profileImageUrl: post.linkedCat.imageUrl }
      : post.author;
  }, [post]);

  const togglePostLike = async () => {
    if (!post) {
      return;
    }

    const previous = post;
    const nextLiked = !post.isLikedByMe;
    setPost({ ...post, isLikedByMe: nextLiked, likeCount: Math.max(0, post.likeCount + (nextLiked ? 1 : -1)) });

    try {
      await setCommunityPostLiked(post.id, nextLiked);
    } catch (error) {
      setPost(previous);
      const userError = getUserFacingError(error, 'community.like');
      Alert.alert(userError.title, userError.message);
    }
  };

  const toggleBookmark = async () => {
    if (!post) {
      return;
    }

    const previous = post;
    const nextBookmarked = !post.isBookmarked;
    setPost({ ...post, isBookmarked: nextBookmarked });

    try {
      await setCommunityPostBookmarked(post.id, nextBookmarked);
    } catch (error) {
      setPost(previous);
      const userError = getUserFacingError(error, 'community.load');
      Alert.alert(userError.title, userError.message);
    }
  };

  const toggleCommentLike = async (commentId: string) => {
    if (!post || pendingCommentLikeIds.has(commentId)) {
      return;
    }

    const target = post.comments.find((item) => item.id === commentId);
    if (!target) {
      return;
    }

    const nextLiked = !target.isLikedByMe;
    setPendingCommentLikeIds((previous) => new Set(previous).add(commentId));
    setPost({
      ...post,
      comments: post.comments.map((item) =>
        item.id === commentId
          ? { ...item, isLikedByMe: nextLiked, likeCount: Math.max(0, item.likeCount + (nextLiked ? 1 : -1)) }
          : item,
      ),
    });

    try {
      await setCommunityCommentLiked(commentId, nextLiked);
    } catch (error) {
      await loadPost();
      const userError = getUserFacingError(error, 'community.like');
      Alert.alert(userError.title, userError.message);
    } finally {
      setPendingCommentLikeIds((previous) => {
        const next = new Set(previous);
        next.delete(commentId);
        return next;
      });
    }
  };

  const submitComment = async () => {
    const normalized = comment.trim();
    if (!post || !normalized || isSubmittingComment) {
      return;
    }

    setIsSubmittingComment(true);
    try {
      await createCommunityComment(post.id, normalized);
      setComment('');
      await loadPost();
    } catch (error) {
      const userError = getUserFacingError(error, 'community.comment');
      Alert.alert(userError.title, userError.message);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const deletePost = () => {
    if (!post) {
      return;
    }

    Alert.alert('게시글을 삭제할까요?', '삭제한 게시글은 커뮤니티에서 더 이상 보이지 않아요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          void deleteCommunityPost(post.id)
            .then(() => navigation.goBack())
            .catch((error) => {
              const userError = getUserFacingError(error, 'community.load');
              Alert.alert(userError.title, userError.message);
            });
        },
      },
    ]);
  };

  const openReportReasonPicker = () => {
    setSelectedReportReason(null);
    setIsReportReasonOpen(true);
  };

  const submitReport = async () => {
    if (!post || !selectedReportReason || isReporting) {
      return;
    }

    setIsReporting(true);
    try {
      await reportCommunityPost(post.id, selectedReportReason);
      setIsReportReasonOpen(false);
      setSelectedReportReason(null);
      setTimeout(() => {
        Alert.alert('신고 완료', '선택한 사유와 함께 접수했어요. 운영팀이 확인할게요.');
      }, 220);
    } catch (error) {
      const userError = getUserFacingError(error, 'community.report');
      Alert.alert(userError.title, userError.message);
    } finally {
      setIsReporting(false);
    }
  };

  const openMoreMenu = () => {
    if (!post) {
      return;
    }

    const options = post.isOwnedByMe ? ['취소', '게시글 삭제'] : ['취소', '게시글 신고'];
    if (Platform.OS !== 'ios') {
      Alert.alert(
        post.isOwnedByMe ? '게시글 관리' : '게시글 신고',
        undefined,
        [
          {
            text: post.isOwnedByMe ? '게시글 삭제' : '게시글 신고',
            style: 'destructive',
            onPress: post.isOwnedByMe ? deletePost : openReportReasonPicker,
          },
          { text: '취소', style: 'cancel' },
        ],
      );
      return;
    }

    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: 0, destructiveButtonIndex: 1 },
      (buttonIndex) => {
        if (buttonIndex === 1) {
          post.isOwnedByMe ? deletePost() : openReportReasonPicker();
        }
      },
    );
  };

  if (isLoading && !post) {
    return (
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.centeredScreen}>
        <ActivityIndicator color={nd.colors.accent} />
        <Text style={styles.stateText}>현장 기록을 펼치고 있어요.</Text>
      </SafeAreaView>
    );
  }

  if (!post || !displayAuthor) {
    return (
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.screen}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="뒤로" accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.headerIcon}>
            <ArrowLeft color={nd.colors.ink} size={28} strokeWidth={1.8} />
          </Pressable>
          <Text style={styles.headerTitle}>현장 기록</Text>
          <View style={styles.headerIcon} />
        </View>
        <View style={styles.errorState}>
          <PawPrint color={nd.colors.subtle} size={38} strokeWidth={1.6} />
          <Text style={styles.stateTitle}>기록을 불러오지 못했어요</Text>
          <Text style={styles.stateText}>{errorMessage ?? '잠시 후 다시 확인해 주세요.'}</Text>
          <Pressable accessibilityRole="button" onPress={() => void loadPost()} style={styles.retryButton}>
            <Text style={styles.retryText}>다시 불러오기</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="뒤로" accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.headerIcon}>
            <ArrowLeft color={nd.colors.ink} size={28} strokeWidth={1.8} />
          </Pressable>
          <Text style={styles.headerTitle}>현장 기록</Text>
          <Pressable accessibilityLabel="게시글 더보기" accessibilityRole="button" onPress={openMoreMenu} style={styles.headerIcon}>
            <MoreHorizontal color={nd.colors.ink} size={28} strokeWidth={2.2} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl onRefresh={() => void loadPost(true)} refreshing={isRefreshing} tintColor={nd.colors.accent} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topicPill}>
            <Text style={styles.topicText}>{topicLabels[post.topic]}</Text>
          </View>

          <View style={styles.authorRow}>
            <ProfileAvatar author={displayAuthor} size={48} />
            <View style={styles.authorCopy}>
              <Text style={styles.authorName}>{displayAuthor.nickname}</Text>
              <Text style={styles.authorMeta}>{post.regionName ?? '동네'} · {formatDateTime(post.observedAt ?? post.createdAt)}</Text>
            </View>
          </View>

          {post.regionName ? (
            <View style={styles.locationRow}>
              <MapPin color="#505050" size={18} strokeWidth={1.9} />
              <Text style={styles.locationText}>{post.regionName} 근처</Text>
            </View>
          ) : null}

          <Text style={styles.postBody}>{post.content}</Text>

          {post.imageUrls.length > 0 ? (
            <ScrollView
              contentContainerStyle={styles.heroRow}
              decelerationRate="fast"
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
            >
              {post.imageUrls.map((imageUrl, index) => (
                <Image
                  accessibilityLabel={`게시글 사진 ${index + 1}`}
                  key={`${imageUrl}-${index}`}
                  resizeMode="cover"
                  source={{ uri: imageUrl }}
                  style={[styles.heroImage, { width: heroWidth }]}
                />
              ))}
            </ScrollView>
          ) : null}

          {post.observationNote ? (
            <View style={[styles.noteCard, post.imageUrls.length > 0 && styles.noteCardOverlap]}>
              <StickyNote color={nd.colors.accent} size={18} strokeWidth={1.8} />
              <Text style={styles.noteText}>{post.observationNote}</Text>
              <PawPrint color="#6A5139" size={17} strokeWidth={1.8} />
            </View>
          ) : null}

          <View style={styles.metricsRow}>
            <Pressable accessibilityLabel={post.isLikedByMe ? '공감 취소' : '공감하기'} accessibilityRole="button" onPress={togglePostLike} style={styles.metricButton}>
              <Heart
                color={post.isLikedByMe ? nd.colors.heart : nd.colors.ink}
                fill={post.isLikedByMe ? nd.colors.heart : 'transparent'}
                size={23}
                strokeWidth={1.8}
              />
              <Text style={styles.metricText}>공감 {post.likeCount}</Text>
            </Pressable>
            <View style={styles.metricButton}>
              <MessageCircle color={nd.colors.ink} size={23} strokeWidth={1.8} />
              <Text style={styles.metricText}>댓글 {post.commentCount}</Text>
            </View>
            <Pressable accessibilityLabel={post.isBookmarked ? '북마크 해제' : '북마크'} accessibilityRole="button" onPress={toggleBookmark} style={styles.bookmarkButton}>
              <Bookmark
                color={post.isBookmarked ? nd.colors.accent : nd.colors.ink}
                fill={post.isBookmarked ? nd.colors.accent : 'transparent'}
                size={23}
                strokeWidth={1.8}
              />
            </Pressable>
          </View>

          <View style={styles.comments}>
            {post.comments.length === 0 ? (
              <Text style={styles.emptyComments}>첫 댓글을 남겨 주세요.</Text>
            ) : (
              post.comments.map((item) => (
                <View key={item.id} style={styles.commentRow}>
                  <ProfileAvatar author={item.author} size={38} />
                  <View style={styles.commentCopy}>
                    <Text style={styles.commentAuthor}>{item.author.nickname}</Text>
                    <Text style={styles.commentBody}>{item.content}</Text>
                    <Text style={styles.commentTime}>{formatDateTime(item.createdAt)}</Text>
                  </View>
                  <Pressable
                    accessibilityLabel={item.isLikedByMe ? '댓글 공감 취소' : '댓글 공감'}
                    accessibilityRole="button"
                    disabled={pendingCommentLikeIds.has(item.id)}
                    onPress={() => void toggleCommentLike(item.id)}
                    style={styles.commentLike}
                  >
                    <Heart
                      color={item.isLikedByMe ? nd.colors.heart : nd.colors.sub}
                      fill={item.isLikedByMe ? nd.colors.heart : 'transparent'}
                      size={18}
                      strokeWidth={1.7}
                    />
                    {item.likeCount > 0 ? <Text style={styles.commentLikeCount}>{item.likeCount}</Text> : null}
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        <View style={styles.commentComposer}>
          <TextInput
            accessibilityLabel="댓글 입력"
            editable={!isSubmittingComment}
            maxLength={500}
            onChangeText={setComment}
            onSubmitEditing={() => void submitComment()}
            placeholder="의견을 남겨주세요"
            placeholderTextColor={nd.colors.sub}
            returnKeyType="send"
            style={styles.commentInput}
            value={comment}
          />
          <Pressable
            accessibilityLabel="댓글 보내기"
            accessibilityRole="button"
            disabled={!comment.trim() || isSubmittingComment}
            onPress={() => void submitComment()}
            style={({ pressed }) => [styles.sendButton, (!comment.trim() || isSubmittingComment) && styles.disabled, pressed && styles.pressed]}
          >
            {isSubmittingComment ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Send color="#FFFFFF" size={23} strokeWidth={1.9} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal
        animationType="slide"
        onRequestClose={() => {
          if (!isReporting) setIsReportReasonOpen(false);
        }}
        transparent
        visible={isReportReasonOpen}
      >
        <View style={styles.reportModal}>
          <Pressable
            accessibilityLabel="신고 사유 선택 닫기"
            accessibilityRole="button"
            disabled={isReporting}
            onPress={() => setIsReportReasonOpen(false)}
            style={styles.reportScrim}
          />
          <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.reportSheet}>
            <View style={styles.reportHandle} />
            <View style={styles.reportHeader}>
              <View style={styles.reportHeaderCopy}>
                <Text style={styles.reportTitle}>신고 사유를 선택해 주세요</Text>
                <Text style={styles.reportSubtitle}>해당되는 사유 한 가지를 골라 주세요.</Text>
              </View>
              <Pressable
                accessibilityLabel="신고 사유 선택 닫기"
                accessibilityRole="button"
                disabled={isReporting}
                onPress={() => setIsReportReasonOpen(false)}
                style={styles.reportClose}
              >
                <X color={nd.colors.ink} size={22} strokeWidth={1.8} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.reportList} showsVerticalScrollIndicator={false}>
              {reportReasons.map((reason) => {
                const isSelected = selectedReportReason === reason.id;
                return (
                  <Pressable
                    accessibilityLabel={`${reason.label}: ${reason.description}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    key={reason.id}
                    onPress={() => setSelectedReportReason(reason.id)}
                    style={({ pressed }) => [
                      styles.reportReason,
                      isSelected && styles.reportReasonSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.reportReasonCopy}>
                      <Text style={styles.reportReasonLabel}>{reason.label}</Text>
                      <Text style={styles.reportReasonDescription}>{reason.description}</Text>
                    </View>
                    {isSelected ? (
                      <CheckCircle2 color={nd.colors.accent} fill={nd.colors.primarySoft} size={24} strokeWidth={2} />
                    ) : (
                      <Circle color={nd.colors.subtle} size={24} strokeWidth={1.6} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.reportFooter}>
              <Pressable
                accessibilityLabel="선택한 사유로 신고"
                accessibilityRole="button"
                disabled={!selectedReportReason || isReporting}
                onPress={() => void submitReport()}
                style={({ pressed }) => [
                  styles.reportSubmit,
                  (!selectedReportReason || isReporting) && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                {isReporting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.reportSubmitText}>선택한 사유로 신고</Text>
                )}
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: nd.colors.bg },
  centeredScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: nd.colors.bg },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  headerIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 21, lineHeight: 29, fontWeight: '700', letterSpacing: -0.52, color: nd.colors.ink },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  topicPill: { alignSelf: 'flex-start', minHeight: 30, justifyContent: 'center', borderWidth: 1, borderColor: nd.colors.accent, borderRadius: 10, paddingHorizontal: 12, marginTop: 10 },
  topicText: { fontSize: 13, lineHeight: 18, fontWeight: '600', letterSpacing: -0.33, color: nd.colors.accent },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  authorCopy: { flex: 1 },
  authorName: { fontSize: 16, lineHeight: 23, fontWeight: '700', letterSpacing: -0.4, color: nd.colors.ink },
  authorMeta: { fontSize: 14, lineHeight: 20, letterSpacing: -0.35, color: '#505050' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: nd.colors.field },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  locationText: { fontSize: 14, lineHeight: 20, letterSpacing: -0.35, color: '#505050' },
  postBody: { marginTop: 12, fontSize: 15, lineHeight: 23, letterSpacing: -0.38, color: nd.colors.ink },
  heroRow: { gap: 8, marginTop: 10 },
  heroImage: { height: 220, borderRadius: 12, backgroundColor: nd.colors.field },
  noteCard: { alignSelf: 'center', width: '82%', minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#EADABF', backgroundColor: '#FFF8E7', paddingHorizontal: 12, paddingVertical: 9 },
  noteCardOverlap: { marginTop: -8 },
  noteText: { flexShrink: 1, fontSize: 13, lineHeight: 19, fontWeight: '500', letterSpacing: -0.32, color: '#3D342D', textAlign: 'center' },
  metricsRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: nd.colors.border, marginTop: 10 },
  metricButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 22 },
  metricText: { fontSize: 14, lineHeight: 20, letterSpacing: -0.35, color: nd.colors.ink },
  bookmarkButton: { width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center', marginLeft: 'auto' },
  comments: { paddingTop: 8, gap: 4 },
  commentRow: { minHeight: 70, flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingVertical: 8 },
  commentCopy: { flex: 1, minWidth: 0 },
  commentAuthor: { fontSize: 14, lineHeight: 19, fontWeight: '700', letterSpacing: -0.35, color: nd.colors.ink },
  commentBody: { fontSize: 14, lineHeight: 20, letterSpacing: -0.35, color: nd.colors.ink },
  commentTime: { marginTop: 1, fontSize: 12, lineHeight: 17, color: nd.colors.sub },
  commentLike: { minWidth: 34, minHeight: 44, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 3 },
  commentLikeCount: { fontSize: 12, color: nd.colors.sub },
  emptyComments: { paddingVertical: 30, textAlign: 'center', fontSize: 14, color: nd.colors.sub },
  commentComposer: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderColor: nd.colors.border, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, backgroundColor: nd.colors.bg },
  commentInput: { flex: 1, height: 46, borderWidth: 1, borderColor: nd.colors.border, borderRadius: 23, paddingHorizontal: 16, fontSize: 15, color: nd.colors.ink, backgroundColor: '#FAFAFC' },
  sendButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: nd.colors.accent },
  disabled: { opacity: 0.42 },
  pressed: { opacity: 0.78 },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 },
  stateTitle: { fontSize: 17, lineHeight: 24, fontWeight: '700', color: nd.colors.ink },
  stateText: { fontSize: 14, lineHeight: 20, color: nd.colors.sub, textAlign: 'center' },
  retryButton: { minHeight: 42, justifyContent: 'center', borderRadius: 21, backgroundColor: nd.colors.primarySoft, paddingHorizontal: 18, marginTop: 6 },
  retryText: { fontSize: 14, fontWeight: '700', color: nd.colors.accent },
  reportModal: { flex: 1, justifyContent: 'flex-end' },
  reportScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,17,17,0.42)' },
  reportSheet: { maxHeight: '86%', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: nd.colors.bg, paddingTop: 10 },
  reportHandle: { width: 42, height: 5, alignSelf: 'center', borderRadius: 3, backgroundColor: nd.colors.border },
  reportHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  reportHeaderCopy: { flex: 1 },
  reportTitle: { fontSize: 20, lineHeight: 28, fontWeight: '700', letterSpacing: -0.5, color: nd.colors.ink },
  reportSubtitle: { marginTop: 2, fontSize: 13, lineHeight: 19, color: nd.colors.sub },
  reportClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  reportList: { paddingHorizontal: 16, paddingBottom: 8, gap: 6 },
  reportReason: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: nd.colors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  reportReasonSelected: { borderColor: nd.colors.accent, backgroundColor: nd.colors.primarySoft },
  reportReasonCopy: { flex: 1 },
  reportReasonLabel: { fontSize: 15, lineHeight: 21, fontWeight: '700', letterSpacing: -0.38, color: nd.colors.ink },
  reportReasonDescription: { marginTop: 2, fontSize: 12, lineHeight: 17, letterSpacing: -0.3, color: nd.colors.sub },
  reportFooter: { borderTopWidth: 1, borderColor: nd.colors.border, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 18, backgroundColor: nd.colors.bg },
  reportSubmit: { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 26, backgroundColor: '#FF6A00' },
  reportSubmitText: { fontSize: 17, lineHeight: 24, fontWeight: '700', letterSpacing: -0.43, color: '#FFFFFF' },
});
