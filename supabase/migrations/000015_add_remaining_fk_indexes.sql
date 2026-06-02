-- Add covering indexes for the remaining foreign keys reported by the
-- Supabase performance advisor.
--
-- Why these are separate single-column indexes:
-- - A composite primary key or unique index only covers a foreign key when the
--   FK column is the leftmost indexed column.
-- - These FK columns are not leftmost in the existing composite indexes, so
--   deletes/updates on the referenced rows and joins from the referenced side
--   can still require slower scans.

-- collection_profiles.cover_theme_id -> collection_themes.id
-- Speeds theme-based joins and referenced theme checks for collection covers.
create index if not exists idx_collection_profiles_cover_theme_id
  on public.collection_profiles(cover_theme_id);

-- featured_cats.cat_id -> cats.id
-- Existing indexes start with user_id, so they do not cover cat_id lookups.
create index if not exists idx_featured_cats_cat_id
  on public.featured_cats(cat_id);

-- notification_events.actor_id -> auth.users.id
-- Covers actor lookups and helps FK checks when an actor account is deleted.
create index if not exists idx_notification_events_actor_id
  on public.notification_events(actor_id);

-- region_cats.cat_id -> cats.id
-- Existing primary key starts with region_id, so cat_id still needs coverage.
create index if not exists idx_region_cats_cat_id
  on public.region_cats(cat_id);

-- user_badges.badge_id -> badges.id
-- Existing primary key starts with user_id, so badge_id still needs coverage.
create index if not exists idx_user_badges_badge_id
  on public.user_badges(badge_id);

-- user_season_stamps.stamp_id -> season_stamps.id
-- Existing primary key starts with user_id, so stamp_id still needs coverage.
create index if not exists idx_user_season_stamps_stamp_id
  on public.user_season_stamps(stamp_id);

-- Verification SQL to run after applying this migration:
--
-- select
--   nsp.nspname as schema_name,
--   tbl.relname as table_name,
--   con.conname as fk_name,
--   array_agg(att.attname order by key_cols.ordinality) as fk_columns,
--   exists (
--     select 1
--     from pg_index idx
--     where idx.indrelid = con.conrelid
--       and idx.indisvalid
--       and idx.indpred is null
--       and (idx.indkey::smallint[])[
--         array_lower(idx.indkey::smallint[], 1):
--         array_lower(idx.indkey::smallint[], 1) + cardinality(con.conkey) - 1
--       ] = con.conkey
--   ) as has_covering_index
-- from pg_constraint con
-- join pg_class tbl on tbl.oid = con.conrelid
-- join pg_namespace nsp on nsp.oid = tbl.relnamespace
-- join unnest(con.conkey) with ordinality as key_cols(attnum, ordinality)
--   on true
-- join pg_attribute att
--   on att.attrelid = con.conrelid
--  and att.attnum = key_cols.attnum
-- where con.contype = 'f'
--   and nsp.nspname = 'public'
--   and con.conname in (
--     'collection_profiles_cover_theme_id_fkey',
--     'featured_cats_cat_id_fkey',
--     'notification_events_actor_id_fkey',
--     'region_cats_cat_id_fkey',
--     'user_badges_badge_id_fkey',
--     'user_season_stamps_stamp_id_fkey'
--   )
-- group by nsp.nspname, tbl.relname, con.conname, con.conrelid, con.conkey
-- order by table_name, fk_name;
--
-- Expected result: every row has has_covering_index = true.
--
-- Missing-only SQL recheck:
--
-- select
--   nsp.nspname as schema_name,
--   tbl.relname as table_name,
--   con.conname as fk_name
-- from pg_constraint con
-- join pg_class tbl on tbl.oid = con.conrelid
-- join pg_namespace nsp on nsp.oid = tbl.relnamespace
-- where con.contype = 'f'
--   and nsp.nspname = 'public'
--   and con.conname in (
--     'collection_profiles_cover_theme_id_fkey',
--     'featured_cats_cat_id_fkey',
--     'notification_events_actor_id_fkey',
--     'region_cats_cat_id_fkey',
--     'user_badges_badge_id_fkey',
--     'user_season_stamps_stamp_id_fkey'
--   )
--   and not exists (
--     select 1
--     from pg_index idx
--     where idx.indrelid = con.conrelid
--       and idx.indisvalid
--       and idx.indpred is null
--       and (idx.indkey::smallint[])[
--         array_lower(idx.indkey::smallint[], 1):
--         array_lower(idx.indkey::smallint[], 1) + cardinality(con.conkey) - 1
--       ] = con.conkey
--   )
-- order by table_name, fk_name;
--
-- Expected result: 0 rows for these tables.
