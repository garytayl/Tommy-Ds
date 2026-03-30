-- Fuel tracking for fleet vehicles and gas cards.
-- Supports reporting by vehicle, by card, and over time.

create table if not exists public.vehicles (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  vehicle_type text not null default 'truck' check (vehicle_type in ('truck', 'van', 'other')),
  plate text,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.gas_cards (
  id uuid primary key default uuid_generate_v4(),
  label text not null,
  provider text,
  card_last4 text check (card_last4 is null or card_last4 ~ '^[0-9]{4}$'),
  assigned_vehicle_id uuid references public.vehicles(id) on delete set null,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.fuel_purchases (
  id uuid primary key default uuid_generate_v4(),
  purchased_at timestamptz not null default now(),
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  gas_card_id uuid references public.gas_cards(id) on delete set null,
  station text,
  gallons numeric(10,3) not null check (gallons > 0),
  total_cents int not null check (total_cents > 0),
  odometer_miles int check (odometer_miles is null or odometer_miles >= 0),
  notes text,
  created_by uuid references public.profiles(user_id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_vehicles_name on public.vehicles(name);
create index if not exists idx_gas_cards_label on public.gas_cards(label);
create index if not exists idx_gas_cards_assigned_vehicle_id on public.gas_cards(assigned_vehicle_id);
create index if not exists idx_fuel_purchases_vehicle_id on public.fuel_purchases(vehicle_id);
create index if not exists idx_fuel_purchases_gas_card_id on public.fuel_purchases(gas_card_id);
create index if not exists idx_fuel_purchases_purchased_at on public.fuel_purchases(purchased_at desc);

alter table public.vehicles enable row level security;
alter table public.gas_cards enable row level security;
alter table public.fuel_purchases enable row level security;

drop policy if exists "vehicles admin manager rw" on public.vehicles;
create policy "vehicles admin manager rw"
on public.vehicles
for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

drop policy if exists "vehicles installer read" on public.vehicles;
create policy "vehicles installer read"
on public.vehicles
for select
using (public.current_role() = 'installer');

drop policy if exists "gas_cards admin manager rw" on public.gas_cards;
create policy "gas_cards admin manager rw"
on public.gas_cards
for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

drop policy if exists "gas_cards installer read" on public.gas_cards;
create policy "gas_cards installer read"
on public.gas_cards
for select
using (public.current_role() = 'installer');

drop policy if exists "fuel_purchases admin manager rw" on public.fuel_purchases;
create policy "fuel_purchases admin manager rw"
on public.fuel_purchases
for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

drop policy if exists "fuel_purchases installer read" on public.fuel_purchases;
create policy "fuel_purchases installer read"
on public.fuel_purchases
for select
using (public.current_role() = 'installer');

drop policy if exists "fuel_purchases installer insert" on public.fuel_purchases;
create policy "fuel_purchases installer insert"
on public.fuel_purchases
for insert
with check (public.current_role() = 'installer');
