create or replace function public.upsert_own_profile(
  p_nickname text,
  p_profile_image_url text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
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

  if v_provider not in ('kakao', 'google') then
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
$$;

revoke all on function public.upsert_own_profile(text, text) from public;
revoke execute on function public.upsert_own_profile(text, text) from anon;
grant execute on function public.upsert_own_profile(text, text) to authenticated;
