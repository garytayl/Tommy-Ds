-- Field Service Scheduler MVP schema
-- Next.js + Supabase + Stripe

create extension if not exists "uuid-ossp";

do $$ begin
  create type job_status as enum ('lead','scheduled','in_progress','completed','paid','canceled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type invoice_status as enum ('draft','sent','partially_paid','paid','void');
exception when duplicate_object then null;
end $$;

-- PROFILES (linked to auth.users)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','installer','manager')),
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

-- CUSTOMERS
create table if not exists public.customers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

-- JOBS
create table if not exists public.jobs (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  title text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null default 'IN',
  zip text not null,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  assigned_installer_id uuid references public.profiles(user_id) on delete set null,
  status job_status not null default 'lead',
  notes text,
  created_at timestamptz not null default now()
);

-- INVOICES
create table if not exists public.invoices (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  status invoice_status not null default 'draft',
  subtotal_cents int not null default 0,
  tax_cents int not null default 0,
  total_cents int not null default 0,
  deposit_paid_cents int not null default 0,
  balance_due_cents int not null default 0,
  stripe_customer_id text,
  stripe_invoice_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.invoice_items (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  qty numeric not null default 1,
  unit_price_cents int not null,
  line_total_cents int not null,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount_cents int not null,
  provider text not null default 'stripe',
  provider_payment_intent_id text,
  status text not null check (status in (
    'requires_payment_method',
    'requires_confirmation',
    'processing',
    'succeeded',
    'canceled',
    'failed',
    'refunded'
  )),
  created_at timestamptz not null default now()
);

create table if not exists public.job_photos (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  uploader_id uuid references public.profiles(user_id) on delete set null,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create index if not exists idx_jobs_customer_id on public.jobs(customer_id);
create index if not exists idx_jobs_assigned_installer_id on public.jobs(assigned_installer_id);
create index if not exists idx_jobs_scheduled_start on public.jobs(scheduled_start);
create index if not exists idx_invoices_job_id on public.invoices(job_id);
create index if not exists idx_invoice_items_invoice_id on public.invoice_items(invoice_id);
create index if not exists idx_payments_invoice_id on public.payments(invoice_id);
create index if not exists idx_payments_provider_intent on public.payments(provider_payment_intent_id);
create index if not exists idx_job_photos_job_id on public.job_photos(job_id);

-- Recompute invoice totals from items + successful payments
create or replace function public.recompute_invoice_totals(p_invoice_id uuid)
returns void
language plpgsql
as $$
declare
  v_sub int;
  v_tax int;
  v_total int;
  v_paid int;
begin
  select coalesce(sum(line_total_cents), 0)
    into v_sub
  from public.invoice_items
  where invoice_id = p_invoice_id;

  select tax_cents
    into v_tax
  from public.invoices
  where id = p_invoice_id;

  v_total := coalesce(v_sub, 0) + coalesce(v_tax, 0);

  select coalesce(sum(amount_cents) filter (where status = 'succeeded'), 0)
    into v_paid
  from public.payments
  where invoice_id = p_invoice_id;

  update public.invoices
  set subtotal_cents = coalesce(v_sub, 0),
      total_cents = v_total,
      deposit_paid_cents = coalesce(v_paid, 0),
      balance_due_cents = greatest(v_total - coalesce(v_paid, 0), 0),
      status = case
        when v_total = 0 then 'draft'::invoice_status
        when coalesce(v_paid, 0) = 0 then status
        when coalesce(v_paid, 0) < v_total then 'partially_paid'::invoice_status
        else 'paid'::invoice_status
      end
  where id = p_invoice_id;
end;
$$;

create or replace function public.recompute_invoice_totals_on_item_change()
returns trigger
language plpgsql
as $$
begin
  perform public.recompute_invoice_totals(coalesce(new.invoice_id, old.invoice_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_recompute_invoice_totals_on_item_change on public.invoice_items;
create trigger trg_recompute_invoice_totals_on_item_change
after insert or update or delete on public.invoice_items
for each row execute function public.recompute_invoice_totals_on_item_change();

create or replace function public.recompute_invoice_totals_on_payment_change()
returns trigger
language plpgsql
as $$
begin
  perform public.recompute_invoice_totals(coalesce(new.invoice_id, old.invoice_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_recompute_invoice_totals_on_payment_change on public.payments;
create trigger trg_recompute_invoice_totals_on_payment_change
after insert or update or delete on public.payments
for each row execute function public.recompute_invoice_totals_on_payment_change();

-- Helpful role function for policies
create or replace function public.current_role()
returns text
language sql
stable
as $$
  select role
  from public.profiles
  where user_id = auth.uid()
  limit 1
$$;

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.jobs enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.job_photos enable row level security;

drop policy if exists "profiles read self" on public.profiles;
create policy "profiles read self"
on public.profiles
for select
using (user_id = auth.uid());

drop policy if exists "profiles admin read all" on public.profiles;
create policy "profiles admin read all"
on public.profiles
for select
using (public.current_role() in ('admin', 'manager'));

drop policy if exists "customers admin rw" on public.customers;
create policy "customers admin rw"
on public.customers
for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

drop policy if exists "jobs admin rw" on public.jobs;
create policy "jobs admin rw"
on public.jobs
for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

drop policy if exists "jobs installer read assigned" on public.jobs;
create policy "jobs installer read assigned"
on public.jobs
for select
using (
  public.current_role() = 'installer'
  and assigned_installer_id = auth.uid()
);

drop policy if exists "jobs installer update status/notes" on public.jobs;
create policy "jobs installer update status/notes"
on public.jobs
for update
using (
  public.current_role() = 'installer'
  and assigned_installer_id = auth.uid()
)
with check (
  public.current_role() = 'installer'
  and assigned_installer_id = auth.uid()
);

drop policy if exists "invoices admin rw" on public.invoices;
create policy "invoices admin rw"
on public.invoices
for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

drop policy if exists "invoices installer read assigned job" on public.invoices;
create policy "invoices installer read assigned job"
on public.invoices
for select
using (
  public.current_role() = 'installer'
  and exists (
    select 1
    from public.jobs j
    where j.id = invoices.job_id
      and j.assigned_installer_id = auth.uid()
  )
);

drop policy if exists "invoice_items admin rw" on public.invoice_items;
create policy "invoice_items admin rw"
on public.invoice_items
for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

drop policy if exists "invoice_items installer read via invoice" on public.invoice_items;
create policy "invoice_items installer read via invoice"
on public.invoice_items
for select
using (
  public.current_role() = 'installer'
  and exists (
    select 1
    from public.invoices i
    join public.jobs j on j.id = i.job_id
    where i.id = invoice_items.invoice_id
      and j.assigned_installer_id = auth.uid()
  )
);

drop policy if exists "payments admin rw" on public.payments;
create policy "payments admin rw"
on public.payments
for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

drop policy if exists "payments installer read via invoice" on public.payments;
create policy "payments installer read via invoice"
on public.payments
for select
using (
  public.current_role() = 'installer'
  and exists (
    select 1
    from public.invoices i
    join public.jobs j on j.id = i.job_id
    where i.id = payments.invoice_id
      and j.assigned_installer_id = auth.uid()
  )
);

drop policy if exists "job_photos admin rw" on public.job_photos;
create policy "job_photos admin rw"
on public.job_photos
for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

drop policy if exists "job_photos installer create/read assigned" on public.job_photos;
create policy "job_photos installer create/read assigned"
on public.job_photos
for select
using (
  public.current_role() = 'installer'
  and exists (
    select 1
    from public.jobs j
    where j.id = job_photos.job_id
      and j.assigned_installer_id = auth.uid()
  )
);

drop policy if exists "job_photos installer insert assigned" on public.job_photos;
create policy "job_photos installer insert assigned"
on public.job_photos
for insert
with check (
  public.current_role() = 'installer'
  and exists (
    select 1
    from public.jobs j
    where j.id = job_photos.job_id
      and j.assigned_installer_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public)
values ('job-photos', 'job-photos', false)
on conflict (id) do nothing;
