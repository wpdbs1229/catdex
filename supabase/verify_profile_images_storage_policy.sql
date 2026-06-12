select
  'profile_images_bucket_public' as check_name,
  coalesce(bool_or(public), false) as passed,
  coalesce(array_agg(id), '{}') as details
from storage.buckets
where id = 'profile-images';

select
  'profile_images_select_public_removed' as check_name,
  count(*) = 0 as passed,
  coalesce(array_agg(policyname), '{}') as details
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname = 'profile_images_select_public';

select
  'profile_images_anon_select_absent' as check_name,
  count(*) = 0 as passed,
  coalesce(array_agg(policyname), '{}') as details
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and cmd = 'SELECT'
  and 'anon' = any(roles)
  and qual like '%profile-images%';

select
  'profile_images_select_own_present' as check_name,
  count(*) = 1 as passed,
  coalesce(array_agg(policyname || ': ' || qual), '{}') as details
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname = 'profile_images_select_own'
  and cmd = 'SELECT'
  and 'authenticated' = any(roles)
  and qual like '%profile-images%'
  and qual like '%owner%'
  and qual like '%storage.foldername%';

begin;
set local role anon;

select
  'anon_cannot_select_profile_images_objects' as check_name,
  count(*) = 0 as passed,
  array[count(*)::text] as details
from storage.objects
where bucket_id = 'profile-images';

rollback;
