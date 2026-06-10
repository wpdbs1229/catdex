import { File } from 'expo-file-system';
import { throwIfSupabaseError } from '@/shared/api/client';
import { fetchMyCats } from '@/shared/api/cats.api';
import { assertSupabaseConfigured, supabase } from '@/shared/supabase/client';
import type { ExplorerProfile } from '@/shared/types/profile';
import type { Region, RegionCatPreview } from '@/shared/types/region';

interface RegionRow {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
}

interface CatRegionRow {
  region_id: string;
  cat_id: string;
}

interface MyCatEncounterRegionRow {
  cat_id: string;
  region_name: string;
}

interface CatPreviewRow {
  id: string;
  name: string;
  image_url: string | null;
}

async function getDisplayImageUrl(imageUrl: string | null) {
  if (!imageUrl || imageUrl.startsWith('http') || imageUrl.startsWith('file:')) {
    return imageUrl ?? undefined;
  }

  const { data, error } = await supabase.storage.from('cat-images').createSignedUrl(imageUrl, 60 * 60);
  throwIfSupabaseError(error);

  return data.signedUrl;
}

async function fetchCatPreviewMap(catIds: string[]) {
  const uniqueCatIds = Array.from(new Set(catIds));

  if (uniqueCatIds.length === 0) {
    return new Map<string, RegionCatPreview>();
  }

  const { data, error } = await supabase
    .from('cats')
    .select('id, name, image_url')
    .in('id', uniqueCatIds);

  throwIfSupabaseError(error);

  const previews = await Promise.all(
    ((data ?? []) as CatPreviewRow[]).map(async (cat) => [
      cat.id,
      {
        id: cat.id,
        name: cat.name,
        imageUrl: await getDisplayImageUrl(cat.image_url),
      },
    ] as const),
  );

  return new Map(previews);
}

function appendCatPreview(
  previewsByRegion: Record<string, RegionCatPreview[]>,
  regionKey: string,
  catPreview: RegionCatPreview | undefined,
) {
  if (!catPreview) {
    return;
  }

  const currentPreviews = previewsByRegion[regionKey] ?? [];

  if (currentPreviews.some((preview) => preview.id === catPreview.id)) {
    return;
  }

  previewsByRegion[regionKey] = [...currentPreviews, catPreview];
}

export async function fetchRegions() {
  assertSupabaseConfigured();

  const [regionsResponse, regionCatsResponse] = await Promise.all([
    supabase.from('regions').select('*').order('name', { ascending: true }),
    supabase.from('cat_regions').select('region_id, cat_id'),
  ]);

  throwIfSupabaseError(regionsResponse.error);
  throwIfSupabaseError(regionCatsResponse.error);

  const regionCatRows = (regionCatsResponse.data ?? []) as CatRegionRow[];
  const catPreviewById = await fetchCatPreviewMap(regionCatRows.map((row) => row.cat_id));
  const regionCatPreviews = regionCatRows.reduce<Record<string, RegionCatPreview[]>>((acc, row) => {
    appendCatPreview(acc, row.region_id, catPreviewById.get(row.cat_id));
    return acc;
  }, {});

  return ((regionsResponse.data ?? []) as RegionRow[]).map<Region>((region) => ({
    id: region.id,
    name: region.name,
    lat: Number(region.lat.toFixed(3)),
    lng: Number(region.lng.toFixed(3)),
    radius: Math.max(region.radius, 300),
    cats: (regionCatPreviews[region.id] ?? []).map((cat) => cat.name),
    catPreviews: regionCatPreviews[region.id] ?? [],
  }));
}

export async function fetchMyRegions() {
  assertSupabaseConfigured();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  throwIfSupabaseError(userError);

  if (!user) {
    return [];
  }

  const [regionsResponse, encountersResponse] = await Promise.all([
    supabase.from('regions').select('*').order('name', { ascending: true }),
    supabase.from('cat_encounters').select('cat_id, region_name').eq('user_id', user.id),
  ]);

  throwIfSupabaseError(regionsResponse.error);
  throwIfSupabaseError(encountersResponse.error);

  const regionByName = new Map(((regionsResponse.data ?? []) as RegionRow[]).map((region) => [region.name, region]));
  const encounterRows = (encountersResponse.data ?? []) as MyCatEncounterRegionRow[];
  const catPreviewById = await fetchCatPreviewMap(encounterRows.map((row) => row.cat_id));
  const catPreviewsByRegionName = encounterRows.reduce<Record<string, RegionCatPreview[]>>((acc, row) => {
    appendCatPreview(acc, row.region_name, catPreviewById.get(row.cat_id));
    return acc;
  }, {});

  return Object.entries(catPreviewsByRegionName)
    .map<Region>(([regionName, catPreviews]) => {
      const region = regionByName.get(regionName);

      return {
        id: region?.id ?? `my-${regionName}`,
        name: regionName,
        lat: region ? Number(region.lat.toFixed(3)) : 37.5,
        lng: region ? Number(region.lng.toFixed(3)) : 126.76,
        radius: Math.max(region?.radius ?? 300, 300),
        cats: catPreviews.map((cat) => cat.name),
        catPreviews,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchProfile(): Promise<ExplorerProfile> {
  assertSupabaseConfigured();

  const cats = await fetchMyCats();
  const totalDiscoveries = cats.length;
  const totalEncounters = cats.reduce((sum, cat) => sum + cat.encounterCount, 0);
  const rediscoveries = Math.max(totalEncounters - totalDiscoveries, 0);
  const rareCount = cats.filter((cat) => cat.rarity >= 4).length;

  return {
    title: '동네 냥이 탐험가',
    level: Math.max(1, Math.floor(totalDiscoveries / 2) + 2),
    totalDiscoveries,
    rediscoveries,
    nextLevelProgress: Math.min(95, 40 + rareCount * 11),
    nextLevelLabel: '희귀 냥이 2마리 더 발견하면 Lv.5',
  };
}

export async function uploadCatImage(imageUri: string) {
  assertSupabaseConfigured();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  throwIfSupabaseError(userError);

  if (!user) {
    throw new Error('이미지 업로드에는 로그인이 필요합니다.');
  }

  const file = new File(imageUri);
  const bytes = await file.arrayBuffer();
  const path = `${user.id}/cats/cat-${Date.now()}.jpg`;
  const { data, error } = await supabase.storage.from('cat-images').upload(path, bytes, {
    contentType: 'image/jpeg',
    upsert: false,
  });

  throwIfSupabaseError(error);

  return {
    imageUrl: data.path,
    filename: data.path.split('/').pop() ?? data.path,
    size: bytes.byteLength,
    mimetype: 'image/jpeg',
  };
}
