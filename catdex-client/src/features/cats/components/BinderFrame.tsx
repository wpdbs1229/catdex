import type { ReactNode } from 'react';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

const albumBackground = require('../../../../assets/binder/binder-album.webp');

/**
 * 통짜 렌더링(852x1360)에서 잰 주머니 안쪽 좌표.
 *
 * 링이 종이를 물고 비닐 주머니 여섯 칸이 그려진 장면 전체가 한 장에 구워져
 * 있고, 코드는 그 위 잰 자리에 카드만 얹는다. 링·속지·비닐을 레이어로 쌓던
 * 방식은 조각마다 그림자 방향이 어긋나고 관통 표현이 안 돼서 접었다.
 *
 * 배경을 stretch로 채우므로 축마다 비율이 따로 늘어나는데, 슬롯도 같은
 * 비율 좌표라 주머니와 카드는 어긋나지 않는다.
 */
const SLOT_XS: Array<[number, number]> = [
  [156 / 852, 404 / 852],
  [464 / 852, 716 / 852],
];
const SLOT_YS: Array<[number, number]> = [
  [111 / 1360, 459 / 1360],
  [518 / 1360, 849 / 1360],
  [906 / 1360, 1249 / 1360],
];
/** 오른쪽 아래에 구워진 종이 말림. 이 영역을 누르면 다음 장으로 넘어간다. */
const CURL_RECT = { left: 700 / 852, top: 1120 / 1360 };

interface BinderFrameProps {
  /** 이 장에 꽂을 카드. 왼쪽 위부터 가로 방향으로 최대 여섯 장. */
  slots: ReactNode[];
  /** 카드가 없을 때 페이지 위에 띄울 내용. */
  emptyContent?: ReactNode;
  hasNextPage?: boolean;
  onNextPage?: () => void;
  /** 떠 있는 하단바가 가리는 높이. 바인더 아래 모서리가 그 위에서 끝난다. */
  bottomInset?: number;
}

export function BinderFrame({
  slots,
  emptyContent,
  hasNextPage = false,
  onNextPage,
  bottomInset = 0,
}: BinderFrameProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width } = size;
  // 시안처럼 바인더 아래 모서리가 하단바 위에서 보이도록 그만큼 위에서 끝낸다.
  const height = Math.max(0, size.height - bottomInset + 6);

  return (
    <View onLayout={(event) => setSize(event.nativeEvent.layout)} style={styles.frame}>
      {width > 0 && height > 0 ? (
        <View style={{ width, height }}>
          <Image resizeMode="stretch" source={albumBackground} style={StyleSheet.absoluteFill} />

          {slots.slice(0, 6).map((slot, index) => {
            const [x0, x1] = SLOT_XS[index % 2];
            const [y0, y1] = SLOT_YS[Math.floor(index / 2)];

            return (
              <View
                key={index}
                style={{
                  position: 'absolute',
                  left: x0 * width,
                  top: y0 * height,
                  width: (x1 - x0) * width,
                  height: (y1 - y0) * height,
                }}
              >
                {slot}
              </View>
            );
          })}

          {emptyContent ? <View style={styles.empty}>{emptyContent}</View> : null}

          {hasNextPage ? (
            <Pressable
              accessibilityLabel="다음 장"
              accessibilityRole="button"
              onPress={onNextPage}
              style={[
                styles.curlPress,
                {
                  left: CURL_RECT.left * width,
                  top: CURL_RECT.top * height,
                },
              ]}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
  },
  empty: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  /** 구워진 종이 말림 위에 얹는 투명한 터치 영역. */
  curlPress: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
});
