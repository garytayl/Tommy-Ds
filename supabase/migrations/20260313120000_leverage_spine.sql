-- Leverage spine: leads, appointments, communication_log, audit_log, products
-- Connects: lead → quote → job → invoice → payment
-- Enables: attribution, reschedule history, company memory, trust, product/specs

-- -----------------------------------------------------------------------------
-- 1. Lead tracking + marketing attribution
-- -----------------------------------------------------------------------------
do $$ begin
  create type lead_source as enum (
    'google_ads',
    'facebook_ads',
    'referral',
    'organic',
    'repeat_customer',
    'yard_sign',
    'walk_in',
    'other'
  );
exception when duplicate_object then null;
end $$;

-- leads: converted_quote_id as plain uuid so this migration can run before quotes exists (e.g. if migrations run out of order)
create table if not exists public.leads (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  source lead_source not null default 'other',
  campaign text,
  notes text,
  created_at timestamptz not null default now(),
  converted_job_id uuid references public.jobs(id) on delete set null,
  converted_quote_id uuid
);

create index if not exists idx_leads_customer_id on public.leads(customer_id);
create index if not exists idx_leads_source on public.leads(source);
create index if not exists idx_leads_created_at on public.leads(created_at);
create index if not exists idx_leads_converted_job_id on public.leads(converted_job_id) where converted_job_id is not null;

alter table public.leads enable row level security;
drop policy if exists "leads admin manager rw" on public.leads;
create policy "leads admin manager rw"
on public.leads for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

-- Optional: link quote to lead when creating quote from lead (only if quotes table exists)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'quotes') then
    alter table public.quotes add column if not exists lead_id uuid references public.leads(id) on delete set null;
    create index if not exists idx_quotes_lead_id on public.quotes(lead_id) where lead_id is not null;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Appointment history (scheduling maturity)
-- -----------------------------------------------------------------------------
do $$ begin
  create type appointment_status as enum (
    'scheduled',
    'completed',
    'no_show',
    'canceled',
    'rescheduled'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.appointments (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  status appointment_status not null default 'scheduled',
  notes text,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_appointments_job_id on public.appointments(job_id);
create index if not exists idx_appointments_scheduled_start on public.appointments(scheduled_start);
create index if not exists idx_appointments_status on public.appointments(status);

alter table public.appointments enable row level security;
drop policy if exists "appointments admin manager rw" on public.appointments;
create policy "appointments admin manager rw"
on public.appointments for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));
drop policy if exists "appointments installer read assigned" on public.appointments;
create policy "appointments installer read assigned"
on public.appointments for select
using (
  public.current_role() = 'installer'
  and exists (
    select 1 from public.jobs j
    where j.id = appointments.job_id and j.assigned_installer_id = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- 3. Communication log (company memory)
-- -----------------------------------------------------------------------------
do $$ begin
  create type communication_channel as enum ('call', 'sms', 'email', 'in_person');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type communication_direction as enum ('inbound', 'outbound');
exception when duplicate_object then null;
end $$;

create table if not exists public.communication_log (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references public.jobs(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  channel communication_channel not null,
  direction communication_direction not null,
  summary text not null,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_communication_log_job_id on public.communication_log(job_id) where job_id is not null;
create index if not exists idx_communication_log_customer_id on public.communication_log(customer_id);
create index if not exists idx_communication_log_created_at on public.communication_log(created_at);

alter table public.communication_log enable row level security;
drop policy if exists "communication_log admin manager rw" on public.communication_log;
create policy "communication_log admin manager rw"
on public.communication_log for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));
drop policy if exists "communication_log installer read assigned" on public.communication_log;
create policy "communication_log installer read assigned"
on public.communication_log for select
using (
  public.current_role() = 'installer'
  and exists (
    select 1 from public.jobs j
    where j.id = communication_log.job_id and j.assigned_installer_id = auth.uid()
  )
);
drop policy if exists "communication_log installer insert assigned" on public.communication_log;
create policy "communication_log installer insert assigned"
on public.communication_log for insert
with check (
  public.current_role() = 'installer'
  and (
    communication_log.job_id is null
    or exists (
      select 1 from public.jobs j
      where j.id = communication_log.job_id and j.assigned_installer_id = auth.uid()
    )
  )
);

-- -----------------------------------------------------------------------------
-- 4. Audit trail (nothing disappears)
-- -----------------------------------------------------------------------------
do $$ begin
  create type audit_entity_type as enum (
    'job',
    'invoice',
    'invoice_item',
    'quote',
    'quote_item',
    'customer',
    'payment',
    'lead',
    'appointment'
  );
exception when duplicate_object then null;
end $$;
do $$ begin
  create type audit_action as enum ('insert', 'update', 'delete');
exception when duplicate_object then null;
end $$;

create table if not exists public.audit_log (
  id uuid primary key default uuid_generate_v4(),
  entity_type audit_entity_type not null,
  entity_id uuid not null,
  action audit_action not null,
  changed_by uuid references public.profiles(user_id) on delete set null,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_entity on public.audit_log(entity_type, entity_id);
create index if not exists idx_audit_log_created_at on public.audit_log(created_at);
create index if not exists idx_audit_log_changed_by on public.audit_log(changed_by) where changed_by is not null;

alter table public.audit_log enable row level security;
drop policy if exists "audit_log admin manager read" on public.audit_log;
create policy "audit_log admin manager read"
on public.audit_log for select
using (public.current_role() in ('admin', 'manager'));
-- Inserts from server (service role bypasses RLS; session as admin/manager can insert)
drop policy if exists "audit_log admin manager insert" on public.audit_log;
create policy "audit_log admin manager insert"
on public.audit_log for insert
with check (public.current_role() in ('admin', 'manager'));

-- -----------------------------------------------------------------------------
-- 5. Product catalog (replacing free-text line items)
-- -----------------------------------------------------------------------------
do $$ begin
  create type product_type as enum ('door', 'window', 'labor', 'part', 'other');
exception when duplicate_object then null;
end $$;

create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sku text,
  type product_type not null default 'other',
  manufacturer text,
  default_unit_price_cents int,
  unit text not null default 'each',
  created_at timestamptz not null default now()
);

create index if not exists idx_products_type on public.products(type);
create index if not exists idx_products_sku on public.products(sku) where sku is not null;

alter table public.products enable row level security;
drop policy if exists "products admin manager rw" on public.products;
create policy "products admin manager rw"
on public.products for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));
drop policy if exists "products installer read" on public.products;
create policy "products installer read"
on public.products for select
using (public.current_role() = 'installer');

-- Link quote_items and invoice_items to product (optional; only if tables exist)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'quote_items') then
    execute 'alter table public.quote_items add column if not exists product_id uuid references public.products(id) on delete set null';
    execute 'create index if not exists idx_quote_items_product_id on public.quote_items(product_id) where product_id is not null';
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'invoice_items') then
    execute 'alter table public.invoice_items add column if not exists product_id uuid references public.products(id) on delete set null';
    execute 'create index if not exists idx_invoice_items_product_id on public.invoice_items(product_id) where product_id is not null';
  end if;
end $$;
