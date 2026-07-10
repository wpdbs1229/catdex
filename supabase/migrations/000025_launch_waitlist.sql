create table if not exists public.launch_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_normalized text not null unique,
  platform text not null default 'unknown' check (platform in ('ios', 'android', 'both', 'unknown')),
  launch_notice_consent boolean not null default true,
  update_news_consent boolean not null default false,
  source text not null default 'docs_index',
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  consent_version text not null default 'launch_waitlist_2026_07_10',
  consent_text text not null default '출시 알림 발송을 위해 이메일을 수집·이용하는 데 동의합니다.',
  metadata jsonb not null default '{}'::jsonb,
  last_submitted_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint launch_waitlist_email_not_blank check (length(trim(email)) > 0),
  constraint launch_waitlist_email_normalized_not_blank check (length(trim(email_normalized)) > 0),
  constraint launch_waitlist_launch_consent_required check (launch_notice_consent)
);

create index if not exists idx_launch_waitlist_status_created
  on public.launch_waitlist(status, created_at desc);

create index if not exists idx_launch_waitlist_platform_status
  on public.launch_waitlist(platform, status);

drop trigger if exists launch_waitlist_set_updated_at on public.launch_waitlist;
create trigger launch_waitlist_set_updated_at
  before update on public.launch_waitlist
  for each row execute function public.set_updated_at();

alter table public.launch_waitlist enable row level security;

revoke all on table public.launch_waitlist from anon;
revoke all on table public.launch_waitlist from authenticated;
