-- First quote: Graphman countertop estimate (March 26, 2026)
-- Run in Supabase SQL Editor after migrations. Safe to re-run: deletes prior seed rows for these IDs.

begin;

delete from public.quote_documents where quote_id = 'f2f00001-0000-4000-8000-000000000101';
delete from public.quote_items where quote_id = 'f2f00001-0000-4000-8000-000000000101';
delete from public.quotes where id = 'f2f00001-0000-4000-8000-000000000101';
delete from public.customers where id = 'f2f00001-0000-4000-8000-000000000100';

insert into public.customers (id, name, phone, email, address, city, state, zip)
values (
  'f2f00001-0000-4000-8000-000000000100',
  'Matt & Wendy Graphman',
  '(317) 607-1064',
  null,
  '1088 West Burma Road',
  'Bloomington',
  'IN',
  '47404'
);

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
  notes
)
values (
  'f2f00001-0000-4000-8000-000000000101',
  'f2f00001-0000-4000-8000-000000000100',
  'Countertop estimate — Granite (Black Pearl, Suede)',
  '1088 West Burma Road',
  null,
  'Bloomington',
  'IN',
  '47404',
  'draft',
  10727,
  $quote$COUNTERTOP ESTIMATE

Date: March 26, 2026

PROJECT DETAILS
• Material: Granite Countertop
• Color: Black Pearl
• Finish: Suede
• Edge profile: Standard edge (Bevel not available with this fabricator)
• Backsplash: 4" backsplash
• Reveal: Negative reveal (3 cm)
• Sink: Not provided by customer
• Installation: Undermount sink installation included

PRICING (reference)
• Subtotal: $1,532.45
• Sales tax: $107.27
• Total: $1,639.72

NOTES
• Fabricator does not offer bevel edge for this material/finish
• Customer responsible for providing sink
• Final measurements may affect final pricing

OPTIONAL TERMS (add to customer-facing PDF if desired)
• Valid for 14 days from date above
• 50% deposit to begin fabrication
• Signature line on executed copy$quote$
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
  'Granite countertop — Black Pearl, Suede; standard edge; 4" backsplash; negative reveal (3 cm); undermount sink install included (sink not included)',
  1,
  153245,
  153245
);

-- Trigger should set subtotal/total; ensure totals match estimate
update public.quotes
set tax_cents = 10727
where id = 'f2f00001-0000-4000-8000-000000000101';

select public.recompute_quote_totals('f2f00001-0000-4000-8000-000000000101');

commit;
