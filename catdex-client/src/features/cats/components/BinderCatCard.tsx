import { Heart, PawPrint } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { HabitatIcon } from '@/shared/cats/HabitatIcon';
import { CAT_HABITAT_LABELS, type CatHabitat } from '@/shared/cats/habitat';
import { createNdShadow, nd, theme } from '@/shared/styles/theme';

const paperTexture = require('../../../../assets/textures/crumpled-paper.jpg');
const vinylPocket = require('../../../../assets/binder/vinyl-pocket.png');

/** 하트 리본이 덮는 모서리 크기. */
const RIBBON_SIZE = 52;

interface BinderCatCardProps {
  number: number;
  name: string;
  habitat: CatHabitat;
  imageSource?: ImageSourcePropType;
  liked?: boolean;
  /** 페이지의 첫 카드. 살짝 비스듬히 떠 있어 손이 마지막으로 꽂은 카드처럼 보인다. */
  featured?: boolean;
  onPress?: () => void;
  onToggleLike?: () => void;
}

/**
 * 바인더 속지에 끼운 도감 카드.
 *
 * 사진은 배경을 지운 누끼라 카드 안에서 종이 위에 놓인 것처럼 보인다.
 * 맨 위에는 렌더링된 비닐 주머니 이미지를 덮는다. 입구선·재봉선·반사가
 * 하트 리본까지 눌러 덮어야 "끼워진 카드"로 보인다.
 */
export function BinderCatCard({
  number,
  name,
  habitat,
  imageSource,
  liked = false,
  featured = false,
  onPress,
  onToggleLike,
}: BinderCatCardProps) {
  return (
    <View style={[styles.sleeve, featured && styles.sleeveFeatured]}>
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
              <HabitatIcon color={nd.colors.ink} habitat={habitat} size={14} />
              <Text style={styles.habitatLabel}>{CAT_HABITAT_LABELS[habitat]}</Text>
            </View>
          </View>
        </View>

        {liked ? (
          <View pointerEvents="none" style={styles.ribbon}>
            <Svg height={RIBBON_SIZE} width={RIBBON_SIZE}>
              <Path
                d={`M0 0 H${RIBBON_SIZE} V${RIBBON_SIZE} Z`}
                fill={theme.colors.primary}
              />
            </Svg>
            <Heart color="#FFFFFF" fill="#FFFFFF" size={15} style={styles.ribbonHeart} />
          </View>
        ) : null}

      </Pressable>

      {/* 비닐 주머니가 카드와 리본까지 덮는다. 카드는 overflow:hidden이라 그 안에
          두면 카드 밖으로 나온 주머니 테두리·재봉선이 잘려 아무것도 안 보인다. */}
      <View pointerEvents="none" style={styles.vinyl}>
        <Image resizeMode="stretch" source={vinylPocket} style={styles.vinylImage} />
      </View>

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
  sleeve: {
    flex: 1,
    // 테두리·반사는 비닐 이미지가 갖고 있다. 여기서 겹쳐 그리면 두 겹이 된다.
    padding: 3,
  },
  /** 손이 마지막으로 꽂은 카드. 비스듬히 얹혀 다른 카드 위에 떠 있다. */
  sleeveFeatured: {
    zIndex: 2,
    transform: [{ rotate: '-3deg' }, { translateY: -2 }],
    ...createNdShadow(0.25, 12),
  },
  card: {
    flex: 1,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: theme.colors.primaryLight,
    backgroundColor: '#FFFDF8',
    overflow: 'hidden',
    ...createNdShadow(0.1, 8),
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
    margin: 6,
  },
  photoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 9,
    paddingTop: 5,
    paddingBottom: 8,
    gap: 1,
    backgroundColor: '#FFFDF8',
  },
  number: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: theme.colors.primary,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  name: {
    flexShrink: 1,
    fontSize: 17,
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
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: nd.colors.ink,
  },
  /** 카드(sleeve padding 3 안쪽)보다 넉넉하게 덮어 주머니 테두리·재봉선이
      카드 가장자리 밖으로 나오게 한다. */
  vinyl: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  vinylImage: {
    width: '100%',
    height: '100%',
  },
  ribbon: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: RIBBON_SIZE,
    height: RIBBON_SIZE,
    alignItems: 'flex-end',
  },
  ribbonHeart: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  /** 하트는 카드 위 모서리에서 따로 받는다. 카드 전체 눌림과 겹치지 않게. */
  likeHitArea: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 40,
    height: 40,
    borderTopRightRadius: 11,
  },
});
