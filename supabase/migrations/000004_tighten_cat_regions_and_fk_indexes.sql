-- Tighten the cat_regions INSERT policy and add FK indexes reported by
-- Supabase advisors for the shared Catdex schema.
--
-- Reason:
-- - cat_regions is a shared aggregate of where a cat has actually been seen.
-- - The previous INSERT policy used WITH CHECK (true), so any authenticated
--   user could create arbitrary cat-region relations.
-- - The app's access model records a cat-region relation only after the user
--   has recorded an encounter for the same cat in the same region. The policy
--   below preserves that RPC flow and removes unrestricted direct inserts.
-- - Single-column FK indexes reduce lock and scan cost when referenced rows
--   are updated/deleted and clear the unindexed_foreign_keys advisor findings.

drop policy if exists "cat_regions_insert_authenticated" on public.cat_regions;
drop policy if exists "cat_regions_insert_after_own_encounter" on public.cat_regions;

create policy "cat_regions_insert_after_own_encounter"
  on public.cat_regions for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.cat_encounters ce
      join public.regions r
        on r.name = ce.region_name
      where ce.user_id = (select auth.uid())
        and ce.cat_id = cat_regions.cat_id
        and r.id = cat_regions.region_id
    )
  );

create index if not exists idx_cat_regions_cat_id
  on public.cat_regions(cat_id);

create index if not exists idx_cat_photos_encounter_id
  on public.cat_photos(encounter_id);

create index if not exists idx_cat_photos_uploaded_by
  on public.cat_photos(uploaded_by);

create index if not exists idx_reports_reporter_id
  on public.reports(reporter_id);

create index if not exists idx_reports_cat_id
  on public.reports(cat_id);

create index if not exists idx_reports_encounter_id
  on public.reports(encounter_id);

create index if not exists idx_reports_photo_id
  on public.reports(photo_id);

create index if not exists idx_user_cat_collections_cat_id
  on public.user_cat_collections(cat_id);

-- Verification SQL:
--
-- 1. The cat_regions INSERT policy must no longer have WITH CHECK (true).
-- select policyname, cmd, with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename = 'cat_regions'
--   and cmd = 'INSERT';
--
-- 2. Requested FK columns should have a matching leading-column index.
-- with fk_columns as (
--   select
--     c.conrelid,
--     c.conrelid::regclass::text as table_name,
--     c.conname as fk_name,
--     c.conkey as fk_attnums,
--     array_agg(a.attname order by u.ord) as fk_columns
--   from pg_constraint c
--   join unnest(c.conkey) with ordinality as u(attnum, ord) on true
--   join pg_attribute a
--     on a.attrelid = c.conrelid
--    and a.attnum = u.attnum
--   where c.contype = 'f'
--     and c.conrelid in (
--       'public.cat_regions'::regclass,
--       'public.cat_photos'::regclass,
--       'public.reports'::regclass,
--       'public.user_cat_collections'::regclass
--     )
--   group by c.conrelid, c.conname, c.conkey
-- ),
-- indexed_fks as (
--   select
--     fk.table_name,
--     fk.fk_name,
--     fk.fk_columns,
--     i.indexrelid::regclass::text as index_name
--   from fk_columns fk
--   left join pg_index i
--     on i.indrelid = fk.conrelid
--    and (i.indkey::smallint[])[0:cardinality(fk.fk_attnums) - 1] = fk.fk_attnums
-- )
-- select *
-- from indexed_fks
-- where fk_name in (
--   'cat_regions_cat_id_fkey',
--   'cat_photos_encounter_id_fkey',
--   'cat_photos_uploaded_by_fkey',
--   'reports_reporter_id_fkey',
--   'reports_cat_id_fkey',
--   'reports_encounter_id_fkey',
--   'reports_photo_id_fkey',
--   'user_cat_collections_cat_id_fkey'
-- )
-- order by table_name, fk_name;
--
-- 3. Re-run Supabase advisors after applying this migration.
-- Expected: the rls_policy_always_true finding for public.cat_regions and the
-- listed unindexed_foreign_keys findings are gone.
