-- Sequential invoice number for display (Invoice #1001, etc.)
-- Replaces showing UUID prefix which can collide in seed data

create sequence if not exists public.invoices_invoice_number_seq;

alter table public.invoices
  add column if not exists invoice_number int;

-- Backfill existing rows by created_at order
with ordered as (
  select id, row_number() over (order by created_at, id) as rn
  from public.invoices
  where invoice_number is null
)
update public.invoices i
set invoice_number = ordered.rn
from ordered
where i.id = ordered.id;

-- Default for new rows
alter table public.invoices
  alter column invoice_number set default nextval('public.invoices_invoice_number_seq');

-- Ensure sequence is ahead of any existing max
select setval(
  'public.invoices_invoice_number_seq',
  coalesce((select max(invoice_number) from public.invoices), 0) + 1
);

-- Not null and unique
alter table public.invoices
  alter column invoice_number set not null;

create unique index if not exists idx_invoices_invoice_number on public.invoices(invoice_number);
