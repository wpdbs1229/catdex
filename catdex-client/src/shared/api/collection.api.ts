import { throwIfSupabaseError } from '@/shared/api/client';
import { assertSupabaseConfigured, supabase } from '@/shared/supabase/client';
import type {
  AlleyBadge,
  CollectionCustomizationState,
  CollectionProfile,
  CollectionTheme,
  EntitlementStatus,
  EntitlementTier,
  FeaturedCatSlot,
  SeasonStamp,
  UserEntitlement,
} from '@/shared/types/collection';

interface UserEntitlementRow {
  tier: EntitlementTier;
  status: EntitlementStatus;
  current_period_ends_at: string | null;
}

interface CollectionThemeRow {
  id: string;
  name: string;
  description: string;
  palette: string;
  is_premium: boolean;
}

interface CollectionProfileRow {
  cover_theme_id: string;
  display_title: string;
  intro: string;
  selected_badge_ids: string[];
}

interface FeaturedCatRow {
  slot: number;
  cat_id: string;
  caption: string;
}

interface SeasonStampRow {
  id: string;
  name: string;
  description: string;
  season_key: string;
  starts_on: string;
  ends_on: string;
  is_premium: boolean;
}

interface UserSeasonStampRow {
  stamp_id: string;
  achieved_at: string;
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

function defaultEntitlement(): UserEntitlement {
  return {
    tier: 'free',
    status: 'active',
    currentPeriodEndsAt: null,
  };
}

function mapEntitlement(row?: UserEntitlementRow | null): UserEntitlement {
  if (!row) {
    return defaultEntitlement();
  }

  return {
    tier: row.tier,
    status: row.status,
    currentPeriodEndsAt: row.current_period_ends_at,
  };
}

function mapTheme(row: CollectionThemeRow): CollectionTheme {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    palette: row.palette,
    isPremium: row.is_premium,
  };
}

function mapProfile(row: CollectionProfileRow | null, fallbackThemeId: string): CollectionProfile {
  return {
    coverThemeId: row?.cover_theme_id ?? fallbackThemeId,
    displayTitle: row?.display_title ?? '나의 냥도감',
    intro: row?.intro ?? '오늘도 골목에서 만난 친구들을 기록해요.',
    selectedBadgeIds: row?.selected_badge_ids ?? [],
  };
}

export function hasActiveNyangkkureomi(entitlement: UserEntitlement) {
  return entitlement.tier === 'nyangkkureomi' && (entitlement.status === 'active' || entitlement.status === 'trialing');
}

export async function fetchCollectionCustomization(): Promise<CollectionCustomizationState> {
  assertSupabaseConfigured();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  throwIfSupabaseError(userError);

  if (!user) {
    throw new Error('고양이 서랍을 불러오려면 로그인이 필요합니다.');
  }

  const [
    entitlementResponse,
    themesResponse,
    profileResponse,
    featuredResponse,
    stampsResponse,
    userStampsResponse,
    badgesResponse,
    userBadgesResponse,
  ] = await Promise.all([
    supabase.from('user_entitlements').select('tier, status, current_period_ends_at').eq('user_id', user.id).maybeSingle(),
    supabase.from('collection_themes').select('id, name, description, palette, is_premium').order('sort_order', { ascending: true }),
    supabase
      .from('collection_profiles')
      .select('cover_theme_id, display_title, intro, selected_badge_ids')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase.from('featured_cats').select('slot, cat_id, caption').eq('user_id', user.id).order('slot', { ascending: true }),
    supabase
      .from('season_stamps')
      .select('id, name, description, season_key, starts_on, ends_on, is_premium')
      .order('sort_order', { ascending: true }),
    supabase.from('user_season_stamps').select('stamp_id, achieved_at').eq('user_id', user.id),
    supabase.from('badges').select('id, name, description').order('id', { ascending: true }),
    supabase.from('user_badges').select('badge_id, achieved_at').eq('user_id', user.id),
  ]);

  throwIfSupabaseError(entitlementResponse.error);
  throwIfSupabaseError(themesResponse.error);
  throwIfSupabaseError(profileResponse.error);
  throwIfSupabaseError(featuredResponse.error);
  throwIfSupabaseError(stampsResponse.error);
  throwIfSupabaseError(userStampsResponse.error);
  throwIfSupabaseError(badgesResponse.error);
  throwIfSupabaseError(userBadgesResponse.error);

  const themes = ((themesResponse.data ?? []) as CollectionThemeRow[]).map(mapTheme);
  const fallbackThemeId = themes.find((theme) => !theme.isPremium)?.id ?? 'field-note';
  const userStampById = new Map(((userStampsResponse.data ?? []) as UserSeasonStampRow[]).map((row) => [row.stamp_id, row.achieved_at]));
  const userBadgeById = new Map(((userBadgesResponse.data ?? []) as UserBadgeRow[]).map((row) => [row.badge_id, row.achieved_at]));

  return {
    entitlement: mapEntitlement(entitlementResponse.data as UserEntitlementRow | null),
    profile: mapProfile(profileResponse.data as CollectionProfileRow | null, fallbackThemeId),
    themes,
    featuredCatSlots: ((featuredResponse.data ?? []) as FeaturedCatRow[]).map<FeaturedCatSlot>((row) => ({
      slot: row.slot,
      catId: row.cat_id,
      caption: row.caption,
    })),
    alleyBadges: ((badgesResponse.data ?? []) as BadgeRow[]).map<AlleyBadge>((badge) => ({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      achieved: userBadgeById.has(badge.id),
      achievedAt: userBadgeById.get(badge.id) ? formatDate(userBadgeById.get(badge.id) as string) : undefined,
    })),
    seasonStamps: ((stampsResponse.data ?? []) as SeasonStampRow[]).map<SeasonStamp>((stamp) => ({
      id: stamp.id,
      name: stamp.name,
      description: stamp.description,
      seasonKey: stamp.season_key,
      startsOn: stamp.starts_on,
      endsOn: stamp.ends_on,
      isPremium: stamp.is_premium,
      achieved: userStampById.has(stamp.id),
      achievedAt: userStampById.get(stamp.id) ? formatDate(userStampById.get(stamp.id) as string) : undefined,
    })),
  };
}

export async function saveCollectionProfile(profile: CollectionProfile) {
  assertSupabaseConfigured();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  throwIfSupabaseError(userError);

  if (!user) {
    throw new Error('고양이 서랍 저장에는 로그인이 필요합니다.');
  }

  const { error } = await supabase.from('collection_profiles').upsert(
    {
      user_id: user.id,
      cover_theme_id: profile.coverThemeId,
      display_title: profile.displayTitle,
      intro: profile.intro,
      selected_badge_ids: profile.selectedBadgeIds,
    },
    { onConflict: 'user_id' },
  );

  throwIfSupabaseError(error);
}

export async function saveFeaturedCat(slot: number, catId: string | null) {
  assertSupabaseConfigured();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  throwIfSupabaseError(userError);

  if (!user) {
    throw new Error('대표 고양이 저장에는 로그인이 필요합니다.');
  }

  if (!catId) {
    const { error } = await supabase.from('featured_cats').delete().eq('user_id', user.id).eq('slot', slot);
    throwIfSupabaseError(error);
    return;
  }

  const { error } = await supabase.from('featured_cats').upsert(
    {
      user_id: user.id,
      slot,
      cat_id: catId,
      caption: '',
    },
    { onConflict: 'user_id,slot' },
  );

  throwIfSupabaseError(error);
}
