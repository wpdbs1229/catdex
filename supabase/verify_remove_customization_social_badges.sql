with removed_tables(name) as (
  values
    ('public.user_entitlements'),
    ('public.collection_themes'),
    ('public.collection_profiles'),
    ('public.featured_cats'),
    ('public.season_stamps'),
    ('public.user_season_stamps'),
    ('public.collection_likes'),
    ('public.collection_follows'),
    ('public.badges'),
    ('public.user_badges')
)
select
  'removed_tables_absent' as check_name,
  count(*) = 0 as passed,
  coalesce(array_agg(name), '{}') as remaining
from removed_tables
where to_regclass(name) is not null;

with removed_functions(signature) as (
  values
    ('public.get_public_collection_detail(uuid)'),
    ('public.list_public_collection_rankings()'),
    ('public.toggle_collection_like(uuid)'),
    ('public.toggle_collection_follow(uuid)'),
    ('private.public_collection_summary(uuid)'),
    ('private.public_collection_summary(uuid, uuid)'),
    ('private.list_public_collection_rankings()'),
    ('private.user_has_nyangkkureomi(uuid)'),
    ('private.validate_collection_profile()'),
    ('private.validate_featured_cat()'),
    ('private.notify_user_badge()'),
    ('private.notify_collection_like()'),
    ('private.notify_collection_follow()')
)
select
  'removed_functions_absent' as check_name,
  count(*) = 0 as passed,
  coalesce(array_agg(signature), '{}') as remaining
from removed_functions
where to_regprocedure(signature) is not null;

select
  'notification_settings_removed_columns_absent' as check_name,
  count(*) = 0 as passed,
  coalesce(array_agg(column_name), '{}') as remaining
from information_schema.columns
where table_schema = 'public'
  and table_name = 'notification_settings'
  and column_name in ('achievement_enabled', 'social_enabled');

select
  'notification_events_removed_types_absent' as check_name,
  count(*) = 0 as passed,
  coalesce(array_agg(distinct type), '{}') as remaining
from public.notification_events
where type in ('achievement', 'collection_like', 'collection_follow');

with create_cat_fn as (
  select to_regprocedure('public.create_cat(text, text, text[], text, text, text)') as fn
)
select
  'create_cat_without_user_badges' as check_name,
  fn is not null and pg_get_functiondef(fn) not ilike '%user_badges%' as passed,
  case
    when fn is null then array['public.create_cat(text, text, text[], text, text, text) missing']
    when pg_get_functiondef(fn) ilike '%user_badges%' then array['user_badges reference remains']
    else '{}'::text[]
  end as remaining
from create_cat_fn;
