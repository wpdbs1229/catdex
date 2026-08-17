import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { matchesDexFilter, type DexFilter } from '@/features/cats/dex-filter';
import { fetchRegions } from '@/shared/api/app.api';
import { fetchMyCats } from '@/shared/api/cats.api';
import type { Cat } from '@/shared/types/cat';
import type { Region } from '@/shared/types/region';

interface ClientMapData {
  /** 내가 수집한 고양이 전체. 필터가 걸려도 줄지 않는다. */
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
export function useClientMapData(filter: DexFilter): ClientMapData {
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

          // 보호소냥이는 정책상 위치를 공개하지 않는다. 이 훅은 지도 전용이라
          // 여기서 걸러내면 마커·목록·필터 개수가 전부 같이 빠진다.
          setMyCats(nextCats.filter((cat) => cat.habitat !== 'shelter'));
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
    // 필터는 도감과 같은 기준(컬러·패턴)을 쓴다. 걸러진 고양이는 마커 숫자에서도 빠진다.
    const myCatById = new Map(
      myCats.filter((cat) => matchesDexFilter(cat, filter)).map((cat) => [cat.id, cat]),
    );
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
  }, [allRegions, filter, myCats]);

  return { myCats, regions, catsByRegionId, isLoading };
}
