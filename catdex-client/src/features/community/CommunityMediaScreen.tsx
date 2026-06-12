import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ImageOff, Play } from 'lucide-react-native';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { theme } from '@/shared/styles/theme';
import type { CommunityPost, CommunityPostMedia } from '@/features/community/types';

interface CommunityMediaScreenProps {
  post: CommunityPost | null;
  selectedMediaId?: string | null;
  onBack: () => void;
}

function getDisplayUri(media: CommunityPostMedia) {
  if (media.type === 'VIDEO') {
    return media.thumbnailUrl;
  }

  return media.url;
}

export function CommunityMediaScreen({ post, selectedMediaId, onBack }: CommunityMediaScreenProps) {
  const { width, height } = useWindowDimensions();
  const viewportWidth = Math.max(1, width);
  const [activeIndex, setActiveIndex] = useState(0);
  const mediaList = post?.mediaList ?? [];
  const initialIndex = useMemo(() => {
    const index = mediaList.findIndex((media) => media.id === selectedMediaId);
    return index >= 0 ? index : 0;
  }, [mediaList, selectedMediaId]);

  useEffect(() => {
    setActiveIndex(initialIndex);
  }, [initialIndex]);

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / viewportWidth);
    setActiveIndex(Math.min(Math.max(nextIndex, 0), Math.max(mediaList.length - 1, 0)));
  };

  const renderMedia = ({ item }: ListRenderItemInfo<CommunityPostMedia>) => {
    const uri = getDisplayUri(item);

    return (
      <View style={[styles.mediaPage, { width: viewportWidth }]}>
        {uri ? (
          <Image resizeMode="contain" source={{ uri }} style={[styles.media, { maxHeight: Math.max(260, height - 220) }]} />
        ) : (
          <View style={styles.mediaFallback}>
            <ImageOff color="#FFF8F0" size={42} />
            <Text style={styles.fallbackText}>미디어를 불러올 수 없어요.</Text>
          </View>
        )}
        {item.type === 'VIDEO' ? (
          <View style={styles.videoBadge}>
            <Play color="#FFF8F0" fill="#FFF8F0" size={18} />
            <Text style={styles.videoBadgeText}>{item.durationSec ? `${item.durationSec}초 영상` : '영상'}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  if (!post || mediaList.length === 0) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <ChevronLeft color="#FFF8F0" size={24} />
          </Pressable>
          <Text style={styles.title}>미디어</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyBox}>
          <ImageOff color="#FFF8F0" size={42} />
          <Text style={styles.emptyTitle}>미디어를 찾지 못했어요.</Text>
        </View>
      </View>
    );
  }

  const displayIndex = mediaList.length > 0 ? activeIndex + 1 : 0;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <ChevronLeft color="#FFF8F0" size={24} />
        </Pressable>
        <View style={styles.titleBlock}>
          <Text numberOfLines={1} style={styles.title}>
            {post.authorNickname}
          </Text>
          <Text style={styles.counter}>
            {displayIndex} / {mediaList.length}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={mediaList}
        getItemLayout={(_data, index) => ({
          length: viewportWidth,
          offset: viewportWidth * index,
          index,
        })}
        horizontal
        initialScrollIndex={initialIndex}
        key={`${post.id}-${viewportWidth}`}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={handleMomentumEnd}
        pagingEnabled
        renderItem={renderMedia}
        showsHorizontalScrollIndicator={false}
      />

      <View style={styles.caption}>
        <Text numberOfLines={3} style={styles.captionText}>
          {post.content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1F1711',
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,248,240,0.12)',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  title: {
    color: '#FFF8F0',
    fontSize: 16,
    fontWeight: '900',
  },
  counter: {
    marginTop: 2,
    color: 'rgba(255,248,240,0.68)',
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  headerSpacer: {
    width: 42,
  },
  mediaPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  mediaFallback: {
    width: '100%',
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: 'rgba(255,248,240,0.08)',
  },
  fallbackText: {
    color: '#FFF8F0',
    fontSize: 13,
    fontWeight: '800',
  },
  videoBadge: {
    position: 'absolute',
    left: theme.spacing.lg,
    bottom: theme.spacing.lg,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: 19,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(45,36,27,0.78)',
  },
  videoBadgeText: {
    color: '#FFF8F0',
    fontSize: 12,
    fontWeight: '900',
  },
  caption: {
    minHeight: 78,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  captionText: {
    color: 'rgba(255,248,240,0.86)',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  emptyTitle: {
    color: '#FFF8F0',
    fontSize: 17,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.78,
  },
});
