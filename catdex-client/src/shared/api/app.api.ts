import { File } from 'expo-file-system';
import { throwIfSupabaseError } from '@/shared/api/client';
import { assertSupabaseConfigured, supabase } from '@/shared/supabase/client';
import type { Region } from '@/shared/types/region';

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
  dex_number: number;
}

interface CatNameRow {
  id: string;
  name: string;
}

export async function fetchRegions() {
  assertSupabaseConfigured();

  const [regionsResponse, regionCatsResponse, catsResponse] = await Promise.all([
    // 흡수된 구역(merged_into)은 옛 이름의 껍데기다. 화면에는 대표 구역만 남긴다.
    supabase.from('regions').select('*').is('merged_into', null).order('name', { ascending: true }),
    supabase.from('cat_regions').select('region_id, cat_id, dex_number'),
    supabase.from('cats').select('id, name'),
  ]);

  throwIfSupabaseError(regionsResponse.error);
  throwIfSupabaseError(regionCatsResponse.error);
  throwIfSupabaseError(catsResponse.error);

  const catNameById = new Map(((catsResponse.data ?? []) as CatNameRow[]).map((cat) => [cat.id, cat.name]));
  const regionCatIds = ((regionCatsResponse.data ?? []) as CatRegionRow[]).reduce<Record<string, string[]>>((acc, row) => {
    acc[row.region_id] = [...(acc[row.region_id] ?? []), row.cat_id];
    return acc;
  }, {});
  // 구역 안에서 몇 번째로 기록됐는지. 지부 도감이 카드 번호로 쓴다.
  const regionDexNumbers = ((regionCatsResponse.data ?? []) as CatRegionRow[]).reduce<
    Record<string, Record<string, number>>
  >((acc, row) => {
    acc[row.region_id] = { ...(acc[row.region_id] ?? {}), [row.cat_id]: row.dex_number };
    return acc;
  }, {});
  const regionCats = Object.entries(regionCatIds).reduce<Record<string, string[]>>((acc, [regionId, catIds]) => {
    acc[regionId] = catIds.map((catId) => catNameById.get(catId)).filter((catName): catName is string => Boolean(catName));
    return acc;
  }, {});

  return ((regionsResponse.data ?? []) as RegionRow[]).map<Region>((region) => ({
    id: region.id,
    name: region.name,
    lat: Number(region.lat.toFixed(3)),
    lng: Number(region.lng.toFixed(3)),
    radius: Math.max(region.radius, 300),
    catIds: regionCatIds[region.id] ?? [],
    cats: regionCats[region.id] ?? [],
    catDexNumbers: regionDexNumbers[region.id] ?? {},
  }));
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

export async function uploadCatObservationImage(imageUri: string, kind: 'original' | 'cutout') {
  assertSupabaseConfigured();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  throwIfSupabaseError(userError);

  if (!user) {
    throw new Error('촬영 이미지 저장에는 로그인이 필요합니다.');
  }

  const file = new File(imageUri);
  const bytes = await file.arrayBuffer();
  // 원본 폴백 시 cutout 자리에 JPEG가 오는 등 kind와 실제 포맷이 다를 수
  // 있으므로 실제 파일 확장자를 우선한다.
  const uriExtension = /\.(png|jpe?g|webp|heic)$/i.exec(imageUri.split('?')[0] ?? '')?.[1]?.toLowerCase();
  const extension = uriExtension === 'jpeg' ? 'jpg' : (uriExtension ?? (kind === 'cutout' ? 'png' : 'jpg'));
  const contentTypeByExtension: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    webp: 'image/webp',
    heic: 'image/heic',
  };
  const contentType = contentTypeByExtension[extension] ?? 'image/jpeg';
  const path = `${user.id}/observations/${kind}-${Date.now()}.${extension}`;
  const { data, error } = await supabase.storage.from('cat-images').upload(path, bytes, {
    contentType,
    upsert: false,
  });

  throwIfSupabaseError(error);

  return {
    imageUrl: data.path,
    filename: data.path.split('/').pop() ?? data.path,
    size: bytes.byteLength,
    mimetype: contentType,
  };
}
