-- Graphman countertop estimates (same customer). Safe to re-run: deletes seed rows for these IDs.
-- Run in Supabase SQL Editor after migrations (workflow_stage, deposit_received, quote_documents optional).

begin;

-- Only if quote_documents migration has been applied
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'quote_documents'
  ) then
    delete from public.quote_documents where quote_id in (
      'f2f00001-0000-4000-8000-000000000101',
      'f2f00001-0000-4000-8000-000000000102'
    );
  end if;
end $$;

delete from public.quote_items where quote_id in (
  'f2f00001-0000-4000-8000-000000000101',
  'f2f00001-0000-4000-8000-000000000102'
);
delete from public.quotes where id in (
  'f2f00001-0000-4000-8000-000000000101',
  'f2f00001-0000-4000-8000-000000000102'
);
delete from public.customers where id = 'f2f00001-0000-4000-8000-000000000100';

insert into public.customers (id, name, phone, email)
values (
  'f2f00001-0000-4000-8000-000000000100',
  'Matt & Wendy Graphman',
  '(317) 607-1064',
  null
);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customers' and column_name = 'address'
  ) then
    update public.customers
    set
      address = '1088 W Burma Road',
      city = 'Bloomington',
      state = 'IN',
      zip = '47404'
    where id = 'f2f00001-0000-4000-8000-000000000100';
  end if;
end $$;

-- Quote #1 — original scope / pricing
insert into public.quotes (
  id,
  customer_id,
  title,
  address_line1,
  address_line2,
  city,
  state,
  zip,
  status,
  tax_cents,
  notes,
  created_at
)
values (
  'f2f00001-0000-4000-8000-000000000101',
  'f2f00001-0000-4000-8000-000000000100',
  'Kitchen – Granite Countertop (Quote #1)',
  '1088 W Burma Road',
  null,
  'Bloomington',
  'IN',
  '47404',
  'draft',
  10727,
  $q1$COUNTERTOP ESTIMATE (Quote #1)
Date: March 26, 2026

CUSTOMER INFORMATION
Name: Matt & Wendy Graphman
Address: 1088 W Burma Road, Bloomington, IN 47404
Phone: (317) 607-1064

PROJECT DETAILS
Project: Kitchen – Granite Countertop
Color: Black Pearl (Suede Finish)
Edge Profile: Standard edge (Bevel not available with this fabricator)
Backsplash: 4"
Reveal: Negative reveal (3 cm)
Thickness: 3 cm
Sink: Not provided by customer — customer to supply
Installation: Undermount sink installation included

PRICING (reference — line items control totals in the system)
• Subtotal: $1,532.45
• Tax (7%): $107.27
• Total: $1,639.72

SCOPE NOTES
• Fabricator does not offer bevel edge for this material/finish
• Final measurements may affect final pricing

KEY TERMS / CONDITIONS
• Estimate valid for 30 days
• Based on rough sketch
• Includes digital template, delivery, and installation
• Final pricing depends on template measurements
• Tear-out/removal NOT included
• Plumbing, electrical, gas, carpentry NOT included
• Plumbing must be disconnected before install
• Reconnection must be done by a licensed plumber
• Faucet must be on-site during template
• Seam placement determined by fabricator
• Sealant applied between countertop & backsplash only
• 50% deposit required to proceed$q1$,
  '2026-03-26T15:00:00-04:00'::timestamptz
);

insert into public.quote_items (
  quote_id,
  description,
  qty,
  unit_price_cents,
  line_total_cents
)
values (
  'f2f00001-0000-4000-8000-000000000101',
  'Kitchen granite — Black Pearl (Suede); standard edge; 4" backsplash; negative reveal (3 cm); undermount sink install included (sink not included)',
  1,
  153245,
  153245
);

update public.quotes set tax_cents = 10727 where id = 'f2f00001-0000-4000-8000-000000000101';
select public.recompute_quote_totals('f2f00001-0000-4000-8000-000000000101');

-- Quote #2 — alternate / updated scope
insert into public.quotes (
  id,
  customer_id,
  title,
  address_line1,
  address_line2,
  city,
  state,
  zip,
  status,
  tax_cents,
  notes,
  created_at
)
values (
  'f2f00001-0000-4000-8000-000000000102',
  'f2f00001-0000-4000-8000-000000000100',
  'Kitchen – Granite Countertop (Quote #2)',
  '1088 W Burma Road',
  null,
  'Bloomington',
  'IN',
  '47404',
  'draft',
  18424,
  $q2$COUNTERTOP ESTIMATE (Quote #2)
Date: March 12, 2026

CUSTOMER INFORMATION
Name: Matt & Wendy Graphman
Address: 1088 W Burma Road, Bloomington, IN 47404
Phone: (317) 607-1064

PROJECT DETAILS
Project: Kitchen – Granite Countertop
Color: Black Pearl (Suede Finish)
Edge Profile: Bevel
Backsplash: 4"
Reveal: Negative reveal
Thickness: 3 cm
Sink:
Intrepid #16509 Stainless Steel Undermount
16 Gauge
(Excludes strainer & disposal flange)
Installation: Sink installation included

PRICING (reference — line items control totals in the system)
• Subtotal: $2,632.00
• Tax (7%): $184.24
• Total: $2,816.24

KEY TERMS / CONDITIONS
• Estimate valid for 30 days
• Based on rough sketch
• Includes digital template, delivery, and installation
• Final pricing depends on template measurements
• Tear-out/removal NOT included
• Plumbing, electrical, gas, carpentry NOT included
• Plumbing must be disconnected before install
• Reconnection must be done by a licensed plumber
• Faucet must be on-site during template
• Seam placement determined by fabricator
• Sealant applied between countertop & backsplash only
• 50% deposit required to proceed$q2$,
  '2026-03-12T15:00:00-04:00'::timestamptz
);

insert into public.quote_items (
  quote_id,
  description,
  qty,
  unit_price_cents,
  line_total_cents
)
values (
  'f2f00001-0000-4000-8000-000000000102',
  'Kitchen granite — Black Pearl (Suede); bevel edge; 4" backsplash; negative reveal; 3 cm; Intrepid #16509 undermount sink (16 ga); sink install included',
  1,
  263200,
  263200
);

update public.quotes set tax_cents = 18424 where id = 'f2f00001-0000-4000-8000-000000000102';
select public.recompute_quote_totals('f2f00001-0000-4000-8000-000000000102');

-- Formal quote stage when column exists
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quotes' and column_name = 'workflow_stage'
  ) then
    update public.quotes
    set workflow_stage = 'quote'
    where id in (
      'f2f00001-0000-4000-8000-000000000101',
      'f2f00001-0000-4000-8000-000000000102'
    );
  end if;
end $$;

commit;
