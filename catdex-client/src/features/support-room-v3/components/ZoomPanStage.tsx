import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder, View, type GestureResponderEvent } from 'react-native';

/**
 * 방 전체(셸·바닥·가구·고양이)를 하나로 묶어 확대·축소·이동하는 틀.
 *
 * 확대는 children에 손대지 않고 이 View 하나의 transform으로만 한다. 가구나
 * 고양이에 각자 보정 배율을 주면 확대할 때 서로의 비율이 틀어지기 때문이다.
 * 여기서 잡은 배율은 화면 표시용이고, 격자 좌표계는 그대로다.
 */
export interface ZoomPanStageProps {
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  maxZoom: number;
  /** 꾸미기 중에는 한 손가락 드래그가 가구 몫이라 이동을 끈다(핀치는 살린다). */
  panEnabled: boolean;
  children: React.ReactNode;
}

const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_SLOP = 40;
const PAN_START_PX = 6;

function distance(touches: readonly { pageX: number; pageY: number }[]): number {
  return Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
}

function midpoint(touches: readonly { pageX: number; pageY: number }[]) {
  return {
    x: (touches[0].pageX + touches[1].pageX) / 2,
    y: (touches[0].pageY + touches[1].pageY) / 2,
  };
}

export function ZoomPanStage({
  width,
  height,
  viewportWidth,
  viewportHeight,
  maxZoom,
  panEnabled,
  children,
}: ZoomPanStageProps) {
  const zoom = useRef(new Animated.Value(1)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;

  // PanResponder는 만들 때의 클로저를 붙들고 있어서 최신 값을 ref로 넘긴다.
  const state = useRef({ zoom: 1, tx: 0, ty: 0 });
  const start = useRef({ zoom: 1, tx: 0, ty: 0, dist: 0, focusX: 0, focusY: 0 });
  const panEnabledRef = useRef(panEnabled);
  panEnabledRef.current = panEnabled;
  const boundsRef = useRef({ width, height, viewportWidth, viewportHeight, maxZoom });
  boundsRef.current = { width, height, viewportWidth, viewportHeight, maxZoom };
  const lastTap = useRef({ time: 0, x: 0, y: 0 });

  const clampPan = useCallback((nextZoom: number, x: number, y: number) => {
    const b = boundsRef.current;
    // 방이 화면보다 클 때만 움직인다. 넘치는 만큼만 허용하면 방이 화면
    // 밖으로 완전히 빠져나가지 않는다.
    const slackX = Math.max(0, (b.width * nextZoom - b.viewportWidth) / 2);
    const slackY = Math.max(0, (b.height * nextZoom - b.viewportHeight) / 2);
    return {
      x: Math.min(slackX, Math.max(-slackX, x)),
      y: Math.min(slackY, Math.max(-slackY, y)),
    };
  }, []);

  const apply = useCallback(
    (nextZoom: number, x: number, y: number) => {
      const clamped = clampPan(nextZoom, x, y);
      state.current = { zoom: nextZoom, tx: clamped.x, ty: clamped.y };
      zoom.setValue(nextZoom);
      tx.setValue(clamped.x);
      ty.setValue(clamped.y);
    },
    [clampPan, tx, ty, zoom],
  );

  const animateTo = useCallback(
    (nextZoom: number, x: number, y: number) => {
      const clamped = clampPan(nextZoom, x, y);
      state.current = { zoom: nextZoom, tx: clamped.x, ty: clamped.y };
      Animated.parallel([
        Animated.timing(zoom, { toValue: nextZoom, duration: 220, useNativeDriver: false }),
        Animated.timing(tx, { toValue: clamped.x, duration: 220, useNativeDriver: false }),
        Animated.timing(ty, { toValue: clamped.y, duration: 220, useNativeDriver: false }),
      ]).start();
    },
    [clampPan, tx, ty, zoom],
  );

  /**
   * 두 번 두드리면 overview와 근접 확대를 오간다. 자식(가구·고양이)이 탭을
   * 가져가더라도 capture 단계는 항상 지나가므로 여기서 시각만 재 둔다.
   */
  const onTapCapture = useCallback(
    (event: GestureResponderEvent) => {
      const { pageX, pageY, timestamp } = event.nativeEvent;
      const previous = lastTap.current;
      const quick = timestamp - previous.time < DOUBLE_TAP_MS;
      const near = Math.hypot(pageX - previous.x, pageY - previous.y) < DOUBLE_TAP_SLOP;
      lastTap.current = { time: timestamp, x: pageX, y: pageY };
      if (!quick || !near) return false;

      lastTap.current.time = 0;
      const b = boundsRef.current;
      if (state.current.zoom > 1.05) {
        animateTo(1, 0, 0);
        return false;
      }
      // 두드린 지점이 화면 중앙으로 오도록 당긴다.
      const centerX = b.viewportWidth / 2;
      const centerY = b.viewportHeight / 2;
      animateTo(b.maxZoom, (centerX - pageX) * b.maxZoom, (centerY - pageY) * b.maxZoom);
      return false;
    },
    [animateTo],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: onTapCapture,
        onStartShouldSetPanResponder: (event) => event.nativeEvent.touches.length === 2,
        onMoveShouldSetPanResponder: (event, gesture) =>
          event.nativeEvent.touches.length === 2 ||
          (panEnabledRef.current &&
            state.current.zoom > 1.001 &&
            Math.hypot(gesture.dx, gesture.dy) > PAN_START_PX),
        onPanResponderGrant: (event) => {
          const touches = event.nativeEvent.touches;
          start.current = {
            ...state.current,
            dist: touches.length === 2 ? distance(touches) : 0,
            focusX: touches.length === 2 ? midpoint(touches).x : 0,
            focusY: touches.length === 2 ? midpoint(touches).y : 0,
          };
        },
        onPanResponderMove: (event, gesture) => {
          const b = boundsRef.current;
          const touches = event.nativeEvent.touches;
          if (touches.length === 2) {
            if (start.current.dist === 0) {
              // 한 손가락으로 시작해 두 손가락이 됐다. 기준을 다시 잡는다.
              start.current = {
                ...state.current,
                dist: distance(touches),
                focusX: midpoint(touches).x,
                focusY: midpoint(touches).y,
              };
              return;
            }
            const ratio = distance(touches) / start.current.dist;
            const nextZoom = Math.min(b.maxZoom, Math.max(1, start.current.zoom * ratio));
            // 손가락 사이 지점이 방 위에서 움직이지 않도록 이동량을 보정한다.
            const focus = midpoint(touches);
            const k = nextZoom / start.current.zoom;
            apply(
              nextZoom,
              focus.x - b.viewportWidth / 2 - k * (start.current.focusX - b.viewportWidth / 2 - start.current.tx),
              focus.y - b.viewportHeight / 2 - k * (start.current.focusY - b.viewportHeight / 2 - start.current.ty),
            );
            return;
          }
          if (!panEnabledRef.current) return;
          apply(state.current.zoom, start.current.tx + gesture.dx, start.current.ty + gesture.dy);
        },
        onPanResponderRelease: () => {
          apply(state.current.zoom, state.current.tx, state.current.ty);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [apply, onTapCapture],
  );

  // 방이 바뀌거나(확장) 화면이 회전하면 overview로 되돌린다.
  useEffect(() => {
    apply(1, 0, 0);
  }, [apply, width, height]);

  return (
    <View style={{ flex: 1, overflow: 'hidden' }} {...responder.panHandlers}>
      <Animated.View
        style={{
          position: 'absolute',
          left: (viewportWidth - width) / 2,
          top: (viewportHeight - height) / 2,
          width,
          height,
          transform: [{ translateX: tx }, { translateY: ty }, { scale: zoom }],
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
}
