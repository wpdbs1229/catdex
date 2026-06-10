import { Play } from 'lucide-react-native';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { theme } from '@/shared/styles/theme';
import type { CommunityPostMedia } from '@/features/community/types';

interface CommunityPostMediaViewerProps {
  mediaList: CommunityPostMedia[];
  onOpenMedia?: (media: CommunityPostMedia) => void;
}

const mockAssets = {
  'asset:orange': require('../../../../assets/illustrations/cat-orange-clean.png'),
  'asset:dark': require('../../../../assets/illustrations/cat-dark-clean.png'),
  'asset:tuxedo': require('../../../../assets/illustrations/cat-tuxedo-clean.png'),
  'asset:gray': require('../../../../assets/illustrations/cat-gray-clean.png'),
} satisfies Record<string, ImageSourcePropType>;

function mediaSource(media: CommunityPostMedia): ImageSourcePropType | null {
  const source = media.type === 'VIDEO' ? media.thumbnailUrl : media.url;

  if (!source) {
    return null;
  }

  if (source in mockAssets) {
    return mockAssets[source as keyof typeof mockAssets];
  }

  return { uri: source };
}

export function CommunityPostMediaViewer({ mediaList, onOpenMedia }: CommunityPostMediaViewerProps) {
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
        const source = mediaSource(media);

        return (
          <Pressable
            key={media.id}
            onPress={() => onOpenMedia?.(media)}
            style={({ pressed }) => [styles.mediaFrame, mediaList.length > 1 && styles.mediaFrameCompact, pressed && styles.pressed]}
          >
            {source ? <Image resizeMode="cover" source={source} style={styles.media} /> : <View style={styles.mediaFallback} />}
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
    gap: theme.spacing.sm,
  },
  mediaFrame: {
    width: '100%',
    minWidth: 280,
    aspectRatio: 4 / 3,
    overflow: 'hidden',
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.16)',
  },
  mediaFrameCompact: {
    width: 248,
    minWidth: 248,
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
