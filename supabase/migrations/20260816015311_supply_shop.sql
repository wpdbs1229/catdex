-- 냥냥 비품상점.
--
-- 고객 파일(CustomerDossierCard)을 이루는 세 겹 - 종이 배경, 파일 케이스,
-- 모서리 라벨·도장 - 을 사용자별로 바꿔 낄 수 있게 한다. 지금은 실제
-- 상품을 넣지 않는다(예시 목업일 뿐이라 비워 둔다) - 화면과 흐름만 먼저
-- 열어 두고, 실물 상품은 나중에 운영 콘솔에서 추가한다.
--
-- 결제 방식은 아직 정하지 않았다. 그래서 purchase_shop_item은 지금은 값을
-- 받지 않고 바로 소유로 남기는 자리표시자다 - 나중에 실결제·가상 재화 중
-- 무엇으로 정해지든, 이 함수 안만 바꾸면 되고 스키마는 그대로 쓴다.

create table public.shop_items (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('background', 'case', 'label')),
  name text not null,
  price_krw integer not null check (price_krw >= 0),
  description text,
  -- 목업 미리보기(작은 스와치)와 실제 카드에 입힐 때 쓰는 자산은 다를 수 있다.
  swatch_image_url text,
  asset_image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.shop_items is '비품상점 상품. 배경지·파일 케이스·라벨(도장 포함) 세 카테고리.';

create table public.user_shop_purchases (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.shop_items(id) on delete cascade,
  purchased_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- 카테고리마다 한 번에 하나만 낄 수 있다. 행 하나가 사용자 한 명의 전체 장착 상태다.
create table public.user_equipment (
  user_id uuid primary key references auth.users(id) on delete cascade,
  background_item_id uuid references public.shop_items(id) on delete set null,
  case_item_id uuid references public.shop_items(id) on delete set null,
  label_item_id uuid references public.shop_items(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.shop_items enable row level security;
alter table public.user_shop_purchases enable row level security;
alter table public.user_equipment enable row level security;

create policy shop_items_public_read on public.shop_items
  for select to authenticated
  using (is_active);

create policy user_shop_purchases_select_own on public.user_shop_purchases
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy user_equipment_select_own on public.user_equipment
  for select to authenticated
  using (user_id = (select auth.uid()));

-- 쓰기는 RPC(SECURITY DEFINER)로만 한다 - 구매 검증(중복 구매 방지 등)과
-- 장착 검증(내가 산 상품만 장착 가능)을 서버가 강제해야 한다.

create function public.purchase_shop_item(p_item_id uuid)
returns public.user_shop_purchases
language plpgsql
security definer
set search_path to ''
as $function$
declare
  current_user_id uuid := auth.uid();
  target_item public.shop_items;
  next_purchase public.user_shop_purchases;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select * into target_item from public.shop_items where id = p_item_id and is_active;

  if not found then
    raise exception '상품을 찾을 수 없어요' using errcode = 'P0002';
  end if;

  insert into public.user_shop_purchases (user_id, item_id)
  values (current_user_id, p_item_id)
  on conflict (user_id, item_id) do nothing
  returning * into next_purchase;

  if next_purchase.user_id is null then
    -- 이미 갖고 있던 상품. 멱등하게 기존 행을 돌려준다.
    select * into next_purchase
    from public.user_shop_purchases
    where user_id = current_user_id and item_id = p_item_id;
  end if;

  return next_purchase;
end;
$function$;

revoke all on function public.purchase_shop_item(uuid) from public;
grant execute on function public.purchase_shop_item(uuid) to authenticated;

create function public.equip_shop_item(p_item_id uuid)
returns public.user_equipment
language plpgsql
security definer
set search_path to ''
as $function$
declare
  current_user_id uuid := auth.uid();
  target_item public.shop_items;
  owns_item boolean;
  next_equipment public.user_equipment;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select * into target_item from public.shop_items where id = p_item_id;

  if not found then
    raise exception '상품을 찾을 수 없어요' using errcode = 'P0002';
  end if;

  select exists(
    select 1 from public.user_shop_purchases
    where user_id = current_user_id and item_id = p_item_id
  ) into owns_item;

  if not owns_item then
    raise exception '보유하지 않은 상품은 장착할 수 없어요' using errcode = '42501';
  end if;

  insert into public.user_equipment (user_id, background_item_id, case_item_id, label_item_id)
  values (
    current_user_id,
    case when target_item.category = 'background' then p_item_id end,
    case when target_item.category = 'case' then p_item_id end,
    case when target_item.category = 'label' then p_item_id end
  )
  on conflict (user_id) do update set
    background_item_id = case when target_item.category = 'background' then p_item_id else public.user_equipment.background_item_id end,
    case_item_id = case when target_item.category = 'case' then p_item_id else public.user_equipment.case_item_id end,
    label_item_id = case when target_item.category = 'label' then p_item_id else public.user_equipment.label_item_id end,
    updated_at = now()
  returning * into next_equipment;

  return next_equipment;
end;
$function$;

revoke all on function public.equip_shop_item(uuid) from public;
grant execute on function public.equip_shop_item(uuid) to authenticated;

-- 기본(순정) 모습으로 되돌린다. 장착 화면의 "기본" 옵션을 위해 필요하다.
create function public.unequip_shop_category(p_category text)
returns public.user_equipment
language plpgsql
security definer
set search_path to ''
as $function$
declare
  current_user_id uuid := auth.uid();
  next_equipment public.user_equipment;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_category not in ('background', 'case', 'label') then
    raise exception '알 수 없는 카테고리예요' using errcode = '22023';
  end if;

  insert into public.user_equipment (user_id)
  values (current_user_id)
  on conflict (user_id) do update set
    background_item_id = case when p_category = 'background' then null else public.user_equipment.background_item_id end,
    case_item_id = case when p_category = 'case' then null else public.user_equipment.case_item_id end,
    label_item_id = case when p_category = 'label' then null else public.user_equipment.label_item_id end,
    updated_at = now()
  returning * into next_equipment;

  return next_equipment;
end;
$function$;

revoke all on function public.unequip_shop_category(text) from public;
grant execute on function public.unequip_shop_category(text) to authenticated;
