import { useCallback, useEffect, useMemo, useState } from 'react';
import { uploadCatImage } from '@/shared/api/app.api';
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
      } catch (error) {
        // 초기 로드 실패 시 빈 목록으로 렌더되지만, 촬영/새로고침 경로에서
        // 다시 로드되므로 여기서는 조용히 기록만 남긴다.
        console.warn('[cats] initial load failed', error);
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

    loadEncounters().catch((error) => {
      console.warn('[cats] encounter load failed', error);
    });

    return () => {
      isMounted = false;
    };
  }, [enabled, selectedCatId]);

  // 상세 화면에는 내 수집 기준 기록(myCats: 내 만남 횟수, 내가 처음 만난 날)을
  // 우선 사용한다. 공유 목록(cats)의 수치는 모든 사용자의 만남 합계라
  // "발견 횟수 / 관계 레벨"이 내 기록과 다르게 보이는 문제가 있다.
  const selectedCat = useMemo(
    () =>
      myCats.find((cat) => cat.id === selectedCatId) ??
      cats.find((cat) => cat.id === selectedCatId) ??
      null,
    [cats, myCats, selectedCatId],
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

  const createCatSighting = async (draft: CaptureCatDraft) => {
    const uploadedImage = draft.imageUrl?.startsWith('file:')
      ? await uploadCatImage(draft.imageUrl)
      : null;

    await createCatSightingRequest({
      type: draft.type,
      regionName: draft.regionName,
      memo: draft.memo,
      imageUrl: uploadedImage?.imageUrl ?? draft.imageUrl,
    });
    await reloadCats();
  };

  const updateCatProfile = async (catId: string, draft: CatProfileUpdateDraft) => {
    const uploadedImage = draft.imageUri?.startsWith('file:')
      ? await uploadCatImage(draft.imageUri)
      : null;
    const nextCat = await updateCatProfileRequest(catId, {
      ...draft,
      imageUrl: draft.clearImage ? null : (uploadedImage?.imageUrl ?? draft.imageUri),
    });

    await reloadCats();
    setSelectedCatEncounters(await fetchCatEncounters(catId));

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

    await recordCatEncounter(catId, {
      regionName: lastRegionName,
      memo,
      imageUrl: uploadedImage?.imageUrl ?? imageUrl,
    });

    await reloadCats();
    setSelectedCatEncounters(await fetchCatEncounters(catId));
  };

  return {
    addEncounter,
    cats,
    createCat,
    createCatSighting,
    dexProgress,
    homeSummary,
    isLoading,
    myCats,
    recentCats,
    rediscoveryCount: 0,
    selectedCat,
    selectedCatEncounters,
    undiscoveredDexSlots,
    updateCatProfile,
  };
}
