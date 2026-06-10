import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { CommunityPostCard } from '@/features/community/components/CommunityPostCard';
import { CommunityEmptyState, CommunityErrorState } from '@/features/community/components/CommunityStates';
import { CommunityWriteFab } from '@/features/community/components/CommunityWriteFab';
import { theme } from '@/shared/styles/theme';
import type { AuthUser } from '@/shared/types/auth';
import type { CommunityPost, CommunityPostMedia, CommunityReportReason } from '@/features/community/types';

interface CommunityFeedScreenProps {
  currentUser: AuthUser | null;
  posts: CommunityPost[];
  isLoading: boolean;
  isRefreshing: boolean;
  isPaginating: boolean;
  errorMessage: string | null;
  onRefresh: () => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onOpenCreate: () => void;
  onOpenComments: (post: CommunityPost) => void;
  onToggleLike: (post: CommunityPost) => Promise<void> | void;
  onDeletePost: (post: CommunityPost) => Promise<void> | void;
  onReportPost: (post: CommunityPost, reason: CommunityReportReason) => Promise<void> | void;
}

export function CommunityFeedScreen({
  currentUser,
  posts,
  isLoading,
  isRefreshing,
  isPaginating,
  errorMessage,
  onRefresh,
  onLoadMore,
  onRetry,
  onOpenCreate,
  onOpenComments,
  onToggleLike,
  onDeletePost,
  onReportPost,
}: CommunityFeedScreenProps) {
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);

  const requireLogin = () => {
    Alert.alert('로그인이 필요해요', '커뮤니티 활동은 로그인 후 이용할 수 있어요.');
  };

  const handleOpenCreate = () => {
    if (!currentUser) {
      requireLogin();
      return;
    }

    onOpenCreate();
  };

  const handleToggleLike = async (post: CommunityPost) => {
    if (!currentUser) {
      requireLogin();
      return;
    }

    try {
      await onToggleLike(post);
    } catch (error) {
      Alert.alert('좋아요 처리 실패', error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.');
    }
  };

  const handleDeletePost = (post: CommunityPost) => {
    if (!currentUser) {
      requireLogin();
      return;
    }

    setOpenMenuPostId(null);
    Alert.alert('게시글 삭제', '이 게시글을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await onDeletePost(post);
          } catch (error) {
            Alert.alert('삭제 실패', error instanceof Error ? error.message : '게시글을 삭제하지 못했어요.');
          }
        },
      },
    ]);
  };

  const handleReportPost = (post: CommunityPost) => {
    if (!currentUser) {
      requireLogin();
      return;
    }

    setOpenMenuPostId(null);
    const report = async (reason: CommunityReportReason) => {
      try {
        await onReportPost(post, reason);
        Alert.alert('신고 접수', '신고가 접수되었습니다.');
      } catch (error) {
        Alert.alert('신고 실패', error instanceof Error ? error.message : '신고를 접수하지 못했어요.');
      }
    };

    Alert.alert('게시글 신고', '신고 사유를 선택해 주세요.', [
      { text: '위치 노출', onPress: () => report('LOCATION_EXPOSURE') },
      { text: '동물학대 정황', onPress: () => report('ANIMAL_ABUSE') },
      { text: '개인정보 노출', onPress: () => report('PRIVACY') },
      { text: '기타', onPress: () => report('ETC') },
      { text: '취소', style: 'cancel' },
    ]);
  };

  const handleOpenMedia = (media: CommunityPostMedia) => {
    Alert.alert(media.type === 'VIDEO' ? '영상 보기' : '사진 보기', '미디어 상세 화면으로 확장할 수 있게 연결되어 있어요.');
  };

  const handleEditPost = () => {
    setOpenMenuPostId(null);
    Alert.alert('게시글 수정', '수정 화면은 실제 API 연결 단계에서 이어 붙일 수 있어요.');
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.colors.primaryDark} />
          <Text style={styles.loadingText}>커뮤니티 글을 불러오는 중...</Text>
        </View>
      );
    }

    if (errorMessage && posts.length === 0) {
      return <CommunityErrorState message={errorMessage} onRetry={onRetry} />;
    }

    return null;
  };

  return (
    <View style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.content}
        data={posts}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderContent() ?? <CommunityEmptyState />}
        ListFooterComponent={
          isPaginating ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={theme.colors.primaryDark} />
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>커뮤니티</Text>
              <MessageCircle color={theme.colors.primary} size={20} />
            </View>
            <Text style={styles.subtitle}>동네 고양이 이야기를 함께 남겨요.</Text>
          </View>
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primaryDark}
            colors={[theme.colors.primaryDark]}
          />
        }
        renderItem={({ item }) => (
          <CommunityPostCard
            currentUserId={currentUser?.id}
            onDeletePost={handleDeletePost}
            onEditPost={handleEditPost}
            onOpenComments={onOpenComments}
            onOpenMedia={handleOpenMedia}
            onReportPost={handleReportPost}
            onToggleLike={handleToggleLike}
            onToggleMenu={(postId) => setOpenMenuPostId((current) => (current === postId ? null : postId))}
            openMenuPostId={openMenuPostId}
            post={item}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
      <CommunityWriteFab onPress={handleOpenCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 164,
  },
  header: {
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: theme.typography.letterSpacing,
  },
  subtitle: {
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
  },
  loadingBox: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
  },
  footerLoader: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
