insert into public.badges (id, name, description) values
  ('first-cat', '첫 만남', '첫 고양이를 도감에 기록했어요.'),
  ('first-sighting', '첫 목격담', '이웃 확인 요청으로 첫 목격담을 남겼어요.'),
  ('reunion-friend', '다시 만난 친구', '같은 고양이를 다시 만나 기록했어요.'),
  ('familiar-friend', '눈인사 친구', '같은 고양이를 3번 기록했어요.'),
  ('regular-cat', '단골 냥이', '같은 고양이를 5번 기록했어요.'),
  ('longtime-friend', '오래 아는 사이', '같은 고양이를 10번 기록했어요.'),
  ('cheese-collector', '치즈냥 수집가', '치즈냥 친구 3마리를 도감에 남겼어요.'),
  ('tuxedo-detective', '턱시도냥 탐정', '턱시도냥 친구 3마리를 도감에 남겼어요.'),
  ('calico-friend', '삼색 친구', '삼색이 친구를 도감에 남겼어요.'),
  ('old-town-wanderer', '골목 산책자', '서로 다른 동네 3곳에서 고양이를 기록했어요.'),
  ('neighborhood-regular', '우리 동네 기록가', '한 동네에서 고양이 기록을 10번 남겼어요.'),
  ('careful-observer', '조심스러운 관찰자', '정확한 위치 없이 동네 단위 기록을 10번 남겼어요.'),
  ('safety-reporter', '안전 제보자', '위치 위험이나 정보 오류를 신고해 고양이 안전을 도왔어요.'),
  ('neighbor-verifier', '이웃 확인단', '이웃의 확인 요청에 댓글로 3번 참여했어요.'),
  ('collection-starter', '대표 고양이 설정', '내 사원증과 홈에 보여줄 대표 고양이를 설정했어요.'),
  ('spring-alley-recorder', '봄 골목 기록자', '봄 골목에서 고양이 기록을 3번 남겼어요.'),
  ('rainy-day-recorder', '비 온 뒤 발자국', '비 온 뒤의 고양이 흔적을 기록했어요.'),
  ('night-walk-watcher', '달빛 관찰자', '저녁 시간대의 고양이 기록을 남겼어요.'),
  ('month-later-reunion', '한 달 뒤 다시 만남', '30일 이상 지나 같은 고양이를 다시 기록했어요.'),
  ('quiet-note-keeper', '조용한 친구', '고양이의 행동이나 상태 메모를 5번 남겼어요.'),
  ('dex-10', '동네 도감 10', '고양이 10마리를 도감에 남겼어요.'),
  ('dex-50', '동네 도감 50', '고양이 50마리를 도감에 남겼어요.'),
  ('rare-finder', '희귀 발견자', '희귀도 4 이상의 고양이를 발견했어요.'),
  ('hundred-dex', '도감 완성가', '100마리 도감을 완성하면 획득해요.')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description;

