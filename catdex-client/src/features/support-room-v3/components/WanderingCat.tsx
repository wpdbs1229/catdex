import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image } from 'react-native';
import { CAT_ACTION_IMAGES } from '@/features/support-room/support-room.assets';
import type { CharacterAssetKey } from '@/features/support-room/support-room.assets';
import { useProjection } from '../render/projection';
import { calculateIdleCatLayout } from '../render/sprite-layout';
import { IsoContactShadow } from './IsoContactShadow';

/** 한 칸 걷는 데 걸리는 시간과, 도착해서 쉬는 시간. */
const STEP_MS_PER_CELL = 1400;
const REST_MS = 2200;

/**
 * 앉을 가구가 없어 바닥을 도는 손님.
 *
 * 앉은 손님과 달리 상담(기록)이 열리지 않는다 - 상담은 가구가 있어야 한다.
 * 그림은 idle 포즈 하나로 두고 위치만 옮긴다. 걷는 포즈 아트는 아직 없다.
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

  useEffect(() => {
    if (stops.length < 2) return;

    // 0 -> 1 -> 2 ... -> stops.length 로 한 바퀴 돈다(마지막은 첫 지점으로 복귀).
    const legs = stops.map((_, index) => {
      const from = stops[index];
      const to = stops[(index + 1) % stops.length];
      const cells = Math.hypot(to.groundX - from.groundX, to.groundY - from.groundY) / projection.tileW;
      return Animated.sequence([
        Animated.timing(progress, {
          toValue: index + 1,
          duration: Math.max(600, cells * STEP_MS_PER_CELL),
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.delay(REST_MS),
      ]);
    });

    const loop = Animated.loop(Animated.sequence(legs));
    loop.start();
    return () => {
      loop.stop();
      progress.setValue(0);
    };
  }, [stops, progress, projection.tileW]);

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
          position: 'absolute',
          left,
          top,
          width: first.imageSize,
          height: first.imageSize,
          zIndex,
        }}
      />
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
