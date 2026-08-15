-- 고양이 신고 사유에서 '중복 등록'을 뺀다. 같은 개체가 두 번 등록되는 문제는
-- 신고가 아니라 촬영 매칭이 풀 일이고, 이 사유로 접수된 기록도 없다.

alter table public.reports drop constraint reports_reason_check;

alter table public.reports add constraint reports_reason_check
  check (reason = any (array['inappropriate_photo'::text, 'location_risk'::text, 'incorrect_info'::text, 'other'::text]));
