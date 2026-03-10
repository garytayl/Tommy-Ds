-- Crews for organizing schedule and jobs (Windows and Doors vs Garage Doors)
-- Crews: Joe & Michael, Steven, Chris and Jeremiah, Aaron and Cory

create table if not exists public.crews (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  specialty text not null default 'Windows and Doors',
  created_at timestamptz not null default now()
);

create table if not exists public.crew_members (
  id uuid primary key default uuid_generate_v4(),
  crew_id uuid not null references public.crews(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (crew_id, user_id)
);

alter table public.jobs
  add column if not exists assigned_crew_id uuid references public.crews(id) on delete set null;

create index if not exists idx_crew_members_crew_id on public.crew_members(crew_id);
create index if not exists idx_crew_members_user_id on public.crew_members(user_id);
create index if not exists idx_jobs_assigned_crew_id on public.jobs(assigned_crew_id);

-- RLS
alter table public.crews enable row level security;
alter table public.crew_members enable row level security;

drop policy if exists "crews admin manager rw" on public.crews;
create policy "crews admin manager rw"
on public.crews for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

drop policy if exists "crew_members admin manager rw" on public.crew_members;
create policy "crew_members admin manager rw"
on public.crew_members for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

drop policy if exists "crews installer read" on public.crews;
create policy "crews installer read"
on public.crews for select
using (public.current_role() = 'installer');

drop policy if exists "crew_members installer read" on public.crew_members;
create policy "crew_members installer read"
on public.crew_members for select
using (public.current_role() = 'installer');

-- Seed the four crews (idempotent by id)
insert into public.crews (id, name, specialty) values
  ('f6000001-0000-4000-8000-000000000001', 'Joe & Michael', 'Windows and Doors'),
  ('f6000001-0000-4000-8000-000000000002', 'Steven', 'Garage Doors'),
  ('f6000001-0000-4000-8000-000000000003', 'Chris and Jeremiah', 'Windows and Doors'),
  ('f6000001-0000-4000-8000-000000000004', 'Aaron and Cory', 'Windows and Doors')
on conflict (id) do update set name = excluded.name, specialty = excluded.specialty;
