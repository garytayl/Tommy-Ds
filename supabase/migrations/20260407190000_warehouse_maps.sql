-- Collaborative upper-warehouse floor maps: windows/doors (and future inventory overlay).
-- Public read (anon + authenticated); inserts/updates/deletes require sign-in.

create table public.warehouse_maps (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  image_path text not null,
  width_px int not null check (width_px > 0),
  height_px int not null check (height_px > 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.warehouse_map_placements (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.warehouse_maps (id) on delete cascade,
  kind text not null check (kind in ('window', 'door')),
  label text not null default '',
  pos_x numeric not null check (pos_x >= 0 and pos_x <= 1),
  pos_y numeric not null check (pos_y >= 0 and pos_y <= 1),
  note text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index warehouse_map_placements_map_id_idx on public.warehouse_map_placements (map_id);

create or replace function public.set_warehouse_map_placements_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_warehouse_map_placements_updated_at on public.warehouse_map_placements;
create trigger trg_warehouse_map_placements_updated_at
before update on public.warehouse_map_placements
for each row execute function public.set_warehouse_map_placements_updated_at();

alter table public.warehouse_maps enable row level security;
alter table public.warehouse_map_placements enable row level security;

-- Map definitions: read-only from the app (changes via migrations / SQL).
create policy "warehouse_maps read all"
on public.warehouse_maps
for select
to anon, authenticated
using (true);

-- Placements: anyone signed out can view; team members signed in can edit.
create policy "warehouse_map_placements read all"
on public.warehouse_map_placements
for select
to anon, authenticated
using (true);

create policy "warehouse_map_placements insert authenticated"
on public.warehouse_map_placements
for insert
to authenticated
with check (true);

create policy "warehouse_map_placements update authenticated"
on public.warehouse_map_placements
for update
to authenticated
using (true)
with check (true);

create policy "warehouse_map_placements delete authenticated"
on public.warehouse_map_placements
for delete
to authenticated
using (true);

insert into public.warehouse_maps (slug, title, description, image_path, width_px, height_px, sort_order)
values
  (
    'upper-layout',
    'Layout',
    'Windows and doors in the upper warehouse.',
    '/warehouse/upper-floor-plan.svg',
    1000,
    640,
    0
  ),
  (
    'upper-inventory',
    'Inventory',
    'Reserve for stock locations, aisles, or bays (same editing tools as layout).',
    '/warehouse/inventory-placeholder.svg',
    1000,
    640,
    1
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.warehouse_map_placements;
  end if;
end $$;

alter table public.warehouse_map_placements replica identity full;
