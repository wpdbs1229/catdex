update public.collection_profiles
set cover_theme_id = case cover_theme_id
  when 'spring-flower-alley' then 'field-note'
  when 'summer-awning-shade' then 'sunny-window'
  when 'night-alley' then 'moonlight-lamp-alley'
  when 'sticker-drawer' then 'prague-rooftop'
  when 'pastel-paw-drawer' then 'prague-rooftop'
  else cover_theme_id
end
where cover_theme_id in (
  'spring-flower-alley',
  'summer-awning-shade',
  'night-alley',
  'sticker-drawer',
  'pastel-paw-drawer'
);

delete from public.collection_themes
where id in (
  'spring-flower-alley',
  'summer-awning-shade',
  'night-alley',
  'sticker-drawer',
  'pastel-paw-drawer'
);
