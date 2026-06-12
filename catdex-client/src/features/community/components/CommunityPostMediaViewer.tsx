import { Play } from 'lucide-react-native';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { theme } from '@/shared/styles/theme';
import type { CommunityPostMedia } from '@/features/community/types';

interface CommunityPostMediaViewerProps {
  mediaList: CommunityPostMedia[];
  onOpenMedia?: (media: CommunityPostMedia) => void;
}

function getDisplayUri(media: CommunityPostMedia) {
  if (media.type === 'VIDEO') {
    return media.thumbnailUrl;
  }

  return media.url;
}

export function CommunityPostMediaViewer({ mediaList, onOpenMedia }: CommunityPostMediaViewerProps) {
  const { width } = useWindowDimensions();

  if (mediaList.length === 0) {
    return null;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.mediaRow}
      horizontal
      pagingEnabled={mediaList.length === 1}
      showsHorizontalScrollIndicator={false}
    >
      {mediaList.map((media) => {
        const uri = getDisplayUri(media);

        return (
          <Pressable
            key={media.id}
            onPress={() => onOpenMedia?.(media)}
            style={({ pressed }) => [styles.mediaFrame, { width }, pressed && styles.pressed]}
          >
            {uri ? <Image resizeMode="cover" source={{ uri }} style={styles.media} /> : <View style={styles.mediaFallback} />}
            {media.type === 'VIDEO' ? (
              <View style={styles.videoOverlay}>
                <View style={styles.playButton}>
                  <Play color="#FFF8F0" fill="#FFF8F0" size={22} />
                </View>
                <Text style={styles.videoLabel}>{media.durationSec ? `${media.durationSec}초` : '영상'}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  mediaRow: {
    gap: 0,
  },
  mediaFrame: {
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: 0,
    backgroundColor: '#EAE0D1',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  mediaFallback: {
    flex: 1,
    backgroundColor: theme.colors.surfaceAlt,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45,36,27,0.2)',
  },
  playButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45,36,27,0.72)',
  },
  videoLabel: {
    marginTop: theme.spacing.sm,
    color: '#FFF8F0',
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.9,
  },
});
