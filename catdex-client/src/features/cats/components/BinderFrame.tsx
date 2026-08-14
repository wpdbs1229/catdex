import type { ReactNode } from 'react';
import { useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, Pressable, StyleSheet, View } from 'react-native';

const albumBackground = require('../../../../assets/binder/binder-album.webp');
const sheetFront = require('../../../../assets/binder/page-turn-front.webp');
const sheetBack = require('../../../../assets/binder/page-turn-back.webp');

/**
 * 통짜 렌더링(852x1360)에서 잰 주머니 안쪽 좌표.
 *
 * 링이 종이를 물고 비닐 주머니 여섯 칸이 그려진 장면 전체가 한 장에 구워져
 * 있고, 코드는 그 위 잰 자리에 카드만 얹는다. 배경을 stretch로 채우므로
 * 축마다 비율이 따로 늘어나는데, 슬롯도 같은 비율 좌표라 어긋나지 않는다.
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

/**
 * 회전하는 속지가 배경에서 차지하는 자리. 앞면 에셋이 배경의 이 영역을 그대로
 * 잘라낸 것이라(평균 채널차 1.1), 정지 상태에서 겹쳐도 이음새가 없다.
 */
const SHEET = { left: 102 / 852, top: 38 / 1360, width: 701 / 852, height: 1274 / 1360 };

/** 이만큼 돌면 넘어간 것으로 본다. 180도까지 돌리면 다음 장 카드를 가린다. */
const TURN_END_DEG = -165;
/** 손을 뗐을 때 이 진행률을 넘겼으면 마저 넘긴다. */
const COMPLETE_PROGRESS = 0.28;
/** 또는 이 속도(pt/ms)로 밀었으면 진행률과 무관하게 넘긴다. */
const COMPLETE_VELOCITY = 0.65;

type TurnDirection = 'next' | 'prev';

interface BinderFrameProps {
  /** 장별 카드 노드. 각 장은 왼쪽 위부터 가로 방향 최대 여섯 개. */
  pages: ReactNode[][];
  pageIndex: number;
  onPageChange: (index: number) => void;
  /** 카드가 없을 때 페이지 위에 띄울 내용. */
  emptyContent?: ReactNode;
  /** 떠 있는 하단바가 가리는 높이. 바인더 아래 모서리가 그 위에서 끝난다. */
  bottomInset?: number;
}

/**
 * 고객 도감의 링 바인더. 옆으로 밀거나 종이 말림을 누르면 속지가 왼쪽 고리를
 * 축으로 돌아가며 넘어간다.
 *
 * 표지·고리·주머니는 배경 한 장에 구워져 있고, 넘길 때만 그 위에 회전 속지
 * (앞면 이미지 + 그 장의 카드 + 뒷면 이미지)를 얹는다. 다음 장 카드는 회전이
 * 시작되기 전부터 아래에 깔려 있어 속지가 들리면 바로 드러난다.
 */
