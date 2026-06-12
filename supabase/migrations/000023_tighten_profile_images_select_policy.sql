-- Tighten profile image Storage SELECT policy.
--
-- Why the advisor warns:
-- - `profile-images` is a public bucket.
-- - Public bucket object URLs are served from the bucket public flag.
-- - The previous `profile_images_select_public` policy allowed anon and
--   authenticated clients to SELECT every `storage.objects` row in the bucket,
--   which also allowed full bucket listing.
--
-- Intended access model:
-- - Existing public image URLs keep working because the bucket remains public.
-- - Anonymous users cannot list `profile-images` objects through Storage APIs.
-- - Signed-in users can still SELECT their own profile image objects, which
--   preserves owner-scoped SDK behavior needed by Storage update/upsert flows.
-- - Users cannot SELECT or list another user's profile image object metadata.

do $$
begin
  if not exists (
    select 1
    from storage.buckets
    where id = 'profile-images'
  ) then
    raise exception 'storage bucket "profile-images" does not exist';
  end if;
end $$;

update storage.buckets
set public = true
where id = 'profile-images'
  and public is distinct from true;

drop policy if exists "profile_images_select_public" on storage.objects;
drop policy if exists "profile_images_select_own" on storage.objects;

create policy "profile_images_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'profile-images'
    and owner = (select auth.uid())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
