-- 미종결(pending) 촬영 관찰 정리 스케줄러
--
-- 사용자가 매칭 화면에서 이탈하면 pending 관찰과 업로드 사진 2장이 영구히
-- 남는다. 3일이 지난 pending 관찰을 'expired'로 마감하고, 연결된 후보와
-- 스토리지 파일(원본/누끼)을 정리한다. 매일 KST 새벽 3시 30분에 실행.

alter table public.cat_observations
  drop constraint if exists cat_observations_status_check;

alter table public.cat_observations
  add constraint cat_observations_status_check
  check (status in ('pending', 'linked', 'new_cat', 'uncertain', 'expired'));

create or replace function private.cleanup_stale_cat_observations(
  p_max_age interval default interval '3 days',
  p_limit integer default 200
)
returns table (expired_count integer, removed_file_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  stale record;
  v_expired integer := 0;
  v_files integer := 0;
  v_removed integer;
begin
  for stale in
    select observations.id, observations.original_image_url, observations.cutout_image_url
    from public.cat_observations observations
    where observations.status = 'pending'
      and observations.created_at < now() - p_max_age
    order by observations.created_at
    limit greatest(coalesce(p_limit, 200), 1)
  loop
    delete from public.cat_match_candidates candidates
    where candidates.observation_id = stale.id;

    -- 관찰 전용 업로드(사용자 폴더의 observations/ 경로)만 지운다.
    -- pending 관찰의 파일은 다른 곳에서 참조되지 않는다.
    delete from storage.objects objects
    where objects.bucket_id = 'cat-images'
      and objects.name = any(array[stale.original_image_url, stale.cutout_image_url])
      and objects.name like '%/observations/%';

    get diagnostics v_removed = row_count;
    v_files := v_files + v_removed;

    update public.cat_observations observations
    set status = 'expired'
    where observations.id = stale.id;

    v_expired := v_expired + 1;
  end loop;

  return query select v_expired, v_files;
end;
$$;

revoke all on function private.cleanup_stale_cat_observations(interval, integer) from public, anon, authenticated;

do $$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'catdex-observation-cleanup'
  ) then
    perform cron.unschedule('catdex-observation-cleanup');
  end if;

  -- KST 03:30 = UTC 18:30
  perform cron.schedule(
    'catdex-observation-cleanup',
    '30 18 * * *',
    'select * from private.cleanup_stale_cat_observations();'
  );
end;
$$;
