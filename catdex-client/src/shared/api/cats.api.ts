import { throwIfSupabaseError } from '@/shared/api/client';
import type { CoatColorId, CoatPatternId } from '@/shared/coat/coat.types';
import { toCatHabitat } from '@/shared/cats/habitat';
import { assertSupabaseConfigured, supabase } from '@/shared/supabase/client';
import { getActiveNeighborhood } from '@/shared/neighborhood/active-neighborhood';
import { getCurrentPoint } from '@/shared/neighborhood/neighborhood-location';
import type {
  Cat,
  CatEncounter,
  CatMatchCandidate,
  CatMatchMethod,
  CatObservation,
  CatRarity,
  CatProfileUpdateDraft,
  CaptureCatDraft,
  PersonalityTag,
  DexPlaceholder,
} from '@/shared/types/cat';

interface CatRow {
  id: string;
  number: number;
  name: string;
  coat_colors: CoatColorId[] | null;
  coat_pattern: CoatPatternId | null;
  habitat: string | null;
  rarity: CatRarity;
  rarity_reasons: string[] | null;
  encounter_count: number;
  first_seen_at: string;
  last_seen_at: string;
  last_seen_lat: number | null;
  last_seen_lng: number | null;
  tags: string[];
  memo: string | null;
  image_url: string | null;
  original_photo_url: string | null;
}

interface CatEncounterRow {
  id: string;
  cat_id: string;
  user_id: string;
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

interface CatSightingRow {
  id: string;
  region_name: string;
  coat_colors: CoatColorId[] | null;
  coat_pattern: CoatPatternId | null;
  behavior_hint: string;
  image_url: string | null;
  sighted_at: string;
}

interface CatObservationRow {
  id: string;
  original_image_url: string;
  cutout_image_url: string;
  region_name: string;
  detection_confidence: number;
  resolved_cat_id: string | null;
}

interface CatMatchCandidateRow {
  cat_id: string;
  score: number;
  reason: string;
  match_method: CatMatchMethod;
  model_version: string | null;
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
  const coatColors = row.coat_colors ?? [];

