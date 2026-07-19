-- 동일 개체 데이터 정정 도구
--
-- 1) remove_my_cat_encounter: 사용자가 잘못 연결한 "내 만남 기록"을 직접
--    분리(삭제)한다. 수집/구역/개체 통계를 모두 재계산하고, 마지막 기록이
--    사라진 개체는 함께 정리한다.
-- 2) private.merge_cats: 중복 등록된 두 개체를 운영자가 병합한다.
--    private 스키마라 PostgREST로 노출되지 않으며 service_role(SQL 콘솔)
--    전용이다.
-- 3) private.cat_record_actions: 두 작업 모두 감사 로그를 남긴다.

-- 감사 로그 ------------------------------------------------------------------

create table if not exists private.cat_record_actions (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('remove_encounter', 'merge_cats')),
  actor_id uuid,
  cat_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

revoke all on table private.cat_record_actions from public, anon, authenticated;

-- 통계 재계산 헬퍼 ------------------------------------------------------------

create or replace function private.recalculate_cat_stats(p_cat_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_first date;
  v_last date;
begin
  select count(*), min(seen_at), max(seen_at)
  into v_count, v_first, v_last
  from public.cat_encounters
  where cat_id = p_cat_id;

  if coalesce(v_count, 0) = 0 then
    -- 만남이 없는 개체의 삭제 여부는 호출자가 결정한다.
    return;
  end if;

  update public.cats
  set
    encounter_count = v_count,
    first_seen_at = v_first,
    last_seen_at = v_last,
    relationship_level = public.cat_relationship_level(v_count)
  where id = p_cat_id;
end;
$$;

revoke all on function private.recalculate_cat_stats(uuid) from public, anon, authenticated;

-- 1) 내 만남 기록 분리 --------------------------------------------------------

create or replace function public.remove_my_cat_encounter(p_encounter_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  enc public.cat_encounters;
  my_count integer;
  my_first date;
  my_last date;
  region_count integer;
  region_first date;
  region_last date;
  target_region_id text;
  global_count integer;
  fallback_photo_url text;
  cat_removed boolean := false;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select encounters.*
  into enc
  from public.cat_encounters encounters
  where encounters.id = p_encounter_id;

  if not found then
    raise exception '만남 기록을 찾을 수 없어요' using errcode = 'P0002';
  end if;

  if enc.user_id <> current_user_id then
    raise exception '본인의 만남 기록만 분리할 수 있어요' using errcode = '42501';
  end if;

  -- 이 만남에 연결된 내 사진 행 제거
  delete from public.cat_photos
  where encounter_id = enc.id
    and uploaded_by = current_user_id;

  delete from public.cat_encounters where id = enc.id;

  -- 내 수집 통계 재계산
  select count(*), min(seen_at), max(seen_at)
  into my_count, my_first, my_last
  from public.cat_encounters
  where cat_id = enc.cat_id
    and user_id = current_user_id;

  if coalesce(my_count, 0) = 0 then
    delete from public.user_cat_collections
    where user_id = current_user_id
      and cat_id = enc.cat_id;
  else
    update public.user_cat_collections
    set
      encounter_count = my_count,
      first_collected_at = my_first,
      last_seen_at = my_last,
      updated_at = now()
    where user_id = current_user_id
      and cat_id = enc.cat_id;
  end if;

  -- 구역 통계 재계산 (만남의 동네 이름 기준)
  select regions.id
  into target_region_id
  from public.regions regions
  where regions.name = enc.region_name;

  if target_region_id is not null then
    select count(*), min(seen_at), max(seen_at)
    into region_count, region_first, region_last
    from public.cat_encounters
    where cat_id = enc.cat_id
      and region_name = enc.region_name;

    if coalesce(region_count, 0) = 0 then
      delete from public.cat_regions
      where region_id = target_region_id
        and cat_id = enc.cat_id;
    else
      update public.cat_regions
      set
        encounter_count = region_count,
        first_seen_at = region_first,
        last_seen_at = region_last,
        updated_at = now()
      where region_id = target_region_id
        and cat_id = enc.cat_id;
    end if;
  end if;

  -- 개체 전체 통계
  select count(*)
  into global_count
  from public.cat_encounters
  where cat_id = enc.cat_id;

  if global_count = 0 then
    -- 마지막 기록이 사라진 개체는 함께 정리한다.
    -- (게시글·목격·관찰의 참조는 FK가 set null로 정리한다.)
    delete from public.cats where id = enc.cat_id;
    cat_removed := true;
  else
    perform private.recalculate_cat_stats(enc.cat_id);

    -- 지운 만남의 사진이 대표 사진이었다면 남은 사진으로 교체한다.
    if enc.image_url is not null then
      select photos.image_url
      into fallback_photo_url
      from public.cat_photos photos
      where photos.cat_id = enc.cat_id
      order by photos.is_representative desc, photos.created_at desc
      limit 1;

      update public.cats
      set
        representative_photo_url = case
          when representative_photo_url = enc.image_url then fallback_photo_url
          else representative_photo_url
        end,
        image_url = case
          when image_url = enc.image_url then fallback_photo_url
          else image_url
        end
      where id = enc.cat_id
        and (representative_photo_url = enc.image_url or image_url = enc.image_url);
    end if;
  end if;

  insert into private.cat_record_actions (action, actor_id, cat_id, payload)
  values (
    'remove_encounter',
    current_user_id,
    enc.cat_id,
    jsonb_build_object(
      'encounterId', enc.id,
      'seenAt', enc.seen_at,
      'regionName', enc.region_name,
      'catRemoved', cat_removed
    )
  );

  return jsonb_build_object(
    'catRemoved', cat_removed,
    'myRemainingCount', coalesce(my_count, 0)
  );
end;
$$;

revoke all on function public.remove_my_cat_encounter(uuid) from public, anon;
grant execute on function public.remove_my_cat_encounter(uuid) to authenticated;

-- 2) 운영자 개체 병합 ---------------------------------------------------------

