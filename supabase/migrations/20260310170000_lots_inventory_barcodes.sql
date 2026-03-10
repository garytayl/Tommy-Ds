-- Lots (barcode-labeled areas within a location) and inventory (material + lot + quantity)
-- Enables: "scan barcode" to see where an item is or what's in a lot

-- Optional barcode on materials (e.g. SKU barcode)
alter table public.materials
  add column if not exists barcode text unique;

create index if not exists idx_materials_barcode on public.materials(barcode) where barcode is not null;

-- Lots: physical areas/shelves within a location that can have a barcode
create table if not exists public.lots (
  id uuid primary key default uuid_generate_v4(),
  location_id uuid not null references public.locations(id) on delete cascade,
  barcode text unique,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_lots_location_id on public.lots(location_id);
create index if not exists idx_lots_barcode on public.lots(barcode) where barcode is not null;

-- Inventory: quantity of a material in a lot (warehouse stock)
create table if not exists public.inventory (
  id uuid primary key default uuid_generate_v4(),
  material_id uuid not null references public.materials(id) on delete cascade,
  lot_id uuid not null references public.lots(id) on delete cascade,
  quantity numeric not null default 0 check (quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (material_id, lot_id)
);

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
