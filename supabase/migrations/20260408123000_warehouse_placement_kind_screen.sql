-- Allow placement kind "screen" alongside window and door.

alter table public.warehouse_map_placements drop constraint if exists warehouse_map_placements_kind_check;

alter table public.warehouse_map_placements add constraint warehouse_map_placements_kind_check
  check (kind in ('window', 'door', 'screen'));
