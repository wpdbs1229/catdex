import { useCallback, useEffect, useMemo, useState } from 'react';
import { uploadCatImage } from '@/shared/api/app.api';
import {
  createCat as createCatRequest,
  fetchCatEncounters,
  fetchCats,
  fetchDexPlaceholders,
  fetchDexProgress,
  fetchHomeSummary,
  fetchMyCats,
  fetchRecentCats,
  recordCatEncounter,
} from '@/shared/api/cats.api';
import type { Cat, CatEncounter, CaptureCatDraft, DexPlaceholder, DexProgress, HomeSummary } from '@/shared/types/cat';

const emptyHomeSummary: HomeSummary = {
  todayDiscovered: 0,
  totalCollected: 0,
  recentRediscovered: '아직 없어요',
};

const emptyDexProgress: DexProgress = {
  collected: 0,
  total: 100,
};

export function useCats(selectedCatId: string | null, enabled = true) {
  const [cats, setCats] = useState<Cat[]>([]);
  const [myCats, setMyCats] = useState<Cat[]>([]);
  const [recentCats, setRecentCats] = useState<Cat[]>([]);
  const [selectedCatEncounters, setSelectedCatEncounters] = useState<CatEncounter[]>([]);
  const [undiscoveredDexSlots, setUndiscoveredDexSlots] = useState<DexPlaceholder[]>([]);
  const [homeSummary, setHomeSummary] = useState<HomeSummary>(emptyHomeSummary);
  const [dexProgress, setDexProgress] = useState<DexProgress>(emptyDexProgress);
  const [isLoading, setIsLoading] = useState(true);

  const reloadCats = useCallback(async () => {
    const [nextCats, nextMyCats, nextRecentCats, nextSummary, nextProgress, nextPlaceholders] = await Promise.all([
      fetchCats(),
      fetchMyCats(),
      fetchRecentCats(3),
      fetchHomeSummary(),
      fetchDexProgress(),
      fetchDexPlaceholders(),
    ]);

    setCats(nextCats);
    setMyCats(nextMyCats);
    setRecentCats(nextRecentCats);
    setHomeSummary(nextSummary);
    setDexProgress(nextProgress);
    setUndiscoveredDexSlots(nextPlaceholders);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!enabled) {
        setIsLoading(false);
        return;
      }

      try {
        await reloadCats();
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [enabled, reloadCats]);

  useEffect(() => {
    let isMounted = true;

    async function loadEncounters() {
      if (!enabled || !selectedCatId) {
        setSelectedCatEncounters([]);
        return;
      }

      const nextEncounters = await fetchCatEncounters(selectedCatId);

      if (isMounted) {
        setSelectedCatEncounters(nextEncounters);
      }
    }

    loadEncounters();

    return () => {
      isMounted = false;
    };
  }, [enabled, selectedCatId]);

  const selectedCat = useMemo(
    () => cats.find((cat) => cat.id === selectedCatId) ?? null,
    [cats, selectedCatId],
  );

  const createCat = async (draft: CaptureCatDraft) => {
    const uploadedImage = draft.imageUrl?.startsWith('file:')
      ? await uploadCatImage(draft.imageUrl)
      : null;
    const nextCat = await createCatRequest({
      ...draft,
      imageUrl: uploadedImage?.imageUrl ?? draft.imageUrl,
    });
    await reloadCats();
    return nextCat;
  };

  const addEncounter = async (catId: string, regionName?: string) => {
    const lastRegionName =
      regionName ??
      selectedCatEncounters[selectedCatEncounters.length - 1]?.regionName ??
      '부천시 중동 근처';

    await recordCatEncounter(catId, {
      regionName: lastRegionName,
      memo: '다시 만남 기록',
    });

    await reloadCats();
    setSelectedCatEncounters(await fetchCatEncounters(catId));
  };

  return {
    addEncounter,
    cats,
    createCat,
    dexProgress,
    homeSummary,
    isLoading,
    myCats,
    recentCats,
    rediscoveryCount: 0,
    selectedCat,
    selectedCatEncounters,
    undiscoveredDexSlots,
  };
}
