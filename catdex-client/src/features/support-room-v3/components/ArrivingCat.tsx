import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { CAT_ACTION_IMAGES } from '@/features/support-room/support-room.assets';
import type { CharacterAssetKey } from '@/features/support-room/support-room.assets';
import { useProjection } from '../render/projection';
import { calculateIdleCatLayout } from '../render/sprite-layout';
import { DOOR_OPEN_MS, WALK_MS_PER_CELL, type Cell } from '../support-room-v3.arrival';
import type { GridRect } from '../support-room-v3.layout';
import { walkFrames } from '../support-room-v3.cat-walk';
import { DoorwayLight } from './DoorwayLight';

/**
 * 문에서 걸어 들어와 자리까지 가는 손님.
 *
 * 걷는 포즈 아트가 없어서 idle 한 장을 쓰되, 걸음마다 위아래로 살짝 튀게 하고
 * 가는 방향으로 뒤집는다. 그림 없이도 "걸어온다"로 읽힌다.
 *
 * 도착하면 onArrive를 부르고 사라진다 - 앉은 모습은 가구 쪽이 그린다.
 */
export function ArrivingCat({
  catKey,
  path,
  doorRect,
  startDelayMs = 0,
  onArrive,
}: {
  catKey: CharacterAssetKey;
  path: readonly Cell[];
  /** 손님이 들어오는 문 앞 칸. 여기 바닥에 빛이 들었다 사라진다. */
  doorRect?: GridRect;
  startDelayMs?: number;
  onArrive: () => void;
}) {
  const projection = useProjection();
  const stops = useMemo(
    () => path.map((cell) => calculateIdleCatLayout(projection, cell.x, cell.y)),
    [projection, path],
  );

  const progress = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const doorLight = useRef(new Animated.Value(0)).current;
  const onArriveRef = useRef(onArrive);
  onArriveRef.current = onArrive;

  // 문이 열리고(빛이 들고) - 손님이 나오고 - 문이 닫힌다(빛이 진다).
  useEffect(() => {
    const door = Animated.sequence([
      Animated.delay(startDelayMs),
      Animated.timing(doorLight, { toValue: 1, duration: DOOR_OPEN_MS, useNativeDriver: false }),
      Animated.delay(WALK_MS_PER_CELL * 2),
      Animated.timing(doorLight, { toValue: 0, duration: 520, useNativeDriver: false }),
    ]);
    door.start();
    return () => {
      door.stop();
      doorLight.setValue(0);
    };
  }, [doorLight, startDelayMs, path]);

  useEffect(() => {
    if (stops.length < 2) {
      const timer = setTimeout(() => onArriveRef.current(), startDelayMs);
      return () => clearTimeout(timer);
    }

    const legs = stops.slice(1).map((_, index) => {
      const from = path[index];
      const to = path[index + 1];
      const cells = Math.abs(to.x - from.x) + Math.abs(to.y - from.y) || 1;
      return Animated.timing(progress, {
        toValue: index + 1,
        duration: Math.max(WALK_MS_PER_CELL, cells * WALK_MS_PER_CELL),
        easing: Easing.linear,
        useNativeDriver: false,
      });
    });

    const walk = Animated.sequence([
      Animated.delay(startDelayMs + DOOR_OPEN_MS),
      // 문에서 한 걸음 나오는 동안 나타난다.
      Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: false }),
      ...legs,
    ]);
    const step = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: WALK_MS_PER_CELL / 2, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(bob, { toValue: 0, duration: WALK_MS_PER_CELL / 2, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ]),
    );

    step.start();
    walk.start(({ finished }) => {
      step.stop();
      if (finished) onArriveRef.current();
    });
    return () => {
      walk.stop();
      step.stop();
      progress.setValue(0);
      fade.setValue(0);
    };
    // path는 목적지가 바뀔 때만 새로 만들어진다.
  }, [stops, path, progress, bob, fade, startDelayMs]);

  if (stops.length === 0) return null;
  const first = stops[0];
  const inputRange = stops.map((_, index) => index);
  const single = stops.length < 2;

  const left = single
    ? first.left
    : progress.interpolate({ inputRange, outputRange: stops.map((s) => s.left) });
  const top = single
    ? first.top
    : progress.interpolate({ inputRange, outputRange: stops.map((s) => s.top) });
  const shadowLeft = single
    ? first.shadowLeft
    : progress.interpolate({ inputRange, outputRange: stops.map((s) => s.shadowLeft) });
  const shadowTop = single
    ? first.shadowTop
    : progress.interpolate({ inputRange, outputRange: stops.map((s) => s.shadowTop) });
  const zIndex = single
    ? first.zIndex
    : progress.interpolate({ inputRange, outputRange: stops.map((s) => s.zIndex) });

  // 걸음 높이는 고양이 크기에 비례한다 - 확대해도 같은 걸음으로 보인다.
  const lift = bob.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -Math.max(1.5, first.imageSize * 0.035)],
  });

  // 화면에서 왼쪽으로 가면 그림을 뒤집는다. 걷는 아트는 오른쪽 향만 그린다.
  const last = stops[stops.length - 1];
  const facingLeft = last.left < first.left;
  const frames = walkFrames(catKey) ?? [CAT_ACTION_IMAGES[catKey].idle];
  const spriteStyle = {
    position: 'absolute' as const,
    left,
    top,
    width: first.imageSize,
    height: first.imageSize,
    transform: [{ translateY: lift }, { scaleX: facingLeft ? -1 : 1 }],
    zIndex,
  };

  return (
    <>
      {doorRect ? <DoorwayLight opacity={doorLight} rect={doorRect} /> : null}
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
          opacity: fade,
          zIndex,
        }}
      />
      {/* 두 장이 오면 걸음마다 번갈아 보인다. 한 장뿐이면 그대로 한 장. */}
      {frames.map((frame, index) => (
        <Animated.Image
          key={index}
          resizeMode="contain"
          source={frame}
          style={{
            ...spriteStyle,
            opacity:
              frames.length < 2
                ? fade
                : Animated.multiply(
                    fade,
                    bob.interpolate({
                      inputRange: [0, 1],
                      outputRange: index % 2 === 0 ? [1, 0] : [0, 1],
                    }),
                  ),
          }}
        />
      ))}
    </>
  );
}
