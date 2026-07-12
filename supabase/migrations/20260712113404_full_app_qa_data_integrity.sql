update public.regions
set
  lat = 37.544,
  lng = 127.055,
  radius = greatest(radius, 650)
where id = '성수동'
  and name = '성수동';

create index if not exists idx_community_post_images_author_id
  on public.community_post_images(author_id);

drop policy if exists "cat_observations_delete_own_pending" on public.cat_observations;
create policy "cat_observations_delete_own_pending"
  on public.cat_observations for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and status = 'pending'
  );

grant delete on public.cat_observations to authenticated;

create or replace function public.replace_featured_cats(p_cat_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
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
$$;

revoke all on function public.replace_featured_cats(uuid[]) from public;
revoke execute on function public.replace_featured_cats(uuid[]) from anon;
grant execute on function public.replace_featured_cats(uuid[]) to authenticated;

create or replace function public.replace_community_post_images(
  p_post_id uuid,
  p_image_paths text[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
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
$$;

revoke all on function public.replace_community_post_images(uuid, text[]) from public;
revoke execute on function public.replace_community_post_images(uuid, text[]) from anon;
grant execute on function public.replace_community_post_images(uuid, text[]) to authenticated;

create or replace function public.update_community_post_with_images(
  p_post_id uuid,
  p_title text,
  p_content text,
  p_topic text,
  p_image_paths text[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
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
$$;

revoke all on function public.update_community_post_with_images(uuid, text, text, text, text[]) from public;
revoke execute on function public.update_community_post_with_images(uuid, text, text, text, text[]) from anon;
grant execute on function public.update_community_post_with_images(uuid, text, text, text, text[]) to authenticated;

drop policy if exists "community_posts_permanent_users_only" on public.community_posts;
create policy "community_posts_permanent_users_only"
  on public.community_posts
  as restrictive
  for all
  to authenticated
  using (coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false)
  with check (coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false);

drop policy if exists "community_comments_permanent_users_only" on public.community_comments;
create policy "community_comments_permanent_users_only"
  on public.community_comments
  as restrictive
  for all
  to authenticated
  using (coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false)
  with check (coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false);

drop policy if exists "community_post_likes_permanent_users_only" on public.community_post_likes;
create policy "community_post_likes_permanent_users_only"
  on public.community_post_likes
  as restrictive
  for all
  to authenticated
  using (coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false)
  with check (coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false);

drop policy if exists "community_post_images_permanent_users_only" on public.community_post_images;
create policy "community_post_images_permanent_users_only"
  on public.community_post_images
  as restrictive
  for all
  to authenticated
  using (coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false)
  with check (coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false);

drop policy if exists "community_post_storage_permanent_users_only" on storage.objects;
create policy "community_post_storage_permanent_users_only"
  on storage.objects
  as restrictive
  for all
  to authenticated
  using (
    bucket_id <> 'community-post-images'
    or coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false
  )
  with check (
    bucket_id <> 'community-post-images'
    or coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false
  );

drop policy if exists "community_posts_select_visible" on public.community_posts;
drop policy if exists "community_comments_insert_own" on public.community_comments;
drop policy if exists "community_comments_select_visible_post" on public.community_comments;
drop policy if exists "community_post_likes_select_visible" on public.community_post_likes;
