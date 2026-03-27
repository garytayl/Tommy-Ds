-- Standalone calendar entries (meetings, PTO, reminders) for admin schedule.
-- RLS: admin/manager full CRUD only (schedule is admin UI).

create table if not exists public.schedule_events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  job_id uuid references public.jobs(id) on delete set null,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_schedule_events_starts_at on public.schedule_events(starts_at);
create index if not exists idx_schedule_events_ends_at on public.schedule_events(ends_at);
create index if not exists idx_schedule_events_job_id on public.schedule_events(job_id);

create or replace function public.set_schedule_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_schedule_events_updated_at on public.schedule_events;
create trigger trg_schedule_events_updated_at
before update on public.schedule_events
for each row execute function public.set_schedule_events_updated_at();

alter table public.schedule_events enable row level security;

drop policy if exists "schedule_events admin manager rw" on public.schedule_events;
create policy "schedule_events admin manager rw"
on public.schedule_events
for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));