create or replace function private.merge_cats(
  p_source_cat_id uuid,
  p_target_cat_id uuid,
  p_memo text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_cat public.cats;
  target_cat public.cats;
  moved_encounters integer;
  moved_photos integer;
begin
  if p_source_cat_id is null or p_target_cat_id is null then
    raise exception '병합할 개체 두 마리를 지정해 주세요' using errcode = '22023';
  end if;

  if p_source_cat_id = p_target_cat_id then
    raise exception '같은 개체는 병합할 수 없어요' using errcode = '22023';
  end if;

  select cats.* into source_cat from public.cats cats where cats.id = p_source_cat_id;
  if not found then
    raise exception '원본 개체를 찾을 수 없어요: %', p_source_cat_id using errcode = 'P0002';
  end if;

  select cats.* into target_cat from public.cats cats where cats.id = p_target_cat_id;
  if not found then
    raise exception '대상 개체를 찾을 수 없어요: %', p_target_cat_id using errcode = 'P0002';
  end if;

  -- 만남·사진 이관
  update public.cat_encounters set cat_id = p_target_cat_id where cat_id = p_source_cat_id;
  get diagnostics moved_encounters = row_count;

  update public.cat_photos set cat_id = p_target_cat_id where cat_id = p_source_cat_id;
  get diagnostics moved_photos = row_count;

  -- 사용자별 수집 병합 (합산)
  insert into public.user_cat_collections (user_id, cat_id, first_collected_at, last_seen_at, encounter_count)
  select user_id, p_target_cat_id, first_collected_at, last_seen_at, encounter_count
  from public.user_cat_collections
  where cat_id = p_source_cat_id
  on conflict (user_id, cat_id) do update set
    first_collected_at = least(public.user_cat_collections.first_collected_at, excluded.first_collected_at),
    last_seen_at = greatest(public.user_cat_collections.last_seen_at, excluded.last_seen_at),
    encounter_count = public.user_cat_collections.encounter_count + excluded.encounter_count,
    updated_at = now();

  delete from public.user_cat_collections where cat_id = p_source_cat_id;

  -- 구역 통계 병합 (합산)
  insert into public.cat_regions (region_id, cat_id, first_seen_at, last_seen_at, encounter_count)
  select region_id, p_target_cat_id, first_seen_at, last_seen_at, encounter_count
  from public.cat_regions
  where cat_id = p_source_cat_id
  on conflict (region_id, cat_id) do update set
    first_seen_at = least(public.cat_regions.first_seen_at, excluded.first_seen_at),
    last_seen_at = greatest(public.cat_regions.last_seen_at, excluded.last_seen_at),
    encounter_count = public.cat_regions.encounter_count + excluded.encounter_count,
    updated_at = now();

  delete from public.cat_regions where cat_id = p_source_cat_id;

  -- 대표 고양이: 이미 대상 개체를 대표로 둔 사용자의 원본 슬롯은 정리
  delete from public.featured_cats source_slots
  where source_slots.cat_id = p_source_cat_id
    and exists (
      select 1
      from public.featured_cats target_slots
      where target_slots.user_id = source_slots.user_id
        and target_slots.cat_id = p_target_cat_id
    );

  update public.featured_cats set cat_id = p_target_cat_id, updated_at = now() where cat_id = p_source_cat_id;

  -- 참조 이관
  update public.community_posts set cat_id = p_target_cat_id where cat_id = p_source_cat_id;
  update public.cat_sightings set matched_cat_id = p_target_cat_id where matched_cat_id = p_source_cat_id;
  update public.cat_observations set resolved_cat_id = p_target_cat_id where resolved_cat_id = p_source_cat_id;
  update public.reports set cat_id = p_target_cat_id where cat_id = p_source_cat_id;

  -- 원본을 가리키는 미확정 후보는 의미가 없으므로 제거
  delete from public.cat_match_candidates where cat_id = p_source_cat_id;

  -- 대상에 사진이 없으면 원본 사진으로 보강
  update public.cats
  set
    representative_photo_url = coalesce(representative_photo_url, source_cat.representative_photo_url),
    image_url = coalesce(image_url, source_cat.image_url)
  where id = p_target_cat_id;

  delete from public.cats where id = p_source_cat_id;

  perform private.recalculate_cat_stats(p_target_cat_id);

  insert into private.cat_record_actions (action, actor_id, cat_id, payload)
  values (
    'merge_cats',
    null,
    p_target_cat_id,
    jsonb_build_object(
      'sourceCatId', p_source_cat_id,
      'sourceCatName', source_cat.name,
      'targetCatName', target_cat.name,
      'movedEncounters', moved_encounters,
      'movedPhotos', moved_photos,
      'memo', coalesce(p_memo, '')
    )
  );

  return jsonb_build_object(
    'sourceCatId', p_source_cat_id,
    'targetCatId', p_target_cat_id,
    'movedEncounters', moved_encounters,
    'movedPhotos', moved_photos
  );
end;
$$;

revoke all on function private.merge_cats(uuid, uuid, text) from public, anon, authenticated;
