import { File } from 'expo-file-system';
import { throwIfSupabaseError } from '@/shared/api/client';
import { fetchMyCats } from '@/shared/api/cats.api';
import { DEFAULT_BADGE_CATALOG } from '@/shared/constants/badge.constants';
import { getNyangnyangdanRankState } from '@/shared/profile/nyangnyangdan-rank';
import { assertSupabaseConfigured, supabase } from '@/shared/supabase/client';
import type { Badge, ExplorerProfile } from '@/shared/types/badge';
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
}

interface CatNameRow {
  id: string;
  name: string;
}

interface BadgeRow {
  id: string;
  name: string;
  description: string;
}

interface UserBadgeRow {
  badge_id: string;
  achieved_at: string;
}

function formatDate(value: string) {
  return value.replaceAll('-', '.');
}

export async function fetchRegions() {
  assertSupabaseConfigured();

  const [regionsResponse, regionCatsResponse, catsResponse] = await Promise.all([
    supabase.from('regions').select('*').order('name', { ascending: true }),
    supabase.from('cat_regions').select('region_id, cat_id'),
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
  }));
}

export async function fetchProfile(): Promise<ExplorerProfile> {
  assertSupabaseConfigured();

  const cats = await fetchMyCats();
  const totalDiscoveries = cats.length;
  const totalEncounters = cats.reduce((sum, cat) => sum + cat.encounterCount, 0);
  const rediscoveries = Math.max(totalEncounters - totalDiscoveries, 0);
  const rankState = getNyangnyangdanRankState(totalDiscoveries, rediscoveries);

  return {
    title: rankState.current.title,
    level: rankState.current.level,
    totalDiscoveries,
    rediscoveries,
    nextLevelProgress: rankState.progress,
    nextLevelLabel: rankState.nextGoalLabel,
  };
}

export async function fetchAchievedBadges() {
  assertSupabaseConfigured();

  const [badgesResponse, userBadgesResponse] = await Promise.all([
    supabase.from('badges').select('*').order('id', { ascending: true }),
    supabase.from('user_badges').select('badge_id, achieved_at').order('achieved_at', { ascending: true }),
  ]);

  throwIfSupabaseError(badgesResponse.error);
  throwIfSupabaseError(userBadgesResponse.error);

  const achievedByBadgeId = new Map(
    ((userBadgesResponse.data ?? []) as UserBadgeRow[]).map((row) => [row.badge_id, row.achieved_at]),
  );

  const badgeRows = (badgesResponse.data ?? []) as BadgeRow[];
  const badgeCatalog = badgeRows.length > 0 ? badgeRows : DEFAULT_BADGE_CATALOG;

  return badgeCatalog
    .map<Badge>((badge) => ({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      achieved: achievedByBadgeId.has(badge.id),
      achievedAt: achievedByBadgeId.get(badge.id) ? formatDate(achievedByBadgeId.get(badge.id) as string) : undefined,
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
  const extension = kind === 'cutout' ? 'png' : 'jpg';
  const contentType = kind === 'cutout' ? 'image/png' : 'image/jpeg';
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
