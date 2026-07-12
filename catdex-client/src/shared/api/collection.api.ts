import { throwIfSupabaseError } from '@/shared/api/client';
import { assertSupabaseConfigured, supabase } from '@/shared/supabase/client';
import type { CollectionCustomizationState, FeaturedCatSlot } from '@/shared/types/collection';

interface FeaturedCatRow {
  slot: number;
  cat_id: string;
  caption: string;
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

  const featuredResponse = await supabase
    .from('featured_cats')
    .select('slot, cat_id, caption')
    .eq('user_id', userId)
    .order('slot', { ascending: true });

  throwIfSupabaseError(featuredResponse.error);

  return {
    featuredCatSlots: ((featuredResponse.data ?? []) as FeaturedCatRow[]).map<FeaturedCatSlot>((row) => ({
      slot: row.slot,
      catId: row.cat_id,
      caption: row.caption,
    })),
  };
}

export async function saveFeaturedCats(catIds: string[]): Promise<CollectionCustomizationState> {
  assertSupabaseConfigured();

  const userId = await getCurrentUserId('저장하려면');
  const uniqueCatIds = Array.from(new Set(catIds.filter(Boolean))).slice(0, 3);
  const rows = uniqueCatIds.map((catId, index) => ({
    user_id: userId,
    cat_id: catId,
    slot: index + 1,
    caption: '',
  }));

  const deleteResponse = await supabase.from('featured_cats').delete().eq('user_id', userId);
  throwIfSupabaseError(deleteResponse.error);

  if (rows.length > 0) {
    const insertResponse = await supabase.from('featured_cats').insert(rows);
    throwIfSupabaseError(insertResponse.error);
  }

  return fetchCollectionCustomization();
}
