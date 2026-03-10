-- Quotes / estimates: optional step before job + invoice
-- Flow: Quote -> (approve) -> Job -> Invoice -> Payment

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

-- Recompute quote totals from items
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
