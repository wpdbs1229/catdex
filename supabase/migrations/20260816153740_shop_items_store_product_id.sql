-- RevenueCat/App Store·Play Console 쪽 상품 식별자를 상품에 매달아 둔다.
-- 실결제 상품은 여기 값이 있어야 하고, 없는 동안은(자리표시자 시절 그대로)
-- 클라이언트가 예전처럼 바로 소유 처리하는 경로로 판다.
alter table public.shop_items add column store_product_id text;

comment on column public.shop_items.store_product_id is
  'RevenueCat 상품 식별자(App Store Connect/Play Console 상품 ID와 동일). 비어 있으면 아직 실결제 전이다.';
