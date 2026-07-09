import { throwIfSupabaseError } from '@/shared/api/client';
import { assertSupabaseConfigured, supabase } from '@/shared/supabase/client';
import type { CollectionCustomizationState, FeaturedCatSlot } from '@/shared/types/collection';

interface FeaturedCatRow {
  slot: number;
  cat_id: string;
  caption: string;
}

export async function fetchCollectionCustomization(): Promise<CollectionCustomizationState> {
  assertSupabaseConfigured();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  throwIfSupabaseError(userError);

  if (!user) {
    throw new Error('도감 정보를 불러오려면 로그인이 필요합니다.');
  }

  const featuredResponse = await supabase
    .from('featured_cats')
    .select('slot, cat_id, caption')
    .eq('user_id', user.id)
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
