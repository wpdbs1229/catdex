import { throwIfSupabaseError } from '@/shared/api/client';
import { assertSupabaseConfigured, supabase } from '@/shared/supabase/client';
import type { CollectionCustomizationState, CollectionEntitlementTier, FeaturedCatSlot } from '@/shared/types/collection';

interface FeaturedCatRow {
  slot: number;
  cat_id: string;
  caption: string;
}

interface UserEntitlementRow {
  tier: string;
  status: string;
  current_period_ends_at: string | null;
}

function getActiveEntitlementTier(row: UserEntitlementRow | null): CollectionEntitlementTier {
  if (!row || row.tier !== 'nyangkkureomi') {
    return 'free';
  }

  const hasFuturePeriodEnd = row.current_period_ends_at
    ? new Date(row.current_period_ends_at).getTime() > Date.now()
    : true;
  const hasActiveStatus = row.status === 'active' || row.status === 'trialing' || row.status === 'canceled';

  return hasActiveStatus && hasFuturePeriodEnd ? 'nyangkkureomi' : 'free';
}

async function getCurrentUserId(actionLabel: string) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  throwIfSupabaseError(error);

  if (!user) {
    throw new Error(`도감 정보를 ${actionLabel} 로그인이 필요합니다.`);
  }

  return user.id;
}

export async function fetchCollectionCustomization(): Promise<CollectionCustomizationState> {
  assertSupabaseConfigured();

  const userId = await getCurrentUserId('불러오려면');

  const [featuredResponse, entitlementResponse] = await Promise.all([
    supabase
      .from('featured_cats')
      .select('slot, cat_id, caption')
      .eq('user_id', userId)
      .order('slot', { ascending: true }),
    supabase
      .from('user_entitlements')
      .select('tier, status, current_period_ends_at')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  throwIfSupabaseError(featuredResponse.error);
  throwIfSupabaseError(entitlementResponse.error);

  const entitlementTier = getActiveEntitlementTier((entitlementResponse.data as UserEntitlementRow | null) ?? null);

  return {
    featuredCatSlots: ((featuredResponse.data ?? []) as FeaturedCatRow[]).map<FeaturedCatSlot>((row) => ({
      slot: row.slot,
      catId: row.cat_id,
      caption: row.caption,
    })),
    entitlementTier,
    maxFeaturedCats: entitlementTier === 'nyangkkureomi' ? 3 : 1,
  };
}

export async function saveFeaturedCats(catIds: string[]): Promise<CollectionCustomizationState> {
  assertSupabaseConfigured();

  await getCurrentUserId('저장하려면');
  const uniqueCatIds = Array.from(new Set(catIds.filter(Boolean))).slice(0, 3);
  const { error } = await supabase.rpc('replace_featured_cats', {
    p_cat_ids: uniqueCatIds,
  });

  throwIfSupabaseError(error);

  return fetchCollectionCustomization();
}
