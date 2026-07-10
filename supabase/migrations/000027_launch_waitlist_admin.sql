create schema if not exists private;

create table if not exists private.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('owner', 'admin')),
  note text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists idx_admin_users_active
  on private.admin_users(user_id)
  where revoked_at is null;

create table if not exists private.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target text not null,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_logs_actor_created
  on private.admin_audit_logs(actor_user_id, created_at desc);

create index if not exists idx_admin_audit_logs_target_created
  on private.admin_audit_logs(target, created_at desc);

alter table private.admin_users enable row level security;
alter table private.admin_audit_logs enable row level security;

revoke all on table private.admin_users from anon;
revoke all on table private.admin_users from authenticated;
revoke all on table private.admin_audit_logs from anon;
revoke all on table private.admin_audit_logs from authenticated;
