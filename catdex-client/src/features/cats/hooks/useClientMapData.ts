import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { fetchRegions } from '@/shared/api/app.api';
import { fetchMyCats } from '@/shared/api/cats.api';
import type { Cat } from '@/shared/types/cat';
import type { Region } from '@/shared/types/region';

interface ClientMapData {
  /** 내가 수집한 고양이만. 고객 지도는 "내 고객"이 어디 있는지를 보여준다. */
  myCats: Cat[];
  /** 내 고객이 한 마리라도 있는 구역만. 마릿수도 내 고객 기준으로 다시 센다. */
  regions: Region[];
  catsByRegionId: Map<string, Cat[]>;
  isLoading: boolean;
}

/**
 * 고객 지도 데이터.
 *
 * 동네 지도(useNeighborhoodData)와 달리 현재 동네로 좁히지 않는다. 내 고객이
 * 여러 동네에 흩어져 있어도 한눈에 봐야 하기 때문이다.
 */
export function useClientMapData(): ClientMapData {
  const [myCats, setMyCats] = useState<Cat[]>([]);
  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      setIsLoading(true);
      Promise.all([fetchMyCats(), fetchRegions()])
        .then(([nextCats, nextRegions]) => {
          if (!isActive) {
            return;
          }

          setMyCats(nextCats);
          setAllRegions(nextRegions);
        })
        .catch((error: unknown) => {
          console.warn('[client-map] load failed', error);
        })
        .finally(() => {
          if (isActive) {
            setIsLoading(false);
          }
        });

      return () => {
        isActive = false;
      };
    }, []),
  );

  const { regions, catsByRegionId } = useMemo(() => {
    const myCatById = new Map(myCats.map((cat) => [cat.id, cat]));
    const byRegion = new Map<string, Cat[]>();
    const mine: Region[] = [];

    for (const region of allRegions) {
      const catsHere = region.catIds
        .map((catId) => myCatById.get(catId))
        .filter((cat): cat is Cat => Boolean(cat));

      if (catsHere.length === 0) {
        continue;
      }

      byRegion.set(region.id, catsHere);
      // 마커에 뜨는 숫자가 catIds 길이라서, 남의 고양이가 섞이지 않게 내 것만 남긴다.
      mine.push({ ...region, catIds: catsHere.map((cat) => cat.id), cats: catsHere.map((cat) => cat.name) });
    }

    return { regions: mine, catsByRegionId: byRegion };
  }, [allRegions, myCats]);

  return { myCats, regions, catsByRegionId, isLoading };
}
