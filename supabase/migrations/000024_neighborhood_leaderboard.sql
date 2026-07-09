create or replace function public.get_neighborhood_leaderboard(
  p_region_name text,
  p_days integer default 30,
  p_limit integer default 5
)
returns table (
  rank integer,
  user_id uuid,
  nickname text,
  profile_image_url text,
  contribution_score integer,
  collected_cat_count integer,
  encounter_count integer,
  photo_count integer,
  representative_cat_names text[],
  representative_cat_image_urls text[],
  is_me boolean
)
language sql
security definer
set search_path = ''
as $$
  with period_encounters as (
    select
      encounters.id,
      encounters.user_id,
      encounters.cat_id,
      encounters.seen_at,
      encounters.created_at,
      encounters.image_url
    from public.cat_encounters encounters
    where encounters.region_name = p_region_name
      and encounters.is_public = true
      and encounters.seen_at >= current_date - (greatest(p_days, 1)::integer - 1)
  ),
  first_user_cat_seen as (
    select
      encounters.user_id,
      encounters.cat_id,
      min(encounters.seen_at) as first_seen_at
    from public.cat_encounters encounters
    where encounters.is_public = true
    group by encounters.user_id, encounters.cat_id
  ),
  daily_user_cat as (
    select
      period_encounters.user_id,
      period_encounters.cat_id,
      period_encounters.seen_at,
      bool_or(period_encounters.image_url is not null) as has_photo,
      count(*)::integer as raw_encounter_count
    from period_encounters
    group by period_encounters.user_id, period_encounters.cat_id, period_encounters.seen_at
  ),
  scored_daily as (
    select
      daily_user_cat.user_id,
      daily_user_cat.cat_id,
      daily_user_cat.seen_at,
      daily_user_cat.has_photo,
      daily_user_cat.raw_encounter_count,
      (
        case
          when first_user_cat_seen.first_seen_at = daily_user_cat.seen_at then 3
          else 1
        end +
        case
          when daily_user_cat.has_photo then 1
          else 0
        end
      )::integer as points
    from daily_user_cat
    join first_user_cat_seen
      on first_user_cat_seen.user_id = daily_user_cat.user_id
     and first_user_cat_seen.cat_id = daily_user_cat.cat_id
  ),
  user_scores as (
    select
      scored_daily.user_id,
      sum(scored_daily.points)::integer as contribution_score,
      count(distinct scored_daily.cat_id)::integer as collected_cat_count,
      count(*)::integer as encounter_count,
      count(*) filter (where scored_daily.has_photo)::integer as photo_count
    from scored_daily
    group by scored_daily.user_id
  ),
  representative_cats as (
    select
      ordered_cats.user_id,
      (array_agg(ordered_cats.cat_name order by ordered_cats.last_seen_at desc, ordered_cats.cat_name asc))[1:3] as representative_cat_names,
      (array_agg(ordered_cats.image_url order by ordered_cats.last_seen_at desc, ordered_cats.cat_name asc))[1:3] as representative_cat_image_urls
    from (
      select
        period_encounters.user_id,
        period_encounters.cat_id,
        max(period_encounters.seen_at) as last_seen_at,
        cats.name as cat_name,
        coalesce(cats.representative_photo_url, cats.image_url) as image_url
      from period_encounters
      join public.cats cats
        on cats.id = period_encounters.cat_id
      group by
        period_encounters.user_id,
        period_encounters.cat_id,
        cats.name,
        cats.representative_photo_url,
        cats.image_url
    ) ordered_cats
    group by ordered_cats.user_id
  ),
  ranked as (
    select
      row_number() over (
        order by
          user_scores.contribution_score desc,
          user_scores.collected_cat_count desc,
          user_scores.encounter_count desc,
          coalesce(nullif(trim(profiles.nickname), ''), '동네 냥냥단') asc,
          user_scores.user_id asc
      )::integer as rank,
      user_scores.user_id,
      coalesce(nullif(trim(profiles.nickname), ''), '동네 냥냥단') as nickname,
      profiles.profile_image_url,
      user_scores.contribution_score,
      user_scores.collected_cat_count,
      user_scores.encounter_count,
      user_scores.photo_count,
      coalesce(representative_cats.representative_cat_names, '{}'::text[]) as representative_cat_names,
      coalesce(representative_cats.representative_cat_image_urls, '{}'::text[]) as representative_cat_image_urls,
      coalesce(user_scores.user_id = auth.uid(), false) as is_me
    from user_scores
    left join public.profiles profiles
      on profiles.id = user_scores.user_id
    left join representative_cats
      on representative_cats.user_id = user_scores.user_id
  )
  select
    ranked.rank,
    ranked.user_id,
    ranked.nickname,
    ranked.profile_image_url,
    ranked.contribution_score,
    ranked.collected_cat_count,
    ranked.encounter_count,
    ranked.photo_count,
    ranked.representative_cat_names,
    ranked.representative_cat_image_urls,
    ranked.is_me
  from ranked
  where ranked.rank <= greatest(p_limit, 1)
     or ranked.user_id = auth.uid()
  order by ranked.rank asc;
$$;

revoke all on function public.get_neighborhood_leaderboard(text, integer, integer) from public;
grant execute on function public.get_neighborhood_leaderboard(text, integer, integer) to authenticated;
