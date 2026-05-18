-- Remove advisor-reported unused indexes that are not needed as FK support.
--
-- Kept even when currently unused:
-- - FK-supporting indexes added in 000004.
-- - Existing indexes whose leading column covers an FK.
--
-- Removed:
-- - idx_cat_regions_region_last_seen: currently unused, and cat_regions_pkey
--   already covers region_id for the region FK.
-- - idx_reports_status_created_at: currently unused and not needed for FK
--   coverage.

drop index if exists public.idx_cat_regions_region_last_seen;
drop index if exists public.idx_reports_status_created_at;

-- Verification SQL:
--
-- 1. These indexes should no longer exist.
-- select schemaname, tablename, indexname
-- from pg_indexes
-- where schemaname = 'public'
--   and indexname in (
--     'idx_cat_regions_region_last_seen',
--     'idx_reports_status_created_at'
--   );
--
-- 2. Re-run Supabase performance advisors.
-- Expected:
-- - The two removed indexes no longer appear as unused_index findings.
-- - No new unindexed_foreign_keys findings are introduced by this migration.
