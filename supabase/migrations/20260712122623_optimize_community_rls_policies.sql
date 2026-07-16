drop policy if exists "community_posts_permanent_users_only" on public.community_posts;
create policy "community_posts_permanent_users_only"
  on public.community_posts
  as restrictive
  for all
  to authenticated
  using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false)
  with check (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false);

drop policy if exists "community_comments_permanent_users_only" on public.community_comments;
create policy "community_comments_permanent_users_only"
  on public.community_comments
  as restrictive
  for all
  to authenticated
  using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false)
  with check (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false);

drop policy if exists "community_post_likes_permanent_users_only" on public.community_post_likes;
create policy "community_post_likes_permanent_users_only"
  on public.community_post_likes
  as restrictive
  for all
  to authenticated
  using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false)
  with check (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false);

drop policy if exists "community_post_images_permanent_users_only" on public.community_post_images;
create policy "community_post_images_permanent_users_only"
  on public.community_post_images
  as restrictive
  for all
  to authenticated
  using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false)
  with check (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false);

drop policy if exists "community_post_storage_permanent_users_only" on storage.objects;
create policy "community_post_storage_permanent_users_only"
  on storage.objects
  as restrictive
  for all
  to authenticated
  using (
    bucket_id <> 'community-post-images'
    or coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false
  )
  with check (
    bucket_id <> 'community-post-images'
    or coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false
  );
