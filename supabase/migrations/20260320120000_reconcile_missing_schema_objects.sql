-- Reconcile environments where some historical migrations were skipped.
-- Safe to run repeatedly.

-- ---------------------------------------------------------------------------
-- Quotes + quote items (from 20260310160000_quotes.sql)
-- ---------------------------------------------------------------------------
do $$ begin
  create type quote_status as enum ('draft', 'sent', 'accepted', 'declined');
exception when duplicate_object then null;
end $$;

create table if not exists public.quotes (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  title text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null default 'IN',
  zip text not null,
  status quote_status not null default 'draft',
  subtotal_cents int not null default 0,
  tax_cents int not null default 0,
  total_cents int not null default 0,
  notes text,
  job_id uuid references public.jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.quote_items (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  description text not null,
  qty numeric not null default 1,
  unit_price_cents int not null,
  line_total_cents int not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_quotes_customer_id on public.quotes(customer_id);
create index if not exists idx_quotes_job_id on public.quotes(job_id);
create index if not exists idx_quotes_status on public.quotes(status);
create index if not exists idx_quote_items_quote_id on public.quote_items(quote_id);

create or replace function public.recompute_quote_totals(p_quote_id uuid)
returns void
language plpgsql
as $$
declare
  v_sub int;
  v_tax int;
  v_total int;
begin
  select coalesce(sum(line_total_cents), 0)
    into v_sub
  from public.quote_items
  where quote_id = p_quote_id;

  select tax_cents into v_tax from public.quotes where id = p_quote_id;
  v_total := coalesce(v_sub, 0) + coalesce(v_tax, 0);

  update public.quotes
  set subtotal_cents = coalesce(v_sub, 0),
      total_cents = v_total
  where id = p_quote_id;
end;
$$;

create or replace function public.recompute_quote_totals_on_item_change()
returns trigger
language plpgsql
as $$
begin
  perform public.recompute_quote_totals(coalesce(new.quote_id, old.quote_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_recompute_quote_totals_on_item_change on public.quote_items;
create trigger trg_recompute_quote_totals_on_item_change
after insert or update or delete on public.quote_items
for each row execute function public.recompute_quote_totals_on_item_change();

alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;

drop policy if exists "quotes admin rw" on public.quotes;
create policy "quotes admin rw"
on public.quotes
for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

drop policy if exists "quote_items admin rw" on public.quote_items;
create policy "quote_items admin rw"
on public.quote_items
for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

-- Ensure leverage_spine quote->lead link exists even if quotes was created later.
alter table public.quotes
  add column if not exists lead_id uuid references public.leads(id) on delete set null;
create index if not exists idx_quotes_lead_id on public.quotes(lead_id) where lead_id is not null;

-- ---------------------------------------------------------------------------
-- Lots + inventory + materials barcode (from 20260310170000_lots_inventory_barcodes.sql)
-- ---------------------------------------------------------------------------
alter table public.materials
  add column if not exists barcode text unique;

create index if not exists idx_materials_barcode on public.materials(barcode) where barcode is not null;

create table if not exists public.lots (
  id uuid primary key default uuid_generate_v4(),
  location_id uuid not null references public.locations(id) on delete cascade,
  barcode text unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory (
  id uuid primary key default uuid_generate_v4(),
  material_id uuid not null references public.materials(id) on delete cascade,
  lot_id uuid not null references public.lots(id) on delete cascade,
  quantity numeric not null default 0 check (quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (material_id, lot_id)
);

create index if not exists idx_lots_location_id on public.lots(location_id);
create index if not exists idx_lots_barcode on public.lots(barcode) where barcode is not null;
create index if not exists idx_inventory_material_id on public.inventory(material_id);
create index if not exists idx_inventory_lot_id on public.inventory(lot_id);

alter table public.lots enable row level security;
alter table public.inventory enable row level security;

drop policy if exists "lots admin manager rw" on public.lots;
create policy "lots admin manager rw"
on public.lots for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

drop policy if exists "lots installer read" on public.lots;
create policy "lots installer read"
on public.lots for select
using (public.current_role() = 'installer');

drop policy if exists "inventory admin manager rw" on public.inventory;
create policy "inventory admin manager rw"
on public.inventory for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

drop policy if exists "inventory installer read" on public.inventory;
create policy "inventory installer read"
on public.inventory for select
using (public.current_role() = 'installer');

-- ---------------------------------------------------------------------------
-- Core activity + job notes objects (from 20260313140000_tommy_os_core_schema.sql)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Onboarding completion tracking (from 20260320103000_profiles_onboarding_completed.sql)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;

update public.profiles
set onboarding_completed_at = coalesce(onboarding_completed_at, created_at, now())
where onboarding_completed_at is null;
