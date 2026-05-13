import { throwIfSupabaseError } from '@/shared/api/client';
import { assertSupabaseConfigured, supabase } from '@/shared/supabase/client';
import { catFilters, coatOptions, personalityOptions, totalDexCount, undiscoveredDexSlotsMock } from '@/shared/data/cats.mock';
import type { Cat, CatEncounter, CatFilter, CatReportDraft, CatRarity, CatType, CaptureCatDraft, DexPlaceholder, DexProgress, HomeSummary, PersonalityTag } from '@/shared/types/cat';

export interface CatOptionsResponse {
  filters: CatFilter[];
  coatTypes: CatType[];
  personalityTags: PersonalityTag[];
}

interface CatRow {
  id: string;
  number: number;
  name: string;
  type: CatType;
  rarity: CatRarity;
  encounter_count: number;
  first_seen_at: string;
  last_seen_at: string;
  relationship_level: string;
  tags: string[];
  memo: string | null;
  image_url: string | null;
}

interface CatEncounterRow {
  id: string;
  cat_id: string;
  seen_at: string;
  region_name: string;
  memo: string;
  image_url: string | null;
}

interface UserCatCollectionRow {
  encounter_count: number;
  first_collected_at: string;
  last_seen_at: string;
  cats: CatRow | CatRow[] | null;
}

function formatDate(value: string) {
  return value.replaceAll('-', '.');
}

async function getDisplayImageUrl(imageUrl: string | null) {
  if (!imageUrl || imageUrl.startsWith('http') || imageUrl.startsWith('file:')) {
    return imageUrl ?? undefined;
  }

  const { data, error } = await supabase.storage.from('cat-images').createSignedUrl(imageUrl, 60 * 60);
  throwIfSupabaseError(error);

  return data.signedUrl;
}

async function mapCat(row: CatRow): Promise<Cat> {
  return {
    id: row.id,
    number: row.number,
    name: row.name,
    type: row.type,
    rarity: row.rarity,
    encounterCount: row.encounter_count,
    firstSeenAt: formatDate(row.first_seen_at),
    lastSeenAt: formatDate(row.last_seen_at),
    relationshipLevel: row.relationship_level,
    tags: row.tags,
    memo: row.memo ?? undefined,
    imageUrl: await getDisplayImageUrl(row.image_url),
  };
}

async function mapEncounter(row: CatEncounterRow): Promise<CatEncounter> {
  return {
    id: row.id,
    catId: row.cat_id,
    seenAt: formatDate(row.seen_at),
    regionName: row.region_name,
    memo: row.memo,
    imageUrl: await getDisplayImageUrl(row.image_url),
  };
}

export async function fetchCats(filter: CatFilter = '전체') {
  assertSupabaseConfigured();

  let query = supabase
    .from('cats')
    .select('*')
    .order('last_seen_at', { ascending: false })
    .order('number', { ascending: true });

  if (filter === '희귀') {
    query = query.gte('rarity', 4);
  } else if (filter !== '전체') {
    query = query.eq('type', filter);
  }

  const { data, error } = await query;
  throwIfSupabaseError(error);

  return Promise.all(((data ?? []) as CatRow[]).map(mapCat));
}

export async function fetchRecentCats(limit = 3) {
  assertSupabaseConfigured();

  const { data, error } = await supabase
    .from('cats')
    .select('*')
    .order('last_seen_at', { ascending: false })
    .order('number', { ascending: true })
    .limit(limit);

  throwIfSupabaseError(error);

  return Promise.all(((data ?? []) as CatRow[]).map(mapCat));
}

export async function fetchMyCats() {
  assertSupabaseConfigured();

  const { data, error } = await supabase
    .from('user_cat_collections')
    .select('encounter_count, first_collected_at, last_seen_at, cats(*)')
    .order('last_seen_at', { ascending: false });

  throwIfSupabaseError(error);

  return Promise.all(
    ((data ?? []) as UserCatCollectionRow[])
      .map((row) => {
        const cat = Array.isArray(row.cats) ? row.cats[0] : row.cats;

        if (!cat) {
          return null;
        }

        return {
          ...cat,
          encounter_count: row.encounter_count,
          first_seen_at: row.first_collected_at,
          last_seen_at: row.last_seen_at,
        };
      })
      .filter((row): row is CatRow => row !== null)
      .map(mapCat),
  );
}

export async function fetchHomeSummary(): Promise<HomeSummary> {
  const cats = await fetchCats();
  const today = new Date().toISOString().slice(0, 10).replaceAll('-', '.');
  const rediscovered = cats.find((cat) => cat.encounterCount > 1);

  return {
    todayDiscovered: cats.filter((cat) => cat.firstSeenAt === today).length,
    totalCollected: cats.length,
    recentRediscovered: rediscovered?.name ?? '아직 없어요',
  };
}

export async function fetchDexProgress(): Promise<DexProgress> {
  const cats = await fetchMyCats();

  return {
    collected: cats.length,
    total: totalDexCount,
  };
}

export function fetchDexPlaceholders(): Promise<DexPlaceholder[]> {
  return Promise.resolve(undiscoveredDexSlotsMock);
}

export async function fetchCatEncounters(catId: string) {
  assertSupabaseConfigured();

  const { data, error } = await supabase
    .from('cat_encounters')
    .select('*')
    .eq('cat_id', catId)
    .order('seen_at', { ascending: true });

  throwIfSupabaseError(error);

  return Promise.all(((data ?? []) as CatEncounterRow[]).map(mapEncounter));
}

export function fetchCatOptions(): Promise<CatOptionsResponse> {
  return Promise.resolve({
    filters: catFilters,
    coatTypes: coatOptions,
    personalityTags: personalityOptions,
  });
}

export async function createCat(draft: CaptureCatDraft) {
  assertSupabaseConfigured();

  const { data, error } = await supabase.rpc('create_cat', {
    p_name: draft.name,
    p_type: draft.type,
    p_tags: draft.tags,
    p_region_name: draft.regionName,
    p_memo: draft.memo,
    p_image_url: draft.imageUrl ?? null,
  });

  throwIfSupabaseError(error);

  return mapCat(data as CatRow);
}

export async function recordCatEncounter(catId: string, payload: Pick<CatEncounter, 'regionName' | 'memo'> & { imageUrl?: string }) {
  assertSupabaseConfigured();

  const { data, error } = await supabase.rpc('record_cat_encounter', {
    p_cat_id: catId,
    p_region_name: payload.regionName,
    p_memo: payload.memo,
    p_image_url: payload.imageUrl ?? null,
  });

  throwIfSupabaseError(error);

  return mapEncounter(data as CatEncounterRow);
}

export async function reportCat(draft: CatReportDraft) {
  assertSupabaseConfigured();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  throwIfSupabaseError(userError);

  if (!user) {
    throw new Error('신고에는 로그인이 필요합니다.');
  }

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    cat_id: draft.catId,
    reason: draft.reason,
    memo: draft.memo,
  });

  throwIfSupabaseError(error);
}
