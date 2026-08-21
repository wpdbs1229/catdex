-- 기본 방에 이미 놓여 있는 가구를 시작 지급으로 바꾼다.
--
-- 상담 책상·플로어 조명·작은 책상 화분은 처음부터 방에 놓여 있는데
-- acquisition이 welfarePoint라 "사야 하는 물건"으로 잡혔다. 그래서
-- 보관함에 안 보이고, 방에서 빼면 다시 놓을 방법이 없었다.
--
-- 카탈로그 합계는 25,000P에서 23,250P가 된다. 확장 8,000P를 더하면
-- 31,250P이고, 하루 3마리 기준 30일 누적 33,340P 안에 그대로 들어온다.

update public.support_room_catalog
set acquisition = 'starter', price = 0
where item_id in ('consultation_desk_honey', 'floor_lamp_warm', 'plant_small_desk');
