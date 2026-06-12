import { throwIfSupabaseError } from '@/shared/api/client';
import { isRevenueCatPurchaseCancelled, purchaseSharedMapLifetime, restoreSharedMapLifetime } from '@/shared/payments/shared-map-purchases';
import { assertSupabaseConfigured, supabase } from '@/shared/supabase/client';
import type { SharedMapAccess } from '@/shared/types/entitlement';
import type { Region, RegionCatPreview } from '@/shared/types/region';

const sharedMapPriceLabel = '15,900원';

interface SharedMapEntitlementRow {
  tier: string;
  status: string;
  source: SharedMapAccess['source'] | null;
  current_period_ends_at: string | null;
}

interface SharedMapRegionRow {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  cats: string[] | null;
  cat_previews: Array<{
    id: string;
    name: string;
    imageUrl?: string | null;
    image_url?: string | null;
  }> | null;
}

interface SharedMapPurchaseResponse {
  hasLifetimeAccess: boolean;
  message?: string;
}

function isActiveSharedMapEntitlement(entitlement: SharedMapEntitlementRow) {
  const endsAt = entitlement.current_period_ends_at ? new Date(entitlement.current_period_ends_at) : null;
  const hasNotEnded = !endsAt || endsAt.getTime() > Date.now();

  return (
    entitlement.tier === 'shared_map_lifetime' &&
    hasNotEnded &&
    (entitlement.status === 'active' || entitlement.status === 'trialing' || entitlement.status === 'canceled')
  );
}

async function getDisplayImageUrl(imageUrl: string | null | undefined) {
  if (!imageUrl || imageUrl.startsWith('http') || imageUrl.startsWith('file:')) {
    return imageUrl ?? undefined;
  }

  const { data, error } = await supabase.storage.from('cat-images').createSignedUrl(imageUrl, 60 * 60);
  throwIfSupabaseError(error);

  return data.signedUrl;
}

async function mapSharedCatPreview(preview: NonNullable<SharedMapRegionRow['cat_previews']>[number]): Promise<RegionCatPreview> {
  return {
    id: preview.id,
    name: preview.name,
    imageUrl: await getDisplayImageUrl(preview.imageUrl ?? preview.image_url),
  };
}

export async function fetchSharedMapAccess(): Promise<SharedMapAccess> {
  assertSupabaseConfigured();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  throwIfSupabaseError(userError);

  if (!user) {
    return {
      hasLifetimeAccess: false,
      priceLabel: sharedMapPriceLabel,
    };
  }

  const { data, error } = await supabase
    .from('user_entitlements')
    .select('tier, status, source, current_period_ends_at')
    .eq('user_id', user.id)
    .eq('tier', 'shared_map_lifetime');

  throwIfSupabaseError(error);

  const entitlement = ((data ?? []) as SharedMapEntitlementRow[]).find(isActiveSharedMapEntitlement);

  return {
    hasLifetimeAccess: Boolean(entitlement),
    priceLabel: sharedMapPriceLabel,
    source: entitlement?.source ?? undefined,
  };
}

export async function fetchSharedMapRegions(): Promise<Region[]> {
  assertSupabaseConfigured();

  const { data, error } = await supabase.rpc('get_shared_map_regions');
  throwIfSupabaseError(error);

  const rows = (data ?? []) as SharedMapRegionRow[];

  return Promise.all(
    rows.map(async (row) => {
      const catPreviews = await Promise.all((row.cat_previews ?? []).map(mapSharedCatPreview));

      return {
        id: row.id,
        name: row.name,
        lat: Number(row.lat.toFixed(3)),
        lng: Number(row.lng.toFixed(3)),
        radius: Math.max(row.radius, 500),
        cats: row.cats ?? catPreviews.map((cat) => cat.name),
        catPreviews,
      };
    }),
  );
}

export async function startSharedMapPurchase(): Promise<SharedMapPurchaseResponse> {
  assertSupabaseConfigured();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  throwIfSupabaseError(userError);

  if (!user) {
    return {
      hasLifetimeAccess: false,
      message: '공유지도 구매에는 로그인이 필요합니다.',
    };
  }

  try {
    return await purchaseSharedMapLifetime(user.id);
  } catch (error) {
    if (isRevenueCatPurchaseCancelled(error)) {
      return {
        hasLifetimeAccess: false,
        message: '결제가 취소되었습니다.',
      };
    }

    throw error;
  }
}

export async function restoreSharedMapPurchase(): Promise<SharedMapPurchaseResponse> {
  assertSupabaseConfigured();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  throwIfSupabaseError(userError);

  if (!user) {
    return {
      hasLifetimeAccess: false,
      message: '공유지도 구매 복원에는 로그인이 필요합니다.',
    };
  }

  const restored = await restoreSharedMapLifetime(user.id);

  return {
    hasLifetimeAccess: restored.hasLifetimeAccess,
    message: restored.hasLifetimeAccess ? undefined : '복원 가능한 공유지도 구매 내역이 없습니다.',
  };
}
