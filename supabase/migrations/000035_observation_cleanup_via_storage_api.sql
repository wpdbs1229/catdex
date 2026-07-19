-- 관찰 정리를 Storage API 경유(엣지 함수)로 전환
--
-- 000033의 SQL 함수는 storage.objects를 직접 지우려 했지만 Supabase가
-- 이를 차단한다(storage.protect_delete). 파일 삭제는 observation-cleanup
-- 엣지 함수가 Storage API로 수행하고, pg_cron은 그 함수를 호출한다.
-- 호출 비밀키는 private.app_config에 보관한다(값은 마이그레이션에 넣지
-- 않고 운영 환경에서 별도 주입).

drop function if exists private.cleanup_stale_cat_observations(interval, integer);

create table if not exists private.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

revoke all on table private.app_config from public, anon, authenticated;

create or replace function private.request_observation_cleanup()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleanup_secret text;
  request_id bigint;
begin
  select config.value
  into cleanup_secret
  from private.app_config config
  where config.key = 'observation_cleanup_secret';

  if cleanup_secret is null or length(cleanup_secret) = 0 then
    raise warning 'observation cleanup skipped: private.app_config.observation_cleanup_secret is not set';
    return;
  end if;

  select net.http_post(
    url := 'https://wqiqdybzhbmsvccpklli.supabase.co/functions/v1/observation-cleanup',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cleanup-secret', cleanup_secret
    ),
    body := '{}'::jsonb
  )
  into request_id;
end;
$$;

revoke all on function private.request_observation_cleanup() from public, anon, authenticated;

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
    'select private.request_observation_cleanup();'
  );
end;
$$;
