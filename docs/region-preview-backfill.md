# 지역 미리보기 데이터 백필 전략

## 배경

홈 개인 지도는 `cat_encounters`를 기준으로 내 고양이 미리보기를 만들지만, 지도 좌표와 반경은 `regions`에서 찾는다. `regions`가 비어 있으면 기존 관찰 기록이 있어도 앱은 지역별 실제 중심점을 찾지 못해 `37.5, 126.76` 기본 좌표에 머문다.

공유 지도와 도감의 지역명 보조 정보는 `cat_regions`를 사용한다. `cat_regions`가 비어 있거나 집계가 오래되면 지역별 고양이 미리보기와 발견 횟수가 실제 `cat_encounters`와 어긋난다.

2026-06-12 기준 원격 프로젝트 `wqiqdybzhbmsvccpklli`를 읽기 쿼리로 확인했을 때, 현재 row 수는 `cat_encounters=29`, `regions=3`, `region_cats=6`, `cat_regions=6`이었다. 다만 `cat_regions.encounter_count` 합계는 실제 encounter 집계보다 낮아 보정 migration이 여전히 필요하다.

## 전략

1. `cat_encounters.region_name`을 원천 데이터로 사용한다.
2. 이미 알고 있는 지역은 명시적 seed 중심점으로 `regions`를 upsert한다.
3. seed에 없는 과거 지역명은 정확 좌표를 만들지 않고, 기본 좌표에 모두 겹치지 않도록 결정적 coarse 좌표와 큰 반경을 부여한다.
4. `cat_regions`는 공개 가능한 `cat_encounters`를 지역-고양이 단위로 그룹화해 `first_seen_at`, `last_seen_at`, `encounter_count`를 보정한다.
5. 구버전 코드 호환을 위해 `region_cats`는 첫 encounter 소유자 기준으로 최소 보강하되, 현재 앱의 개인 지도/공유 지도 판단에는 사용하지 않는다.

추가 migration은 [000022_backfill_region_preview_data.sql](/Users/persimmontree/IdeaProjects/catdex/supabase/migrations/000022_backfill_region_preview_data.sql)에 둔다.

## 앱 영향

- 홈 개인 지도: 기존 관찰 기록이 있으면 지역 row를 찾을 수 있어 기본 좌표 fallback에 겹치지 않는다.
- 홈 개인 지도 고양이 미리보기: 기존처럼 `cat_encounters`의 cat id로 `cats`를 조회하므로 앱 코드 변경 없이 표시된다.
- 공유 지도: `cat_regions`가 채워져 지역별 고양이 목록과 미리보기가 표시된다.
- 도감 카드 지역명: `fetchCatRegionNames()`가 `cat_regions -> regions` 조인을 사용하므로 기존 고양이에 지역명이 붙는다.
- 위치 정책: 정확 GPS/EXIF 위치를 새로 저장하지 않는다. 일반 사용자 화면에는 지역명, coarse 중심점, 반경만 사용한다.
- 빈 상태: 사용자의 `cat_encounters`가 실제로 0건이면 기존 빈 상태가 유지된다.

## 검증

적용 후 아래 값이 모두 `0`이어야 한다.

```sql
with encounter_regions as (
  select distinct trim(region_name) as region_name
  from public.cat_encounters
  where region_name is not null
    and length(trim(region_name)) > 0
),
encounter_region_cats as (
  select
    regions.id as region_id,
    encounters.cat_id,
    count(*)::integer as encounter_count
  from public.cat_encounters encounters
  join public.regions regions
    on regions.name = trim(encounters.region_name)
  where encounters.region_name is not null
    and length(trim(encounters.region_name)) > 0
    and coalesce(encounters.is_public, true)
  group by regions.id, encounters.cat_id
)
select
  (
    select count(*)
    from encounter_regions
    left join public.regions regions
      on regions.name = encounter_regions.region_name
    where regions.id is null
  ) as missing_region_rows,
  (
    select count(*)
    from encounter_region_cats
    left join public.cat_regions cat_regions
      on cat_regions.region_id = encounter_region_cats.region_id
     and cat_regions.cat_id = encounter_region_cats.cat_id
    where cat_regions.cat_id is null
  ) as missing_cat_region_rows,
  (
    select count(*)
    from encounter_region_cats
    join public.cat_regions cat_regions
      on cat_regions.region_id = encounter_region_cats.region_id
     and cat_regions.cat_id = encounter_region_cats.cat_id
    where cat_regions.encounter_count <> encounter_region_cats.encounter_count
  ) as stale_cat_region_counts;
```

클라이언트 검증은 `catdex-client`에서 `npm run typecheck`를 기본으로 실행한다. 화면 검증 시에는 홈 개인 지도에 지역 카드/마커와 고양이 미리보기가 보이는지, 공유 지도 권한이 있는 계정에서 지역별 고양이 목록이 보이는지 확인한다.