export function BinderFrame({
  pages,
  pageIndex,
  onPageChange,
  emptyContent,
  bottomInset = 0,
}: BinderFrameProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width } = size;
  // 시안처럼 바인더 아래 모서리가 하단바 위에서 보이도록 그만큼 위에서 끝낸다.
  const height = Math.max(0, size.height - bottomInset + 6);

  const [turn, setTurn] = useState<TurnDirection | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const isSettling = useRef(false);
  // PanResponder 콜백은 생성 시점의 state를 붙잡으므로, 제스처 중에 갱신되는
  // 값들은 ref로 따라간다.
  const progressValue = useRef(0);
  const turnRef = useRef<TurnDirection | null>(null);

  const canGoNext = pageIndex < pages.length - 1;
  const canGoPrev = pageIndex > 0;

  const finishTurn = (direction: TurnDirection, completed: boolean) => {
    const target = direction === 'next' ? (completed ? 1 : 0) : completed ? 0 : 1;

    Animated.timing(progress, {
      toValue: target,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      if (completed) {
        onPageChange(direction === 'next' ? pageIndex + 1 : pageIndex - 1);
      }

      setTurn(null);
      turnRef.current = null;
      isSettling.current = false;
    });
  };

  const shouldClaimSwipe = (dx: number, dy: number) => {
    return (
      !isSettling.current &&
      !turnRef.current &&
      Math.abs(dx) > 12 &&
      Math.abs(dx) > Math.abs(dy) * 1.5 &&
      (dx < 0 ? canGoNext : canGoPrev)
    );
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // 카드 탭은 그대로 두고, 옆으로 끄는 손만 가로챈다. 손이 카드 위에서
        // 시작하면 캡처(위에서 뺏기)로, 빈 종이에서 시작하면 버블로 잡히므로
        // 둘 다 열어둔다.
        onMoveShouldSetPanResponder: (_, gesture) => shouldClaimSwipe(gesture.dx, gesture.dy),
        onMoveShouldSetPanResponderCapture: (_, gesture) => shouldClaimSwipe(gesture.dx, gesture.dy),
        onPanResponderMove: (_, gesture) => {
          if (width <= 0) {
            return;
          }

          // 방향은 첫 이동의 부호로 정한다. grant 시점의 dx는 시뮬레이터
          // 합성 입력에서 반대 부호로 들어오는 경우가 있어 믿을 수 없다.
          // 한번 정해지면 원점을 지나쳐도 같은 장이 반대로 눕는 것이지
          // 다른 장 넘김으로 바뀌지 않는다.
          if (!turnRef.current) {
            if (Math.abs(gesture.dx) < 2) {
              return;
            }

            const direction: TurnDirection = gesture.dx < 0 ? 'next' : 'prev';

            if (direction === 'next' ? !canGoNext : !canGoPrev) {
              return;
            }

            turnRef.current = direction;
            setTurn(direction);
            progressValue.current = direction === 'next' ? 0 : 1;
            progress.setValue(progressValue.current);
          }

          const direction = turnRef.current;
          const dragged = Math.min(1, Math.max(0, Math.abs(gesture.dx) / (width * 0.85)));
          const next =
            direction === 'next' ? (gesture.dx < 0 ? dragged : 0) : gesture.dx > 0 ? 1 - dragged : 1;

          progressValue.current = next;
          progress.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          const direction = turnRef.current;

          if (!direction) {
            return;
          }

          const traveled = direction === 'next' ? progressValue.current : 1 - progressValue.current;
          const fastEnough =
            direction === 'next' ? gesture.vx <= -COMPLETE_VELOCITY : gesture.vx >= COMPLETE_VELOCITY;

          isSettling.current = true;
          finishTurn(direction, traveled >= COMPLETE_PROGRESS || fastEnough);
        },
        onPanResponderTerminate: () => {
          if (!turnRef.current) {
            return;
          }

          isSettling.current = true;
          finishTurn(turnRef.current, false);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canGoNext, canGoPrev, pageIndex, pages.length, width],
  );

  const startCurlTurn = () => {
    if (!canGoNext || turn || isSettling.current) {
      return;
    }

    turnRef.current = 'next';
    setTurn('next');
    progress.setValue(0);
    isSettling.current = true;
    finishTurn('next', true);
  };

  const isMeasured = width > 0 && height > 0;
  const sheetRect = {
    left: SHEET.left * width,
    top: SHEET.top * height,
    width: SHEET.width * width,
    height: SHEET.height * height,
  };

  const rotateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${TURN_END_DEG}deg`],
  });
  // 종이가 들린 중간에 아래 장으로 떨어지는 그림자가 가장 짙다.
  const underShadowOpacity = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.24, 0.04],
  });
  // 돌아가는 앞면은 빛에서 멀어질수록 어두워진다.
  const frontShadeOpacity = progress.interpolate({
    inputRange: [0, 0.5],
    outputRange: [0, 0.16],
    extrapolate: 'clamp',
  });

  // 아래에 깔리는 장과 회전 속지에 붙는 장.
  const underPage = turn === 'next' ? pages[pageIndex + 1] : pages[pageIndex];
  const turningPage = turn === 'next' ? pages[pageIndex] : pages[pageIndex - 1];

  const renderSlots = (slots: ReactNode[] | undefined, rect: { left: number; top: number; width: number; height: number }) =>
    (slots ?? []).slice(0, 6).map((slot, index) => {
      const [x0, x1] = SLOT_XS[index % 2];
      const [y0, y1] = SLOT_YS[Math.floor(index / 2)];

      return (
        <View
          key={index}
          style={{
            position: 'absolute',
            // 슬롯 좌표는 바인더 전체 기준이므로, 회전 속지 안에서는 속지
            // 원점만큼 빼서 놓는다.
            left: x0 * width - rect.left,
            top: y0 * height - rect.top,
            width: (x1 - x0) * width,
            height: (y1 - y0) * height,
          }}
        >
          {slot}
        </View>
      );
    });

  return (
    <View onLayout={(event) => setSize(event.nativeEvent.layout)} style={styles.frame}>
      {isMeasured ? (
        <View style={{ width, height }} {...panResponder.panHandlers}>
          <Image
            resizeMode="stretch"
            source={albumBackground}
            style={{ position: 'absolute', top: 0, left: 0, width, height }}
          />

          {/* 아래 장. 넘김이 없을 때는 현재 장이 곧 아래 장이다. */}
          {renderSlots(underPage, { left: 0, top: 0, width, height })}

          {turn ? (
            <>
              {/* 들린 종이가 아래 장에 떨어뜨리는 그림자 */}
              <Animated.View
                pointerEvents="none"
                style={[styles.underShadow, sheetRect, { opacity: underShadowOpacity }]}
              />

              {/* 회전 속지. 왼쪽 고리를 축으로 돈다. */}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.turningSheet,
                  sheetRect,
                  {
                    transform: [{ perspective: 1100 }, { rotateY }],
                  },
                ]}
              >
                {/* 앞면: 속지 이미지 + 이 장의 카드. 90도를 넘으면 숨는다. */}
                <View style={styles.face}>
                  <Image
                    resizeMode="stretch"
                    source={sheetFront}
                    style={StyleSheet.flatten([styles.faceImage, { width: sheetRect.width, height: sheetRect.height }])}
                  />
                  <View style={{ width: sheetRect.width, height: sheetRect.height }}>
                    {renderSlots(turningPage, sheetRect)}
                  </View>
                  <Animated.View
                    style={[
                      StyleSheet.absoluteFillObject,
                      { backgroundColor: '#3B2E1E', opacity: frontShadeOpacity },
                    ]}
                  />
                </View>

                {/* 뒷면: 미리 180도 돌려두면 속지가 90도를 넘는 순간 나타난다. */}
                <View style={[styles.face, styles.backFace]}>
                  <Image
                    resizeMode="stretch"
                    source={sheetBack}
                    style={StyleSheet.flatten([styles.faceImage, { width: sheetRect.width, height: sheetRect.height }])}
                  />
                </View>
              </Animated.View>
            </>
          ) : null}

          {emptyContent ? <View style={styles.empty}>{emptyContent}</View> : null}

          {canGoNext && !turn ? (
            <Pressable
              accessibilityLabel="다음 장"
              accessibilityRole="button"
              onPress={startCurlTurn}
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
  underShadow: {
    position: 'absolute',
    backgroundColor: '#2B2318',
    borderRadius: 12,
  },
  turningSheet: {
    position: 'absolute',
    transformOrigin: '0% 50%',
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    backfaceVisibility: 'hidden',
  },
  backFace: {
    transform: [{ rotateY: '180deg' }],
  },
  faceImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
