-- Speeds slot-scoped queries (history, search by slot).
create index if not exists warehouse_yard_placements_slot_code_idx
  on public.warehouse_yard_placements (slot_code);
