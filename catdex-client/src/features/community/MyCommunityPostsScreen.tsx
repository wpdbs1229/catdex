import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, ChevronLeft, Edit3, MessageCircle, ShieldCheck, Trash2 } from 'lucide-react-native';
import { CommunityPostCard } from '@/features/community/components/CommunityPostCard';
import { communityFilterOptions } from '@/features/community/community.constants';
import { deleteCommunityPost, fetchCommunityPosts } from '@/shared/api/community.api';
import { getUserFacingError, type UserFacingError } from '@/shared/errors/user-facing-error';
import { createShadow, theme } from '@/shared/styles/theme';
import type { CommunityFilter, CommunityPost } from '@/shared/types/community';

interface MyCommunityPostsScreenProps {
  onBack: () => void;
  onComposePost: () => void;
  onEditPost: (postId: string) => void;
  onOpenPost: (postId: string) => void;
}

export function MyCommunityPostsScreen({ onBack, onComposePost, onEditPost, onOpenPost }: MyCommunityPostsScreenProps) {
  const [activeFilter, setActiveFilter] = useState<CommunityFilter>('ALL');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [error, setError] = useState<UserFacingError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const commentCount = useMemo(() => posts.reduce((total, post) => total + post.commentCount, 0), [posts]);

  const refreshPosts = useCallback(
    async (nextFilter: CommunityFilter = activeFilter) => {
      setIsLoading(true);
      setError(null);

      try {
        const nextPosts = await fetchCommunityPosts({
          mine: true,
          topic: nextFilter,
          limit: 50,
        });
        setPosts(nextPosts);
      } catch (nextError) {
        console.warn('[community] my posts load failed', nextError);
        setPosts([]);
        setError(getUserFacingError(nextError, 'community.load'));
      } finally {
        setIsLoading(false);
      }
    },
    [activeFilter],
  );

  useEffect(() => {
    void refreshPosts();
  }, [refreshPosts]);

  const handleChangeFilter = (filter: CommunityFilter) => {
    setActiveFilter(filter);
    void refreshPosts(filter);
  };

  const deletePost = async (postId: string) => {
    if (deletingPostId) {
      return;
    }

    setDeletingPostId(postId);
    setError(null);

    try {
      await deleteCommunityPost(postId);
      setPosts((current) => current.filter((post) => post.id !== postId));
    } catch (nextError) {
      console.warn('[community] my post delete failed', nextError);
      setError(getUserFacingError(nextError, 'community.delete'));
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleDeletePost = (post: CommunityPost) => {
    Alert.alert('게시글 삭제', '삭제하면 게시글과 댓글, 공감 기록이 함께 사라져요. 계속할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          void deletePost(post.id);
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <Pressable accessibilityLabel="마이페이지로 돌아가기" accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <ChevronLeft color={theme.colors.primaryDark} size={22} />
        </Pressable>
        <View style={styles.topCopy}>
          <Text style={styles.kicker}>내 활동</Text>
          <Text style={styles.title}>내 게시글</Text>
          <Text style={styles.description}>동네 게시판에 올린 글과 도감에 연결한 이야기를 모아봐요.</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <View style={styles.metaPill}>
          {isLoading ? <ActivityIndicator color={theme.colors.primaryDark} size="small" /> : <MessageCircle color={theme.colors.accent} size={15} />}
          <Text style={styles.metaText}>{isLoading ? '불러오는 중' : `게시글 ${posts.length}개 · 댓글 ${commentCount}개`}</Text>
        </View>
        <Pressable accessibilityLabel="게시글 작성" accessibilityRole="button" onPress={onComposePost} style={({ pressed }) => [styles.writeButton, pressed && styles.pressed]}>
          <Edit3 color="#FFF8F0" size={15} />
          <Text style={styles.writeButtonText}>글쓰기</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.filterRow} horizontal showsHorizontalScrollIndicator={false}>
        {communityFilterOptions.map((filter) => {
          const isActive = activeFilter === filter.id;

          return (
            <Pressable
              accessibilityLabel={`내 게시글 필터 ${filter.label}`}
              accessibilityRole="button"
              key={filter.id}
              onPress={() => handleChangeFilter(filter.id)}
              style={({ pressed }) => [styles.filterChip, isActive && styles.filterChipActive, pressed && styles.pressed]}
            >
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{filter.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {error ? (
        <View style={styles.errorCard}>
          <AlertCircle color={theme.colors.primary} size={18} />
          <View style={styles.errorCopy}>
            <Text style={styles.errorTitle}>{error.title}</Text>
            <Text style={styles.errorText}>{error.message}</Text>
          </View>
          <Pressable accessibilityLabel="내 게시글 다시 불러오기" accessibilityRole="button" onPress={() => refreshPosts()} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
            <Text style={styles.retryText}>다시</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.postStack}>
        {posts.map((post) => {
          const isDeletingPost = deletingPostId === post.id;

          return (
            <View key={post.id} style={styles.managedPostCard}>
              <CommunityPostCard onPress={onOpenPost} post={post} />
              <View style={styles.manageRow}>
                <Pressable accessibilityLabel={`${post.title} 수정`} accessibilityRole="button" onPress={() => onEditPost(post.id)} style={({ pressed }) => [styles.manageButton, pressed && styles.pressed]}>
                  <Edit3 color={theme.colors.primaryDark} size={14} />
                  <Text style={styles.manageText}>수정</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={`${post.title} 삭제`}
                  accessibilityRole="button"
                  disabled={isDeletingPost}
                  onPress={() => handleDeletePost(post)}
                  style={({ pressed }) => [styles.manageButton, styles.manageDeleteButton, isDeletingPost && styles.manageButtonDisabled, pressed && styles.pressed]}
                >
                  <Trash2 color={theme.colors.primary} size={14} />
                  <Text style={styles.manageDeleteText}>{isDeletingPost ? '삭제 중' : '삭제'}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      {!isLoading && posts.length === 0 ? (
        <View style={styles.emptyCard}>
          <MessageCircle color="#CDB58F" size={30} />
          <Text style={styles.emptyTitle}>아직 내가 쓴 글이 없어요</Text>
          <Text style={styles.emptyText}>동네 게시판에 목격담이나 근황을 남기면 여기에서 다시 확인할 수 있어요.</Text>
          <Pressable accessibilityLabel="첫 게시글 작성" accessibilityRole="button" onPress={onComposePost} style={({ pressed }) => [styles.emptyWriteButton, pressed && styles.pressed]}>
            <Text style={styles.emptyWriteText}>글쓰기</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.safetyStrip}>
        <ShieldCheck color={theme.colors.accent} size={17} />
        <Text style={styles.safetyText}>게시글에 연결한 고양이 기록은 동네 도감과 게시판에서 함께 보일 수 있어요.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 132,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: 'rgba(255,253,246,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
  },
  topCopy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  title: {
    marginTop: 4,
    color: theme.colors.text,
    fontSize: 26,
    lineHeight: 33,
    fontWeight: '900',
  },
  description: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  actionRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  metaPill: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  metaText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  writeButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.primaryDark,
    ...createShadow(3),
  },
  writeButtonText: {
    color: '#FFF8F0',
    fontSize: 12,
    fontWeight: '900',
  },
  filterRow: {
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.lg,
  },
  filterChip: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.11)',
  },
  filterChipActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  filterText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  filterTextActive: {
    color: '#FFF8F0',
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
  postStack: {
    gap: theme.spacing.md,
  },
  managedPostCard: {
    gap: theme.spacing.sm,
  },
  manageRow: {
    minHeight: 36,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  manageButton: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 17,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(221,232,200,0.56)',
    borderWidth: 1,
    borderColor: 'rgba(111,131,77,0.12)',
  },
  manageDeleteButton: {
    backgroundColor: 'rgba(255,239,221,0.72)',
    borderColor: 'rgba(196,122,66,0.18)',
  },
  manageButtonDisabled: {
    opacity: 0.5,
  },
  manageText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  manageDeleteText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  emptyCard: {
    minHeight: 178,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  emptyTitle: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 6,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyWriteButton: {
    marginTop: theme.spacing.md,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.primaryDark,
  },
  emptyWriteText: {
    color: '#FFF8F0',
    fontSize: 12,
    fontWeight: '900',
  },
  safetyStrip: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(221,232,200,0.56)',
    borderWidth: 1,
    borderColor: 'rgba(113,138,91,0.18)',
  },
  safetyText: {
    flex: 1,
    color: theme.colors.inkSoft,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.82,
  },
});
