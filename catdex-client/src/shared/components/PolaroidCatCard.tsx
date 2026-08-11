import { Heart, PawPrint } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { createNdShadow, nd } from '@/shared/styles/theme';

const paperTexture = require('../../../assets/textures/crumpled-paper.jpg');

interface PolaroidCatCardProps {
  /** 대표 사진. 없으면 발바닥 자리표시자를 보여준다. */
  imageSource?: ImageSourcePropType;
  tagLabel: string;
  onPress?: () => void;
  liked?: boolean;
  onToggleLike?: () => void;
  locked?: boolean;
  /** 시안에서 아직 내 도감에 없는 고양이는 냥태그를 회색으로 쓴다. */
  tagTone?: 'default' | 'muted';
}

export function PolaroidCatCard({
  imageSource,
  tagLabel,
  onPress,
  liked = false,
  onToggleLike,
  locked = false,
  tagTone = 'default',
}: PolaroidCatCardProps) {
  return (
    <Pressable
      accessibilityLabel={tagLabel}
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.photoFrame}>
        <Image resizeMode="cover" source={paperTexture} style={styles.paper} />
        {imageSource ? (
          <Image resizeMode="contain" source={imageSource} style={[styles.photo, locked && styles.lockedPhoto]} />
        ) : null}
        {locked || !imageSource ? (
          <View style={styles.lockedOverlay}>
            <PawPrint color={nd.colors.subtle} size={28} />
          </View>
        ) : null}
        {onToggleLike ? (
          <Pressable
            accessibilityLabel={liked ? '찜 해제' : '찜하기'}
            hitSlop={6}
            onPress={onToggleLike}
            style={styles.heartButton}
          >
            <Heart
              color={liked ? nd.colors.heart : nd.colors.ink}
              fill={liked ? nd.colors.heart : 'transparent'}
              size={16}
              strokeWidth={1.8}
            />
          </Pressable>
        ) : null}
      </View>
      <View style={[styles.tag, tagTone === 'muted' && styles.tagMuted]}>
        <Text numberOfLines={1} style={styles.tagText}>
          {tagLabel}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    aspectRatio: 165 / 178,
    backgroundColor: nd.colors.bg,
    padding: 10,
    paddingBottom: 22,
    ...createNdShadow(0.16, 8),
  },
  pressed: {
    opacity: 0.88,
  },
  photoFrame: {
    flex: 1,
    backgroundColor: nd.colors.field,
    overflow: 'hidden',
  },
  paper: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  photo: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '8%',
    bottom: 0,
    width: '100%',
    height: '96%',
  },
  lockedPhoto: {
    opacity: 0.22,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    ...createNdShadow(0.08, 4),
  },
  tag: {
    position: 'absolute',
    top: 4,
    left: 12,
    maxWidth: '78%',
    backgroundColor: nd.colors.tag,
    paddingHorizontal: 5,
    paddingVertical: 4,
    transform: [{ rotate: '-3deg' }],
  },
  tagMuted: {
    backgroundColor: nd.colors.tagMuted,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#000000',
  },
});
