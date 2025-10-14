-- Users table (simple mirror of auth.users or app-level users)
create table if not exists public.pan_users (
  id uuid primary key,
  email text,
  location text,
  created_at timestamp with time zone default now()
);

-- Notifications table
create table if not exists public.pan_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.pan_users(id) on delete cascade,
  query text not null,
  query_for_llm text,
  next_run_at timestamp with time zone,
  schedule_cron text,
  metadata jsonb default '{}'::jsonb,
  is_active boolean not null default true,
  is_next_run_scheduled boolean not null default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Jobs table
create table if not exists public.pan_jobs (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.pan_notifications(id) on delete cascade,
  run_at timestamp with time zone not null,
  response jsonb,
  status text not null check (status in ('scheduled', 'running', 'success', 'error')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Helpful indexes
create index if not exists idx_pan_notifications_next_run_at on public.pan_notifications(next_run_at) where is_active = true;
create index if not exists idx_pan_notifications_schedule_window on public.pan_notifications(next_run_at) where is_active = true and is_next_run_scheduled = false;
create index if not exists idx_pan_notifications_user on public.pan_notifications(user_id);
create index if not exists idx_pan_jobs_notification on public.pan_jobs(notification_id);
create index if not exists idx_pan_jobs_status_run_at on public.pan_jobs(status, run_at);

-- Trigger to update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_notifications_updated_at on public.notifications;
create trigger trg_notifications_updated_at
before update on public.pan_notifications
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_jobs_updated_at on public.pan_jobs;
create trigger trg_jobs_updated_at
before update on public.pan_jobs
for each row execute procedure public.set_updated_at();


