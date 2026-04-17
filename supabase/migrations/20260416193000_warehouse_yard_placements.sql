-- Simple yard log: free-text customer/job label + slot code (from QR or manual).
-- No link to external CRM; warehouse use only.

create table public.warehouse_yard_placements (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  slot_code text not null,
  note text,
  created_at timestamptz not null default now()
);

create index warehouse_yard_placements_created_at_idx on public.warehouse_yard_placements (created_at desc);

create index warehouse_yard_placements_customer_name_lower_idx on public.warehouse_yard_placements (lower(customer_name));

alter table public.warehouse_yard_placements enable row level security;

create policy "warehouse_yard_placements read all"
on public.warehouse_yard_placements
for select
to anon, authenticated
using (true);

create policy "warehouse_yard_placements insert authenticated"
on public.warehouse_yard_placements
for insert
to authenticated
with check (true);

comment on table public.warehouse_yard_placements is 'Warehouse yard find/place log; customer_name is a label only, not synced to external systems.';