create or replace function private.award_badge(
  p_user_id uuid,
  p_badge_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null or p_badge_id is null then
    return;
  end if;

  insert into public.user_badges (user_id, badge_id)
  select p_user_id, p_badge_id
  where exists (
    select 1
    from public.badges
    where id = p_badge_id
  )
  on conflict do nothing;
end;
$$;

create or replace function private.refresh_user_badges(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cat_record_count integer := 0;
  sighting_count integer := 0;
  max_cat_record_count integer := 0;
  collected_cat_count integer := 0;
  cheese_cat_count integer := 0;
  tuxedo_cat_count integer := 0;
  calico_cat_count integer := 0;
  distinct_region_count integer := 0;
  max_region_record_count integer := 0;
  region_precision_count integer := 0;
  spring_record_count integer := 0;
  note_record_count integer := 0;
  verify_comment_count integer := 0;
begin
  if p_user_id is null then
    return;
  end if;

  select count(*)::integer
  into cat_record_count
  from public.cat_encounters
  where user_id = p_user_id;

  select count(*)::integer
  into sighting_count
  from public.cat_sightings
  where reporter_id = p_user_id;

  if cat_record_count >= 1 then
    perform private.award_badge(p_user_id, 'first-cat');
  end if;

  if sighting_count >= 1 then
    perform private.award_badge(p_user_id, 'first-sighting');
  end if;

  select coalesce(max(record_count), 0)::integer
  into max_cat_record_count
  from (
    select cat_id, count(*) as record_count
    from public.cat_encounters
    where user_id = p_user_id
    group by cat_id
  ) cat_records;

  if max_cat_record_count >= 2 then
    perform private.award_badge(p_user_id, 'reunion-friend');
  end if;

  if max_cat_record_count >= 3 then
    perform private.award_badge(p_user_id, 'familiar-friend');
  end if;

  if max_cat_record_count >= 5 then
    perform private.award_badge(p_user_id, 'regular-cat');
  end if;

  if max_cat_record_count >= 10 then
    perform private.award_badge(p_user_id, 'longtime-friend');
  end if;

  if exists (
    select 1
    from public.cat_encounters encounters
    group by encounters.user_id, encounters.cat_id
    having encounters.user_id = p_user_id
       and count(*) >= 2
       and max(encounters.seen_at) - min(encounters.seen_at) >= 30
  ) then
    perform private.award_badge(p_user_id, 'month-later-reunion');
  end if;

  select count(distinct cat_id)::integer
  into collected_cat_count
  from (
    select cat_id
    from public.user_cat_collections
    where user_id = p_user_id
    union
    select cat_id
    from public.cat_encounters
    where user_id = p_user_id
  ) collected;

  if collected_cat_count >= 10 then
    perform private.award_badge(p_user_id, 'dex-10');
  end if;

  if collected_cat_count >= 50 then
    perform private.award_badge(p_user_id, 'dex-50');
  end if;

  if collected_cat_count >= 100 then
    perform private.award_badge(p_user_id, 'hundred-dex');
  end if;

  select count(distinct cats.id)::integer
  into cheese_cat_count
  from public.cats
  where cats.type = '치즈냥'
    and (
      exists (
        select 1
        from public.user_cat_collections collections
        where collections.user_id = p_user_id
          and collections.cat_id = cats.id
      )
      or exists (
        select 1
        from public.cat_encounters encounters
        where encounters.user_id = p_user_id
          and encounters.cat_id = cats.id
      )
    );

  if cheese_cat_count >= 3 then
    perform private.award_badge(p_user_id, 'cheese-collector');
  end if;

  select count(distinct cats.id)::integer
  into tuxedo_cat_count
  from public.cats
  where cats.type = '턱시도'
    and (
      exists (
        select 1
        from public.user_cat_collections collections
        where collections.user_id = p_user_id
          and collections.cat_id = cats.id
      )
      or exists (
        select 1
        from public.cat_encounters encounters
        where encounters.user_id = p_user_id
          and encounters.cat_id = cats.id
      )
    );

  if tuxedo_cat_count >= 3 then
    perform private.award_badge(p_user_id, 'tuxedo-detective');
  end if;

  select count(distinct cats.id)::integer
  into calico_cat_count
  from public.cats
  where cats.type = '삼색이'
    and (
      exists (
        select 1
        from public.user_cat_collections collections
        where collections.user_id = p_user_id
          and collections.cat_id = cats.id
      )
      or exists (
        select 1
        from public.cat_encounters encounters
        where encounters.user_id = p_user_id
          and encounters.cat_id = cats.id
      )
    );

  if calico_cat_count >= 1 then
    perform private.award_badge(p_user_id, 'calico-friend');
  end if;

  if exists (
    select 1
    from public.cats
    where rarity >= 4
      and (
        exists (
          select 1
          from public.user_cat_collections collections
          where collections.user_id = p_user_id
            and collections.cat_id = cats.id
        )
        or exists (
          select 1
          from public.cat_encounters encounters
          where encounters.user_id = p_user_id
            and encounters.cat_id = cats.id
        )
      )
  ) then
    perform private.award_badge(p_user_id, 'rare-finder');
  end if;

  select
    count(distinct region_name)::integer,
    coalesce(max(region_record_count), 0)::integer
  into distinct_region_count, max_region_record_count
  from (
    select region_name, count(*) as region_record_count
    from (
      select trim(region_name) as region_name
      from public.cat_encounters
      where user_id = p_user_id
        and length(trim(region_name)) > 0
      union all
      select trim(region_name) as region_name
      from public.cat_sightings
      where reporter_id = p_user_id
        and length(trim(region_name)) > 0
    ) records
    group by region_name
  ) region_records;

  if distinct_region_count >= 3 then
    perform private.award_badge(p_user_id, 'old-town-wanderer');
  end if;

  if max_region_record_count >= 10 then
    perform private.award_badge(p_user_id, 'neighborhood-regular');
  end if;

  select count(*)::integer
  into region_precision_count
  from public.cat_encounters
  where user_id = p_user_id
    and location_precision = 'region';

  region_precision_count := region_precision_count + sighting_count;

  if region_precision_count >= 10 then
    perform private.award_badge(p_user_id, 'careful-observer');
  end if;

  if exists (
    select 1
    from public.reports
    where reporter_id = p_user_id
      and reason in ('location_risk', 'incorrect_info')
  ) then
    perform private.award_badge(p_user_id, 'safety-reporter');
  end if;

  select count(*)::integer
  into spring_record_count
  from (
    select seen_at as recorded_on
    from public.cat_encounters
    where user_id = p_user_id
    union all
    select sighted_at as recorded_on
    from public.cat_sightings
    where reporter_id = p_user_id
  ) spring_records
  where extract(month from recorded_on) between 3 and 5;

  if spring_record_count >= 3 then
    perform private.award_badge(p_user_id, 'spring-alley-recorder');
  end if;

  if exists (
    select 1
    from public.cat_encounters
    where user_id = p_user_id
      and memo ilike '%비%'
  ) or exists (
    select 1
    from public.cat_sightings
    where reporter_id = p_user_id
      and behavior_hint ilike '%비%'
  ) then
    perform private.award_badge(p_user_id, 'rainy-day-recorder');
  end if;

  if exists (
    select 1
    from public.cat_encounters
    where user_id = p_user_id
      and extract(hour from (created_at at time zone 'Asia/Seoul')) between 18 and 21
  ) or exists (
    select 1
    from public.cat_sightings
    where reporter_id = p_user_id
      and extract(hour from (created_at at time zone 'Asia/Seoul')) between 18 and 21
  ) then
    perform private.award_badge(p_user_id, 'night-walk-watcher');
  end if;

  select count(*)::integer
  into note_record_count
  from (
    select memo as note
    from public.cat_encounters
    where user_id = p_user_id
    union all
    select behavior_hint as note
    from public.cat_sightings
    where reporter_id = p_user_id
  ) notes
  where length(trim(coalesce(note, ''))) >= 4;

  if note_record_count >= 5 then
    perform private.award_badge(p_user_id, 'quiet-note-keeper');
  end if;

  if exists (
    select 1
    from public.featured_cats
    where user_id = p_user_id
  ) then
    perform private.award_badge(p_user_id, 'collection-starter');
  end if;

  if to_regclass('public.community_comments') is not null
     and to_regclass('public.community_posts') is not null then
    execute '
      select count(*)::integer
      from public.community_comments comments
      join public.community_posts posts on posts.id = comments.post_id
      where comments.author_id = $1
        and posts.status = ''ACTIVE''
        and posts.topic = ''VERIFY''
        and posts.author_id <> $1
    '
    into verify_comment_count
    using p_user_id;

    if verify_comment_count >= 3 then
      perform private.award_badge(p_user_id, 'neighbor-verifier');
    end if;
  end if;
end;
$$;

create or replace function private.refresh_user_badges_from_cat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_user_id uuid;
begin
  if tg_op = 'DELETE' then
    for affected_user_id in
      select user_id
      from (
        select old.created_by as user_id
        union
        select old.user_id
        union
        select collections.user_id
        from public.user_cat_collections collections
        where collections.cat_id = old.id
        union
        select encounters.user_id
        from public.cat_encounters encounters
        where encounters.cat_id = old.id
      ) affected
      where user_id is not null
    loop
      perform private.refresh_user_badges(affected_user_id);
    end loop;

    return old;
  end if;

  for affected_user_id in
    select user_id
    from (
      select new.created_by as user_id
      union
      select new.user_id
      union
      select collections.user_id
      from public.user_cat_collections collections
      where collections.cat_id = new.id
      union
      select encounters.user_id
      from public.cat_encounters encounters
      where encounters.cat_id = new.id
    ) affected
    where user_id is not null
  loop
    perform private.refresh_user_badges(affected_user_id);
  end loop;

  return new;
end;
$$;

create or replace function private.refresh_user_badges_from_collection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.refresh_user_badges(old.user_id);
    return old;
  end if;

  perform private.refresh_user_badges(new.user_id);
  return new;
end;
$$;

create or replace function private.refresh_user_badges_from_encounter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.refresh_user_badges(old.user_id);
    return old;
  end if;

  perform private.refresh_user_badges(new.user_id);
  return new;
end;
$$;

create or replace function private.refresh_user_badges_from_sighting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.refresh_user_badges(old.reporter_id);
    return old;
  end if;

  perform private.refresh_user_badges(new.reporter_id);
  return new;
end;
$$;

create or replace function private.refresh_user_badges_from_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.refresh_user_badges(old.reporter_id);
    return old;
  end if;

  perform private.refresh_user_badges(new.reporter_id);
  return new;
end;
$$;

create or replace function private.refresh_user_badges_from_featured_cat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.refresh_user_badges(old.user_id);
    return old;
  end if;

  perform private.refresh_user_badges(new.user_id);
  return new;
end;
$$;

create or replace function private.refresh_user_badges_from_community_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.refresh_user_badges(old.author_id);
    return old;
  end if;

  perform private.refresh_user_badges(new.author_id);
  return new;
end;
$$;

drop trigger if exists cats_award_badges on public.cats;
create trigger cats_award_badges
  after insert or update or delete on public.cats
  for each row execute function private.refresh_user_badges_from_cat();

drop trigger if exists user_cat_collections_award_badges on public.user_cat_collections;
create trigger user_cat_collections_award_badges
  after insert or update or delete on public.user_cat_collections
  for each row execute function private.refresh_user_badges_from_collection();

drop trigger if exists cat_encounters_award_badges on public.cat_encounters;
create trigger cat_encounters_award_badges
  after insert or update on public.cat_encounters
  for each row execute function private.refresh_user_badges_from_encounter();

drop trigger if exists cat_sightings_award_badges on public.cat_sightings;
create trigger cat_sightings_award_badges
  after insert or update on public.cat_sightings
  for each row execute function private.refresh_user_badges_from_sighting();

drop trigger if exists reports_award_badges on public.reports;
create trigger reports_award_badges
  after insert or update on public.reports
  for each row execute function private.refresh_user_badges_from_report();

drop trigger if exists featured_cats_award_badges on public.featured_cats;
create trigger featured_cats_award_badges
  after insert or update or delete on public.featured_cats
  for each row execute function private.refresh_user_badges_from_featured_cat();

do $$
begin
  if to_regclass('public.community_comments') is not null then
    execute 'drop trigger if exists community_comments_award_badges on public.community_comments';
    execute '
      create trigger community_comments_award_badges
        after insert or update or delete on public.community_comments
        for each row execute function private.refresh_user_badges_from_community_comment()
    ';
  end if;
end $$;

do $$
declare
  next_user_id uuid;
begin
  if to_regclass('public.community_comments') is null then
    return;
  end if;

  for next_user_id in
    execute 'select distinct author_id from public.community_comments where author_id is not null'
  loop
    perform private.refresh_user_badges(next_user_id);
  end loop;
end $$;

do $$
declare
  next_user_id uuid;
begin
  for next_user_id in
    select distinct user_id
    from (
      select user_id from public.cat_encounters
      union
      select user_id from public.user_cat_collections
      union
      select reporter_id as user_id from public.cat_sightings
      union
      select reporter_id as user_id from public.reports
      union
      select user_id from public.featured_cats
    ) users
    where user_id is not null
  loop
    perform private.refresh_user_badges(next_user_id);
  end loop;
end $$;
