create table if not exists public.community_post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_community_post_images_post_order
  on public.community_post_images(post_id, sort_order asc, created_at asc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-post-images', 'community-post-images', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.community_post_images enable row level security;

create policy "community_post_images_select_public_thread"
  on public.community_post_images for select
  to authenticated
  using (
    exists (
      select 1
      from public.community_posts posts
      where posts.id = community_post_images.post_id
        and posts.status = 'ACTIVE'
        and posts.visibility = 'PUBLIC'
    )
    or (select auth.uid()) = author_id
  );

create policy "community_post_images_insert_own_thread"
  on public.community_post_images for insert
  to authenticated
  with check (
    (select auth.uid()) = author_id
    and exists (
      select 1
      from public.community_posts posts
      where posts.id = community_post_images.post_id
        and posts.author_id = (select auth.uid())
    )
  );

create policy "community_post_images_update_own"
  on public.community_post_images for update
  to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

create policy "community_post_images_delete_own"
  on public.community_post_images for delete
  to authenticated
  using ((select auth.uid()) = author_id);

create policy "community_post_storage_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'community-post-images');

create policy "community_post_storage_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'community-post-images'
    and owner = (select auth.uid())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "community_post_storage_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'community-post-images'
    and owner = (select auth.uid())
  )
  with check (
    bucket_id = 'community-post-images'
    and owner = (select auth.uid())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "community_post_storage_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'community-post-images'
    and owner = (select auth.uid())
  );

grant select, insert, update, delete on public.community_post_images to authenticated;
