import { throwIfSupabaseError } from '@/shared/api/client';
import { assertSupabaseConfigured, supabase } from '@/shared/supabase/client';
import type { NeighborhoodLeaderboardEntry } from '@/shared/types/leaderboard';

interface NeighborhoodLeaderboardRow {
  rank: number;
  user_id: string;
  nickname: string | null;
  profile_image_url: string | null;
  contribution_score: number;
  collected_cat_count: number;
  encounter_count: number;
  photo_count: number;
  representative_cat_names: string[] | null;
  representative_cat_image_urls: string[] | null;
  is_me: boolean;
}

async function getCatDisplayImageUrl(imageUrl: string | null) {
  if (!imageUrl || imageUrl.startsWith('http') || imageUrl.startsWith('file:')) {
    return imageUrl ?? undefined;
  }

  const { data, error } = await supabase.storage.from('cat-images').createSignedUrl(imageUrl, 60 * 60);
  throwIfSupabaseError(error);

  return data.signedUrl;
}

async function mapLeaderboardRow(row: NeighborhoodLeaderboardRow): Promise<NeighborhoodLeaderboardEntry> {
  const representativeCatImageUrls = await Promise.all(
    (row.representative_cat_image_urls ?? []).map((imageUrl) => getCatDisplayImageUrl(imageUrl)),
  );

  return {
    rank: row.rank,
    userId: row.user_id,
    nickname: row.nickname?.trim() || '동네 냥냥단',
    profileImageUrl: row.profile_image_url ?? undefined,
    contributionScore: row.contribution_score,
    collectedCatCount: row.collected_cat_count,
    encounterCount: row.encounter_count,
    photoCount: row.photo_count,
    representativeCatNames: row.representative_cat_names ?? [],
    representativeCatImageUrls: representativeCatImageUrls.filter((imageUrl): imageUrl is string => Boolean(imageUrl)),
    isMe: row.is_me,
  };
}

export async function fetchNeighborhoodLeaderboard(regionName: string, days = 30, limit = 5): Promise<NeighborhoodLeaderboardEntry[]> {
  assertSupabaseConfigured();

  const { data, error } = await supabase.rpc('get_neighborhood_leaderboard', {
    p_region_name: regionName,
    p_days: days,
    p_limit: limit,
  });

  throwIfSupabaseError(error);

  return Promise.all(((data ?? []) as NeighborhoodLeaderboardRow[]).map(mapLeaderboardRow));
}
