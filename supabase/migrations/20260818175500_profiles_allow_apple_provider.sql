-- Apple 로그인을 provider로 인정한다.
--
-- 로그인 화면은 카카오·Google·Apple 세 개를 내주지만, 서버는 세 군데에서
-- provider 목록을 따로 들고 있어 Apple로 들어온 사람을 받아내지 못했다.
--
--   1) profiles_provider_check      → insert 자체가 막힌다
--   2) private.handle_new_user()    → 가입 순간 'guest'로 떨어진다
--   3) public.upsert_own_profile()  → 사원증을 만들 때 'kakao'로 덮어쓴다
--
-- 셋을 한꺼번에 열어야 의미가 있다. 하나라도 남으면 Apple 사용자는
-- 다른 제공자로 기록된 채로 남는다.

alter table public.profiles drop constraint if exists profiles_provider_check;
alter table public.profiles add constraint profiles_provider_check
  check (provider = any (array['kakao'::text, 'google'::text, 'apple'::text, 'guest'::text]));

create or replace function private.handle_new_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  next_provider text;
begin
  next_provider := case
    when new.is_anonymous then 'guest'
    when new.raw_app_meta_data->>'provider' in ('kakao', 'google', 'apple', 'guest') then new.raw_app_meta_data->>'provider'
    else 'guest'
  end;

  insert into public.profiles (id, nickname, email, provider, profile_image_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nickname', new.raw_user_meta_data->>'name', '냥도감 탐험가'),
    new.email,
    next_provider,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do update set
    nickname = excluded.nickname,
    email = excluded.email,
    provider = excluded.provider,
    profile_image_url = excluded.profile_image_url,
    updated_at = now();

  return new;
end;
$function$;

create or replace function public.upsert_own_profile(p_nickname text, p_profile_image_url text default null::text)
 returns void
 language plpgsql
 set search_path to ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_email text := nullif((select auth.jwt())->>'email', '');
  v_provider text := (select auth.jwt())->'app_metadata'->>'provider';
  v_nickname text := trim(coalesce(p_nickname, ''));
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if char_length(v_nickname) < 2 or char_length(v_nickname) > 20 then
    raise exception 'Nickname must be between 2 and 20 characters.' using errcode = '22023';
  end if;

  if v_provider not in ('kakao', 'google', 'apple') then
    v_provider := 'kakao';
  end if;

  update public.profiles
  set nickname = v_nickname,
      email = v_email,
      provider = v_provider,
      profile_image_url = p_profile_image_url
  where id = v_user_id;

  if not found then
    insert into public.profiles (
      id,
      nickname,
      email,
      provider,
      profile_image_url
    )
    values (
      v_user_id,
      v_nickname,
      v_email,
      v_provider,
      p_profile_image_url
    );
  end if;
end;
$function$;
