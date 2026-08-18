import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import type { FurnitureSpec } from '../domain/furniture';
import type { GridPoint } from '../domain/grid';
import type { Placement } from '../domain/placement';
import type { VisitScene } from '../domain/scheduler';
import { cellRect, placementRect } from '../render/projection';
import { catActionImage } from '../support-room-v2.cat-assets';

/** 고양이 표시 높이(원본 월드 px). 방이 넓어 보이도록 작게 둔다. */
const CAT_WORLD_HEIGHT = 280;
const WALK_MS_PER_CELL = 320;
const INTERACT_MS = 6000;
const WALK_CYCLE_MS = 160;
const INTERACT_CYCLE_MS = 1200;

type VisitPhase = 'walk' | 'interact' | 'exit';

interface CatVisitViewProps {
  scene: VisitScene;
  targetPlacement: Placement;
  targetSpec: FurnitureSpec;
  scale: number;
  motionEnabled: boolean;
  /** interact 구간 동안 독립 가구를 숨기라는 신호 */
  onInteractChange: (interacting: boolean) => void;
  onDone: () => void;
}

function cellCenter(cell: GridPoint, scale: number) {
  const rect = cellRect('floor', cell);
  return {
    x: (rect.left + rect.width / 2) * scale,
    y: (rect.top + rect.height) * scale,
  };
}

/**
 * 방문 한 건의 재생: 문 → 걷기 → 행동(합성 이미지) → 되돌아 나가기.
 * 합성 행동 PNG에는 가구가 함께 그려져 있으므로 interact 동안 부모가
 * 같은 placement의 독립 가구를 숨긴다. Reduce Motion이면 걷기를 생략한다.
 */
export function CatVisitView({
  scene,
  targetPlacement,
  targetSpec,
  scale,
  motionEnabled,
  onInteractChange,
  onDone,
}: CatVisitViewProps) {
  const [phase, setPhase] = useState<VisitPhase>('walk');
  const position = useRef(new Animated.ValueXY(cellCenter(scene.path[0], scale))).current;
  const walkCycle = useRef(new Animated.Value(0)).current;
  const interactCycle = useRef(new Animated.Value(0)).current;
  const [imageFailed, setImageFailed] = useState(false);

  const catHeight = CAT_WORLD_HEIGHT * scale;

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const walk = (cells: readonly GridPoint[], onEnd: () => void) => {
      if (!motionEnabled || cells.length <= 1) {
        position.setValue(cellCenter(cells[cells.length - 1] ?? scene.anchor, scale));
        onEnd();
        return;
      }
      const steps = cells.slice(1).map((cell) =>
        Animated.timing(position, {
          toValue: cellCenter(cell, scale),
          duration: WALK_MS_PER_CELL,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      );
      Animated.sequence(steps).start(({ finished }) => {
        if (finished && !cancelled) onEnd();
      });
    };

    walk(scene.path, () => {
      if (cancelled) return;
      setPhase('interact');
      onInteractChange(true);
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          onInteractChange(false);
          setPhase('exit');
          walk([...scene.path].reverse(), () => {
            if (!cancelled) onDone();
          });
        }, INTERACT_MS),
      );
    });

    return () => {
      cancelled = true;
      position.stopAnimation();
      onInteractChange(false);
      timers.forEach(clearTimeout);
    };
    // scene 교체 시 전체 재시작이 의도된 동작이다.
    // eslint 없음: 의존성은 scene.eventId 하나로 충분.
  }, [scene.eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!motionEnabled || phase === 'interact') {
      walkCycle.stopAnimation();
      walkCycle.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(walkCycle, {
          toValue: 1,
          duration: WALK_CYCLE_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(walkCycle, {
          toValue: 0,
          duration: WALK_CYCLE_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();

    return () => {
      loop.stop();
      walkCycle.setValue(0);
    };
  }, [motionEnabled, phase, walkCycle]);

  useEffect(() => {
    if (!motionEnabled || phase !== 'interact') {
      interactCycle.stopAnimation();
      interactCycle.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(interactCycle, {
          toValue: 1,
          duration: INTERACT_CYCLE_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(interactCycle, {
          toValue: 0,
          duration: INTERACT_CYCLE_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();

    return () => {
      loop.stop();
      interactCycle.setValue(0);
    };
  }, [interactCycle, motionEnabled, phase]);

  const walkLift = walkCycle.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -3 * scale],
  });
  const walkTilt = walkCycle.interpolate({
    inputRange: [0, 1],
    outputRange: ['-1deg', '1deg'],
  });
  const walkSquash = walkCycle.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.985],
  });
  const interactLift = interactCycle.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2 * scale],
  });
  const interactScale = interactCycle.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.018],
  });

  if (phase === 'interact') {
    // 합성 PNG(고양이+가구)를 가구 자리에 그린다. 1×1 가구도 고양이가 함께
    // 그려져 있어 두 칸 폭으로 키워 읽히게 한다.
    const rect = placementRect(targetPlacement, targetSpec);
    const width = Math.max(rect.width, cellRect('floor', scene.anchor).width * 2) * scale;
    const height = width;
    const left = (rect.left + rect.width / 2) * scale - width / 2;
    const top = (rect.top + rect.height) * scale - height;
    return (
      <Animated.Image
        accessibilityLabel={`${scene.catName} 고객이 ${targetSpec.name}을 사용 중`}
        onError={() => setImageFailed(true)}
        resizeMode="contain"
        source={
          imageFailed
            ? catActionImage('fallback_cream', 'idle')
            : catActionImage(scene.characterAssetKey, scene.behaviorId)
        }
        style={{
          position: 'absolute',
          left,
          top,
          width,
          height,
          zIndex: 10_000,
          transform: [{ translateY: interactLift }, { scale: interactScale }],
        }}
      />
    );
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.cat,
        {
          width: catHeight,
          height: catHeight,
          transform: [
            { translateX: Animated.subtract(position.x, catHeight / 2) },
            { translateY: Animated.subtract(position.y, catHeight) },
          ],
        },
      ]}
    >
      <Animated.Image
        onError={() => setImageFailed(true)}
        resizeMode="contain"
        source={catActionImage(imageFailed ? 'fallback_cream' : scene.characterAssetKey, 'idle')}
        style={[
          styles.catImage,
          {
            transform: [
              { translateY: walkLift },
              { rotate: walkTilt },
              { scaleY: walkSquash },
            ],
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cat: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 10_000,
  },
  catImage: {
    width: '100%',
    height: '100%',
  },
});
