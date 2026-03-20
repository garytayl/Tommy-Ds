-- Placeholder / demo data for Tommy D's (customers, jobs, invoices, items, payments).
-- Run with: supabase db reset (applies migrations + seed) or psql/supabase db execute -f supabase/seed.sql
-- Uses deterministic UUIDs so re-running is idempotent if you clear tables first.

-- Clear existing placeholder data (optional: only if you want to re-seed same IDs)
DELETE FROM public.job_materials WHERE job_id IN (SELECT id FROM public.jobs WHERE customer_id IN (SELECT id FROM public.customers WHERE name LIKE '%(seed)%'));
DELETE FROM public.payments WHERE invoice_id IN (SELECT id FROM public.invoices WHERE job_id IN (SELECT id FROM public.jobs WHERE customer_id IN (SELECT id FROM public.customers WHERE name LIKE '%(seed)%')));
DELETE FROM public.invoice_items WHERE invoice_id IN (SELECT id FROM public.invoices WHERE job_id IN (SELECT id FROM public.jobs WHERE customer_id IN (SELECT id FROM public.customers WHERE name LIKE '%(seed)%')));
DELETE FROM public.invoices WHERE job_id IN (SELECT id FROM public.jobs WHERE customer_id IN (SELECT id FROM public.customers WHERE name LIKE '%(seed)%'));
DELETE FROM public.jobs WHERE customer_id IN (SELECT id FROM public.customers WHERE name LIKE '%(seed)%');
DELETE FROM public.customers WHERE name LIKE '%(seed)%';

-- Customers (seed)
INSERT INTO public.customers (id, name, phone, email) VALUES
  ('c1000001-0000-4000-8000-000000000001', 'Anderson Home (seed)', '(317) 555-1001', 'anderson@example.com'),
  ('c1000001-0000-4000-8000-000000000002', 'Baker Family (seed)', '(317) 555-1002', 'baker@example.com'),
  ('c1000001-0000-4000-8000-000000000003', 'Clark Construction (seed)', '(317) 555-1003', 'clark@example.com'),
  ('c1000001-0000-4000-8000-000000000004', 'Davis Properties (seed)', '(317) 555-1004', 'davis@example.com'),
  ('c1000001-0000-4000-8000-000000000005', 'Evans Realty (seed)', '(317) 555-1005', 'evans@example.com'),
  ('c1000001-0000-4000-8000-000000000006', 'Foster & Sons (seed)', '(317) 555-1006', 'foster@example.com'),
  ('c1000001-0000-4000-8000-000000000007', 'Green Valley HOA (seed)', '(317) 555-1007', 'hoa@greenvalley.example.com'),
  ('c1000001-0000-4000-8000-000000000008', 'Harris Residence (seed)', '(317) 555-1008', 'harris@example.com'),
  ('c1000001-0000-4000-8000-000000000009', 'Indy Commercial LLC (seed)', '(317) 555-1009', 'indy@example.com'),
  ('c1000001-0000-4000-8000-00000000000a', 'Johnson Rental (seed)', '(317) 555-1010', 'johnson@example.com')
ON CONFLICT (id) DO NOTHING;

