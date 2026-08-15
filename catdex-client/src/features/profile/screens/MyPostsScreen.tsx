import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AlignLeft, ArrowLeft, ChevronRight, Heart, MessageCircle } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '@/app/navigation/types';
import { useGoBackOrHome } from '@/app/navigation/useGoBackOrHome';
import { fetchMyCommunityPosts } from '@/shared/api/community.api';
import { createNdShadow, nd, theme } from '@/shared/styles/theme';
import type { CommunityPost, CommunityTopic } from '@/shared/types/community';

const topicLabels: Record<CommunityTopic, string> = {
  SIGHTING: '고객 목격',
  VERIFY: '질문',
  STATUS: '상태 공유',
  INFO: '정보 공유',
};

function formatPostDate(createdAt: string) {
  const parsed = new Date(createdAt);

  if (Number.isNaN(parsed.getTime())) {
    return createdAt;
  }

  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');

  return `${parsed.getFullYear()}.${month}.${day}`;
}

/** 마이페이지 > 내 게시글. 커뮤니티에 내가 쓴 글만 모아 본다. */
export function MyPostsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const goBack = useGoBackOrHome();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      fetchMyCommunityPosts()
        .then((next) => {
          if (isActive) {
            setPosts(next);
            setHasLoaded(true);
          }
        })
        .catch((error: unknown) => {
          console.warn('[my-posts] load failed', error);
          if (isActive) {
            setHasLoaded(true);
          }
        });

      return () => {
        isActive = false;
      };
    }, []),
  );

  const openPost = (post: CommunityPost) => {
    // 커뮤니티 상세는 지부 탭 스택에 산다. 마이페이지에서 열면 지부 탭으로
    // 건너가고, 뒤로 가면 커뮤니티 흐름에 남는다.
    navigation.navigate('Main', {
      screen: 'MapTab',
      params: { screen: 'CommunityPostDetail', params: { postId: post.id } },
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="뒤로 가기"
          accessibilityRole="button"
          onPress={goBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <ArrowLeft color={nd.colors.ink} size={20} strokeWidth={1.8} />
        </Pressable>
        <Text style={styles.title}>내 게시글</Text>
        <View style={styles.headerSpacer} />
      </View>

      {!hasLoaded ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.centered}>
          <AlignLeft color={nd.colors.subtle} size={38} strokeWidth={1.6} />
          <Text style={styles.emptyTitle}>아직 쓴 글이 없어요</Text>
          <Text style={styles.emptyText}>지부 커뮤니티에 글을 남기면 여기에 모여요.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {posts.map((post) => (
            <Pressable
              accessibilityLabel={`${post.title} 게시글 열기`}
              accessibilityRole="button"
              key={post.id}
              onPress={() => openPost(post)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.rowTexts}>
                <View style={styles.rowMetaLine}>
                  <View style={styles.topicChip}>
                    <Text style={styles.topicChipText}>{topicLabels[post.topic]}</Text>
                  </View>
                  {post.regionName ? <Text style={styles.rowMeta}>{post.regionName}</Text> : null}
                  <Text style={styles.rowMeta}>{formatPostDate(post.createdAt)}</Text>
                </View>
                <Text numberOfLines={1} style={styles.rowTitle}>
                  {post.title}
                </Text>
                <Text numberOfLines={2} style={styles.rowContent}>
                  {post.content}
                </Text>
                <View style={styles.rowMetaLine}>
                  <View style={styles.countItem}>
                    <Heart color={nd.colors.sub} size={13} strokeWidth={2} />
                    <Text style={styles.rowMeta}>{post.likeCount}</Text>
                  </View>
                  <View style={styles.countItem}>
                    <MessageCircle color={nd.colors.sub} size={13} strokeWidth={2} />
                    <Text style={styles.rowMeta}>{post.commentCount}</Text>
                  </View>
                </View>
              </View>
              {post.imageUrls[0] ? (
                <Image resizeMode="cover" source={{ uri: post.imageUrls[0] }} style={styles.thumbnail} />
              ) : (
                <ChevronRight color={nd.colors.sub} size={18} strokeWidth={2} />
              )}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nd.colors.bgSecondary,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  headerSpacer: {
    width: 44,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.43,
    color: nd.colors.ink,
  },
  pressed: {
    opacity: 0.7,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  emptyTitle: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '600',
    color: nd.colors.ink,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: nd.colors.sub,
  },
  list: {
    padding: 16,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: nd.radius.input,
    backgroundColor: '#FFFFFF',
    ...createNdShadow(0.05, 6),
  },
  rowTexts: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  rowMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topicChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: nd.radius.pill,
    backgroundColor: theme.colors.primarySoft,
  },
  topicChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.28,
    color: theme.colors.primary,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.38,
    lineHeight: 21,
    color: nd.colors.ink,
  },
  rowContent: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.33,
    color: nd.colors.sub,
  },
  rowMeta: {
    fontSize: 12.5,
    letterSpacing: -0.3,
    color: nd.colors.sub,
  },
  countItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: nd.colors.field,
  },
});
