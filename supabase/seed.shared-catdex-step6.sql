-- Shared Catdex step 6 QA seed.
-- Run manually against a local Supabase database or a disposable QA project.
-- This file creates two deterministic auth users and seeds shared cats whose
-- global catalog state differs from each user's personal collection state.
-- For Expo OAuth simulator QA, replace the A/B UUIDs below with the real
-- Google/Kakao user IDs from auth.users before running the data seed.

begin;

do $$
begin
  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values
    (
      '10000000-0000-0000-0000-0000000000a1',
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'step6-a@example.test',
      crypt('password-a', gen_salt('bf')),
      now(),
      '{"provider":"google","providers":["google"]}'::jsonb,
      '{"nickname":"Step6 A"}'::jsonb,
      now(),
      now()
    ),
    (
      '20000000-0000-0000-0000-0000000000b2',
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'step6-b@example.test',
      crypt('password-b', gen_salt('bf')),
      now(),
      '{"provider":"kakao","providers":["kakao"]}'::jsonb,
      '{"nickname":"Step6 B"}'::jsonb,
      now(),
      now()
    )
  on conflict (id) do update set
    email = excluded.email,
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = now();
end $$;

insert into public.profiles (id, nickname, email, provider)
values
  ('10000000-0000-0000-0000-0000000000a1', 'Step6 A', 'step6-a@example.test', 'google'),
  ('20000000-0000-0000-0000-0000000000b2', 'Step6 B', 'step6-b@example.test', 'kakao')
on conflict (id) do update set
  nickname = excluded.nickname,
  email = excluded.email,
  provider = excluded.provider,
  updated_at = now();

insert into public.regions (id, name, lat, lng, radius)
values
  ('step6-jung-dong', 'Step6 중동 근처', 37.503, 126.766, 350),
  ('step6-sang-dong', 'Step6 상동 근처', 37.506, 126.753, 400)
on conflict (id) do update set
  name = excluded.name,
  lat = excluded.lat,
  lng = excluded.lng,
  radius = excluded.radius;

delete from public.cat_sightings
where id in (
  '90000000-0000-0000-0000-0000000000a1',
  '90000000-0000-0000-0000-0000000000a2'
);

delete from public.cat_encounters
where cat_id in (
  '90000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000002',
  '90000000-0000-0000-0000-000000000003'
);

delete from public.user_cat_collections
where cat_id in (
  '90000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000002',
  '90000000-0000-0000-0000-000000000003'
);

delete from public.cat_regions
where cat_id in (
  '90000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000002',
  '90000000-0000-0000-0000-000000000003'
);

delete from public.region_cats
where cat_id in (
  '90000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000002',
  '90000000-0000-0000-0000-000000000003'
);

delete from public.cat_photos
where cat_id in (
  '90000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000002',
  '90000000-0000-0000-0000-000000000003'
);

delete from public.cats
where id in (
  '90000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000002',
  '90000000-0000-0000-0000-000000000003'
);

insert into public.cats (
  id,
  user_id,
  created_by,
  number,
  name,
  type,
  rarity,
  encounter_count,
  first_seen_at,
  last_seen_at,
  relationship_level,
  tags,
  memo,
  image_url,
  representative_photo_url
)
values
  (
    '90000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-0000000000a1',
    '10000000-0000-0000-0000-0000000000a1',
    901,
    '스텝감자',
    '치즈냥',
    3,
    1,
    current_date - 2,
    current_date - 2,
    public.cat_relationship_level(1),
    array['느긋함'],
    'A만 수집한 공유 고양이',
    null,
    null
  ),
  (
    '90000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-0000000000b2',
    '20000000-0000-0000-0000-0000000000b2',
    902,
    '스텝나비',
    '삼색이',
    4,
    2,
    current_date - 1,
    current_date,
    public.cat_relationship_level(2),
    array['겁많음', '활발함'],
    'A와 B가 모두 수집한 공유 고양이',
    null,
    null
  ),
  (
    '90000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-0000000000b2',
    '20000000-0000-0000-0000-0000000000b2',
    903,
    '스텝후추',
    '턱시도',
    2,
    1,
    current_date,
    current_date,
    public.cat_relationship_level(1),
    array['야간 순찰'],
    'B만 수집한 공유 고양이',
    null,
    null
  );

