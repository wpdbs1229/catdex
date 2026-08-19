-- 가입 순간에는 제공자 프로필을 받아쓰지 않는다.
--
-- 지금까지 handle_new_user()는 카카오·Google이 준 이름(실명)과 프로필 사진을
-- 그대로 profiles에 넣었다. 그래서 사원증 만들기 화면을 거치기도 전에
-- 실명과 카카오 프로필 사진이 앱에 노출됐다.
--
-- 사원증에 실릴 값은 upsert_own_profile()로만 들어와야 한다. 여기서는
-- 자리만 만들어 두고 닉네임은 기본값, 사진은 비운다.

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
    '냥도감 탐험가',
    new.email,
    next_provider,
    null
  )
  on conflict (id) do update set
    email = excluded.email,
    provider = excluded.provider,
    updated_at = now();

  return new;
end;
$function$;
