-- 018_admin.sql
-- Adds gym suspension support and admin audit log

alter table gyms add column if not exists suspended_at timestamptz;

create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,         -- 'suspend_gym' | 'unsuspend_gym' | 'delete_gym'
  target_id uuid,
  target_name text,
  created_at timestamptz not null default now()
);
