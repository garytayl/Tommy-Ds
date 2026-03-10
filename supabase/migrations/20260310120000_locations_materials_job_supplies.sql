-- Material locations (door shop + upper/lower warehouse) and job supplies/parts
-- Three locations: center = door_shop, lower_warehouse, upper_warehouse

do $$ begin
  create type location_code as enum ('door_shop', 'lower_warehouse', 'upper_warehouse');
exception when duplicate_object then null;
end $$;

-- Physical locations where materials are stored
create table if not exists public.locations (
  id uuid primary key default uuid_generate_v4(),
  code location_code not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

-- Catalog of supplies and parts (can live at any location)
create table if not exists public.materials (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sku text,
  unit text not null default 'each',
  default_location_id uuid references public.locations(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Supplies/parts required for a job and installation (which location to pull from)
create table if not exists public.job_materials (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete restrict,
  quantity numeric not null default 1 check (quantity > 0),
  location_id uuid references public.locations(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  unique (job_id, material_id)
);

create index if not exists idx_materials_default_location on public.materials(default_location_id);
create index if not exists idx_job_materials_job_id on public.job_materials(job_id);
create index if not exists idx_job_materials_material_id on public.job_materials(material_id);
create index if not exists idx_job_materials_location_id on public.job_materials(location_id);

-- RLS
alter table public.locations enable row level security;
alter table public.materials enable row level security;
alter table public.job_materials enable row level security;

drop policy if exists "locations admin manager rw" on public.locations;
create policy "locations admin manager rw"
on public.locations for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

drop policy if exists "materials admin manager rw" on public.materials;
create policy "materials admin manager rw"
on public.materials for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

drop policy if exists "job_materials admin manager rw" on public.job_materials;
create policy "job_materials admin manager rw"
on public.job_materials for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

drop policy if exists "job_materials installer read assigned" on public.job_materials;
create policy "job_materials installer read assigned"
on public.job_materials for select
using (
  public.current_role() = 'installer'
  and exists (
    select 1 from public.jobs j
    where j.id = job_materials.job_id and j.assigned_installer_id = auth.uid()
  )
);

-- Seed the three locations (idempotent)
insert into public.locations (id, code, name) values
  ('d4000001-0000-4000-8000-000000000001', 'door_shop', 'Door Shop (Center)'),
  ('d4000001-0000-4000-8000-000000000002', 'lower_warehouse', 'Lower Warehouse'),
  ('d4000001-0000-4000-8000-000000000003', 'upper_warehouse', 'Upper Warehouse')
on conflict (code) do update set name = excluded.name;