  return {
    id: row.id,
    number: row.number,
    name: row.name,
    // 도감 이름은 저장하지 않고 컬러·무늬에서 만든다.
    coatColors,
    coatPattern: row.coat_pattern,
    habitat: toCatHabitat(row.habitat),
    rarity: row.rarity,
    rarityReasons: row.rarity_reasons ?? [],
    encounterCount: row.encounter_count,
    firstSeenAt: formatDate(row.first_seen_at),
    lastSeenAt: formatDate(row.last_seen_at),
    lastSeenLat: row.last_seen_lat ?? undefined,
    lastSeenLng: row.last_seen_lng ?? undefined,
    tags: row.tags,
    memo: row.memo ?? undefined,
    imageUrl: await getDisplayImageUrl(row.image_url),
    originalPhotoUrl: await getDisplayImageUrl(row.original_photo_url),
  };
}

async function mapEncounter(row: CatEncounterRow): Promise<CatEncounter> {
  return {
    id: row.id,
    catId: row.cat_id,
    userId: row.user_id,
    seenAt: formatDate(row.seen_at),
    regionName: row.region_name,
    memo: row.memo,
    imageUrl: await getDisplayImageUrl(row.image_url),
  };
}

// 잘못 연결한 내 만남 기록을 분리(삭제)한다. 서버에서 수집·구역·개체
// 통계까지 재계산하며, 마지막 기록이었다면 개체도 함께 정리된다.
export async function removeMyCatEncounter(encounterId: string) {
  assertSupabaseConfigured();

  const { data, error } = await supabase.rpc('remove_my_cat_encounter', {
    p_encounter_id: encounterId,
  });

  throwIfSupabaseError(error);

  return data as { catRemoved: boolean; myRemainingCount: number };
}

export async function fetchCats() {
  assertSupabaseConfigured();

  const { data, error } = await supabase
    .from('cats')
    .select('*')
    .order('last_seen_at', { ascending: false })
    .order('number', { ascending: true });

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

async function mapSightingPlaceholder(row: CatSightingRow): Promise<DexPlaceholder> {
  const coatColors = row.coat_colors ?? [];

  return {
    id: row.id,
    coatColors,
    coatPattern: row.coat_pattern,
    rarity: 2,
    regionHint: row.region_name,
    sightedAt: formatDate(row.sighted_at),
    reportCount: 1,
    behaviorHint: row.behavior_hint || undefined,
    imageUrl: await getDisplayImageUrl(row.image_url),
  };
}

function mapObservation(row: CatObservationRow): CatObservation {
  return {
    id: row.id,
    originalImageUrl: row.original_image_url,
    cutoutImageUrl: row.cutout_image_url,
    regionName: row.region_name,
    detectionConfidence: Number(row.detection_confidence),
    matchedCatId: row.resolved_cat_id ?? undefined,
  };
}

export async function fetchDexPlaceholders(): Promise<DexPlaceholder[]> {
  assertSupabaseConfigured();

  const { data, error } = await supabase
    .from('cat_sightings')
    .select('id, region_name, coat_colors, coat_pattern, behavior_hint, image_url, sighted_at')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(6);

  throwIfSupabaseError(error);

  return Promise.all(((data ?? []) as CatSightingRow[]).map(mapSightingPlaceholder));
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

export async function createCat(draft: CaptureCatDraft) {
  assertSupabaseConfigured();

  // 구역 중심 좌표를 함께 보낸다. 없으면 서버가 기본 좌표로 만들고,
  // 나중에 좌표가 들어올 때 스스로 고친다. 이 값은 내 위치가 아니라
  // 동네 이름을 지오코딩해서 얻은 동네 중심이다.
  const neighborhood = await getActiveNeighborhood().catch(() => null);
  const isSameRegion = neighborhood?.name === draft.regionName;
  // 실제로 서 있는 지점도 함께 남긴다. 구역 중심과 달리 이 점이 지도 발자국의
  // 닻이 된다. 못 읽으면 좌표 없이 기록되고 발자국은 구역 중심으로 돌아간다.
  const point = await getCurrentPoint();

  const { data, error } = await supabase.rpc('create_cat', {
    p_region_lat: isSameRegion ? neighborhood.lat : null,
    p_region_lng: isSameRegion ? neighborhood.lng : null,
    p_name: draft.name,
    p_tags: draft.tags,
    p_region_name: draft.regionName,
    p_memo: draft.memo,
    p_image_url: draft.imageUrl ?? null,
    p_coat_colors: draft.coatColors,
    p_coat_pattern: draft.coatPattern,
    p_original_photo_url: draft.originalPhotoUrl ?? null,
    p_habitat: draft.habitat,
    p_lat: point?.lat ?? null,
    p_lng: point?.lng ?? null,
  });

  throwIfSupabaseError(error);

  return mapCat(data as CatRow);
}

export async function updateCatProfile(catId: string, draft: CatProfileUpdateDraft & { imageUrl?: string | null }) {
  assertSupabaseConfigured();

  const name = draft.name.trim();

  if (!name) {
    throw new Error('고양이 이름을 입력해 주세요.');
  }

  const updatePayload: {
    name: string;
    tags: PersonalityTag[];
    memo: string | null;
    image_url?: string | null;
  } = {
    name,
    tags: draft.tags,
    memo: draft.memo.trim() || null,
  };

  if (draft.imageUrl !== undefined) {
    updatePayload.image_url = draft.imageUrl;
  }

  const { data, error } = await supabase
    .from('cats')
    .update(updatePayload)
    .eq('id', catId)
    .select('*')
    .maybeSingle();

  throwIfSupabaseError(error);

  if (!data) {
    throw new Error('고양이 정보를 수정할 권한이 없어요.');
  }

  return mapCat(data as CatRow);
}

export async function createCatObservation(draft: {
  originalImageUrl: string;
  cutoutImageUrl: string;
  regionName: string;
  detectionConfidence: number;
  boundingBox: Record<string, number> | null;
  featureVector: number[];
  isPreciseCutout: boolean;
  coatHints?: string[];
  embedding?: number[];
  embeddingVersion?: string | null;
}) {
  assertSupabaseConfigured();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  throwIfSupabaseError(userError);

  if (!user) {
    throw new Error('촬영 관찰 저장에는 로그인이 필요합니다.');
  }

  const { data, error } = await supabase
    .from('cat_observations')
    .insert({
      user_id: user.id,
      original_image_url: draft.originalImageUrl,
      cutout_image_url: draft.cutoutImageUrl,
      region_name: draft.regionName,
      detection_confidence: draft.detectionConfidence,
      detection_box: draft.boundingBox,
      feature_vector: draft.featureVector,
      is_precise_cutout: draft.isPreciseCutout,
      coat_hints: draft.coatHints ?? [],
      embedding: draft.embedding ?? null,
      embedding_version: draft.embedding && draft.embedding.length > 0 ? (draft.embeddingVersion ?? null) : null,
      status: 'pending',
    })
    .select('id, original_image_url, cutout_image_url, region_name, detection_confidence, resolved_cat_id')
    .single();

  throwIfSupabaseError(error);

  return mapObservation(data as CatObservationRow);
}

export async function fetchCatMatchCandidates(payload: {
  observationId?: string;
  regionNames: string[];
  coatHints?: string[];
  limit?: number;
}) {
  if (!payload.observationId) {
    return [];
  }

  assertSupabaseConfigured();

  const limit = Math.min(Math.max(payload.limit ?? 5, 1), 10);
  const { error: generationError } = await supabase.rpc('generate_cat_match_candidates', {
    p_observation_id: payload.observationId,
    p_region_names: payload.regionNames,
    p_coat_hints: payload.coatHints ?? [],
    p_limit: limit,
  });
  throwIfSupabaseError(generationError);

  const { data, error } = await supabase
    .from('cat_match_candidates')
    .select('cat_id, score, reason, match_method, model_version, cats(*)')
    .eq('observation_id', payload.observationId)
    .order('rank', { ascending: true })
    .limit(limit);
  throwIfSupabaseError(error);

  return Promise.all(
    ((data ?? []) as CatMatchCandidateRow[])
      .map((row) => {
        const cat = Array.isArray(row.cats) ? row.cats[0] : row.cats;

        if (!cat) {
          return null;
        }

        return {
          cat,
          score: row.score,
          reason: row.reason,
          method: row.match_method,
          modelVersion: row.model_version ?? undefined,
        };
      })
      .filter(
        (candidate): candidate is {
          cat: CatRow;
          score: number;
          reason: string;
          method: CatMatchMethod;
          modelVersion: string | undefined;
        } => candidate !== null,
      )
      .map(async (candidate) => ({
        cat: await mapCat(candidate.cat),
        score: candidate.score,
        reason: candidate.reason,
        method: candidate.method,
        modelVersion: candidate.modelVersion,
      })),
  );
}

export async function resolveCatObservation(observationId: string, catId: string | null, status: 'linked' | 'new_cat' | 'uncertain') {
  assertSupabaseConfigured();

  const { error } = await supabase
    .from('cat_observations')
    .update({
      resolved_cat_id: catId,
      status,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', observationId);

  throwIfSupabaseError(error);
}

export async function createCatSighting(
  draft: Pick<CaptureCatDraft, 'coatColors' | 'coatPattern' | 'regionName' | 'memo'> & { imageUrl?: string },
) {
  assertSupabaseConfigured();

  const { data, error } = await supabase.rpc('create_cat_sighting', {
    p_region_name: draft.regionName,
    p_behavior_hint: draft.memo,
    p_image_url: draft.imageUrl ?? null,
    p_coat_colors: draft.coatColors,
    p_coat_pattern: draft.coatPattern,
  });

  throwIfSupabaseError(error);

  return mapSightingPlaceholder(data as CatSightingRow);
}

export async function recordCatEncounter(catId: string, payload: Pick<CatEncounter, 'regionName' | 'memo'> & { imageUrl?: string }) {
  assertSupabaseConfigured();

  // 만남은 "지금 여기"의 기록이므로 실제 지점을 같이 남긴다. 못 읽으면 좌표
  // 없이 남고, 개체의 마지막 지점도 그대로 유지된다.
  const point = await getCurrentPoint();

  const { data, error } = await supabase.rpc('record_cat_encounter', {
    p_cat_id: catId,
    p_region_name: payload.regionName,
    p_memo: payload.memo,
    p_image_url: payload.imageUrl ?? null,
    p_lat: point?.lat ?? null,
    p_lng: point?.lng ?? null,
  });

  throwIfSupabaseError(error);

  return mapEncounter(data as CatEncounterRow);
}

