import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, Edit3, Map, MessageCircle, ShieldCheck } from 'lucide-react-native';
import { CommunityPostCard } from '@/features/community/components/CommunityPostCard';
import { communityFilterOptions } from '@/features/community/community.constants';
import { NeighborhoodLeaderboardCard } from '@/features/map/components/NeighborhoodLeaderboardCard';
import { fetchCommunityPosts } from '@/shared/api/community.api';
import { fetchNeighborhoodLeaderboard } from '@/shared/api/leaderboard.api';
import { getUserFacingError, type UserFacingError } from '@/shared/errors/user-facing-error';
import { createShadow, theme } from '@/shared/styles/theme';
import type { CommunityFilter, CommunityPost } from '@/shared/types/community';
import type { NeighborhoodLeaderboardEntry } from '@/shared/types/leaderboard';

interface CommunityBoardScreenProps {
  neighborhoodName: string;
  onComposePost: () => void;
  onOpenMap: () => void;
  onOpenPost: (postId: string) => void;
}

export function CommunityBoardScreen({ neighborhoodName, onComposePost, onOpenMap, onOpenPost }: CommunityBoardScreenProps) {
  const [activeFilter, setActiveFilter] = useState<CommunityFilter>('ALL');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [error, setError] = useState<UserFacingError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<NeighborhoodLeaderboardEntry[]>([]);
  const [leaderboardError, setLeaderboardError] = useState<UserFacingError | null>(null);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);

  const commentCount = useMemo(() => posts.reduce((total, post) => total + post.commentCount, 0), [posts]);

  const refreshPosts = useCallback(
    async (nextFilter: CommunityFilter = activeFilter) => {
      setIsLoading(true);
      setError(null);

      try {
        const nextPosts = await fetchCommunityPosts({
          regionName: neighborhoodName,
          topic: nextFilter,
          limit: 50,
        });
        setPosts(nextPosts);
      } catch (nextError) {
        console.warn('[community] board load failed', nextError);
        setPosts([]);
        setError(getUserFacingError(nextError, 'community.load'));
      } finally {
        setIsLoading(false);
      }
    },
    [activeFilter, neighborhoodName],
  );

  const refreshLeaderboard = useCallback(async () => {
    setIsLeaderboardLoading(true);
    setLeaderboardError(null);

    try {
      const nextLeaderboard = await fetchNeighborhoodLeaderboard(neighborhoodName, 30, 5);
      setLeaderboard(nextLeaderboard);
    } catch (nextError) {
      console.warn('[leaderboard] board load failed', nextError);
      setLeaderboard([]);
      setLeaderboardError(getUserFacingError(nextError, 'leaderboard.load'));
    } finally {
      setIsLeaderboardLoading(false);
    }
  }, [neighborhoodName]);

  useEffect(() => {
    void refreshPosts();
  }, [refreshPosts]);

  useEffect(() => {
    void refreshLeaderboard();
  }, [refreshLeaderboard]);

  const handleChangeFilter = (filter: CommunityFilter) => {
    setActiveFilter(filter);
    void refreshPosts(filter);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.segmentWrap}>
        <Pressable accessibilityLabel="지도 보기" accessibilityRole="button" onPress={onOpenMap} style={({ pressed }) => [styles.segmentButton, pressed && styles.pressed]}>
          <Map color={theme.colors.primaryDark} size={15} />
          <Text style={styles.segmentText}>지도</Text>
        </Pressable>
        <View style={[styles.segmentButton, styles.segmentButtonActive]}>
          <MessageCircle color="#FFF8F0" size={15} />
          <Text style={[styles.segmentText, styles.segmentTextActive]}>게시판</Text>
        </View>
      </View>

      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>동네 게시판</Text>
          <Text style={styles.title}>{neighborhoodName} 게시판</Text>
          <Text style={styles.description}>목격담, 근황, 질문을 이웃과 나눠요. 필요한 글은 동네 도감 고양이와 연결할 수 있어요.</Text>
        </View>
        <Pressable accessibilityLabel="게시글 작성" accessibilityRole="button" onPress={onComposePost} style={({ pressed }) => [styles.writeButton, pressed && styles.pressed]}>
          <Edit3 color="#FFF8F0" size={16} />
          <Text style={styles.writeButtonText}>글쓰기</Text>
        </Pressable>
      </View>

      <NeighborhoodLeaderboardCard
        entries={leaderboard}
        errorMessage={leaderboardError?.message}
        isLoading={isLeaderboardLoading}
        onRetry={refreshLeaderboard}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {communityFilterOptions.map((filter) => {
          const isActive = activeFilter === filter.id;

          return (
            <Pressable
              accessibilityLabel={`게시판 필터 ${filter.label}`}
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

      <View style={styles.metaStrip}>
        {isLoading ? <ActivityIndicator color={theme.colors.primaryDark} size="small" /> : <MessageCircle color={theme.colors.accent} size={15} />}
        <Text style={styles.metaText}>
          {isLoading ? '동네 이야기를 불러오는 중' : `게시글 ${posts.length}개 · 댓글 ${commentCount}개`}
        </Text>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <AlertCircle color={theme.colors.primary} size={18} />
          <View style={styles.errorCopy}>
            <Text style={styles.errorTitle}>{error.title}</Text>
            <Text style={styles.errorText}>{error.message}</Text>
          </View>
          <Pressable accessibilityLabel="게시판 다시 불러오기" accessibilityRole="button" onPress={() => refreshPosts()} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
            <Text style={styles.retryText}>다시</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.postStack}>
        {posts.map((post) => (
          <CommunityPostCard key={post.id} onPress={onOpenPost} post={post} />
        ))}
      </View>

      {!isLoading && posts.length === 0 ? (
        <View style={styles.emptyCard}>
          <MessageCircle color="#CDB58F" size={28} />
          <Text style={styles.emptyTitle}>아직 이 주제의 글이 없어요</Text>
          <Text style={styles.emptyText}>첫 이야기를 남기면 이웃들이 이어서 댓글을 달 수 있어요.</Text>
          <Pressable accessibilityLabel="첫 게시글 작성" accessibilityRole="button" onPress={onComposePost} style={({ pressed }) => [styles.emptyWriteButton, pressed && styles.pressed]}>
            <Text style={styles.emptyWriteText}>글쓰기</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.safetyStrip}>
        <ShieldCheck color={theme.colors.accent} size={17} />
        <Text style={styles.safetyText}>글과 연결된 도감 기록은 정확한 좌표 없이 동네와 구역 단위로만 공유해요.</Text>
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
  segmentWrap: {
    minHeight: 44,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    borderRadius: 22,
    padding: 4,
    backgroundColor: 'rgba(255,253,246,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  segmentButton: {
    flex: 1,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 18,
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.primaryDark,
  },
  segmentText: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: '#FFF8F0',
  },
  header: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  headerCopy: {
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
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '900',
  },
  description: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
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
  metaStrip: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: 19,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.56)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  metaText: {
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
  postStack: {
    gap: theme.spacing.md,
  },
  emptyCard: {
    minHeight: 176,
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
    fontSize: 16,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 5,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyWriteButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primaryDark,
  },
  emptyWriteText: {
    color: '#FFF8F0',
    fontSize: 12,
    fontWeight: '900',
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
  pressed: {
    opacity: 0.82,
  },
});
