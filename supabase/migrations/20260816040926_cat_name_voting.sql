-- 고양이 이름 투표.
--
-- 지금까지 이름은 최초 등록자가 지은 대로 고정이었다. 그런데 같은 고양이를
-- 여럿이 서로 다른 이름으로 부르는 게 자연스럽다. 그 고양이를 만난 사람만
-- 후보를 내고 투표할 수 있고, 도전자가 현재 이름보다 3표 이상 앞서야
-- cats.name이 실제로 바뀐다 - 표 하나로 이름이 계속 뒤집히는 걸 막는다.

create table public.cat_name_proposals (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null references public.cats(id) on delete cascade,
  name text not null,
  proposed_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (cat_id, name)
);

comment on table public.cat_name_proposals is '고양이 이름 후보. 최초 등록 이름도 후보 하나로 시작한다.';

create table public.cat_name_votes (
  cat_id uuid not null references public.cats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  proposal_id uuid not null references public.cat_name_proposals(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (cat_id, user_id)
);

comment on table public.cat_name_votes is '한 사람당 고양이 하나에 표 하나. 다른 후보로 옮기면 이 행이 갱신된다.';

alter table public.cats add column active_name_proposal_id uuid references public.cat_name_proposals(id);

alter table public.cat_name_proposals enable row level security;
alter table public.cat_name_votes enable row level security;

-- 후보·득표는 동네 사람들과 공유되는 값이라(기록 타임라인과 같은 원칙) 누구나 읽는다.
create policy cat_name_proposals_public_read on public.cat_name_proposals
  for select to authenticated
  using (true);

create policy cat_name_votes_public_read on public.cat_name_votes
  for select to authenticated
  using (true);

-- 기존 고양이마다 지금 이름을 후보 #1로 만들어 심는다. 등록자가 스스로 첫 표를 던진다.
insert into public.cat_name_proposals (cat_id, name, proposed_by)
select c.id, c.name, coalesce(c.created_by, c.user_id)
from public.cats c
where coalesce(c.created_by, c.user_id) is not null;

update public.cats c
set active_name_proposal_id = p.id
from public.cat_name_proposals p
where p.cat_id = c.id and p.name = c.name;

insert into public.cat_name_votes (cat_id, user_id, proposal_id)
select p.cat_id, p.proposed_by, p.id
from public.cat_name_proposals p
on conflict (cat_id, user_id) do nothing;

-- 도전자가 현재 이름보다 이만큼 더 표를 받아야 실제로 이름이 바뀐다.
create function private.promote_leading_cat_name(p_cat_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  flip_margin constant integer := 3;
  current_votes integer;
  leader record;
begin
  select count(*)
  into current_votes
  from public.cat_name_votes v
  join public.cats c on c.id = v.cat_id
  where v.cat_id = p_cat_id and v.proposal_id = c.active_name_proposal_id;

  select v.proposal_id, count(*) as votes
  into leader
  from public.cat_name_votes v
  where v.cat_id = p_cat_id
  group by v.proposal_id
  order by count(*) desc
  limit 1;

  if leader.proposal_id is null then
    return;
  end if;

  if leader.votes - coalesce(current_votes, 0) >= flip_margin then
    update public.cats c
    set name = p.name, active_name_proposal_id = p.id
    from public.cat_name_proposals p
    where c.id = p_cat_id and p.id = leader.proposal_id and c.active_name_proposal_id <> p.id;
  end if;
end;
$function$;

create function public.propose_cat_name(p_cat_id uuid, p_name text)
returns public.cat_name_proposals
language plpgsql
security definer
set search_path to ''
as $function$
declare
  current_user_id uuid := auth.uid();
  cleaned_name text := trim(coalesce(p_name, ''));
  has_met boolean;
  next_proposal public.cat_name_proposals;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if cleaned_name = '' or length(cleaned_name) > 20 then
    raise exception '이름은 1~20자로 적어 주세요' using errcode = '22023';
  end if;

  select exists(
    select 1 from public.user_cat_collections
    where user_id = current_user_id and cat_id = p_cat_id
  ) into has_met;

  if not has_met then
    raise exception '만난 적 있는 고객만 이름을 제안할 수 있어요' using errcode = '42501';
  end if;

  insert into public.cat_name_proposals (cat_id, name, proposed_by)
  values (p_cat_id, cleaned_name, current_user_id)
  on conflict (cat_id, name) do update set name = excluded.name
  returning * into next_proposal;

  insert into public.cat_name_votes (cat_id, user_id, proposal_id)
  values (p_cat_id, current_user_id, next_proposal.id)
  on conflict (cat_id, user_id) do update set
    proposal_id = excluded.proposal_id,
    created_at = now();

  perform private.promote_leading_cat_name(p_cat_id);

  return next_proposal;
end;
$function$;

revoke all on function public.propose_cat_name(uuid, text) from public;
grant execute on function public.propose_cat_name(uuid, text) to authenticated;

create function public.vote_cat_name(p_proposal_id uuid)
returns public.cat_name_votes
language plpgsql
security definer
set search_path to ''
as $function$
declare
  current_user_id uuid := auth.uid();
  target_proposal public.cat_name_proposals;
  has_met boolean;
  next_vote public.cat_name_votes;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select * into target_proposal from public.cat_name_proposals where id = p_proposal_id;

  if not found then
    raise exception '후보를 찾을 수 없어요' using errcode = 'P0002';
  end if;

  select exists(
    select 1 from public.user_cat_collections
    where user_id = current_user_id and cat_id = target_proposal.cat_id
  ) into has_met;

  if not has_met then
    raise exception '만난 적 있는 고객만 투표할 수 있어요' using errcode = '42501';
  end if;

  insert into public.cat_name_votes (cat_id, user_id, proposal_id)
  values (target_proposal.cat_id, current_user_id, p_proposal_id)
  on conflict (cat_id, user_id) do update set
    proposal_id = excluded.proposal_id,
    created_at = now()
  returning * into next_vote;

  perform private.promote_leading_cat_name(target_proposal.cat_id);

  return next_vote;
end;
$function$;

revoke all on function public.vote_cat_name(uuid) from public;
grant execute on function public.vote_cat_name(uuid) to authenticated;

-- create_cat도 등록하는 순간 그 이름을 후보 #1로 심고 등록자가 첫 표를 던지게 한다.
-- 매개변수는 그대로라 signature 충돌 없이 create or replace로 끝난다.
create or replace function public.create_cat(
  p_name text,
  p_tags text[],
  p_region_name text,
  p_memo text,
  p_image_url text default null,
  p_coat_colors text[] default '{}'::text[],
  p_coat_pattern text default null,
  p_region_lat double precision default null,
  p_region_lng double precision default null,
  p_original_photo_url text default null,
  p_habitat text default 'street',
  p_lat double precision default null,
  p_lng double precision default null
)
returns public.cats
language plpgsql
set search_path to ''
as $function$
declare
  current_user_id uuid := auth.uid();
  next_number integer;
  next_cat public.cats;
  next_encounter public.cat_encounters;
  next_name_proposal public.cat_name_proposals;
  next_region_id text;
  calculated_rarity integer;
  calculated_reasons text[];
  collected_count integer;
  chosen_habitat text := coalesce(nullif(trim(p_habitat), ''), 'street');
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Cat name is required' using errcode = '22023';
  end if;

  if p_region_name is null or length(trim(p_region_name)) = 0 then
    raise exception 'Region name is required' using errcode = '22023';
  end if;

  if chosen_habitat not in ('house', 'street', 'shelter') then
    raise exception '알 수 없는 거처예요' using errcode = '22023';
  end if;

  select calculated.rarity, calculated.reasons
  into calculated_rarity, calculated_reasons
  from public.calculate_cat_rarity(coalesce(p_coat_colors, '{}'), p_coat_pattern, p_region_name) as calculated;

  perform pg_advisory_xact_lock(hashtext('shared_cat_number'));

  select coalesce(max(number), 0) + 1
  into next_number
  from public.cats;

  insert into public.cats (
    user_id,
    created_by,
    number,
    name,
    coat_colors,
    coat_pattern,
    habitat,
    rarity,
    rarity_reasons,
    encounter_count,
    first_seen_at,
    last_seen_at,
    last_seen_lat,
    last_seen_lng,
    tags,
    memo,
    image_url,
    representative_photo_url,
    original_photo_url
  )
  values (
    current_user_id,
    current_user_id,
    next_number,
    trim(p_name),
    coalesce(p_coat_colors, '{}'),
    p_coat_pattern,
    chosen_habitat,
    calculated_rarity,
    coalesce(calculated_reasons, '{}'::text[]),
    1,
    current_date,
    current_date,
    p_lat,
    p_lng,
    coalesce(p_tags, '{}'),
    nullif(trim(coalesce(p_memo, '')), ''),
    p_image_url,
    p_image_url,
    p_original_photo_url
  )
  returning * into next_cat;

  -- 등록한 이름을 후보 #1로 심고, 등록자가 그 이름에 첫 표를 던진다.
  insert into public.cat_name_proposals (cat_id, name, proposed_by)
  values (next_cat.id, next_cat.name, current_user_id)
  returning * into next_name_proposal;

  insert into public.cat_name_votes (cat_id, user_id, proposal_id)
  values (next_cat.id, current_user_id, next_name_proposal.id);

  update public.cats set active_name_proposal_id = next_name_proposal.id where id = next_cat.id;
  next_cat.active_name_proposal_id := next_name_proposal.id;

  insert into public.cat_encounters (user_id, cat_id, seen_at, region_name, memo, image_url, lat, lng, location_precision, is_public)
  values (current_user_id, next_cat.id, current_date, p_region_name, coalesce(p_memo, ''), p_image_url, p_lat, p_lng, 'region', true)
  returning * into next_encounter;

  insert into public.user_cat_collections (user_id, cat_id, first_collected_at, last_seen_at, encounter_count)
  values (current_user_id, next_cat.id, current_date, current_date, 1)
  on conflict (user_id, cat_id) do update set
    last_seen_at = excluded.last_seen_at,
    encounter_count = public.user_cat_collections.encounter_count + 1,
    updated_at = now();

  next_region_id := private.ensure_region(p_region_name, p_region_lat, p_region_lng);

  insert into public.region_cats (region_id, cat_id, user_id)
  values (next_region_id, next_cat.id, current_user_id)
  on conflict do nothing;

  insert into public.cat_regions (region_id, cat_id, first_seen_at, last_seen_at, encounter_count)
  values (next_region_id, next_cat.id, current_date, current_date, 1)
  on conflict (region_id, cat_id) do update set
    last_seen_at = excluded.last_seen_at,
    encounter_count = public.cat_regions.encounter_count + 1,
    updated_at = now();

  if p_image_url is not null then
    insert into public.cat_photos (cat_id, encounter_id, uploaded_by, image_url, is_representative, visibility)
    values (next_cat.id, next_encounter.id, current_user_id, coalesce(p_original_photo_url, p_image_url), true, 'public');
  end if;

  -- 이번 등록으로 상한이 올라갔다면 예전 기록의 별도 다시 본다.
  select count(*)
  into collected_count
  from public.user_cat_collections
  where user_cat_collections.user_id = current_user_id;

  if collected_count in (10, 30) then
    perform private.lift_collector_rarity_cap(current_user_id);

    select cats.rarity, cats.rarity_reasons
    into next_cat.rarity, next_cat.rarity_reasons
    from public.cats
    where cats.id = next_cat.id;
  end if;

  return next_cat;
end;
$function$;
