-- 비품상점 시드 상품.
--
-- 상점·인벤토리(보유 비품) 화면이 열려 있는데 상품이 하나도 없었다.
-- 시안(보유 비품)의 다섯 상품을 심는다. 이미지 스와치는 시안에서 오려
-- GitHub Pages(docs/assets/shop)로 서빙한다. store_product_id는 비워 둔다 -
-- 스토어 콘솔에 실물이 올라가면 그때 채우고, 그전에는 결제 없이 소유 처리된다.
--
-- 시안의 '따뜻한 신입사원 세트'(묶음 상품)는 카테고리 체계(배경지·케이스·라벨)에
-- 없어 이번 시드에서 뺐다. 묶음은 별도 기획(카테고리·장착 규칙)이 필요하다.

insert into public.shop_items (id, category, name, price_krw, description, swatch_image_url, asset_image_url, sort_order)
values
  (
    '00000000-0000-0000-0000-0000005b0b01',
    'background',
    '별빛 배경지',
    1900,
    '보랏빛 밤하늘에 별이 잔잔히 깔린 배경지예요.',
    'https://wpdbs1229.github.io/catdex/assets/shop/starlight-bg.png',
    'https://wpdbs1229.github.io/catdex/assets/shop/starlight-bg.png',
    1
  ),
  (
    '00000000-0000-0000-0000-0000005b0b02',
    'background',
    '체크 배경지',
    1900,
    '분홍 체크가 포근한 배경지예요.',
    'https://wpdbs1229.github.io/catdex/assets/shop/check-bg.png',
    'https://wpdbs1229.github.io/catdex/assets/shop/check-bg.png',
    2
  ),
  (
    '00000000-0000-0000-0000-0000005b0b03',
    'case',
    '호박빛 케이스',
    2900,
    '은은한 호박빛이 도는 파일 케이스예요.',
    'https://wpdbs1229.github.io/catdex/assets/shop/amber-case.png',
    'https://wpdbs1229.github.io/catdex/assets/shop/amber-case.png',
    1
  ),
  (
    '00000000-0000-0000-0000-0000005b0b04',
    'label',
    '금빛 공사 도장',
    2400,
    '대한냥냥공사의 금빛 발도장이에요.',
    'https://wpdbs1229.github.io/catdex/assets/shop/gold-stamp.png',
    'https://wpdbs1229.github.io/catdex/assets/shop/gold-stamp.png',
    1
  ),
  (
    '00000000-0000-0000-0000-0000005b0b05',
    'label',
    '고객 우선 라벨',
    1900,
    '고객 우선! 파일 모서리에 붙이는 다짐 라벨이에요.',
    -- 가로로 긴 라벨이라 1:1 스와치용은 정사각 여백판을 따로 쓴다.
    'https://wpdbs1229.github.io/catdex/assets/shop/priority-label-swatch.png',
    'https://wpdbs1229.github.io/catdex/assets/shop/priority-label.png',
    2
  )
on conflict (id) do nothing;
