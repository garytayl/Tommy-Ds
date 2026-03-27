-- Customer mailing / billing address (separate from quote/job project site address).
-- Legacy column was `address` (single line); normalize to address_line1 + address_line2.

alter table public.customers add column if not exists address_line1 text;
alter table public.customers add column if not exists address_line2 text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customers' and column_name = 'address'
  ) then
    update public.customers
    set address_line1 = nullif(trim(address), '')
    where (address_line1 is null or trim(coalesce(address_line1, '')) = '')
      and address is not null
      and trim(address) <> '';
    alter table public.customers drop column address;
  end if;
end $$;

comment on column public.customers.address_line1 is 'Customer billing/mailing — not the job site (see quotes/jobs address fields).';
comment on column public.customers.address_line2 is 'Customer address line 2.';
