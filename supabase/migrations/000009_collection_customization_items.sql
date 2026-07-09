insert into public.collection_themes (id, name, description, palette, sort_order) values
  ('spring-flower-alley', '봄꽃 골목', '꽃잎이 흩날리는 계절별 감성 표지', 'spring', 30),
  ('summer-awning-shade', '여름 처마 그늘', '뜨거운 햇빛을 피해 쉬는 여름 골목 표지', 'summer', 40),
  ('storybook-forest-path', '손그림 숲길', '따뜻한 손그림 판타지 감성 표지', 'storybook', 140),
  ('pastel-paw-drawer', '파스텔 발자국', '아기자기한 스티커와 발자국을 담은 표지', 'pastel', 150),
  ('prague-rooftop', '프라하 지붕', '붉은 지붕과 작은 광장이 떠오르는 중유럽 감성 표지', 'europe', 160),
  ('moonlight-lamp-alley', '달빛 골목', '가로등 아래 조용히 빛나는 밤 산책 표지', 'moon', 170)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  palette = excluded.palette,
  sort_order = excluded.sort_order;

insert into public.badges (id, name, description) values
  ('rainy-day-recorder', '비 오는 날 기록자', '빗소리 나는 날에도 고양이를 기록했어요.'),
  ('night-walk-watcher', '밤 산책 관찰자', '밤 골목에서 만난 고양이를 기록했어요.'),
  ('tuxedo-detective', '턱시도냥 탐정', '턱시도냥 친구들을 꾸준히 만났어요.'),
  ('calico-friend', '삼색 친구', '삼색이 친구를 도감에 남겼어요.'),
  ('tiny-paw-keeper', '작은 발자국 보관자', '짧은 만남도 소중히 기록했어요.'),
  ('old-town-wanderer', '오래된 골목 산책자', '여러 동네 골목을 꾸준히 탐험했어요.')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description;

insert into public.season_stamps (id, name, description, season_key, starts_on, ends_on, sort_order) values
  ('rainy-day-2026', '비 오는 날 냥발 도장', '비 오는 골목에서 만난 순간을 남겨요.', '2026-rainy', date '2026-06-01', date '2026-07-15', 25),
  ('flower-road-2026', '꽃길 냥발 도장', '꽃잎 사이로 지나간 발자국을 모아요.', '2026-spring', date '2026-03-01', date '2026-05-31', 35),
  ('moon-patrol-2026', '달밤 순찰 냥발 도장', '달빛 아래 만난 고양이를 기억해요.', '2026-autumn', date '2026-09-01', date '2026-11-30', 45),
  ('old-square-2026', '작은 광장 냥발 도장', '중유럽 감성의 작은 광장 산책 기록이에요.', '2026-winter', date '2026-12-01', date '2027-02-28', 50)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  season_key = excluded.season_key,
  starts_on = excluded.starts_on,
  ends_on = excluded.ends_on,
  sort_order = excluded.sort_order;

create or replace function private.validate_collection_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_badge_count integer;
begin
  if not exists (
    select 1
    from public.collection_themes
    where id = new.cover_theme_id
  ) then
    raise exception 'Collection theme not found' using errcode = 'P0002';
  end if;

  selected_badge_count := coalesce(array_length(new.selected_badge_ids, 1), 0);

  if selected_badge_count > 0 and exists (
    select 1
    from unnest(new.selected_badge_ids) as selected_badge_id
    where not exists (
      select 1
      from public.user_badges
      where user_id = new.user_id
        and badge_id = selected_badge_id
    )
  ) then
    raise exception '획득한 골목 배지만 도감에 진열할 수 있습니다.' using errcode = '42501';
  end if;

  if selected_badge_count > 4 then
    raise exception '골목 배지는 최대 4개까지 진열할 수 있습니다.' using errcode = '22023';
  end if;

  return new;
end;
$$;
