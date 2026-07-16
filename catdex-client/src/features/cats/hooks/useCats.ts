import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { removeCatImages, uploadCatImage } from '@/shared/api/app.api';
import {
  createCat as createCatRequest,
  createCatSighting as createCatSightingRequest,
  fetchCatEncounters,
  fetchCats,
  fetchDexPlaceholders,
  fetchDexProgress,
  fetchHomeSummary,
  fetchMyCats,
  fetchRecentCats,
  recordCatEncounter,
  updateCatProfile as updateCatProfileRequest,
} from '@/shared/api/cats.api';
import { getUserFacingError, type UserFacingError } from '@/shared/errors/user-facing-error';
import type { Cat, CatEncounter, CatProfileUpdateDraft, CaptureCatDraft, DexPlaceholder, DexProgress, HomeSummary } from '@/shared/types/cat';

const emptyHomeSummary: HomeSummary = {
  myWeeklyCollected: 0,
  myTotalCollected: 0,
  sharedTodayDiscovered: 0,
  sharedTotalCats: 0,
  recentMyRediscovered: '아직 없어요',
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
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState<UserFacingError | null>(null);
  const loadRequestId = useRef(0);

  const reloadCats = useCallback(async () => {
    if (!enabled) {
      return false;
    }

    const requestId = ++loadRequestId.current;

    setIsLoading(true);
    setLoadError(null);

    try {
      const [nextCats, nextMyCats, nextRecentCats, nextSummary, nextProgress, nextPlaceholders] = await Promise.all([
        fetchCats(),
        fetchMyCats(),
        fetchRecentCats(3),
        fetchHomeSummary(),
        fetchDexProgress(),
        fetchDexPlaceholders(),
      ]);

      if (requestId !== loadRequestId.current) {
        return false;
      }

      setCats(nextCats);
      setMyCats(nextMyCats);
      setRecentCats(nextRecentCats);
      setHomeSummary(nextSummary);
      setDexProgress(nextProgress);
      setUndiscoveredDexSlots(nextPlaceholders);
      setHasLoaded(true);
      return true;
    } catch (error) {
      console.warn('[cats] load failed', error);

      if (requestId === loadRequestId.current) {
        setLoadError(getUserFacingError(error, 'app.load'));
      }

      return false;
    } finally {
      if (requestId === loadRequestId.current) {
        setIsLoading(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    async function load() {
      if (!enabled) {
        loadRequestId.current += 1;
        setCats([]);
        setMyCats([]);
        setRecentCats([]);
        setSelectedCatEncounters([]);
        setUndiscoveredDexSlots([]);
        setHomeSummary(emptyHomeSummary);
        setDexProgress(emptyDexProgress);
        setIsLoading(false);
        setHasLoaded(false);
        setLoadError(null);
        return;
      }

      await reloadCats();
    }

    void load();

    return () => {
      loadRequestId.current += 1;
    };
  }, [enabled, reloadCats]);

  useEffect(() => {
    let isMounted = true;

    async function loadEncounters() {
      if (!enabled || !selectedCatId) {
        setSelectedCatEncounters([]);
        return;
      }

      try {
        const nextEncounters = await fetchCatEncounters(selectedCatId);

        if (isMounted) {
          setSelectedCatEncounters(nextEncounters);
        }
      } catch (error) {
        console.warn('[cats] encounters load failed', error);

        if (isMounted) {
          setSelectedCatEncounters([]);
          setLoadError(getUserFacingError(error, 'app.load'));
        }
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

    let nextCat: Cat;

    try {
      nextCat = await createCatRequest({
        ...draft,
        imageUrl: uploadedImage?.imageUrl ?? draft.imageUrl,
      });
    } catch (error) {
      if (uploadedImage) {
        await removeCatImages([uploadedImage.imageUrl]).catch((cleanupError) => {
          console.warn('[cats] failed create image cleanup failed', cleanupError);
        });
      }

      throw error;
    }

    await reloadCats();
    return nextCat;
  };

  const createCatSighting = async (draft: CaptureCatDraft) => {
    const uploadedImage = draft.imageUrl?.startsWith('file:')
      ? await uploadCatImage(draft.imageUrl)
      : null;

    try {
      await createCatSightingRequest({
        type: draft.type,
        regionName: draft.regionName,
        memo: draft.memo,
        imageUrl: uploadedImage?.imageUrl ?? draft.imageUrl,
      });
    } catch (error) {
      if (uploadedImage) {
        await removeCatImages([uploadedImage.imageUrl]).catch((cleanupError) => {
          console.warn('[cats] failed sighting image cleanup failed', cleanupError);
        });
      }

      throw error;
    }

    await reloadCats();
  };

  const updateCatProfile = async (catId: string, draft: CatProfileUpdateDraft) => {
    const uploadedImage = draft.imageUri?.startsWith('file:')
      ? await uploadCatImage(draft.imageUri)
      : null;
    let nextCat: Cat;

    try {
      nextCat = await updateCatProfileRequest(catId, {
        ...draft,
        imageUrl: draft.clearImage ? null : (uploadedImage?.imageUrl ?? draft.imageUri),
      });
    } catch (error) {
      if (uploadedImage) {
        await removeCatImages([uploadedImage.imageUrl]).catch((cleanupError) => {
          console.warn('[cats] failed profile image cleanup failed', cleanupError);
        });
      }

      throw error;
    }

    await reloadCats();
    setSelectedCatEncounters(await fetchCatEncounters(catId).catch(() => []));

    return nextCat;
  };

  const addEncounter = async (catId: string, regionName?: string, imageUrl?: string, memo = '다시 만남 기록') => {
    const lastRegionName =
      regionName ??
      selectedCatEncounters[selectedCatEncounters.length - 1]?.regionName ??
      '동네 미지정';
    const uploadedImage = imageUrl?.startsWith('file:')
      ? await uploadCatImage(imageUrl)
      : null;

    try {
      await recordCatEncounter(catId, {
        regionName: lastRegionName,
        memo,
        imageUrl: uploadedImage?.imageUrl ?? imageUrl,
      });
    } catch (error) {
      if (uploadedImage) {
        await removeCatImages([uploadedImage.imageUrl]).catch((cleanupError) => {
          console.warn('[cats] failed encounter image cleanup failed', cleanupError);
        });
      }

      throw error;
    }

    await reloadCats();
    setSelectedCatEncounters(await fetchCatEncounters(catId).catch(() => []));
  };

  return {
    addEncounter,
    cats,
    createCat,
    createCatSighting,
    dexProgress,
    homeSummary,
    hasLoaded,
    isLoading,
    loadError,
    myCats,
    recentCats,
    reloadCats,
    rediscoveryCount: 0,
    selectedCat,
    selectedCatEncounters,
    undiscoveredDexSlots,
    updateCatProfile,
  };
}
