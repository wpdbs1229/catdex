create or replace function private.validate_featured_cat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.user_cat_collections
    where user_id = new.user_id
      and cat_id = new.cat_id
  ) then
    raise exception '내 도감에 수집한 고양이만 대표로 설정할 수 있습니다.' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_featured_cat() from public, anon, authenticated;

drop trigger if exists featured_cats_validate on public.featured_cats;
create trigger featured_cats_validate
  before insert or update on public.featured_cats
  for each row execute function private.validate_featured_cat();

drop function if exists private.user_has_nyangkkureomi(uuid);
drop table if exists public.user_entitlements;
