
-- 운영에만 있던 테이블 9개

create table if not exists public.collection_follows (
  followed_id uuid not null,
  follower_id uuid not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.collection_likes (
  owner_id uuid not null,
  liked_by uuid not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.collection_profiles (
  user_id uuid not null,
  cover_theme_id text not null,
  display_title text default '나의 냥도감'::text not null,
  intro text default '오늘도 골목에서 만난 친구들을 기록해요.'::text not null,
  selected_badge_ids text[] default '{}'::text[] not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  is_public boolean default true not null,
  selected_stamp_ids text[] default '{}'::text[] not null
);

create table if not exists public.collection_themes (
  id text not null,
  name text not null,
  description text not null,
  palette text default 'warm'::text not null,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.community_content_reports (
  id uuid default gen_random_uuid() not null,
  reporter_id uuid default auth.uid() not null,
  target_user_id uuid not null,
  post_id uuid,
  comment_id uuid,
  reason text not null,
  details text,
  status text default 'PENDING'::text not null,
  resolution_note text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.community_post_media (
  id uuid default gen_random_uuid() not null,
  post_id uuid not null,
  type text not null,
  url text not null,
  thumbnail_url text,
  width integer,
  height integer,
  duration_sec integer,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.community_user_blocks (
  blocker_id uuid not null,
  blocked_user_id uuid not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.season_stamps (
  id text not null,
  name text not null,
  description text not null,
  season_key text not null,
  starts_on date not null,
  ends_on date not null,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.user_season_stamps (
  user_id uuid not null,
  stamp_id text not null,
  achieved_at date default CURRENT_DATE not null
);

-- 기존 테이블 컬럼 보정 4건
alter table public.community_comments add column if not exists deleted_at timestamp with time zone;
alter table public.community_posts alter column content set default ''::text;
alter table public.profiles alter column nickname set default '냥도감 탐험가'::text;
alter table public.profiles alter column provider set default 'guest'::text;

-- 제약 41개
alter table public.collection_follows drop constraint if exists collection_follows_pkey;
alter table public.collection_follows add constraint collection_follows_pkey PRIMARY KEY (followed_id, follower_id);
alter table public.collection_likes drop constraint if exists collection_likes_pkey;
alter table public.collection_likes add constraint collection_likes_pkey PRIMARY KEY (owner_id, liked_by);
alter table public.collection_profiles drop constraint if exists collection_profiles_pkey;
alter table public.collection_profiles add constraint collection_profiles_pkey PRIMARY KEY (user_id);
alter table public.collection_themes drop constraint if exists collection_themes_pkey;
alter table public.collection_themes add constraint collection_themes_pkey PRIMARY KEY (id);
alter table public.community_content_reports drop constraint if exists community_content_reports_pkey;
alter table public.community_content_reports add constraint community_content_reports_pkey PRIMARY KEY (id);
alter table public.community_post_media drop constraint if exists community_post_media_pkey;
alter table public.community_post_media add constraint community_post_media_pkey PRIMARY KEY (id);
alter table public.community_user_blocks drop constraint if exists community_user_blocks_pkey;
alter table public.community_user_blocks add constraint community_user_blocks_pkey PRIMARY KEY (blocker_id, blocked_user_id);
alter table public.season_stamps drop constraint if exists season_stamps_pkey;
alter table public.season_stamps add constraint season_stamps_pkey PRIMARY KEY (id);
alter table public.user_season_stamps drop constraint if exists user_season_stamps_pkey;
alter table public.user_season_stamps add constraint user_season_stamps_pkey PRIMARY KEY (user_id, stamp_id);
alter table public.collection_follows drop constraint if exists collection_follows_check;
alter table public.collection_follows add constraint collection_follows_check CHECK ((followed_id <> follower_id));
alter table public.collection_likes drop constraint if exists collection_likes_check;
alter table public.collection_likes add constraint collection_likes_check CHECK ((owner_id <> liked_by));
alter table public.community_comments drop constraint if exists community_comments_status_check;
alter table public.community_comments add constraint community_comments_status_check CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'HIDDEN'::text, 'DELETED'::text, 'REPORTED'::text])));
alter table public.community_content_reports drop constraint if exists community_content_reports_details_length_check;
alter table public.community_content_reports add constraint community_content_reports_details_length_check CHECK (((details IS NULL) OR (char_length(details) <= 500)));
alter table public.community_content_reports drop constraint if exists community_content_reports_no_self_check;
alter table public.community_content_reports add constraint community_content_reports_no_self_check CHECK ((reporter_id <> target_user_id));
alter table public.community_content_reports drop constraint if exists community_content_reports_reason_check;
alter table public.community_content_reports add constraint community_content_reports_reason_check CHECK ((reason = ANY (ARRAY['SPAM'::text, 'ABUSE'::text, 'INAPPROPRIATE'::text, 'PRIVACY'::text, 'OTHER'::text])));
alter table public.community_content_reports drop constraint if exists community_content_reports_single_target_check;
alter table public.community_content_reports add constraint community_content_reports_single_target_check CHECK (((((post_id IS NOT NULL))::integer + ((comment_id IS NOT NULL))::integer) = 1));
alter table public.community_content_reports drop constraint if exists community_content_reports_status_check;
alter table public.community_content_reports add constraint community_content_reports_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'REVIEWING'::text, 'RESOLVED'::text, 'DISMISSED'::text])));
alter table public.community_post_media drop constraint if exists community_post_media_type_check;
alter table public.community_post_media add constraint community_post_media_type_check CHECK ((type = ANY (ARRAY['IMAGE'::text, 'VIDEO'::text])));
alter table public.community_posts drop constraint if exists community_posts_status_check;
alter table public.community_posts add constraint community_posts_status_check CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'HIDDEN'::text, 'DELETED'::text, 'REPORTED'::text, 'PENDING_REVIEW'::text])));
alter table public.community_posts drop constraint if exists community_posts_visibility_check;
alter table public.community_posts add constraint community_posts_visibility_check CHECK ((visibility = ANY (ARRAY['PUBLIC'::text, 'FOLLOWERS'::text, 'PRIVATE'::text])));
alter table public.community_user_blocks drop constraint if exists community_user_blocks_no_self_check;
alter table public.community_user_blocks add constraint community_user_blocks_no_self_check CHECK ((blocker_id <> blocked_user_id));
alter table public.profiles drop constraint if exists profiles_provider_check;
alter table public.profiles add constraint profiles_provider_check CHECK ((provider = ANY (ARRAY['kakao'::text, 'google'::text, 'guest'::text])));
alter table public.season_stamps drop constraint if exists season_stamps_check;
alter table public.season_stamps add constraint season_stamps_check CHECK ((starts_on <= ends_on));
alter table public.collection_follows drop constraint if exists collection_follows_followed_id_fkey;
alter table public.collection_follows add constraint collection_follows_followed_id_fkey FOREIGN KEY (followed_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.collection_follows drop constraint if exists collection_follows_follower_id_fkey;
alter table public.collection_follows add constraint collection_follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.collection_likes drop constraint if exists collection_likes_liked_by_fkey;
alter table public.collection_likes add constraint collection_likes_liked_by_fkey FOREIGN KEY (liked_by) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.collection_likes drop constraint if exists collection_likes_owner_id_fkey;
alter table public.collection_likes add constraint collection_likes_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.collection_profiles drop constraint if exists collection_profiles_cover_theme_id_fkey;
alter table public.collection_profiles add constraint collection_profiles_cover_theme_id_fkey FOREIGN KEY (cover_theme_id) REFERENCES collection_themes(id);
alter table public.collection_profiles drop constraint if exists collection_profiles_user_id_fkey;
alter table public.collection_profiles add constraint collection_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.community_comments drop constraint if exists community_comments_author_id_fkey;
alter table public.community_comments add constraint community_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.community_content_reports drop constraint if exists community_content_reports_comment_id_fkey;
alter table public.community_content_reports add constraint community_content_reports_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES community_comments(id) ON DELETE CASCADE;
alter table public.community_content_reports drop constraint if exists community_content_reports_post_id_fkey;
alter table public.community_content_reports add constraint community_content_reports_post_id_fkey FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE;
alter table public.community_content_reports drop constraint if exists community_content_reports_reporter_id_fkey;
alter table public.community_content_reports add constraint community_content_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.community_content_reports drop constraint if exists community_content_reports_target_user_id_fkey;
alter table public.community_content_reports add constraint community_content_reports_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.community_post_likes drop constraint if exists community_post_likes_user_id_fkey;
alter table public.community_post_likes add constraint community_post_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.community_post_media drop constraint if exists community_post_media_post_id_fkey;
alter table public.community_post_media add constraint community_post_media_post_id_fkey FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE;
alter table public.community_posts drop constraint if exists community_posts_author_id_fkey;
alter table public.community_posts add constraint community_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.community_user_blocks drop constraint if exists community_user_blocks_blocked_user_id_fkey;
alter table public.community_user_blocks add constraint community_user_blocks_blocked_user_id_fkey FOREIGN KEY (blocked_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.community_user_blocks drop constraint if exists community_user_blocks_blocker_id_fkey;
alter table public.community_user_blocks add constraint community_user_blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.user_season_stamps drop constraint if exists user_season_stamps_stamp_id_fkey;
alter table public.user_season_stamps add constraint user_season_stamps_stamp_id_fkey FOREIGN KEY (stamp_id) REFERENCES season_stamps(id) ON DELETE CASCADE;
alter table public.user_season_stamps drop constraint if exists user_season_stamps_user_id_fkey;
alter table public.user_season_stamps add constraint user_season_stamps_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 인덱스 32개
CREATE INDEX IF NOT EXISTS idx_cat_sightings_matched_cat_id ON public.cat_sightings USING btree (matched_cat_id);
CREATE INDEX IF NOT EXISTS idx_collection_follows_followed_created ON public.collection_follows USING btree (followed_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_follows_follower_created ON public.collection_follows USING btree (follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_likes_liked_by_created ON public.collection_likes USING btree (liked_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_likes_owner_created ON public.collection_likes USING btree (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_profiles_cover_theme_id ON public.collection_profiles USING btree (cover_theme_id);
CREATE INDEX IF NOT EXISTS idx_collection_profiles_public ON public.collection_profiles USING btree (is_public, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_themes_sort_order ON public.collection_themes USING btree (sort_order, id);
CREATE INDEX IF NOT EXISTS idx_community_comments_post_created_at ON public.community_comments USING btree (post_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_community_content_reports_status_created ON public.community_content_reports USING btree (status, created_at);
CREATE INDEX IF NOT EXISTS idx_community_content_reports_target_user ON public.community_content_reports USING btree (target_user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_community_content_reports_unique_comment ON public.community_content_reports USING btree (reporter_id, comment_id) WHERE (comment_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS idx_community_content_reports_unique_post ON public.community_content_reports USING btree (reporter_id, post_id) WHERE (post_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_community_post_likes_user_id ON public.community_post_likes USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_community_post_media_post_sort ON public.community_post_media USING btree (post_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_community_posts_active_created_at ON public.community_posts USING btree (status, visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_author_created_at ON public.community_posts USING btree (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_user_blocks_blocked_user ON public.community_user_blocks USING btree (blocked_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_featured_cats_cat_id ON public.featured_cats USING btree (cat_id);
CREATE INDEX IF NOT EXISTS idx_region_cats_cat_id ON public.region_cats USING btree (cat_id);
CREATE INDEX IF NOT EXISTS idx_season_stamps_season_sort ON public.season_stamps USING btree (season_key, sort_order);
CREATE INDEX IF NOT EXISTS idx_user_season_stamps_stamp_id ON public.user_season_stamps USING btree (stamp_id);
CREATE INDEX IF NOT EXISTS idx_user_season_stamps_user_achieved ON public.user_season_stamps USING btree (user_id, achieved_at DESC);

-- 함수 14개
CREATE OR REPLACE FUNCTION private.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  next_provider text;
begin
  next_provider := case
    when new.is_anonymous then 'guest'
    when new.raw_app_meta_data->>'provider' in ('kakao', 'google', 'guest') then new.raw_app_meta_data->>'provider'
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

CREATE OR REPLACE FUNCTION private.list_public_collection_rankings()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  current_user_id uuid := auth.uid();
  rankings jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select coalesce(jsonb_agg(private.public_collection_summary(ranked.user_id)), '[]'::jsonb)
  into rankings
  from (
    select
      profiles.user_id,
      count(distinct likes.liked_by) as like_count,
      count(distinct collections.cat_id) as collected_count,
      max(collections.last_seen_at) as last_seen_at
    from public.collection_profiles profiles
    left join public.collection_likes likes on likes.owner_id = profiles.user_id
    left join public.user_cat_collections collections on collections.user_id = profiles.user_id
    where profiles.is_public
    group by profiles.user_id
    order by
      count(distinct likes.liked_by) desc,
      count(distinct collections.cat_id) desc,
      max(collections.last_seen_at) desc nulls last,
      profiles.user_id asc
    limit 30
  ) ranked;

  return rankings;
end;
$function$;

CREATE OR REPLACE FUNCTION private.prepare_community_content_report()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  content_author_id uuid;
begin
  if auth.uid() is not null then
    new.reporter_id := auth.uid();
  end if;

  if new.post_id is not null and new.comment_id is null then
    select posts.author_id
    into content_author_id
    from public.community_posts posts
    where posts.id = new.post_id;
  elsif new.comment_id is not null and new.post_id is null then
    select comments.author_id
    into content_author_id
    from public.community_comments comments
    where comments.id = new.comment_id;
  else
    raise exception using
      errcode = '22023',
      message = '신고할 게시글 또는 댓글 하나를 선택해 주세요.';
  end if;

  if content_author_id is null then
    raise exception using
      errcode = '22023',
      message = '신고할 콘텐츠를 찾을 수 없습니다.';
  end if;

  if content_author_id = new.reporter_id then
    raise exception using
      errcode = '22023',
      message = '내가 작성한 콘텐츠는 신고할 수 없습니다.';
  end if;

  new.target_user_id := content_author_id;
  new.status := 'PENDING';
  new.resolution_note := null;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.public_collection_summary(p_owner_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  current_user_id uuid := auth.uid();
  next_profile public.collection_profiles;
  next_theme public.collection_themes;
  owner_profile public.profiles;
  collected_count integer;
  badge_count integer;
  stamp_count integer;
  like_count integer;
  follower_count integer;
  viewer_liked boolean;
  viewer_following boolean;
  featured_cats jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select * into next_profile
  from public.collection_profiles
  where user_id = p_owner_id;

  if next_profile.user_id is null then
    return null;
  end if;

  if not next_profile.is_public and p_owner_id <> current_user_id then
    return null;
  end if;

  select * into next_theme
  from public.collection_themes
  where id = next_profile.cover_theme_id;

  select * into owner_profile
  from public.profiles
  where id = p_owner_id;

  select count(*)::integer into collected_count
  from public.user_cat_collections
  where user_id = p_owner_id;

  select count(*)::integer into badge_count
  from public.user_badges
  where user_id = p_owner_id;

  select count(*)::integer into stamp_count
  from public.user_season_stamps
  where user_id = p_owner_id;

  select count(*)::integer into like_count
  from public.collection_likes
  where owner_id = p_owner_id;

  select count(*)::integer into follower_count
  from public.collection_follows
  where followed_id = p_owner_id;

  viewer_liked := exists (
    select 1
    from public.collection_likes
    where owner_id = p_owner_id
      and liked_by = current_user_id
  );

  viewer_following := exists (
    select 1
    from public.collection_follows
    where followed_id = p_owner_id
      and follower_id = current_user_id
  );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'slot', featured.slot,
        'id', cats.id,
        'number', cats.number,
        'name', cats.name,
        'type', cats.type,
        'imageUrl', cats.image_url
      )
      order by featured.slot
    ),
    '[]'::jsonb
  )
  into featured_cats
  from public.featured_cats featured
  join public.cats cats on cats.id = featured.cat_id
  where featured.user_id = p_owner_id;

  return jsonb_build_object(
    'ownerId', p_owner_id,
    'nickname', coalesce(owner_profile.nickname, '냥도감 탐험가'),
    'profileImageUrl', owner_profile.profile_image_url,
    'profile', jsonb_build_object(
      'coverThemeId', next_profile.cover_theme_id,
      'displayTitle', next_profile.display_title,
      'intro', next_profile.intro,
      'selectedBadgeIds', next_profile.selected_badge_ids,
      'isPublic', next_profile.is_public
    ),
    'theme', jsonb_build_object(
      'id', next_theme.id,
      'name', next_theme.name,
      'description', next_theme.description,
      'palette', next_theme.palette
    ),
    'featuredCats', featured_cats,
    'stats', jsonb_build_object(
      'collectedCount', collected_count,
      'badgeCount', badge_count,
      'stampCount', stamp_count,
      'likeCount', like_count,
      'followerCount', follower_count
    ),
    'viewer', jsonb_build_object(
      'liked', viewer_liked,
      'following', viewer_following,
      'isOwner', p_owner_id = current_user_id
    )
  );
end;
$function$;

CREATE OR REPLACE FUNCTION private.reject_prohibited_community_text()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  normalized_text text;
  prohibited_term text;
begin
  if tg_table_name = 'community_posts' then
    normalized_text := lower(concat_ws(' ', new.title, new.content));
  else
    normalized_text := lower(new.content);
  end if;

  normalized_text := regexp_replace(normalized_text, '[[:space:][:punct:]]+', '', 'g');

  foreach prohibited_term in array array[
    '씨발',
    '씹새끼',
    '개새끼',
    '병신',
    '좆',
    '죽어버려',
    'nigger',
    'fuck',
    'bitch'
  ]
  loop
    if strpos(normalized_text, prohibited_term) > 0 then
      raise exception using
        errcode = '22023',
        message = '다른 사용자를 해치거나 불쾌하게 할 수 있는 표현은 등록할 수 없습니다.';
    end if;
  end loop;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.validate_collection_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  selected_badge_count integer;
  selected_stamp_count integer;
begin
  if not exists (
    select 1
    from public.collection_themes
    where id = new.cover_theme_id
  ) then
    raise exception 'Collection theme not found' using errcode = 'P0002';
  end if;

  selected_badge_count := coalesce(array_length(new.selected_badge_ids, 1), 0);

  if selected_badge_count > 0 and exists (
    select 1
    from unnest(new.selected_badge_ids) as selected_badge_id
    where not exists (
      select 1
      from public.user_badges
      where user_id = new.user_id
        and badge_id = selected_badge_id
    )
  ) then
    raise exception '획득한 골목 배지만 도감에 진열할 수 있습니다.' using errcode = '42501';
  end if;

  if selected_badge_count > 4 then
    raise exception '골목 배지는 최대 4개까지 진열할 수 있습니다.' using errcode = '22023';
  end if;

  selected_stamp_count := coalesce(array_length(new.selected_stamp_ids, 1), 0);

  if selected_stamp_count > 0 and exists (
    select 1
    from unnest(new.selected_stamp_ids) as selected_stamp_id
    where not exists (
      select 1
      from public.user_season_stamps
      where user_id = new.user_id
        and stamp_id = selected_stamp_id
    )
  ) then
    raise exception '획득한 냥발 도장만 도감에 진열할 수 있습니다.' using errcode = '42501';
  end if;

  if selected_stamp_count > 3 then
    raise exception '냥발 도장은 최대 3개까지 진열할 수 있습니다.' using errcode = '22023';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_collection_detail(p_owner_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select private.public_collection_summary(p_owner_id);
$function$;

CREATE OR REPLACE FUNCTION public.list_public_collection_rankings()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select private.list_public_collection_rankings();
$function$;

CREATE OR REPLACE FUNCTION public.replace_community_post_images(p_post_id uuid, p_image_paths text[])
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := (select auth.uid());
  v_image_paths text[] := coalesce(p_image_paths, '{}'::text[]);
  v_item_count integer;
  v_unique_count integer;
  v_required_prefix text;
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다.' using errcode = '42501';
  end if;

  if coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) then
    raise exception '정식 계정만 게시글 사진을 관리할 수 있습니다.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.community_posts posts
    where posts.id = p_post_id
      and posts.author_id = v_user_id
  ) then
    raise exception '게시글 사진을 수정할 권한이 없습니다.' using errcode = '42501';
  end if;

  v_item_count := cardinality(v_image_paths);

  if v_item_count > 5 then
    raise exception '게시글 사진은 최대 5장까지 저장할 수 있습니다.' using errcode = '22023';
  end if;

  if array_position(v_image_paths, null) is not null
    or exists (
      select 1
      from unnest(v_image_paths) as selected(image_path)
      where trim(selected.image_path) = ''
    ) then
    raise exception '유효하지 않은 사진 경로가 포함되어 있습니다.' using errcode = '22023';
  end if;

  select count(distinct image_path)::integer
  into v_unique_count
  from unnest(v_image_paths) as selected(image_path);

  if v_unique_count <> v_item_count then
    raise exception '같은 사진을 중복 저장할 수 없습니다.' using errcode = '22023';
  end if;

  v_required_prefix := v_user_id::text || '/posts/' || p_post_id::text || '/';

  if exists (
    select 1
    from unnest(v_image_paths) as selected(image_path)
    where selected.image_path not like v_required_prefix || '%'
  ) then
    raise exception '게시글에 속하지 않은 사진 경로입니다.' using errcode = '42501';
  end if;

  delete from public.community_post_images
  where post_id = p_post_id
    and author_id = v_user_id;

  insert into public.community_post_images (post_id, author_id, image_url, sort_order)
  select
    p_post_id,
    v_user_id,
    selected.image_path,
    (selected.sort_order - 1)::integer
  from unnest(v_image_paths) with ordinality as selected(image_path, sort_order);
end;
$function$;

CREATE OR REPLACE FUNCTION public.replace_featured_cats(p_cat_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := (select auth.uid());
  v_cat_ids uuid[] := coalesce(p_cat_ids, '{}'::uuid[]);
  v_item_count integer;
  v_unique_count integer;
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다.' using errcode = '42501';
  end if;

  if coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) then
    raise exception '정식 계정만 대표 고양이를 설정할 수 있습니다.' using errcode = '42501';
  end if;

  v_item_count := cardinality(v_cat_ids);

  if v_item_count > 3 then
    raise exception '대표 고양이는 최대 3마리까지 설정할 수 있습니다.' using errcode = '22023';
  end if;

  if array_position(v_cat_ids, null) is not null then
    raise exception '유효하지 않은 고양이 식별자가 포함되어 있습니다.' using errcode = '22023';
  end if;

  select count(distinct cat_id)::integer
  into v_unique_count
  from unnest(v_cat_ids) as selected(cat_id);

  if v_unique_count <> v_item_count then
    raise exception '같은 고양이를 중복 선택할 수 없습니다.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(v_cat_ids) as selected(cat_id)
    where not exists (
      select 1
      from public.user_cat_collections collections
      where collections.user_id = v_user_id
        and collections.cat_id = selected.cat_id
    )
  ) then
    raise exception '내 도감에 수집한 고양이만 대표로 설정할 수 있습니다.' using errcode = '42501';
  end if;

  delete from public.featured_cats
  where user_id = v_user_id;

  insert into public.featured_cats (user_id, cat_id, slot, caption)
  select
    v_user_id,
    selected.cat_id,
    selected.slot::integer,
    ''
  from unnest(v_cat_ids) with ordinality as selected(cat_id, slot);
end;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_collection_follow(p_owner_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  current_user_id uuid := auth.uid();
  next_following boolean;
  next_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_owner_id = current_user_id then
    raise exception '내 도감은 팔로우할 수 없습니다.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.collection_profiles
    where user_id = p_owner_id
      and is_public
  ) then
    raise exception '공개 도감만 팔로우할 수 있습니다.' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.collection_follows
    where followed_id = p_owner_id
      and follower_id = current_user_id
  ) then
    delete from public.collection_follows
    where followed_id = p_owner_id
      and follower_id = current_user_id;
    next_following := false;
  else
    insert into public.collection_follows (followed_id, follower_id)
    values (p_owner_id, current_user_id);
    next_following := true;
  end if;

  select count(*)::integer into next_count
  from public.collection_follows
  where followed_id = p_owner_id;

  return jsonb_build_object('following', next_following, 'followerCount', next_count);
end;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_collection_like(p_owner_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  current_user_id uuid := auth.uid();
  next_liked boolean;
  next_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_owner_id = current_user_id then
    raise exception '내 도감에는 좋아요를 누를 수 없습니다.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.collection_profiles
    where user_id = p_owner_id
      and is_public
  ) then
    raise exception '공개 도감만 좋아요할 수 있습니다.' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.collection_likes
    where owner_id = p_owner_id
      and liked_by = current_user_id
  ) then
    delete from public.collection_likes
    where owner_id = p_owner_id
      and liked_by = current_user_id;
    next_liked := false;
  else
    insert into public.collection_likes (owner_id, liked_by)
    values (p_owner_id, current_user_id);
    next_liked := true;
  end if;

  select count(*)::integer into next_count
  from public.collection_likes
  where owner_id = p_owner_id;

  return jsonb_build_object('liked', next_liked, 'likeCount', next_count);
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_community_post_with_images(p_post_id uuid, p_title text, p_content text, p_topic text, p_image_paths text[])
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := (select auth.uid());
  v_post_id uuid;
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다.' using errcode = '42501';
  end if;

  if coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) then
    raise exception '정식 계정만 게시글을 수정할 수 있습니다.' using errcode = '42501';
  end if;

  if char_length(trim(coalesce(p_content, ''))) < 2 then
    raise exception '동네 이야기를 2자 이상 입력해 주세요.' using errcode = '22023';
  end if;

  if p_topic not in ('SIGHTING', 'VERIFY', 'STATUS', 'INFO') then
    raise exception '유효하지 않은 게시글 주제입니다.' using errcode = '22023';
  end if;

  update public.community_posts
  set
    title = coalesce(nullif(trim(p_title), ''), left(trim(p_content), 48)),
    content = trim(p_content),
    topic = p_topic
  where id = p_post_id
    and author_id = v_user_id
  returning id into v_post_id;

  if v_post_id is null then
    raise exception '게시글 수정 권한이 없습니다.' using errcode = '42501';
  end if;

  perform public.replace_community_post_images(p_post_id, p_image_paths);

  return v_post_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.upsert_own_profile(p_nickname text, p_profile_image_url text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$;

-- RLS 활성화
alter table public.collection_follows enable row level security;
alter table public.collection_likes enable row level security;
alter table public.collection_profiles enable row level security;
alter table public.collection_themes enable row level security;
alter table public.community_content_reports enable row level security;
alter table public.community_post_media enable row level security;
alter table public.community_user_blocks enable row level security;
alter table public.season_stamps enable row level security;
alter table public.user_season_stamps enable row level security;

-- 운영에 없는 정책 1개 제거
drop policy if exists "profiles_select_own" on public.profiles;

-- RLS 정책 31개
drop policy if exists "cat_observations_delete_own_pending" on public.cat_observations;
create policy "cat_observations_delete_own_pending"
  on public.cat_observations for delete
  to authenticated
  using (((( SELECT auth.uid() AS uid) = user_id) AND (status = 'pending'::text)));

drop policy if exists "collection_follows_delete_own" on public.collection_follows;
create policy "collection_follows_delete_own"
  on public.collection_follows for delete
  to authenticated
  using ((( SELECT auth.uid() AS uid) = follower_id));

drop policy if exists "collection_follows_insert_own" on public.collection_follows;
create policy "collection_follows_insert_own"
  on public.collection_follows for insert
  to authenticated
  with check (((( SELECT auth.uid() AS uid) = follower_id) AND (followed_id <> follower_id) AND (EXISTS ( SELECT 1
   FROM collection_profiles
  WHERE ((collection_profiles.user_id = collection_follows.followed_id) AND collection_profiles.is_public)))));

drop policy if exists "collection_follows_select_own_or_public_followed" on public.collection_follows;
create policy "collection_follows_select_own_or_public_followed"
  on public.collection_follows for select
  to authenticated
  using (((( SELECT auth.uid() AS uid) = follower_id) OR (EXISTS ( SELECT 1
   FROM collection_profiles
  WHERE ((collection_profiles.user_id = collection_follows.followed_id) AND collection_profiles.is_public)))));

drop policy if exists "collection_likes_delete_own" on public.collection_likes;
create policy "collection_likes_delete_own"
  on public.collection_likes for delete
  to authenticated
  using ((( SELECT auth.uid() AS uid) = liked_by));

drop policy if exists "collection_likes_insert_own" on public.collection_likes;
create policy "collection_likes_insert_own"
  on public.collection_likes for insert
  to authenticated
  with check (((( SELECT auth.uid() AS uid) = liked_by) AND (owner_id <> liked_by) AND (EXISTS ( SELECT 1
   FROM collection_profiles
  WHERE ((collection_profiles.user_id = collection_likes.owner_id) AND collection_profiles.is_public)))));

drop policy if exists "collection_likes_select_own_or_public_owner" on public.collection_likes;
create policy "collection_likes_select_own_or_public_owner"
  on public.collection_likes for select
  to authenticated
  using (((( SELECT auth.uid() AS uid) = liked_by) OR (EXISTS ( SELECT 1
   FROM collection_profiles
  WHERE ((collection_profiles.user_id = collection_likes.owner_id) AND collection_profiles.is_public)))));

drop policy if exists "collection_profiles_insert_own" on public.collection_profiles;
create policy "collection_profiles_insert_own"
  on public.collection_profiles for insert
  to authenticated
  with check ((( SELECT auth.uid() AS uid) = user_id));

drop policy if exists "collection_profiles_select_own_or_public" on public.collection_profiles;
create policy "collection_profiles_select_own_or_public"
  on public.collection_profiles for select
  to authenticated
  using (((( SELECT auth.uid() AS uid) = user_id) OR is_public));

drop policy if exists "collection_profiles_update_own" on public.collection_profiles;
create policy "collection_profiles_update_own"
  on public.collection_profiles for update
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));

drop policy if exists "collection_themes_select_authenticated" on public.collection_themes;
create policy "collection_themes_select_authenticated"
  on public.collection_themes for select
  to authenticated
  using (true);

drop policy if exists "community_comments_permanent_users_only" on public.community_comments;
create policy "community_comments_permanent_users_only"
  on public.community_comments for all
  to authenticated
  using ((COALESCE(((( SELECT auth.jwt() AS jwt) ->> 'is_anonymous'::text))::boolean, false) IS FALSE))
  with check ((COALESCE(((( SELECT auth.jwt() AS jwt) ->> 'is_anonymous'::text))::boolean, false) IS FALSE));

drop policy if exists "community_comments_select_public_thread" on public.community_comments;
create policy "community_comments_select_public_thread"
  on public.community_comments for select
  to authenticated
  using ((((status = 'ACTIVE'::text) AND (NOT (EXISTS ( SELECT 1
   FROM community_user_blocks blocks
  WHERE ((blocks.blocker_id = ( SELECT auth.uid() AS uid)) AND (blocks.blocked_user_id = community_comments.author_id))))) AND (EXISTS ( SELECT 1
   FROM community_posts posts
  WHERE ((posts.id = community_comments.post_id) AND (posts.status = 'ACTIVE'::text) AND (posts.visibility = 'PUBLIC'::text))))) OR (( SELECT auth.uid() AS uid) = author_id)));

drop policy if exists "community_content_reports_insert_own_pending" on public.community_content_reports;
create policy "community_content_reports_insert_own_pending"
  on public.community_content_reports for insert
  to authenticated
  with check (((( SELECT auth.uid() AS uid) = reporter_id) AND (status = 'PENDING'::text) AND (resolution_note IS NULL)));

drop policy if exists "community_content_reports_permanent_users_only" on public.community_content_reports;
create policy "community_content_reports_permanent_users_only"
  on public.community_content_reports for all
  to authenticated
  using ((COALESCE(((( SELECT auth.jwt() AS jwt) ->> 'is_anonymous'::text))::boolean, false) IS FALSE))
  with check ((COALESCE(((( SELECT auth.jwt() AS jwt) ->> 'is_anonymous'::text))::boolean, false) IS FALSE));

drop policy if exists "community_content_reports_select_own" on public.community_content_reports;
create policy "community_content_reports_select_own"
  on public.community_content_reports for select
  to authenticated
  using ((( SELECT auth.uid() AS uid) = reporter_id));

drop policy if exists "community_post_images_permanent_users_only" on public.community_post_images;
create policy "community_post_images_permanent_users_only"
  on public.community_post_images for all
  to authenticated
  using ((COALESCE(((( SELECT auth.jwt() AS jwt) ->> 'is_anonymous'::text))::boolean, false) IS FALSE))
  with check ((COALESCE(((( SELECT auth.jwt() AS jwt) ->> 'is_anonymous'::text))::boolean, false) IS FALSE));

drop policy if exists "community_post_likes_permanent_users_only" on public.community_post_likes;
create policy "community_post_likes_permanent_users_only"
  on public.community_post_likes for all
  to authenticated
  using ((COALESCE(((( SELECT auth.jwt() AS jwt) ->> 'is_anonymous'::text))::boolean, false) IS FALSE))
  with check ((COALESCE(((( SELECT auth.jwt() AS jwt) ->> 'is_anonymous'::text))::boolean, false) IS FALSE));

drop policy if exists "community_post_media_delete_own_post" on public.community_post_media;
create policy "community_post_media_delete_own_post"
  on public.community_post_media for delete
  to authenticated
  using ((EXISTS ( SELECT 1
   FROM community_posts posts
  WHERE ((posts.id = community_post_media.post_id) AND (posts.author_id = ( SELECT auth.uid() AS uid))))));

drop policy if exists "community_post_media_insert_own_post" on public.community_post_media;
create policy "community_post_media_insert_own_post"
  on public.community_post_media for insert
  to authenticated
  with check ((EXISTS ( SELECT 1
   FROM community_posts posts
  WHERE ((posts.id = community_post_media.post_id) AND (posts.author_id = ( SELECT auth.uid() AS uid))))));

drop policy if exists "community_post_media_select_visible_post" on public.community_post_media;
create policy "community_post_media_select_visible_post"
  on public.community_post_media for select
  to authenticated
  using ((EXISTS ( SELECT 1
   FROM community_posts posts
  WHERE ((posts.id = community_post_media.post_id) AND (posts.status = 'ACTIVE'::text) AND ((posts.visibility = 'PUBLIC'::text) OR (posts.author_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists "community_post_media_update_own_post" on public.community_post_media;
create policy "community_post_media_update_own_post"
  on public.community_post_media for update
  to authenticated
  using ((EXISTS ( SELECT 1
   FROM community_posts posts
  WHERE ((posts.id = community_post_media.post_id) AND (posts.author_id = ( SELECT auth.uid() AS uid))))))
  with check ((EXISTS ( SELECT 1
   FROM community_posts posts
  WHERE ((posts.id = community_post_media.post_id) AND (posts.author_id = ( SELECT auth.uid() AS uid))))));

drop policy if exists "community_posts_permanent_users_only" on public.community_posts;
create policy "community_posts_permanent_users_only"
  on public.community_posts for all
  to authenticated
  using ((COALESCE(((( SELECT auth.jwt() AS jwt) ->> 'is_anonymous'::text))::boolean, false) IS FALSE))
  with check ((COALESCE(((( SELECT auth.jwt() AS jwt) ->> 'is_anonymous'::text))::boolean, false) IS FALSE));

drop policy if exists "community_posts_select_public" on public.community_posts;
create policy "community_posts_select_public"
  on public.community_posts for select
  to authenticated
  using ((((status = 'ACTIVE'::text) AND (visibility = 'PUBLIC'::text) AND (NOT (EXISTS ( SELECT 1
   FROM community_user_blocks blocks
  WHERE ((blocks.blocker_id = ( SELECT auth.uid() AS uid)) AND (blocks.blocked_user_id = community_posts.author_id)))))) OR (( SELECT auth.uid() AS uid) = author_id)));

drop policy if exists "community_user_blocks_delete_own" on public.community_user_blocks;
create policy "community_user_blocks_delete_own"
  on public.community_user_blocks for delete
  to authenticated
  using ((( SELECT auth.uid() AS uid) = blocker_id));

drop policy if exists "community_user_blocks_insert_own" on public.community_user_blocks;
create policy "community_user_blocks_insert_own"
  on public.community_user_blocks for insert
  to authenticated
  with check (((( SELECT auth.uid() AS uid) = blocker_id) AND (blocker_id <> blocked_user_id)));

drop policy if exists "community_user_blocks_permanent_users_only" on public.community_user_blocks;
create policy "community_user_blocks_permanent_users_only"
  on public.community_user_blocks for all
  to authenticated
  using ((COALESCE(((( SELECT auth.jwt() AS jwt) ->> 'is_anonymous'::text))::boolean, false) IS FALSE))
  with check ((COALESCE(((( SELECT auth.jwt() AS jwt) ->> 'is_anonymous'::text))::boolean, false) IS FALSE));

drop policy if exists "community_user_blocks_select_own" on public.community_user_blocks;
create policy "community_user_blocks_select_own"
  on public.community_user_blocks for select
  to authenticated
  using ((( SELECT auth.uid() AS uid) = blocker_id));

drop policy if exists "profiles_select_public_identity" on public.profiles;
create policy "profiles_select_public_identity"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "season_stamps_select_authenticated" on public.season_stamps;
create policy "season_stamps_select_authenticated"
  on public.season_stamps for select
  to authenticated
  using (true);

drop policy if exists "user_season_stamps_select_own" on public.user_season_stamps;
create policy "user_season_stamps_select_own"
  on public.user_season_stamps for select
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));

-- 트리거 6개
drop trigger if exists collection_profiles_set_updated_at on public.collection_profiles;
CREATE TRIGGER collection_profiles_set_updated_at BEFORE UPDATE ON public.collection_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

drop trigger if exists collection_profiles_validate on public.collection_profiles;
CREATE TRIGGER collection_profiles_validate BEFORE INSERT OR UPDATE ON public.collection_profiles FOR EACH ROW EXECUTE FUNCTION private.validate_collection_profile();

drop trigger if exists community_comments_reject_prohibited_text on public.community_comments;
CREATE TRIGGER community_comments_reject_prohibited_text BEFORE INSERT OR UPDATE OF content ON public.community_comments FOR EACH ROW EXECUTE FUNCTION private.reject_prohibited_community_text();

drop trigger if exists community_content_reports_prepare on public.community_content_reports;
CREATE TRIGGER community_content_reports_prepare BEFORE INSERT ON public.community_content_reports FOR EACH ROW EXECUTE FUNCTION private.prepare_community_content_report();

drop trigger if exists community_content_reports_set_updated_at on public.community_content_reports;
CREATE TRIGGER community_content_reports_set_updated_at BEFORE UPDATE ON public.community_content_reports FOR EACH ROW EXECUTE FUNCTION set_updated_at();

drop trigger if exists community_posts_reject_prohibited_text on public.community_posts;
CREATE TRIGGER community_posts_reject_prohibited_text BEFORE INSERT OR UPDATE OF title, content ON public.community_posts FOR EACH ROW EXECUTE FUNCTION private.reject_prohibited_community_text();

