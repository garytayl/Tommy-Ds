-- Remove only placeholder demo rows (customer name contains "(seed)").
-- Does NOT delete real customers (e.g. Matt & Wendy Graphman) or their quotes.
--
-- Why demo rows come back: running supabase/seed.sql, npm run db:seed, or supabase db reset
-- re-inserts Anderson Home (seed), Baker Family (seed), etc.
--
-- Run this in Supabase SQL Editor whenever you want those demos gone.

begin;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'quote_documents'
  ) then
    delete from public.quote_documents
    where quote_id in (
      select id from public.quotes
      where customer_id in (select id from public.customers where name like '%(seed)%')
    );
  end if;
end $$;

delete from public.quote_items
where quote_id in (
  select id from public.quotes
  where customer_id in (select id from public.customers where name like '%(seed)%')
);

delete from public.quotes
where customer_id in (select id from public.customers where name like '%(seed)%');

delete from public.leads
where customer_id in (select id from public.customers where name like '%(seed)%');

delete from public.communication_log
where customer_id in (select id from public.customers where name like '%(seed)%');

delete from public.appointments
where job_id in (
  select id from public.jobs
  where customer_id in (select id from public.customers where name like '%(seed)%')
);

delete from public.activities
where job_id in (
  select id from public.jobs
  where customer_id in (select id from public.customers where name like '%(seed)%')
);

delete from public.job_notes
where job_id in (
  select id from public.jobs
  where customer_id in (select id from public.customers where name like '%(seed)%')
);

delete from public.job_photos
where job_id in (
  select id from public.jobs
  where customer_id in (select id from public.customers where name like '%(seed)%')
);

delete from public.job_materials
where job_id in (
  select id from public.jobs
  where customer_id in (select id from public.customers where name like '%(seed)%')
);

delete from public.payments
where invoice_id in (
  select id from public.invoices
  where job_id in (
    select id from public.jobs
    where customer_id in (select id from public.customers where name like '%(seed)%')
  )
);

delete from public.invoice_items
where invoice_id in (
  select id from public.invoices
  where job_id in (
    select id from public.jobs
    where customer_id in (select id from public.customers where name like '%(seed)%')
  )
);

delete from public.invoices
where job_id in (
  select id from public.jobs
  where customer_id in (select id from public.customers where name like '%(seed)%')
);

delete from public.jobs
where customer_id in (select id from public.customers where name like '%(seed)%');

delete from public.customers where name like '%(seed)%';

commit;
