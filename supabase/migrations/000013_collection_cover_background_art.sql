insert into public.collection_themes (id, name, description, palette, is_premium, sort_order) values
  (
    'field-note',
    '노을 언덕 도감',
    '들꽃 언덕과 멀리 보이는 지붕을 담은 따뜻한 기본 표지',
    'sunset-hill',
    false,
    10
  ),
  (
    'sunny-window',
    '여름 강가 도감',
    '갈대와 징검돌, 맑은 하늘이 어울리는 시원한 기본 표지',
    'summer-river',
    false,
    20
  ),
  (
    'storybook-forest-path',
    '이끼숲 산책 도감',
    '햇살이 내려앉은 이끼숲 산책길의 냥꾸러미 표지',
    'moss-forest',
    true,
    110
  ),
  (
    'moonlight-lamp-alley',
    '비 오는 골목정원 도감',
    '수국과 젖은 골목, 따뜻한 창문빛을 담은 냥꾸러미 표지',
    'rain-garden',
    true,
    120
  ),
  (
    'prague-rooftop',
    '단풍 신사길 도감',
    '단풍잎과 등불이 어울리는 가을 산책길 냥꾸러미 표지',
    'autumn-shrine',
    true,
    130
  ),
  (
    'winter-blanket',
    '눈 내린 마을 도감',
    '눈길과 발자국, 조용한 마을 감성의 겨울 냥꾸러미 표지',
    'snow-village',
    true,
    140
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  palette = excluded.palette,
  is_premium = excluded.is_premium,
  sort_order = excluded.sort_order;