insert into public.cat_encounters (id, user_id, cat_id, seen_at, region_name, memo, image_url, location_precision, is_public)
values
  (
    '91000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-0000000000a1',
    '90000000-0000-0000-0000-000000000001',
    current_date - 2,
    'Step6 중동 근처',
    'A의 최초 등록',
    null,
    'region',
    true
  ),
  (
    '91000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-0000000000b2',
    '90000000-0000-0000-0000-000000000002',
    current_date - 1,
    'Step6 상동 근처',
    'B의 최초 등록',
    null,
    'region',
    true
  ),
  (
    '91000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-0000000000a1',
    '90000000-0000-0000-0000-000000000002',
    current_date,
    'Step6 중동 근처',
    'A의 재발견',
    null,
    'region',
    true
  ),
  (
    '91000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-0000000000b2',
    '90000000-0000-0000-0000-000000000003',
    current_date,
    'Step6 상동 근처',
    'B 전용 비공개 발견 기록',
    null,
    'region',
    false
  );

insert into public.user_cat_collections (user_id, cat_id, first_collected_at, last_seen_at, encounter_count)
values
  ('10000000-0000-0000-0000-0000000000a1', '90000000-0000-0000-0000-000000000001', current_date - 2, current_date - 2, 1),
  ('10000000-0000-0000-0000-0000000000a1', '90000000-0000-0000-0000-000000000002', current_date, current_date, 1),
  ('20000000-0000-0000-0000-0000000000b2', '90000000-0000-0000-0000-000000000002', current_date - 1, current_date - 1, 1),
  ('20000000-0000-0000-0000-0000000000b2', '90000000-0000-0000-0000-000000000003', current_date, current_date, 1)
on conflict (user_id, cat_id) do update set
  first_collected_at = excluded.first_collected_at,
  last_seen_at = excluded.last_seen_at,
  encounter_count = excluded.encounter_count,
  updated_at = now();

insert into public.region_cats (region_id, cat_id, user_id)
values
  ('step6-jung-dong', '90000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-0000000000a1'),
  ('step6-sang-dong', '90000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-0000000000b2'),
  ('step6-jung-dong', '90000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-0000000000a1'),
  ('step6-sang-dong', '90000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-0000000000b2')
on conflict do nothing;

insert into public.cat_regions (region_id, cat_id, first_seen_at, last_seen_at, encounter_count)
values
  ('step6-jung-dong', '90000000-0000-0000-0000-000000000001', current_date - 2, current_date - 2, 1),
  ('step6-sang-dong', '90000000-0000-0000-0000-000000000002', current_date - 1, current_date - 1, 1),
  ('step6-jung-dong', '90000000-0000-0000-0000-000000000002', current_date, current_date, 1),
  ('step6-sang-dong', '90000000-0000-0000-0000-000000000003', current_date, current_date, 1)
on conflict (region_id, cat_id) do update set
  first_seen_at = excluded.first_seen_at,
  last_seen_at = excluded.last_seen_at,
  encounter_count = excluded.encounter_count,
  updated_at = now();

insert into public.cat_sightings (id, reporter_id, region_name, coat_type, behavior_hint, image_url, status, sighted_at)
values
  (
    '90000000-0000-0000-0000-0000000000a1',
    '10000000-0000-0000-0000-0000000000a1',
    'Step6 중동 근처',
    '흰냥',
    '화단 근처에서 자주 보여요.',
    null,
    'open',
    current_date
  ),
  (
    '90000000-0000-0000-0000-0000000000a2',
    '20000000-0000-0000-0000-0000000000b2',
    'Step6 상동 근처',
    '검은냥',
    '저녁 이후에 상가 앞을 지나가요.',
    null,
    'open',
    current_date
  )
on conflict (id) do update set
  reporter_id = excluded.reporter_id,
  region_name = excluded.region_name,
  coat_type = excluded.coat_type,
  behavior_hint = excluded.behavior_hint,
  status = excluded.status,
  sighted_at = excluded.sighted_at,
  updated_at = now();

commit;
