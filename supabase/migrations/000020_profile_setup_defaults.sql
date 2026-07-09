alter table public.profiles
  alter column nickname set default '골목기록가';

create or replace function private.handle_new_user()
returns trigger
set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname, email, provider, profile_image_url)
  values (
    new.id,
    '골목기록가',
    new.email,
    case
      when new.raw_app_meta_data->>'provider' in ('kakao', 'google') then new.raw_app_meta_data->>'provider'
      else 'kakao'
    end,
    null
  )
  on conflict (id) do update set
    email = excluded.email,
    provider = excluded.provider,
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer;
