-- 비품 가격을 "한 달이면 방을 다 꾸민다"에 맞춰 다시 짠다.
--
-- 예전 가격은 400~2,600(6.5배)이라 초반과 후반 아이템의 무게가 거의 같았고,
-- 고양이 행동을 여는 상호작용 가구가 순수 장식보다 싸서 가격이 재미를
-- 반영하지 못했다.
--
-- 수입은 서버에 박힌 지급액 그대로다(만남 100 / 신규 수집 보너스 400 /
-- 첫 발견 상담 300 / 반복 상담 100). 하루 3마리를 만나는 사용자를 기준으로
-- 30일 누적 약 33,000P가 쌓이므로, 카탈로그 25,000P + 방 확장 8,000P로 맞췄다.
--
-- 가격 폭은 200~3,000(15배)이고, 상호작용 가구가 가장 비싸다.

update public.support_room_catalog as c
set price = v.price
from (values
  ('agency_wall_sign', 800),
  ('bulletin_board_customer', 700),
  ('consultation_desk_honey', 900),
  ('customer_water_station', 2600),
  ('document_box_olive', 1200),
  ('document_organizer_cream', 250),
  ('employee_award_frame', 400),
  ('file_cabinet_olive', 800),
  ('floor_lamp_warm', 650),
  ('flooring_cream_terrazzo', 1000),
  ('flooring_warm_gray_carpet', 800),
  ('low_bookshelf_honey', 600),
  ('meeting_table_round', 1200),
  ('office_partition_cream', 500),
  ('office_sofa_sage', 1200),
  ('paw_stamp_pad_orange', 1800),
  ('plant_large_rubber', 450),
  ('plant_small_desk', 200),
  ('reception_desk_cream', 1100),
  ('service_bell_brass', 2400),
  ('umbrella_stand_olive', 350),
  ('wall_clock_agency', 300),
  ('wall_shelf_honey', 500),
  ('wallpaper_apricot_pinstripe', 700),
  ('wallpaper_sage_linen', 600),
  ('window_bench', 3000)
) as v(item_id, price)
where c.item_id = v.item_id and c.price is distinct from v.price;
