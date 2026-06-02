-- Nyangkkureomi A/B QA seed.
-- Run manually against a local Supabase database or a disposable QA project.
-- This file creates one free user and one nyangkkureomi user with the same
-- shared catdex baseline, then diverges collection customization state.
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
      '30000000-0000-0000-0000-0000000000f1',
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'nyang-free@example.test',
      crypt('password-free', gen_salt('bf')),
      now(),
      '{"provider":"google","providers":["google"]}'::jsonb,
      '{"nickname":"냥꾸 무료"}'::jsonb,
      now(),
      now()
    ),
    (
      '40000000-0000-0000-0000-0000000000b2',
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'nyang-paid@example.test',
      crypt('password-paid', gen_salt('bf')),
      now(),
      '{"provider":"kakao","providers":["kakao"]}'::jsonb,
      '{"nickname":"냥꾸 구독"}'::jsonb,
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
  ('30000000-0000-0000-0000-0000000000f1', '냥꾸 무료', 'nyang-free@example.test', 'google'),
  ('40000000-0000-0000-0000-0000000000b2', '냥꾸 구독', 'nyang-paid@example.test', 'kakao')
on conflict (id) do update set
  nickname = excluded.nickname,
  email = excluded.email,
  provider = excluded.provider,
  updated_at = now();

insert into public.regions (id, name, lat, lng, radius)
values
  ('nyang-ab-gil', '냥꾸 A/B 골목 근처', 37.503, 126.766, 350),
  ('nyang-ab-park', '냥꾸 A/B 공원 근처', 37.506, 126.753, 400)
on conflict (id) do update set
  name = excluded.name,
  lat = excluded.lat,
  lng = excluded.lng,
  radius = excluded.radius;

delete from public.featured_cats
where user_id in (
  '30000000-0000-0000-0000-0000000000f1',
  '40000000-0000-0000-0000-0000000000b2'
);

delete from public.collection_likes
where owner_id in (
  '30000000-0000-0000-0000-0000000000f1',
  '40000000-0000-0000-0000-0000000000b2'
)
or liked_by in (
  '30000000-0000-0000-0000-0000000000f1',
  '40000000-0000-0000-0000-0000000000b2'
);

delete from public.collection_follows
where followed_id in (
  '30000000-0000-0000-0000-0000000000f1',
  '40000000-0000-0000-0000-0000000000b2'
)
or follower_id in (
  '30000000-0000-0000-0000-0000000000f1',
  '40000000-0000-0000-0000-0000000000b2'
);

delete from public.user_season_stamps
where user_id in (
  '30000000-0000-0000-0000-0000000000f1',
  '40000000-0000-0000-0000-0000000000b2'
);

delete from public.user_badges
where user_id in (
  '30000000-0000-0000-0000-0000000000f1',
  '40000000-0000-0000-0000-0000000000b2'
);

delete from public.collection_profiles
where user_id in (
  '30000000-0000-0000-0000-0000000000f1',
  '40000000-0000-0000-0000-0000000000b2'
);

delete from public.user_entitlements
where user_id in (
  '30000000-0000-0000-0000-0000000000f1',
  '40000000-0000-0000-0000-0000000000b2'
);

delete from public.cat_encounters
where cat_id in (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004'
);

delete from public.user_cat_collections
where cat_id in (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004'
);

delete from public.cat_regions
where cat_id in (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004'
);

delete from public.region_cats
where cat_id in (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004'
);

delete from public.cat_photos
where cat_id in (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004'
);

delete from public.cats
where id in (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004'
);

insert into public.user_entitlements (user_id, tier, status, source, current_period_ends_at)
values
  ('30000000-0000-0000-0000-0000000000f1', 'free', 'active', 'manual', null),
  ('40000000-0000-0000-0000-0000000000b2', 'nyangkkureomi', 'active', 'manual', now() + interval '30 days')
on conflict (user_id) do update set
  tier = excluded.tier,
  status = excluded.status,
  source = excluded.source,
  current_period_ends_at = excluded.current_period_ends_at,
  updated_at = now();

insert into public.season_stamps (id, name, description, season_key, starts_on, ends_on, is_premium, sort_order)
values
  (
    'nyang-ab-premium-spring-2026',
    '봄 서랍 프리미엄 냥발 도장',
    '냥꾸러미 A/B 검증용 현재 시즌 프리미엄 도장',
    '2026-spring',
    date '2026-03-01',
    date '2026-05-31',
    true,
    15
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  season_key = excluded.season_key,
  starts_on = excluded.starts_on,
  ends_on = excluded.ends_on,
  is_premium = excluded.is_premium,
  sort_order = excluded.sort_order;

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
    'a0000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-0000000000f1',
    '30000000-0000-0000-0000-0000000000f1',
    951,
    '서랍감자',
    '치즈냥',
    3,
    2,
    current_date - 9,
    current_date - 1,
    public.cat_relationship_level(2),
    array['느긋함', '단골'],
    '무료/구독 모두 수집한 대표 후보',
    null,
    null
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-0000000000b2',
    '40000000-0000-0000-0000-0000000000b2',
    952,
    '서랍나비',
    '삼색이',
    4,
    2,
    current_date - 6,
    current_date,
    public.cat_relationship_level(2),
    array['활발함'],
    '구독 사용자의 두 번째 주인공 후보',
    null,
    null
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    '40000000-0000-0000-0000-0000000000b2',
    '40000000-0000-0000-0000-0000000000b2',
    953,
    '서랍후추',
    '턱시도',
    2,
    1,
    current_date - 2,
    current_date - 2,
    public.cat_relationship_level(1),
    array['야간 순찰'],
    '구독 사용자의 세 번째 주인공 후보',
    null,
    null
  ),
  (
    'a0000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-0000000000f1',
    '30000000-0000-0000-0000-0000000000f1',
    954,
    '서랍구름',
    '흰냥',
    3,
    1,
    current_date - 1,
    current_date - 1,
    public.cat_relationship_level(1),
    array['조심스러움'],
    '무료 사용자가 수집했지만 대표로 선택하지 않은 후보',
    null,
    null
  );

insert into public.cat_encounters (id, user_id, cat_id, seen_at, region_name, memo, image_url, location_precision, is_public)
values
  (
    'b0000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-0000000000f1',
    'a0000000-0000-0000-0000-000000000001',
    current_date - 9,
    '냥꾸 A/B 골목 근처',
    '무료 사용자의 첫 만남',
    null,
    'region',
    true
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-0000000000b2',
    'a0000000-0000-0000-0000-000000000001',
    current_date - 1,
    '냥꾸 A/B 골목 근처',
    '구독 사용자의 재발견',
    null,
    'region',
    true
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    '40000000-0000-0000-0000-0000000000b2',
    'a0000000-0000-0000-0000-000000000002',
    current_date - 6,
    '냥꾸 A/B 공원 근처',
    '구독 사용자의 두 번째 주인공',
    null,
    'region',
    true
  ),
  (
    'b0000000-0000-0000-0000-000000000004',
    '40000000-0000-0000-0000-0000000000b2',
    'a0000000-0000-0000-0000-000000000003',
    current_date - 2,
    '냥꾸 A/B 공원 근처',
    '구독 사용자의 세 번째 주인공',
    null,
    'region',
    true
  ),
  (
    'b0000000-0000-0000-0000-000000000005',
    '30000000-0000-0000-0000-0000000000f1',
    'a0000000-0000-0000-0000-000000000004',
    current_date - 1,
    '냥꾸 A/B 골목 근처',
    '무료 사용자의 추가 수집',
    null,
    'region',
    true
  );

insert into public.user_cat_collections (user_id, cat_id, first_collected_at, last_seen_at, encounter_count)
values
  ('30000000-0000-0000-0000-0000000000f1', 'a0000000-0000-0000-0000-000000000001', current_date - 9, current_date - 9, 1),
  ('30000000-0000-0000-0000-0000000000f1', 'a0000000-0000-0000-0000-000000000004', current_date - 1, current_date - 1, 1),
  ('40000000-0000-0000-0000-0000000000b2', 'a0000000-0000-0000-0000-000000000001', current_date - 1, current_date - 1, 1),
  ('40000000-0000-0000-0000-0000000000b2', 'a0000000-0000-0000-0000-000000000002', current_date - 6, current_date - 6, 1),
  ('40000000-0000-0000-0000-0000000000b2', 'a0000000-0000-0000-0000-000000000003', current_date - 2, current_date - 2, 1)
on conflict (user_id, cat_id) do update set
  first_collected_at = excluded.first_collected_at,
  last_seen_at = excluded.last_seen_at,
  encounter_count = excluded.encounter_count,
  updated_at = now();

insert into public.region_cats (region_id, cat_id, user_id)
values
  ('nyang-ab-gil', 'a0000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-0000000000f1'),
  ('nyang-ab-gil', 'a0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-0000000000b2'),
  ('nyang-ab-park', 'a0000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-0000000000b2'),
  ('nyang-ab-park', 'a0000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-0000000000b2'),
  ('nyang-ab-gil', 'a0000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-0000000000f1')
on conflict do nothing;

insert into public.cat_regions (region_id, cat_id, first_seen_at, last_seen_at, encounter_count)
values
  ('nyang-ab-gil', 'a0000000-0000-0000-0000-000000000001', current_date - 9, current_date - 1, 2),
  ('nyang-ab-park', 'a0000000-0000-0000-0000-000000000002', current_date - 6, current_date - 6, 1),
  ('nyang-ab-park', 'a0000000-0000-0000-0000-000000000003', current_date - 2, current_date - 2, 1),
  ('nyang-ab-gil', 'a0000000-0000-0000-0000-000000000004', current_date - 1, current_date - 1, 1)
on conflict (region_id, cat_id) do update set
  first_seen_at = excluded.first_seen_at,
  last_seen_at = excluded.last_seen_at,
  encounter_count = excluded.encounter_count,
  updated_at = now();

insert into public.user_badges (user_id, badge_id, achieved_at)
values
  ('30000000-0000-0000-0000-0000000000f1', 'first-cat', current_date - 9),
  ('30000000-0000-0000-0000-0000000000f1', 'regular-cat', current_date - 1),
  ('40000000-0000-0000-0000-0000000000b2', 'first-cat', current_date - 6),
  ('40000000-0000-0000-0000-0000000000b2', 'regular-cat', current_date - 3),
  ('40000000-0000-0000-0000-0000000000b2', 'cheese-collector', current_date - 1),
  ('40000000-0000-0000-0000-0000000000b2', 'winter-recorder', current_date)
on conflict (user_id, badge_id) do update set
  achieved_at = excluded.achieved_at;

insert into public.user_season_stamps (user_id, stamp_id, achieved_at)
values
  ('30000000-0000-0000-0000-0000000000f1', 'spring-walk-2026', current_date - 10),
  ('40000000-0000-0000-0000-0000000000b2', 'spring-walk-2026', current_date - 10),
  ('40000000-0000-0000-0000-0000000000b2', 'nyang-ab-premium-spring-2026', current_date)
on conflict (user_id, stamp_id) do update set
  achieved_at = excluded.achieved_at;

insert into public.collection_profiles (user_id, cover_theme_id, display_title, intro, selected_badge_ids, selected_stamp_ids)
values
  (
    '30000000-0000-0000-0000-0000000000f1',
    'field-note',
    '무료 서랍 냥도감',
    '기본 표지와 대표 고양이 1마리로 꾸민 도감',
    array['first-cat', 'regular-cat'],
    array['spring-walk-2026']
  ),
  (
    '40000000-0000-0000-0000-0000000000b2',
    'prague-rooftop',
    '냥꾸러미 서랍 도감',
    '프리미엄 표지와 주인공 3마리를 진열한 도감',
    array['first-cat', 'regular-cat', 'cheese-collector', 'winter-recorder'],
    array['spring-walk-2026', 'nyang-ab-premium-spring-2026']
  )
on conflict (user_id) do update set
  cover_theme_id = excluded.cover_theme_id,
  display_title = excluded.display_title,
  intro = excluded.intro,
  selected_badge_ids = excluded.selected_badge_ids,
  selected_stamp_ids = excluded.selected_stamp_ids,
  updated_at = now();

insert into public.featured_cats (user_id, slot, cat_id, caption)
values
  ('30000000-0000-0000-0000-0000000000f1', 1, 'a0000000-0000-0000-0000-000000000001', '무료 사용자는 주인공 1마리'),
  ('40000000-0000-0000-0000-0000000000b2', 1, 'a0000000-0000-0000-0000-000000000001', '공유 고양이 주인공'),
  ('40000000-0000-0000-0000-0000000000b2', 2, 'a0000000-0000-0000-0000-000000000002', '구독 슬롯 2'),
  ('40000000-0000-0000-0000-0000000000b2', 3, 'a0000000-0000-0000-0000-000000000003', '구독 슬롯 3')
on conflict (user_id, slot) do update set
  cat_id = excluded.cat_id,
  caption = excluded.caption,
  updated_at = now();

commit;
