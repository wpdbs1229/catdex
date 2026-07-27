import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CameraType } from 'expo-camera';

import {
  buildZoomStops,
  DEFAULT_ZOOM_CAPABILITIES,
  factorForNormalized,
  getZoomCapabilities,
  normalizedForFactor,
  type ZoomCapabilities,
} from '../camera-zoom';

/**
 * 배율 상태를 "표시 배율"로 다루고, expo-camera에 넘길 때만 0~1로 환산한다.
 * 기기 능력은 전후면 카메라마다 다르므로 facing이 바뀌면 다시 조회한다.
 */
export function useZoomControl(facing: CameraType) {
  const [capabilities, setCapabilities] = useState<ZoomCapabilities>(DEFAULT_ZOOM_CAPABILITIES);
  const [normalized, setNormalized] = useState(0);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const gestureStartFactor = useRef(1);

  useEffect(() => {
    let isActive = true;

    getZoomCapabilities(facing).then((next) => {
      if (!isActive) {
        return;
      }

      setCapabilities(next);
      // 카메라를 바꾸면 배율은 기본값으로 되돌린다.
      setNormalized(0);
    });

    return () => {
      isActive = false;
    };
  }, [facing]);

  const stops = useMemo(() => buildZoomStops(capabilities), [capabilities]);
  const factor = useMemo(() => factorForNormalized(normalized, capabilities), [normalized, capabilities]);

  const setFactor = useCallback(
    (nextFactor: number) => {
      setNormalized(normalizedForFactor(nextFactor, capabilities));
    },
    [capabilities],
  );

  const beginGesture = useCallback(() => {
    gestureStartFactor.current = factor;
    setIsAdjusting(true);
  }, [factor]);

  const updateGesture = useCallback(
    (scale: number) => {
      setFactor(gestureStartFactor.current * scale);
    },
    [setFactor],
  );

  const endGesture = useCallback(() => {
    setIsAdjusting(false);
  }, []);

  return {
    capabilities,
    /** expo-camera의 zoom prop에 그대로 넘기는 값 */
    normalized,
    /** 사용자에게 보여 주는 배율 */
    factor,
    stops,
    isAdjusting,
    setFactor,
    beginGesture,
    updateGesture,
    endGesture,
  };
}
