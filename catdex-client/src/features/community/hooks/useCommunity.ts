import { useCallback, useEffect, useState } from 'react';
import type { AuthUser } from '@/shared/types/auth';
import {
  createCommunityComment,
  createCommunityPost,
  deleteCommunityComment,
  deleteCommunityPost,
  fetchCommunityComments,
  fetchCommunityPosts,
  reportCommunityTarget,
  toggleCommunityPostLike,
} from '@/features/community/services/communityRepository';
import type {
  CommunityComment,
  CommunityCreatePostInput,
  CommunityPost,
  CommunityReportReason,
  CommunityReportTargetType,
} from '@/features/community/types';

const pageSize = 5;

function mergePosts(previous: CommunityPost[], incoming: CommunityPost[]) {
  const map = new Map<string, CommunityPost>();

  [...previous, ...incoming].forEach((post) => {
    map.set(post.id, post);
  });

  return [...map.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function useCommunity(currentUser: AuthUser | null) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPaginating, setIsPaginating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  const loadFirstPage = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);

      try {
        const response = await fetchCommunityPosts({
          limit: pageSize,
          userId: currentUser?.id,
        });

        setPosts(response.items);
        setNextCursor(response.nextCursor);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : '커뮤니티 글을 불러오지 못했어요.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentUser?.id],
  );

  const loadMore = useCallback(async () => {
    if (!nextCursor || isPaginating) {
      return;
    }

    setIsPaginating(true);

    try {
      const response = await fetchCommunityPosts({
        cursor: nextCursor,
        limit: pageSize,
        userId: currentUser?.id,
      });

      setPosts((previous) => mergePosts(previous, response.items));
      setNextCursor(response.nextCursor);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '다음 글을 불러오지 못했어요.');
    } finally {
      setIsPaginating(false);
    }
  }, [currentUser?.id, isPaginating, nextCursor]);

  useEffect(() => {
    loadFirstPage('initial');
  }, [loadFirstPage]);

  const refresh = useCallback(() => loadFirstPage('refresh'), [loadFirstPage]);

  const addPost = useCallback(
    async (input: CommunityCreatePostInput, author: AuthUser) => {
      const createdPost = await createCommunityPost(input, author);

      setPosts((previous) => mergePosts([createdPost], previous));

      return createdPost;
    },
    [],
  );

  const toggleLike = useCallback(async (postId: string, user: AuthUser) => {
    let rollbackPost: CommunityPost | undefined;

    setPosts((previous) =>
      previous.map((post) => {
        if (post.id !== postId) {
          return post;
        }

        rollbackPost = post;

        return {
          ...post,
          isLikedByMe: !post.isLikedByMe,
          likeCount: post.isLikedByMe ? Math.max(0, post.likeCount - 1) : post.likeCount + 1,
        };
      }),
    );

    try {
      const updatedPost = await toggleCommunityPostLike(postId, user);

      setPosts((previous) => previous.map((post) => (post.id === postId ? updatedPost : post)));
    } catch (error) {
      if (rollbackPost) {
        const restoredPost = rollbackPost;
        setPosts((previous) => previous.map((post) => (post.id === postId ? restoredPost : post)));
      }

      throw error;
    }
  }, []);

  const removePost = useCallback(async (postId: string, user: AuthUser) => {
    await deleteCommunityPost(postId, user);
    setPosts((previous) => previous.filter((post) => post.id !== postId));
  }, []);

  const loadComments = useCallback((postId: string) => fetchCommunityComments(postId), []);

  const addComment = useCallback(async (postId: string, content: string, author: AuthUser) => {
    const comment = await createCommunityComment(postId, content, author);

    setPosts((previous) =>
      previous.map((post) =>
        post.id === postId
          ? {
              ...post,
              commentCount: post.commentCount + 1,
            }
          : post,
      ),
    );

    return comment;
  }, []);

  const removeComment = useCallback(async (postId: string, commentId: string, user: AuthUser) => {
    await deleteCommunityComment(postId, commentId, user);
    setPosts((previous) =>
      previous.map((post) =>
        post.id === postId
          ? {
              ...post,
              commentCount: Math.max(0, post.commentCount - 1),
            }
          : post,
      ),
    );
  }, []);

  const reportTarget = useCallback(
    async (params: {
      targetType: CommunityReportTargetType;
      targetId: string;
      reason: CommunityReportReason;
      detail?: string;
      reporter: AuthUser;
    }) => reportCommunityTarget(params),
    [],
  );

  const getPostById = useCallback(
    (postId: string | null | undefined) => posts.find((post) => post.id === postId) ?? null,
    [posts],
  );

  return {
    posts,
    isLoading,
    isRefreshing,
    isPaginating,
    errorMessage,
    refresh,
    retry: () => loadFirstPage('initial'),
    loadMore,
    addPost,
    toggleLike,
    removePost,
    loadComments,
    addComment,
    removeComment,
    reportTarget,
    getPostById,
  };
}
