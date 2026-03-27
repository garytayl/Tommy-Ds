-- Deterministic line order for quotes (reorder in UI without swapping timestamps).

alter table public.quote_items add column if not exists sort_order int not null default 0;

update public.quote_items qi
set sort_order = sub.ord
from (
  select
    id,
    row_number() over (partition by quote_id order by created_at asc, id asc) - 1 as ord
  from public.quote_items
) sub
where qi.id = sub.id;

create index if not exists idx_quote_items_quote_sort on public.quote_items (quote_id, sort_order);
