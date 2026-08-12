import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  getActiveNeighborhood,
  setActiveNeighborhood,
  UNSET_NEIGHBORHOOD_NAME,
} from '@/shared/neighborhood/active-neighborhood';
import { detectCurrentNeighborhood } from '@/shared/neighborhood/neighborhood-location';
import type { SavedNeighborhood } from '@/shared/types/neighborhood';

/**
 * 헤더의 동네 칩이 쓰는 훅.
 * 저장된 동네가 없으면 화면당 한 번만 현재 위치로 자동 감지하고, 칩을 누르면
 * 다시 감지한다. 자동 감지 실패(권한 거부 등)는 조용히 넘어가고, 사용자가 직접
 * 누른 경우에만 이유를 알린다.
 */
export function useActiveNeighborhood() {
  const [neighborhood, setNeighborhood] = useState<SavedNeighborhood | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const isMountedRef = useRef(true);
  const hasTriedAutoDetectRef = useRef(false);

  const detect = useCallback(async (options: { silent?: boolean } = {}) => {
    setIsDetecting(true);

    try {
      const { neighborhood: detected } = await detectCurrentNeighborhood();
      await setActiveNeighborhood(detected);

      if (isMountedRef.current) {
        setNeighborhood(detected);
      }

      return detected;
    } catch (error) {
      if (!options.silent) {
        Alert.alert('동네를 확인하지 못했어요', error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.');
      }

      return null;
    } finally {
      if (isMountedRef.current) {
        setIsDetecting(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;

      getActiveNeighborhood()
        .then((saved) => {
          if (!isMountedRef.current) {
            return;
          }

          setNeighborhood(saved);

          if (!saved && !hasTriedAutoDetectRef.current) {
            hasTriedAutoDetectRef.current = true;
            void detect({ silent: true });
          }
        })
        .catch((error: unknown) => {
          console.warn('[neighborhood] load failed', error);
        });

      return () => {
        isMountedRef.current = false;
      };
    }, [detect]),
  );

  const refresh = useCallback(() => {
    getActiveNeighborhood()
      .then((saved) => {
        if (isMountedRef.current) {
          setNeighborhood(saved);
        }
      })
      .catch((error: unknown) => {
        console.warn('[neighborhood] refresh failed', error);
      });
  }, []);

  return {
    neighborhood,
    name: neighborhood?.name ?? UNSET_NEIGHBORHOOD_NAME,
    isDetecting,
    /** 현재 위치를 새 동네로 잡는다. 실패하면 이유를 알린다. */
    redetect: () => detect(),
    /** 목록에서 다른 동네를 고른 뒤 헤더를 다시 읽는다. */
    refresh,
  };
}
