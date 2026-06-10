import { ImagePlus, Play, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { sanitizeCaptureImage } from '@/features/capture/utils/sanitizeCaptureImage';
import { theme } from '@/shared/styles/theme';
import { COMMUNITY_MEDIA_CONFIG, type CommunityCreatePostMediaInput } from '@/features/community/types';

export interface CommunityDraftMedia extends CommunityCreatePostMediaInput {
  id: string;
}

interface CommunityMediaPickerProps {
  disabled?: boolean;
  mediaList: CommunityDraftMedia[];
  onChange: (mediaList: CommunityDraftMedia[]) => void;
}

function createDraftId() {
  return `draft-media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function countByType(mediaList: CommunityDraftMedia[], type: CommunityDraftMedia['type']) {
  return mediaList.filter((media) => media.type === type).length;
}

export function CommunityMediaPicker({ disabled = false, mediaList, onChange }: CommunityMediaPickerProps) {
  const handlePickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('사진 접근 권한 필요', '커뮤니티에 사진이나 영상을 첨부하려면 사진 접근을 허용해 주세요.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: true,
      exif: false,
      mediaTypes: ['images', 'videos'],
      quality: 0.9,
      videoMaxDuration: COMMUNITY_MEDIA_CONFIG.maxVideoDurationSec,
    });

    if (result.canceled) {
      return;
    }

    const nextMedia = [...mediaList];
    let imageCount = countByType(nextMedia, 'IMAGE');
    let videoCount = countByType(nextMedia, 'VIDEO');

    for (const asset of result.assets) {
      const isVideo = asset.type === 'video';

      if (isVideo && videoCount >= COMMUNITY_MEDIA_CONFIG.maxVideoCount) {
        Alert.alert('영상 첨부 제한', `영상은 최대 ${COMMUNITY_MEDIA_CONFIG.maxVideoCount}개까지 첨부할 수 있어요.`);
        continue;
      }

      if (!isVideo && imageCount >= COMMUNITY_MEDIA_CONFIG.maxImageCount) {
        Alert.alert('사진 첨부 제한', `사진은 최대 ${COMMUNITY_MEDIA_CONFIG.maxImageCount}장까지 첨부할 수 있어요.`);
        continue;
      }

      const sanitizedUri = isVideo ? asset.uri : await sanitizeCaptureImage(asset.uri);

      nextMedia.push({
        id: createDraftId(),
        type: isVideo ? 'VIDEO' : 'IMAGE',
        uri: sanitizedUri,
        thumbnailUri: isVideo ? asset.uri : undefined,
        width: asset.width,
        height: asset.height,
        durationSec: asset.duration ? Math.round(asset.duration / 1000) : undefined,
      });

      if (isVideo) {
        videoCount += 1;
      } else {
        imageCount += 1;
      }
    }

    onChange(nextMedia);
  };

  const handleRemove = (mediaId: string) => {
    onChange(mediaList.filter((media) => media.id !== mediaId));
  };

  return (
    <View style={styles.container}>
      <Pressable
        disabled={disabled}
        onPress={handlePickMedia}
        style={({ pressed }) => [styles.addButton, pressed && !disabled && styles.pressed, disabled && styles.disabled]}
      >
        <ImagePlus color={theme.colors.primaryDark} size={20} />
        <Text style={styles.addButtonText}>사진/영상 추가</Text>
      </Pressable>

      {mediaList.length > 0 ? (
        <ScrollView contentContainerStyle={styles.previewRow} horizontal showsHorizontalScrollIndicator={false}>
          {mediaList.map((media) => (
            <View key={media.id} style={styles.previewItem}>
              <Image resizeMode="cover" source={{ uri: media.thumbnailUri ?? media.uri }} style={styles.previewImage} />
              {media.type === 'VIDEO' ? (
                <View style={styles.videoBadge}>
                  <Play color="#FFF8F0" fill="#FFF8F0" size={14} />
                </View>
              ) : null}
              <Pressable disabled={disabled} onPress={() => handleRemove(media.id)} style={styles.removeButton}>
                <Trash2 color="#FFF8F0" size={14} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
  },
  addButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(255,253,246,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
  },
  addButtonText: {
    color: theme.colors.primaryDark,
    fontSize: 15,
    fontWeight: '800',
  },
  previewRow: {
    gap: theme.spacing.sm,
  },
  previewItem: {
    width: 92,
    height: 92,
    overflow: 'hidden',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.16)',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45,36,27,0.72)',
  },
  videoBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45,36,27,0.72)',
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.55,
  },
});
