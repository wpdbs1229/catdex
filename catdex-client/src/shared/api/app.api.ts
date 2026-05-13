import { File } from 'expo-file-system';
import { throwIfSupabaseError } from '@/shared/api/client';
import { fetchCats, fetchMyCats } from '@/shared/api/cats.api';
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

  const [regionsResponse, regionCatsResponse, cats] = await Promise.all([
    supabase.from('regions').select('*').order('name', { ascending: true }),
    supabase.from('cat_regions').select('region_id, cat_id'),
    fetchCats(),
  ]);

  throwIfSupabaseError(regionsResponse.error);
  throwIfSupabaseError(regionCatsResponse.error);

  const catNameById = new Map(cats.map((cat) => [cat.id, cat.name]));
  const regionCats = ((regionCatsResponse.data ?? []) as CatRegionRow[]).reduce<Record<string, string[]>>((acc, row) => {
    const catName = catNameById.get(row.cat_id);

    if (catName) {
      acc[row.region_id] = [...(acc[row.region_id] ?? []), catName];
    }

    return acc;
  }, {});

  return ((regionsResponse.data ?? []) as RegionRow[]).map<Region>((region) => ({
    id: region.id,
    name: region.name,
    lat: Number(region.lat.toFixed(3)),
    lng: Number(region.lng.toFixed(3)),
    radius: Math.max(region.radius, 300),
    cats: regionCats[region.id] ?? [],
  }));
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

  return ((badgesResponse.data ?? []) as BadgeRow[])
    .map<Badge>((badge) => ({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      achieved: achievedByBadgeId.has(badge.id),
      achievedAt: achievedByBadgeId.get(badge.id) ? formatDate(achievedByBadgeId.get(badge.id) as string) : undefined,
    }))
    .filter((badge) => badge.achieved);
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
