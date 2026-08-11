import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import type { MapPoint } from '@/features/map/components/KakaoMapView';

/**
 * 지도에 찍을 현재 위치.
 *
 * 저장하지 않고 화면에만 쓴다. 권한을 새로 묻지도 않는다 — 이미 허용돼 있을 때만
 * 읽고, 아니면 점 없이 지도를 띄운다. 동네 확인처럼 사용자가 직접 누른 동작이
 * 아니라서 여기서 권한 창을 띄우면 맥락 없는 요청이 된다.
 */
export function useCurrentLocation(): MapPoint | null {
  const [point, setPoint] = useState<MapPoint | null>(null);

  useEffect(() => {
    let isActive = true;

    (async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();

        if (!permission.granted) {
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (isActive) {
          setPoint({ lat: position.coords.latitude, lng: position.coords.longitude });
        }
      } catch {
        // 위치를 못 읽으면 점만 없다. 지도는 그대로 쓴다.
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  return point;
}
