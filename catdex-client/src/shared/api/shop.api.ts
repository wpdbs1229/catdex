import { getCurrentUserId } from '@/shared/api/auth.api';
import { throwIfSupabaseError } from '@/shared/api/client';
import { fetchOfferings, purchasePackage } from '@/shared/purchases/revenuecat';
import { assertSupabaseConfigured, supabase } from '@/shared/supabase/client';
import type { ShopItem, ShopItemCategory, UserEquipment } from '@/shared/types/shop';

const SHOP_ITEM_COLUMNS =
  'id, category, name, price_krw, description, swatch_image_url, asset_image_url, store_product_id';

interface ShopItemRow {
  id: string;
  category: ShopItemCategory;
  name: string;
  price_krw: number;
  description: string | null;
  swatch_image_url: string | null;
  asset_image_url: string | null;
  store_product_id: string | null;
}

interface UserEquipmentRow {
  background_item_id: string | null;
  case_item_id: string | null;
  label_item_id: string | null;
}

function mapShopItem(row: ShopItemRow): ShopItem {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    priceKrw: row.price_krw,
    description: row.description ?? undefined,
    swatchImageUrl: row.swatch_image_url ?? undefined,
    assetImageUrl: row.asset_image_url ?? undefined,
    storeProductId: row.store_product_id ?? undefined,
  };
}

/** 상점 상품 전체. 지금은 운영 콘솔에서 상품을 넣기 전이라 빈 배열일 수 있다. */
export async function fetchShopItems(): Promise<ShopItem[]> {
  assertSupabaseConfigured();

  const { data, error } = await supabase
    .from('shop_items')
    .select(SHOP_ITEM_COLUMNS)
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true });

  throwIfSupabaseError(error);

  return ((data ?? []) as ShopItemRow[]).map(mapShopItem);
}

/** 내가 산 상품의 id 집합. 목록에서 "보유 중" 표시에 쓴다. */
export async function fetchMyShopPurchaseIds(): Promise<Set<string>> {
  assertSupabaseConfigured();

  const currentUserId = await getCurrentUserId();

  if (!currentUserId) {
    return new Set();
  }

  const { data, error } = await supabase.from('user_shop_purchases').select('item_id');

  throwIfSupabaseError(error);

  return new Set(((data ?? []) as Array<{ item_id: string }>).map((row) => row.item_id));
}

/** 지금 장착된 상품. 비어 있는 칸은 기본(순정) 모습이다. */
export async function fetchMyEquipment(): Promise<UserEquipment> {
  assertSupabaseConfigured();

  const currentUserId = await getCurrentUserId();

  if (!currentUserId) {
    return {};
  }

  const { data, error } = await supabase
    .from('user_equipment')
    .select('background_item_id, case_item_id, label_item_id')
    .maybeSingle();

  throwIfSupabaseError(error);

  const row = data as UserEquipmentRow | null;

  if (!row) {
    return {};
  }

  const itemIds = [row.background_item_id, row.case_item_id, row.label_item_id].filter(
    (id): id is string => Boolean(id),
  );

  if (itemIds.length === 0) {
    return {};
  }

  const { data: itemRows, error: itemsError } = await supabase
    .from('shop_items')
    .select(SHOP_ITEM_COLUMNS)
    .in('id', itemIds);

  throwIfSupabaseError(itemsError);

  const itemsById = new Map(((itemRows ?? []) as ShopItemRow[]).map((item) => [item.id, mapShopItem(item)]));

  return {
    background: row.background_item_id ? itemsById.get(row.background_item_id) : undefined,
    case: row.case_item_id ? itemsById.get(row.case_item_id) : undefined,
    label: row.label_item_id ? itemsById.get(row.label_item_id) : undefined,
  };
}

/** 상품을 산다. 이미 갖고 있으면 그대로 성공한다(멱등). */
export async function purchaseShopItem(itemId: string) {
  assertSupabaseConfigured();

  const { error } = await supabase.rpc('purchase_shop_item', { p_item_id: itemId });

  throwIfSupabaseError(error);
}

/**
 * 상품을 산다. store_product_id가 있으면 RevenueCat으로 실제 결제를 띄우고,
 * 성공한 뒤에만 소유 처리한다. 아직 없으면(운영 콘솔에 실물이 안 올라온
 * 동안) 예전처럼 결제 없이 바로 소유 처리한다 - 상점 화면이 실물 상품이
 * 하나도 없어도 그대로 켜져 있어야 한다.
 */
export async function purchaseShopItemViaStore(item: ShopItem) {
  if (!item.storeProductId) {
    return purchaseShopItem(item.id);
  }

  const offering = await fetchOfferings();
  const targetPackage = offering?.availablePackages.find(
    (candidate) => candidate.product.identifier === item.storeProductId,
  );

  if (!targetPackage) {
    throw new Error('지금은 이 상품을 구매할 수 없어요. 잠시 후 다시 시도해 주세요.');
  }

  await purchasePackage(targetPackage);
  // 결제가 실제로 끝난 뒤에만 우리 쪽 소유로 남긴다.
  await purchaseShopItem(item.id);
}

/** 보유한 상품을 장착한다. 같은 카테고리의 기존 장착은 자동으로 풀린다. */
export async function equipShopItem(itemId: string) {
  assertSupabaseConfigured();

  const { error } = await supabase.rpc('equip_shop_item', { p_item_id: itemId });

  throwIfSupabaseError(error);
}

/** 카테고리를 기본(순정) 모습으로 되돌린다. */
export async function unequipShopCategory(category: ShopItemCategory) {
  assertSupabaseConfigured();

  const { error } = await supabase.rpc('unequip_shop_category', { p_category: category });

  throwIfSupabaseError(error);
}
