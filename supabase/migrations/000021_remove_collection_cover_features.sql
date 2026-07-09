drop table if exists public.collection_profiles cascade;
drop table if exists public.collection_themes cascade;
drop table if exists public.user_season_stamps cascade;
drop table if exists public.season_stamps cascade;

drop function if exists private.refresh_user_badges_from_collection_profile();
drop function if exists private.validate_collection_profile();

update public.badges
set
  name = '대표 고양이 설정',
  description = '내 사원증과 홈에 보여줄 대표 고양이를 설정했어요.'
where id = 'collection-starter';
