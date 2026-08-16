-- 교육용 고객 '보리' 시드
--
-- 첫 사용자 온보딩(신입 사원 첫 업무)에서 등록 연습에 쓰는 전역 공용 개체다.
-- 개체는 이 한 마리뿐이고, 사용자마다 record_cat_encounter로 만남 기록을
-- 남겨 수집한다. id·이름·구역은 클라이언트 상수(training.constants.ts)와
-- 같아야 한다.

-- 시드 개체는 누구의 소유도 아니다. 계정이 지워져도 함께 사라지면 안 된다.
alter table public.cats alter column user_id drop not null;

-- 연수원 구역. 좌표를 정해 두지 않으면 placeholder(부천 기본 좌표)로 만들어져
-- 고객 지도에서 진짜 동네와 겹쳐 보인다. 세종 정부청사 언저리에 둔다 -
-- 공기업 연수원의 농담이자, 실제 동네 기록과 부딪힐 일이 없는 자리다.
select private.ensure_region('냥냥공사 연수원', 36.5040, 127.2494);

insert into public.cats (
  id,
  user_id,
  created_by,
  number,
  name,
  coat_colors,
  coat_pattern,
  habitat,
  rarity,
  rarity_reasons,
  encounter_count,
  first_seen_at,
  last_seen_at,
  tags,
  memo,
  image_url,
  representative_photo_url
)
select
  '00000000-0000-0000-0000-00000000b021',
  null,
  null,
  coalesce(max(number), 0) + 1,
  '보리',
  '{orange,white}',
  'tabby',
  'house',
  1,
  '{"교육용 고객"}',
  1,
  current_date,
  current_date,
  '{}',
  '대한냥냥공사 연수원의 교육 담당 고객님. 신입 사원의 첫 등록을 도와준다.',
  'https://wpdbs1229.github.io/catdex/assets/bori-cat.png',
  'https://wpdbs1229.github.io/catdex/assets/bori-cat.png'
from public.cats
on conflict (id) do nothing;

-- remove_my_cat_encounter는 마지막 만남 기록이 사라진 개체를 함께 지운다.
-- 첫 사용자가 보리 기록을 지우면 시드가 통째로 사라져 다음 신입의 온보딩이
-- 깨지므로, 보리만은 삭제를 조용히 무시한다.
create or replace function private.protect_training_cat()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if old.id = '00000000-0000-0000-0000-00000000b021' then
    return null;
  end if;

  return old;
end;
$$;

drop trigger if exists protect_training_cat on public.cats;

create trigger protect_training_cat
  before delete on public.cats
  for each row
  execute function private.protect_training_cat();
