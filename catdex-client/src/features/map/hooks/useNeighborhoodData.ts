import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { fetchRegions } from '@/shared/api/app.api';
import { fetchCats, fetchMyCats } from '@/shared/api/cats.api';
import { isMatchingNeighborhoodName } from '@/shared/neighborhood/neighborhood-match';
import { loadNeighborhoodState } from '@/shared/neighborhood/neighborhood-storage';
import type { Cat } from '@/shared/types/cat';
import type { Region } from '@/shared/types/region';

interface NeighborhoodData {
  cats: Cat[];
  myCatIds: Set<string>;
  regions: Region[];
  neighborhoodName: string;
}

/** 동네 도감·지도 화면이 함께 쓰는 데이터 로더. 화면 포커스 시마다 새로 읽는다. */
export function useNeighborhoodData(): NeighborhoodData {
  const [cats, setCats] = useState<Cat[]>([]);
  const [myCatIds, setMyCatIds] = useState<Set<string>>(() => new Set());
  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [neighborhoodName, setNeighborhoodName] = useState('내 동네');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      Promise.all([fetchCats(), fetchMyCats(), fetchRegions(), loadNeighborhoodState().catch(() => null)])
        .then(([nextCats, nextMyCats, nextRegions, neighborhoodState]) => {
          if (!isActive) {
            return;
          }

          setCats(nextCats);
          setMyCatIds(new Set(nextMyCats.map((cat) => cat.id)));
          setAllRegions(nextRegions);

          const activeNeighborhood = neighborhoodState?.savedNeighborhoods.find(
            (neighborhood) => neighborhood.id === neighborhoodState.activeNeighborhoodId,
          );

          if (activeNeighborhood) {
            setNeighborhoodName(activeNeighborhood.name);
          }
        })
        .catch((error: unknown) => {
          console.warn('[neighborhood] load failed', error);
        });

      return () => {
        isActive = false;
      };
    }, []),
  );

  const regions = useMemo(() => {
    const matched = allRegions.filter((region) => isMatchingNeighborhoodName(region.name, neighborhoodName));

    return matched.length > 0 ? matched : allRegions;
  }, [allRegions, neighborhoodName]);

  return { cats, myCatIds, regions, neighborhoodName };
}
