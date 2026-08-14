import { Heart, PawPrint } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { HabitatIcon } from '@/shared/cats/HabitatIcon';
import { CAT_HABITAT_LABELS, type CatHabitat } from '@/shared/cats/habitat';
import { nd, theme } from '@/shared/styles/theme';

const paperTexture = require('../../../../assets/textures/crumpled-paper.jpg');

/** 하트 리본이 덮는 모서리 크기. */
const RIBBON_SIZE = 44;

interface BinderCatCardProps {
  number: number;
  name: string;
  habitat: CatHabitat;
  imageSource?: ImageSourcePropType;
  liked?: boolean;
  onPress?: () => void;
  onToggleLike?: () => void;
}

/**
 * 바인더 주머니에 꽂힌 도감 카드.
 *
 * 비닐 주머니는 배경 이미지에 구워져 있고, 카드는 그 주머니 안쪽에 맞춰 얹힌다.
 * 그래서 카드가 스스로 비닐이나 그림자를 두르지 않는다 - 주머니 테두리와 빛
 * 반사가 배경에서 카드를 둘러싼다.
 */
export function BinderCatCard({
  number,
  name,
  habitat,
  imageSource,
  liked = false,
  onPress,
  onToggleLike,
}: BinderCatCardProps) {
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityLabel={`${name} ${CAT_HABITAT_LABELS[habitat]}`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.photoArea}>
          <Image resizeMode="cover" source={paperTexture} style={styles.photoPaper} />
          {imageSource ? (
            <Image resizeMode="contain" source={imageSource} style={styles.photo} />
          ) : (
            <View style={styles.photoFallback}>
              <PawPrint color={nd.colors.subtle} size={34} />
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.number}>#{String(number).padStart(3, '0')}</Text>
          <View style={styles.footerRow}>
            <Text numberOfLines={1} style={styles.name}>
              {name}
            </Text>
            <View style={styles.habitatTag}>
              <HabitatIcon color={nd.colors.ink} habitat={habitat} size={13} />
              <Text style={styles.habitatLabel}>{CAT_HABITAT_LABELS[habitat]}</Text>
            </View>
          </View>
        </View>

        {liked ? (
          <View pointerEvents="none" style={styles.ribbon}>
            <Svg height={RIBBON_SIZE} width={RIBBON_SIZE}>
              <Path d={`M0 0 H${RIBBON_SIZE} V${RIBBON_SIZE} Z`} fill={theme.colors.primary} />
            </Svg>
            <Heart color="#FFFFFF" fill="#FFFFFF" size={13} style={styles.ribbonHeart} />
          </View>
        ) : null}
      </Pressable>

      {onToggleLike ? (
        <Pressable
          accessibilityLabel={liked ? '찜 해제' : '찜하기'}
          accessibilityRole="button"
          hitSlop={6}
          onPress={onToggleLike}
          style={styles.likeHitArea}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  card: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.primaryLight,
    backgroundColor: '#FFFDF8',
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.9,
  },
  photoArea: {
    flex: 1,
    overflow: 'hidden',
  },
  photoPaper: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
    opacity: 0.5,
  },
  photo: {
    flex: 1,
    margin: 5,
  },
  photoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 7,
    gap: 1,
    backgroundColor: '#FFFDF8',
  },
  number: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: theme.colors.primary,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
  },
  name: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: nd.colors.ink,
  },
  habitatTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  habitatLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: nd.colors.ink,
  },
  ribbon: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: RIBBON_SIZE,
    height: RIBBON_SIZE,
  },
  ribbonHeart: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  /** 하트는 카드 위 모서리에서 따로 받는다. 카드 전체 눌림과 겹치지 않게. */
  likeHitArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 38,
    height: 38,
  },
});
