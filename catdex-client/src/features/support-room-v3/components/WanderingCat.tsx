import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image } from 'react-native';
import { CAT_ACTION_IMAGES } from '@/features/support-room/support-room.assets';
import type { CharacterAssetKey } from '@/features/support-room/support-room.assets';
import { useProjection } from '../render/projection';
import { calculateIdleCatLayout } from '../render/sprite-layout';
import { walkFrames } from '../support-room-v3.cat-walk';
import { IsoContactShadow } from './IsoContactShadow';

/** 한 칸 걷는 데 걸리는 시간과, 도착해서 쉬는 시간. */
const STEP_MS_PER_CELL = 1400;
const REST_MS = 2200;

/**
 * 앉을 가구가 없어 바닥을 도는 손님.
 *
 * 앉은 손님과 달리 상담(기록)이 열리지 않는다 - 상담은 가구가 있어야 한다.
 * 움직이는 동안은 걷는 그림, 멈춰 쉬는 동안은 idle을 보여준다. 앉은 자세로
 * 바닥을 미끄러지지 않게 하려면 이 둘을 갈라야 한다.
 */
export function WanderingCat({
  catKey,
  path,
}: {
  catKey: CharacterAssetKey;
  path: readonly { x: number; y: number }[];
}) {
  const projection = useProjection();

  // 경로의 각 지점을 미리 화면 좌표로 바꿔 둔다. 방 크기가 바뀌면 다시 계산된다.
  const stops = useMemo(
    () => path.map((cell) => calculateIdleCatLayout(projection, cell.x, cell.y)),
    [projection, path],
  );

  const progress = useRef(new Animated.Value(0)).current;
  /** 1이면 걷는 중, 0이면 멈춰 쉬는 중. 그림과 걸음 흔들림이 여기 물린다. */
  const moving = useRef(new Animated.Value(0)).current;
  /** 1이면 화면 왼쪽으로 가는 중(그림을 뒤집는다). */
  const facingLeft = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (stops.length < 2) return;

    // 0 -> 1 -> 2 ... -> stops.length 로 한 바퀴 돈다(마지막은 첫 지점으로 복귀).
    const jump = (value: Animated.Value, toValue: number) =>
      Animated.timing(value, { toValue, duration: 0, useNativeDriver: false });

    const legs = stops.map((_, index) => {
      const from = stops[index];
      const to = stops[(index + 1) % stops.length];
      const cells = Math.hypot(to.groundX - from.groundX, to.groundY - from.groundY) / projection.tileW;
      return Animated.sequence([
        jump(facingLeft, to.left < from.left ? 1 : 0),
        jump(moving, 1),
        Animated.timing(progress, {
          toValue: index + 1,
          duration: Math.max(600, cells * STEP_MS_PER_CELL),
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        jump(moving, 0),
        Animated.delay(REST_MS),
      ]);
    });

    const loop = Animated.loop(Animated.sequence(legs));
    const step = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 280, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(bob, { toValue: 0, duration: 280, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ]),
    );
    loop.start();
    step.start();
    return () => {
      loop.stop();
      step.stop();
      progress.setValue(0);
      moving.setValue(0);
    };
  }, [stops, progress, moving, facingLeft, bob, projection.tileW]);

  if (stops.length === 0) return null;
  const first = stops[0];
  if (stops.length === 1) {
    return <StillCat catKey={catKey} layout={first} />;
  }

  const inputRange = stops.map((_, index) => index).concat(stops.length);
  const cycle = [...stops, stops[0]];
  const left = progress.interpolate({ inputRange, outputRange: cycle.map((s) => s.left) });
  const top = progress.interpolate({ inputRange, outputRange: cycle.map((s) => s.top) });
  const shadowLeft = progress.interpolate({
    inputRange,
    outputRange: cycle.map((s) => s.shadowLeft),
  });
  const shadowTop = progress.interpolate({
    inputRange,
    outputRange: cycle.map((s) => s.shadowTop),
  });
  // 깊이도 같이 따라가야 한다. 첫 지점 값으로 굳혀 두면 방을 가로지를 때
  // 앞에 있는 가구 뒤로 들어가거나 뒤에 있는 가구를 가린다.
  const zIndex = progress.interpolate({ inputRange, outputRange: cycle.map((s) => s.zIndex) });

  const walk = walkFrames(catKey)?.[0];
  // 걸을 때만 위아래로 튄다. 쉬는 동안은 흔들리지 않는다.
  const lift = Animated.multiply(
    moving,
    bob.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -Math.max(1.5, first.imageSize * 0.035)],
    }),
  );
  const spriteStyle = {
    position: 'absolute' as const,
    left,
    top,
    width: first.imageSize,
    height: first.imageSize,
    zIndex,
  };

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: shadowLeft,
          top: shadowTop,
          width: first.shadowWidth,
          height: first.shadowHeight,
          borderRadius: first.shadowHeight / 2,
          backgroundColor: 'rgba(73, 44, 20, 0.16)',
          zIndex,
        }}
      />
      <Animated.Image
        resizeMode="contain"
        source={CAT_ACTION_IMAGES[catKey].idle}
        style={{
          ...spriteStyle,
          opacity: walk ? Animated.subtract(1, moving) : 1,
        }}
      />
      {walk ? (
        <Animated.Image
          resizeMode="contain"
          source={walk}
          style={{
            ...spriteStyle,
            opacity: moving,
            transform: [
              { translateY: lift },
              { scaleX: facingLeft.interpolate({ inputRange: [0, 1], outputRange: [1, -1] }) },
            ],
          }}
        />
      ) : null}
    </>
  );
}

function StillCat({
  catKey,
  layout,
}: {
  catKey: CharacterAssetKey;
  layout: ReturnType<typeof calculateIdleCatLayout>;
}) {
  return (
    <>
      <IsoContactShadow layout={layout} />
      <Image
        resizeMode="contain"
        source={CAT_ACTION_IMAGES[catKey].idle}
        style={{
          position: 'absolute',
          left: layout.left,
          top: layout.top,
          width: layout.imageSize,
          height: layout.imageSize,
          zIndex: layout.zIndex,
        }}
      />
    </>
  );
}
