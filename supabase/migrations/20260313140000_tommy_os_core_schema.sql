-- Tommy D's OS Core Schema (v1 surgical migration)
-- Extend customers, jobs; add activities, job_notes; updated_at trigger.
-- Does NOT add job_files, activity_templates, or change payments.

-- -----------------------------------------------------------------------------
-- 0. Optional: FK from leads.converted_quote_id to quotes (if quotes exists; leverage_spine may have created leads without it)
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'quotes')
     and not exists (select 1 from information_schema.table_constraints where table_schema = 'public' and table_name = 'leads' and constraint_name = 'leads_converted_quote_id_fkey') then
    alter table public.leads add constraint leads_converted_quote_id_fkey foreign key (converted_quote_id) references public.quotes(id) on delete set null;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 1. Extend customers: address, city, state, zip
-- -----------------------------------------------------------------------------
alter table public.customers
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists zip text;

-- -----------------------------------------------------------------------------
-- 2. Extend jobs: project_type, updated_at
-- -----------------------------------------------------------------------------
alter table public.jobs
  add column if not exists project_type text,
  add column if not exists updated_at timestamptz default now();

-- -----------------------------------------------------------------------------
-- 3. Expand job_status enum (add new values, then migrate existing rows)
-- -----------------------------------------------------------------------------
alter type public.job_status add value if not exists 'consultation_scheduled';
alter type public.job_status add value if not exists 'measured';
alter type public.job_status add value if not exists 'quote_sent';
alter type public.job_status add value if not exists 'approved';
alter type public.job_status add value if not exists 'installed';
alter type public.job_status add value if not exists 'closed';

update public.jobs set status = 'installed' where status = 'completed';
update public.jobs set status = 'scheduled' where status = 'in_progress';

-- -----------------------------------------------------------------------------
-- 4. Activity and job_note enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.activity_type as enum (
    'created', 'note', 'consultation', 'pre_measure', 'measure', 'design',
    'quote_sent', 'follow_up', 'customer_acceptance', 'deposit_received',
    'schedule_install', 'walkthrough', 'install', 'payment_received'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.activity_status as enum ('pending', 'completed', 'canceled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.job_note_type as enum ('internal', 'customer', 'installer', 'sales');
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- 5. activities table
-- -----------------------------------------------------------------------------
create table if not exists public.activities (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  type public.activity_type not null,
  title text,
  description text,
  scheduled_date timestamptz,
  assigned_to uuid references public.profiles(user_id) on delete set null,
  status public.activity_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists idx_activities_job_id on public.activities(job_id);
create index if not exists idx_activities_scheduled_date on public.activities(scheduled_date);
create index if not exists idx_activities_type on public.activities(type);

alter table public.activities enable row level security;

drop policy if exists "activities admin manager rw" on public.activities;
create policy "activities admin manager rw"
on public.activities
for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

drop policy if exists "activities installer read assigned" on public.activities;
create policy "activities installer read assigned"
on public.activities
for select
using (
  public.current_role() = 'installer'
  and exists (
    select 1 from public.jobs j
    where j.id = activities.job_id and j.assigned_installer_id = auth.uid()
  )
);

drop policy if exists "activities installer insert update assigned" on public.activities;
create policy "activities installer insert update assigned"
on public.activities
for insert
with check (
  public.current_role() = 'installer'
  and exists (
    select 1 from public.jobs j
    where j.id = activities.job_id and j.assigned_installer_id = auth.uid()
  )
);
drop policy if exists "activities installer update assigned" on public.activities;
create policy "activities installer update assigned"
on public.activities
for update
using (
  public.current_role() = 'installer'
  and exists (
    select 1 from public.jobs j
    where j.id = activities.job_id and j.assigned_installer_id = auth.uid()
  )
)
with check (
  public.current_role() = 'installer'
  and exists (
    select 1 from public.jobs j
    where j.id = activities.job_id and j.assigned_installer_id = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- 6. job_notes table
-- -----------------------------------------------------------------------------
create table if not exists public.job_notes (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  note_type public.job_note_type not null,
  note text not null,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_job_notes_job_id on public.job_notes(job_id);

alter table public.job_notes enable row level security;

drop policy if exists "job_notes admin manager rw" on public.job_notes;
create policy "job_notes admin manager rw"
on public.job_notes
for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

drop policy if exists "job_notes installer read assigned" on public.job_notes;
create policy "job_notes installer read assigned"
on public.job_notes
for select
using (
  public.current_role() = 'installer'
  and exists (
    select 1 from public.jobs j
    where j.id = job_notes.job_id and j.assigned_installer_id = auth.uid()
  )
);

drop policy if exists "job_notes installer insert assigned" on public.job_notes;
create policy "job_notes installer insert assigned"
on public.job_notes
for insert
with check (
  public.current_role() = 'installer'
  and exists (
    select 1 from public.jobs j
    where j.id = job_notes.job_id and j.assigned_installer_id = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- 7. updated_at trigger on jobs
-- -----------------------------------------------------------------------------
create or replace function public.set_jobs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_jobs_updated_at on public.jobs;
create trigger trg_jobs_updated_at
before update on public.jobs
for each row execute function public.set_jobs_updated_at();

-- -----------------------------------------------------------------------------
-- 8. Installer job update: allow new statuses (scheduled, installed)
-- -----------------------------------------------------------------------------
create or replace function public.enforce_installer_job_update_permissions()
returns trigger
language plpgsql
as $$
declare
  v_role text;
begin
  v_role := public.current_role();

  if v_role = 'installer' then
    if new.customer_id is distinct from old.customer_id
      or new.title is distinct from old.title
      or new.address_line1 is distinct from old.address_line1
      or new.address_line2 is distinct from old.address_line2
      or new.city is distinct from old.city
      or new.state is distinct from old.state
      or new.zip is distinct from old.zip
      or new.scheduled_start is distinct from old.scheduled_start
      or new.scheduled_end is distinct from old.scheduled_end
      or new.assigned_installer_id is distinct from old.assigned_installer_id
    then
      raise exception 'Installers cannot modify schedule or core job details'
        using errcode = '42501';
    end if;

    if new.status is distinct from old.status
      and new.status not in ('in_progress', 'completed', 'scheduled', 'installed')
    then
      raise exception 'Installers can only set job status to in_progress, completed, scheduled, or installed'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;
