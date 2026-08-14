import { ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { createNdShadow, nd } from '@/shared/styles/theme';

const leatherTexture = require('../../../../assets/binder/leather-texture.webp');
const binderRing = require('../../../../assets/binder/binder-ring.webp');
const pageCurl = require('../../../../assets/binder/page-curl.webp');

/** 왼쪽에 물리는 링 개수. */
const RING_COUNT = 5;

interface BinderFrameProps {
  children: ReactNode;
  /** 넘길 다음 장이 있으면 오른쪽 아래 모서리가 접힌다. */
  hasNextPage?: boolean;
  onNextPage?: () => void;
}

/**
 * 고객 도감의 바인더.
 *
 * 가죽은 스티치가 없는 결 텍스처만 깔고 박음질은 여기서 그린다. 스티치까지 든
 * 이미지 한 장을 화면 비율에 맞춰 늘리면 박음질 두께와 모서리가 눌리고,
 * 안드로이드에는 9-slice가 없어 손쓸 방법이 없다.
 */
export function BinderFrame({ children, hasNextPage = false, onNextPage }: BinderFrameProps) {
  return (
    <View style={styles.binder}>
      <Image resizeMode="repeat" source={leatherTexture} style={styles.leather} />
      <View pointerEvents="none" style={styles.stitch} />

      <View style={styles.page}>
        {children}

        {hasNextPage ? (
          <Pressable
            accessibilityLabel="다음 장"
            accessibilityRole="button"
            onPress={onNextPage}
            style={styles.curlButton}
          >
            <Image source={pageCurl} style={styles.curl} />
            <ChevronRight color={nd.colors.sub} size={18} strokeWidth={2.4} style={styles.curlChevron} />
          </Pressable>
        ) : null}
      </View>

      {/* 링은 속지 왼쪽 끝을 물고 있어야 해서 페이지 위에 얹는다. */}
      <View pointerEvents="none" style={styles.rings}>
        {Array.from({ length: RING_COUNT }, (_, index) => (
          <Image key={index} resizeMode="contain" source={binderRing} style={styles.ring} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  binder: {
    flex: 1,
    overflow: 'hidden',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#F3E7D3',
  },
  leather: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
  /** 가장자리를 따라 도는 박음질. */
  stitch: {
    position: 'absolute',
    top: 9,
    left: 9,
    right: 9,
    bottom: 0,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(180, 150, 110, 0.45)',
  },
  page: {
    flex: 1,
    marginTop: 20,
    marginLeft: 34,
    marginRight: 16,
    borderRadius: 10,
    backgroundColor: '#FCF9F2',
    overflow: 'hidden',
    ...createNdShadow(0.12, 10),
  },
  rings: {
    position: 'absolute',
    top: 20,
    bottom: 0,
    left: 6,
    width: 46,
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
  },
  ring: {
    width: 46,
    height: 25,
  },
  curlButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 56,
    height: 64,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  curl: {
    ...StyleSheet.absoluteFillObject,
    width: 56,
    height: 64,
  },
  curlChevron: {
    marginRight: 7,
    marginBottom: 9,
  },
});
