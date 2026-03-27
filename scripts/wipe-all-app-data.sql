-- Wipe all application data in public schema (Tommy D's Field Service Scheduler).
-- Run in Supabase SQL Editor (or: psql / supabase db execute) against your project.
--
-- Keeps: table definitions, migrations, auth.users, public.profiles, public.crews (seeded crews).
-- Removes: customers, jobs, quotes, inventory, materials, products, audit trail.
--
-- Demo customers: Anderson/Baker/etc. named "(seed)" come from supabase/seed.sql or npm run db:seed.
-- After a full wipe they are gone until you run seed again. To remove only demos and keep real data,
-- use scripts/remove-demo-seeds.sql instead of this file.
--
-- Storage: Supabase does NOT allow DELETE FROM storage.objects in SQL (storage.protect_delete).
-- After this script, empty buckets via Dashboard (Storage → bucket → select all → delete) or run:
--   npm run storage:clear
--   (scripts/clear-storage-buckets.mjs uses the Storage API with the service role key.)

begin;

truncate table public.audit_log restart identity cascade;
truncate table public.communication_log restart identity cascade;
truncate table public.quote_documents restart identity cascade;
truncate table public.quote_items restart identity cascade;
truncate table public.quotes restart identity cascade;
truncate table public.payments restart identity cascade;
truncate table public.invoice_items restart identity cascade;
truncate table public.invoices restart identity cascade;
truncate table public.job_photos restart identity cascade;
truncate table public.job_notes restart identity cascade;
truncate table public.activities restart identity cascade;
truncate table public.appointments restart identity cascade;
truncate table public.job_materials restart identity cascade;
truncate table public.leads restart identity cascade;
truncate table public.jobs restart identity cascade;
truncate table public.customers restart identity cascade;
truncate table public.inventory restart identity cascade;
truncate table public.lots restart identity cascade;
truncate table public.materials restart identity cascade;
truncate table public.locations restart identity cascade;
truncate table public.products restart identity cascade;
truncate table public.crew_members restart identity cascade;

commit;

-- Optional: re-seed warehouse locations + default materials (from your seed workflow).
-- insert into public.locations ...
