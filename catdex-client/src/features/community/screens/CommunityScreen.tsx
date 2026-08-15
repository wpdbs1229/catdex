import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronDown, MapPin, PawPrint, SquarePen } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { MapStackParamList, RootStackParamList } from '@/app/navigation/types';
import { TAB_BAR_TOP_GAP, useTabBarBottomGap, useTabBarInset } from '@/app/navigation/useTabBarInset';
import { CommunityPostCard } from '@/features/community/components/CommunityPostCard';
import { NeighborhoodTabBar } from '@/features/map/components/NeighborhoodTabBar';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { fetchCommunityPosts, setCommunityPostLiked } from '@/shared/api/community.api';
import { getUserFacingError } from '@/shared/errors/user-facing-error';
import { NeighborhoodSheet } from '@/shared/neighborhood/NeighborhoodSheet';
import { useActiveNeighborhood } from '@/shared/neighborhood/useActiveNeighborhood';
import { createNdShadow, nd, theme } from '@/shared/styles/theme';
import type { CommunityPost } from '@/shared/types/community';

export function CommunityScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MapStackParamList & RootStackParamList>>();
  const tabBarBottomGap = useTabBarBottomGap();
  const tabBarInset = useTabBarInset();
  const { neighborhood, name, isDetecting, redetect, refresh } = useActiveNeighborhood();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingLikeIds, setPendingLikeIds] = useState<Set<string>>(new Set());
  const [isNeighborhoodSheetOpen, setIsNeighborhoodSheetOpen] = useState(false);

  const regionName = neighborhood?.name;

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      if (!regionName) {
        setPosts([]);
        setLoadError(null);
        setIsLoading(false);
        return () => {
          isActive = false;
        };
      }

      setIsLoading(true);
      setLoadError(null);
      setPosts([]);

      fetchCommunityPosts(regionName)
        .then((nextPosts) => {
          if (isActive) {
            setPosts(nextPosts);
          }
        })
        .catch((error: unknown) => {
          console.warn('[community] load failed', error);

          if (isActive) {
            setLoadError(getUserFacingError(error, 'community.load').message);
          }
        })
        .finally(() => {
          if (isActive) {
            setIsLoading(false);
          }
        });

      return () => {
        isActive = false;
      };
    }, [regionName]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      if (!regionName) {
        await redetect();
        return;
      }

      setPosts(await fetchCommunityPosts(regionName));
      setLoadError(null);
    } catch (error) {
      console.warn('[community] refresh failed', error);
      setLoadError(getUserFacingError(error, 'community.load').message);
    } finally {
      setIsRefreshing(false);
    }
  }, [redetect, regionName]);

  const handleToggleLike = useCallback(async (post: CommunityPost) => {
    const nextLiked = !post.isLikedByMe;

    setPendingLikeIds((previous) => new Set(previous).add(post.id));
    setPosts((previous) =>
      previous.map((item) =>
        item.id === post.id
          ? {
              ...item,
              isLikedByMe: nextLiked,
              likeCount: Math.max(0, item.likeCount + (nextLiked ? 1 : -1)),
            }
          : item,
      ),
    );

    try {
      await setCommunityPostLiked(post.id, nextLiked);
    } catch (error) {
      setPosts((previous) =>
        previous.map((item) =>
          item.id === post.id
            ? {
                ...item,
                isLikedByMe: post.isLikedByMe,
                likeCount: post.likeCount,
              }
            : item,
        ),
      );

      const userError = getUserFacingError(error, 'community.like');
      Alert.alert(userError.title, userError.message);
    } finally {
      setPendingLikeIds((previous) => {
        const next = new Set(previous);
        next.delete(post.id);
        return next;
      });
    }
  }, []);

  const emptyState = isLoading || (isDetecting && !regionName) ? (
    <View style={styles.stateBox}>
      <ActivityIndicator color={theme.colors.accent} size="small" />
      <Text style={styles.stateText}>동네 이야기를 모으고 있어요.</Text>
    </View>
  ) : (
    <View style={styles.stateBox}>
      <PawPrint color={nd.colors.subtle} size={36} strokeWidth={1.6} />
      <Text style={styles.stateTitle}>
        {loadError ? '이야기를 불러오지 못했어요' : regionName ? '아직 올라온 이야기가 없어요' : '동네를 정해 주세요'}
      </Text>
      <Text style={styles.stateText}>
        {loadError ??
          (regionName
            ? `${regionName}의 첫 고양이 소식을 남겨 보세요.`
            : '위 동네 이름을 눌러 활동할 동네를 선택해 주세요.')}
      </Text>
      {loadError ? (
        <Pressable
          accessibilityLabel="커뮤니티 다시 불러오기"
          accessibilityRole="button"
          onPress={handleRefresh}
          style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
        >
          <Text style={styles.retryText}>다시 불러오기</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityLabel={`현재 동네 ${name}, 동네 변경`}
          accessibilityRole="button"
          onPress={() => setIsNeighborhoodSheetOpen(true)}
          style={({ pressed }) => [styles.locationChip, pressed && styles.pressed]}
        >
          <View style={styles.locationIcon}>
            {isDetecting ? (
              <ActivityIndicator color={nd.colors.ink} size="small" />
            ) : (
              <MapPin color={nd.colors.ink} size={20} strokeWidth={1.8} />
            )}
          </View>
          <Text style={styles.locationText}>{isDetecting ? '동네 확인 중' : name}</Text>
          <ChevronDown color={nd.colors.ink} size={16} strokeWidth={1.8} />
        </Pressable>
        <NotificationBell />
      </View>

      <FlatList
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarInset + 28 }]}
        data={posts}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        keyExtractor={(post) => post.id}
        ListEmptyComponent={emptyState}
        refreshControl={
          <RefreshControl
            onRefresh={handleRefresh}
            refreshing={isRefreshing}
            tintColor={theme.colors.accent}
          />
        }
        renderItem={({ item }) => (
          <CommunityPostCard
            isLikePending={pendingLikeIds.has(item.id)}
            onOpenComments={() => navigation.navigate('CommunityPostDetail', { postId: item.id })}
            onOpenPost={() => navigation.navigate('CommunityPostDetail', { postId: item.id })}
            onToggleLike={handleToggleLike}
            post={item}
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      <Pressable
        accessibilityLabel="새 커뮤니티 글 작성"
        accessibilityRole="button"
        onPress={() => navigation.navigate('CommunityPostComposer')}
        style={({ pressed }) => [
          styles.fab,
          { bottom: tabBarInset + 16 },
          pressed && styles.fabPressed,
        ]}
      >
        <SquarePen color="#FFFFFF" size={24} strokeWidth={1.8} />
      </Pressable>

      <View
        pointerEvents="box-none"
        style={[styles.tabBarWrap, { paddingBottom: tabBarBottomGap }]}
      >
        <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="communityTabBarScrim" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0" stopColor="#111111" stopOpacity={0} />
              <Stop offset="1" stopColor="#111111" stopOpacity={0.3} />
            </LinearGradient>
          </Defs>
          <Rect fill="url(#communityTabBarScrim)" height="100%" width="100%" x="0" y="0" />
        </Svg>
        <NeighborhoodTabBar
          active="board"
          onHome={() => navigation.getParent()?.navigate('HomeTab' as never)}
          onOpenBoard={() => undefined}
          onOpenDex={() => navigation.navigate('NeighborhoodDex')}
          onOpenMap={() => navigation.navigate('NeighborhoodMap')}
        />
      </View>

      <NeighborhoodSheet
        activeId={neighborhood?.id}
        isDetecting={isDetecting}
        onAddCurrent={() => {
          void redetect().then((detected) => {
            if (detected) {
              refresh();
            }
          });
        }}
        onChanged={refresh}
        onClose={() => setIsNeighborhoodSheetOpen(false)}
        visible={isNeighborhoodSheetOpen}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nd.colors.bg,
  },
  headerRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: nd.colors.bgSecondary,
    marginRight: 6,
  },
  locationText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  listContent: {
    flexGrow: 1,
    paddingTop: 16,
  },
  divider: {
    height: 1,
    marginVertical: 12,
    backgroundColor: '#F1F1F5',
  },
  stateBox: {
    flex: 1,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  stateTitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: nd.colors.ink,
    textAlign: 'center',
  },
  stateText: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.325,
    color: nd.colors.sub,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    borderRadius: nd.radius.pill,
    backgroundColor: nd.colors.field,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  retryText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    letterSpacing: -0.325,
    color: nd.colors.ink,
  },
  fab: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: nd.colors.accent,
    ...createNdShadow(0.16, 20),
  },
  fabPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.97 }],
  },
  tabBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: TAB_BAR_TOP_GAP,
  },
  pressed: {
    opacity: 0.84,
  },
});
