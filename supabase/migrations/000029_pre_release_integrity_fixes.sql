-- 앱스토어 출시 전 데이터 정합성 수정 모음
--
-- 1) 회원탈퇴가 공유 도감 고양이를 연쇄 삭제하지 않도록 cats.user_id FK를
--    on delete set null로 변경 (다른 사용자의 수집/만남 기록 보호)
-- 2) 커뮤니티 작성자 표시용 최소 프로필 조회 RPC (profiles RLS는 본인 행만
--    허용하므로, 닉네임/이미지 두 컬럼만 노출하는 security definer 함수 제공)
-- 3) 같은 기기에서 계정을 전환해도 푸시 토큰을 안전하게 인계받는 RPC
-- 4) 탈퇴/삭제 경로에서 사용하는 FK 컬럼 인덱스 보강

-- 1) 공유 고양이 보호 -------------------------------------------------------

alter table public.cats alter column user_id drop not null;

alter table public.cats drop constraint if exists cats_user_id_fkey;

alter table public.cats
  add constraint cats_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

-- 초기 스키마의 unique (user_id, number)는 user_id가 null이 되면 의미가
-- 없어지지만, 공유 번호 체계에서 이미 전역 발급이므로 그대로 둔다.

-- 2) 커뮤니티 작성자 프로필 조회 --------------------------------------------

create or replace function public.get_community_author_profiles(p_user_ids uuid[])
returns table (
  id uuid,
  nickname text,
  profile_image_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select profiles.id, profiles.nickname, profiles.profile_image_url
  from public.profiles as profiles
  where profiles.id = any(p_user_ids)
    and auth.uid() is not null;
$$;

revoke all on function public.get_community_author_profiles(uuid[]) from public;
revoke all on function public.get_community_author_profiles(uuid[]) from anon;
grant execute on function public.get_community_author_profiles(uuid[]) to authenticated;

-- 3) 푸시 토큰 인계 ----------------------------------------------------------
-- Expo 푸시 토큰은 사용자 단위가 아니라 기기 단위다. 같은 기기에서 다른
-- 계정으로 로그인하면 기존 소유자의 행 때문에 RLS 위반이 났었다.

create or replace function public.register_notification_device(
  p_expo_push_token text,
  p_platform text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_expo_push_token is null or length(trim(p_expo_push_token)) = 0 then
    raise exception 'Push token is required';
  end if;

  if p_platform not in ('ios', 'android', 'web', 'unknown') then
    raise exception 'Unsupported platform: %', p_platform;
  end if;

  delete from public.notification_devices
  where expo_push_token = p_expo_push_token
    and user_id <> current_user_id;

  insert into public.notification_devices (user_id, expo_push_token, platform, enabled, last_seen_at)
  values (current_user_id, p_expo_push_token, p_platform, true, now())
  on conflict (expo_push_token)
  do update set
    user_id = excluded.user_id,
    platform = excluded.platform,
    enabled = true,
    last_seen_at = now(),
    updated_at = now();
end;
$$;

revoke all on function public.register_notification_device(text, text) from public;
revoke all on function public.register_notification_device(text, text) from anon;
grant execute on function public.register_notification_device(text, text) to authenticated;

-- 4) 삭제 경로 인덱스 --------------------------------------------------------

create index if not exists idx_community_comments_author_id
  on public.community_comments(author_id);

create index if not exists idx_community_post_images_author_id
  on public.community_post_images(author_id);

create index if not exists idx_notification_events_actor_id
  on public.notification_events(actor_id);