-- Jobs (seed): mix of statuses and dates; job_kind = installation vs service
INSERT INTO public.jobs (id, customer_id, title, address_line1, address_line2, city, state, zip, scheduled_start, scheduled_end, status, notes, job_kind) VALUES
  ('a2000001-0000-4000-8000-000000000001', 'c1000001-0000-4000-8000-000000000001', 'Front door replacement', '123 Oak St', NULL, 'Indianapolis', 'IN', '46201', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days' + INTERVAL '2 hours', 'scheduled', 'Customer prefers morning slot.', 'installation'),
  ('a2000001-0000-4000-8000-000000000002', 'c1000001-0000-4000-8000-000000000002', 'Garage door repair', '456 Elm Ave', 'Unit B', 'Indianapolis', 'IN', '46202', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '1 hour', 'scheduled', NULL, 'service'),
  ('a2000001-0000-4000-8000-000000000003', 'c1000001-0000-4000-8000-000000000003', 'Commercial entry doors x4', '789 Commerce Dr', NULL, 'Indianapolis', 'IN', '46203', NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days' + INTERVAL '6 hours', 'lead', 'Send quote first.', 'installation'),
  ('a2000001-0000-4000-8000-000000000004', 'c1000001-0000-4000-8000-000000000004', 'Sliding patio door', '321 Maple Ln', NULL, 'Carmel', 'IN', '46032', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '3 hours', 'completed', 'Left key with neighbor.', 'installation'),
  ('a2000001-0000-4000-8000-000000000005', 'c1000001-0000-4000-8000-000000000005', 'Window + door package', '555 Realtor Way', NULL, 'Fishers', 'IN', '46038', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '4 hours', 'paid', NULL, 'installation'),
  ('a2000001-0000-4000-8000-000000000006', 'c1000001-0000-4000-8000-000000000001', 'Storm door install', '123 Oak St', NULL, 'Indianapolis', 'IN', '46201', NOW() + INTERVAL '1 week', NOW() + INTERVAL '1 week' + INTERVAL '1 hour', 'lead', 'Follow-up from front door job.', 'installation'),
  ('a2000001-0000-4000-8000-000000000007', 'c1000001-0000-4000-8000-000000000006', 'Garage door opener', '100 Main St', NULL, 'Noblesville', 'IN', '46060', NOW() + INTERVAL '4 days', NOW() + INTERVAL '4 days' + INTERVAL '2 hours', 'scheduled', NULL, 'service'),
  ('a2000001-0000-4000-8000-000000000008', 'c1000001-0000-4000-8000-000000000007', 'Clubhouse double doors', '200 HOA Blvd', NULL, 'Indianapolis', 'IN', '46204', NULL, NULL, 'lead', 'Waiting on HOA approval.', 'installation'),
  ('a2000001-0000-4000-8000-000000000009', 'c1000001-0000-4000-8000-000000000008', 'Back door + frame', '888 Harris Rd', NULL, 'Greenwood', 'IN', '46142', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '2 hours', 'scheduled', 'Dog in yard, use side gate.', 'installation'),
  ('a2000001-0000-4000-8000-00000000000a', 'c1000001-0000-4000-8000-000000000009', 'Office building entry', '500 Business Park', NULL, 'Indianapolis', 'IN', '46205', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '8 hours', 'completed', NULL, 'installation'),
  ('a2000001-0000-4000-8000-00000000000b', 'c1000001-0000-4000-8000-00000000000a', 'Rental unit door repair', '777 Landlord Ln', 'Apt 2', 'Indianapolis', 'IN', '46206', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '1 hour', 'in_progress', 'Tenant present.', 'service'),
  ('a2000001-0000-4000-8000-00000000000c', 'c1000001-0000-4000-8000-000000000002', 'Basement egress window', '456 Elm Ave', NULL, 'Indianapolis', 'IN', '46202', NOW() + INTERVAL '6 days', NULL, 'lead', NULL, 'installation'),
  ('a2000001-0000-4000-8000-00000000000d', 'c1000001-0000-4000-8000-000000000004', 'Second property - garage', '999 Rental Pl', NULL, 'Carmel', 'IN', '46032', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '2 hours', 'paid', NULL, 'installation'),
  ('a2000001-0000-4000-8000-00000000000e', 'c1000001-0000-4000-8000-000000000005', 'New construction - 3 doors', '100 New Build Dr', NULL, 'Fishers', 'IN', '46038', NOW() + INTERVAL '2 weeks', NOW() + INTERVAL '2 weeks' + INTERVAL '5 hours', 'lead', 'Builder will provide specs.', 'installation'),
  ('a2000001-0000-4000-8000-00000000000f', 'c1000001-0000-4000-8000-000000000007', 'Pool gate latch', '200 HOA Blvd', 'Pool area', 'Indianapolis', 'IN', '46204', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '30 minutes', 'scheduled', 'Quick fix.', 'service')
ON CONFLICT (id) DO NOTHING;

-- Invoices (one per job for most; mix of statuses)
INSERT INTO public.invoices (id, job_id, status, tax_cents) VALUES
  ('b3000001-0000-4000-8000-000000000001', 'a2000001-0000-4000-8000-000000000001', 'draft', 0),
  ('b3000001-0000-4000-8000-000000000002', 'a2000001-0000-4000-8000-000000000002', 'draft', 0),
  ('b3000001-0000-4000-8000-000000000003', 'a2000001-0000-4000-8000-000000000003', 'draft', 0),
  ('b3000001-0000-4000-8000-000000000004', 'a2000001-0000-4000-8000-000000000004', 'sent', 1200),
  ('b3000001-0000-4000-8000-000000000005', 'a2000001-0000-4000-8000-000000000005', 'paid', 4500),
  ('b3000001-0000-4000-8000-000000000006', 'a2000001-0000-4000-8000-000000000006', 'draft', 0),
  ('b3000001-0000-4000-8000-000000000007', 'a2000001-0000-4000-8000-000000000007', 'draft', 0),
  ('b3000001-0000-4000-8000-000000000008', 'a2000001-0000-4000-8000-000000000008', 'draft', 0),
  ('b3000001-0000-4000-8000-000000000009', 'a2000001-0000-4000-8000-000000000009', 'sent', 800),
  ('b3000001-0000-4000-8000-00000000000a', 'a2000001-0000-4000-8000-00000000000a', 'partially_paid', 600),
  ('b3000001-0000-4000-8000-00000000000b', 'a2000001-0000-4000-8000-00000000000b', 'draft', 0),
  ('b3000001-0000-4000-8000-00000000000c', 'a2000001-0000-4000-8000-00000000000c', 'draft', 0),
  ('b3000001-0000-4000-8000-00000000000d', 'a2000001-0000-4000-8000-00000000000d', 'paid', 2200),
  ('b3000001-0000-4000-8000-00000000000e', 'a2000001-0000-4000-8000-00000000000e', 'draft', 0),
  ('b3000001-0000-4000-8000-00000000000f', 'a2000001-0000-4000-8000-00000000000f', 'draft', 0)
ON CONFLICT (id) DO NOTHING;

-- Invoice line items (triggers will recompute totals)
INSERT INTO public.invoice_items (invoice_id, description, qty, unit_price_cents, line_total_cents) VALUES
  ('b3000001-0000-4000-8000-000000000001', 'Front door unit', 1, 85000, 85000),
  ('b3000001-0000-4000-8000-000000000001', 'Installation', 1, 35000, 35000),
  ('b3000001-0000-4000-8000-000000000002', 'Garage door repair labor', 1, 18500, 18500),
  ('b3000001-0000-4000-8000-000000000003', 'Commercial entry door', 4, 42000, 168000),
  ('b3000001-0000-4000-8000-000000000003', 'Install per door', 4, 15000, 60000),
  ('b3000001-0000-4000-8000-000000000004', 'Sliding patio door', 1, 120000, 120000),
  ('b3000001-0000-4000-8000-000000000004', 'Installation', 1, 45000, 45000),
  ('b3000001-0000-4000-8000-000000000005', 'Window package', 1, 180000, 180000),
  ('b3000001-0000-4000-8000-000000000005', 'Door package', 1, 220000, 220000),
  ('b3000001-0000-4000-8000-000000000005', 'Installation', 1, 55000, 55000),
  ('b3000001-0000-4000-8000-000000000006', 'Storm door', 1, 32000, 32000),
  ('b3000001-0000-4000-8000-000000000006', 'Installation', 1, 15000, 15000),
  ('b3000001-0000-4000-8000-000000000007', 'Garage door opener', 1, 28000, 28000),
  ('b3000001-0000-4000-8000-000000000007', 'Installation', 1, 12000, 12000),
  ('b3000001-0000-4000-8000-000000000008', 'Double door unit', 1, 65000, 65000),
  ('b3000001-0000-4000-8000-000000000009', 'Back door + frame', 1, 72000, 72000),
  ('b3000001-0000-4000-8000-000000000009', 'Installation', 1, 28000, 28000),
  ('b3000001-0000-4000-8000-00000000000a', 'Office entry door', 1, 95000, 95000),
  ('b3000001-0000-4000-8000-00000000000a', 'Installation', 1, 38000, 38000),
  ('b3000001-0000-4000-8000-00000000000b', 'Door repair labor', 1, 12500, 12500),
  ('b3000001-0000-4000-8000-00000000000c', 'Egress window', 1, 48000, 48000),
  ('b3000001-0000-4000-8000-00000000000d', 'Garage door panel', 1, 42000, 42000),
  ('b3000001-0000-4000-8000-00000000000d', 'Installation', 1, 18000, 18000),
  ('b3000001-0000-4000-8000-00000000000e', 'Entry door', 3, 38000, 114000),
  ('b3000001-0000-4000-8000-00000000000e', 'Installation', 3, 14000, 42000),
  ('b3000001-0000-4000-8000-00000000000f', 'Pool gate latch repair', 1, 4500, 4500);

-- Recompute invoice totals (trigger normally does this; run once for seed)
SELECT public.recompute_invoice_totals(id) FROM public.invoices WHERE id IN (
  'b3000001-0000-4000-8000-000000000001','b3000001-0000-4000-8000-000000000002','b3000001-0000-4000-8000-000000000003',
  'b3000001-0000-4000-8000-000000000004','b3000001-0000-4000-8000-000000000005','b3000001-0000-4000-8000-000000000006',
  'b3000001-0000-4000-8000-000000000007','b3000001-0000-4000-8000-000000000008','b3000001-0000-4000-8000-000000000009',
  'b3000001-0000-4000-8000-00000000000a','b3000001-0000-4000-8000-00000000000b','b3000001-0000-4000-8000-00000000000c',
  'b3000001-0000-4000-8000-00000000000d','b3000001-0000-4000-8000-00000000000e','b3000001-0000-4000-8000-00000000000f'
);

-- Payments (so some invoices show paid / partially_paid)
INSERT INTO public.payments (invoice_id, amount_cents, provider, status) VALUES
  ('b3000001-0000-4000-8000-000000000005', 455500, 'stripe', 'succeeded'),
  ('b3000001-0000-4000-8000-00000000000d', 62000, 'stripe', 'succeeded'),
  ('b3000001-0000-4000-8000-00000000000a', 100000, 'stripe', 'succeeded');

-- Recompute again after payments
SELECT public.recompute_invoice_totals('b3000001-0000-4000-8000-000000000005');
SELECT public.recompute_invoice_totals('b3000001-0000-4000-8000-00000000000d');
SELECT public.recompute_invoice_totals('b3000001-0000-4000-8000-00000000000a');

-- Materials (supplies/parts catalog). Locations are seeded in migration.
INSERT INTO public.materials (id, name, sku, unit, default_location_id) VALUES
  ('e5000001-0000-4000-8000-000000000001', 'Door unit - 36" entry', 'DR-36-ENT', 'each', 'd4000001-0000-4000-8000-000000000001'),
  ('e5000001-0000-4000-8000-000000000002', 'Hinge set (3-pack)', 'HNG-3', 'pack', 'd4000001-0000-4000-8000-000000000001'),
  ('e5000001-0000-4000-8000-000000000003', 'Deadbolt', 'DB-STD', 'each', 'd4000001-0000-4000-8000-000000000002'),
  ('e5000001-0000-4000-8000-000000000004', 'Shim pack', 'SHM-50', 'pack', 'd4000001-0000-4000-8000-000000000002'),
  ('e5000001-0000-4000-8000-000000000005', 'Caulk - exterior', 'CAK-EXT', 'tube', 'd4000001-0000-4000-8000-000000000001'),
  ('e5000001-0000-4000-8000-000000000006', 'Screws - install kit', 'SCR-INST', 'kit', 'd4000001-0000-4000-8000-000000000003'),
  ('e5000001-0000-4000-8000-000000000007', 'Weatherstrip', 'WTH-36', 'each', 'd4000001-0000-4000-8000-000000000003'),
  ('e5000001-0000-4000-8000-000000000008', 'Garage door panel section', 'GDP-9', 'each', 'd4000001-0000-4000-8000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- Job materials: supplies/parts per job and installation (location = where to pull from)
-- Location IDs: door_shop d4000001-...001, lower_warehouse ...002, upper_warehouse ...003
INSERT INTO public.job_materials (job_id, material_id, quantity, location_id, notes) VALUES
  ('a2000001-0000-4000-8000-000000000001', 'e5000001-0000-4000-8000-000000000001', 1, 'd4000001-0000-4000-8000-000000000001', 'Front door unit'),
  ('a2000001-0000-4000-8000-000000000001', 'e5000001-0000-4000-8000-000000000002', 1, 'd4000001-0000-4000-8000-000000000001', NULL),
  ('a2000001-0000-4000-8000-000000000001', 'e5000001-0000-4000-8000-000000000003', 1, 'd4000001-0000-4000-8000-000000000002', NULL),
  ('a2000001-0000-4000-8000-000000000001', 'e5000001-0000-4000-8000-000000000005', 2, 'd4000001-0000-4000-8000-000000000001', NULL),
  ('a2000001-0000-4000-8000-000000000002', 'e5000001-0000-4000-8000-000000000008', 1, 'd4000001-0000-4000-8000-000000000002', 'Garage repair'),
  ('a2000001-0000-4000-8000-000000000002', 'e5000001-0000-4000-8000-000000000006', 1, 'd4000001-0000-4000-8000-000000000003', NULL),
  ('a2000001-0000-4000-8000-000000000004', 'e5000001-0000-4000-8000-000000000007', 1, 'd4000001-0000-4000-8000-000000000001', 'Patio door'),
  ('a2000001-0000-4000-8000-000000000004', 'e5000001-0000-4000-8000-000000000005', 1, 'd4000001-0000-4000-8000-000000000001', NULL),
  ('a2000001-0000-4000-8000-000000000009', 'e5000001-0000-4000-8000-000000000001', 1, 'd4000001-0000-4000-8000-000000000001', 'Back door + frame'),
  ('a2000001-0000-4000-8000-000000000009', 'e5000001-0000-4000-8000-000000000004', 2, 'd4000001-0000-4000-8000-000000000002', NULL);
