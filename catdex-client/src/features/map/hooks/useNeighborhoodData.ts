import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { fetchRegions } from '@/shared/api/app.api';
import { fetchCats, fetchMyCats } from '@/shared/api/cats.api';
import { isMatchingNeighborhoodName } from '@/shared/neighborhood/neighborhood-match';
import { useActiveNeighborhood } from '@/shared/neighborhood/useActiveNeighborhood';
import type { Cat } from '@/shared/types/cat';
import type { Region } from '@/shared/types/region';

interface NeighborhoodData {
  cats: Cat[];
  myCatIds: Set<string>;
  regions: Region[];
  neighborhoodName: string;
  /** 동네가 아직 안 잡혔으면 false. 화면이 빈 이유를 구분하는 데 쓴다. */
  hasNeighborhood: boolean;
  isDetectingNeighborhood: boolean;
  redetectNeighborhood: () => void;
}

/** 동네 도감·지도 화면이 함께 쓰는 데이터 로더. 화면 포커스 시마다 새로 읽는다. */
export function useNeighborhoodData(): NeighborhoodData {
  const [cats, setCats] = useState<Cat[]>([]);
  const [myCatIds, setMyCatIds] = useState<Set<string>>(() => new Set());
  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const { neighborhood, name: neighborhoodName, isDetecting, redetect } = useActiveNeighborhood();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      Promise.all([fetchCats(), fetchMyCats(), fetchRegions()])
        .then(([nextCats, nextMyCats, nextRegions]) => {
          if (!isActive) {
            return;
          }

          setCats(nextCats);
          setMyCatIds(new Set(nextMyCats.map((cat) => cat.id)));
          setAllRegions(nextRegions);
        })
        .catch((error: unknown) => {
          console.warn('[neighborhood] load failed', error);
        });

      return () => {
        isActive = false;
      };
    }, []),
  );

  // 내 동네 구역만 남긴다. 예전에는 0건이면 전국 구역으로 되돌렸는데, 동네가
  // 한 번도 저장되지 않던 시절의 임시 조치였다. 지금은 동네가 실제로 잡히므로
  // "내 동네에 아직 기록이 없다"는 사실을 그대로 보여준다.
  const regions = useMemo(
    () =>
      neighborhood
        ? allRegions.filter((region) => isMatchingNeighborhoodName(region.name, neighborhood.name))
        : [],
    [allRegions, neighborhood],
  );

  return {
    cats,
    myCatIds,
    regions,
    neighborhoodName,
    hasNeighborhood: neighborhood !== null,
    isDetectingNeighborhood: isDetecting,
    redetectNeighborhood: redetect,
  };
}
