-- Storage RLS for quote PDFs/scans: required when uploads use the session-based Supabase client
-- (admin/manager). Service role bypasses these policies.

drop policy if exists "quote_documents storage select admin" on storage.objects;
create policy "quote_documents storage select admin"
on storage.objects for select
to authenticated
using (
  bucket_id = 'quote-documents'
  and public.current_role() in ('admin', 'manager')
);

drop policy if exists "quote_documents storage insert admin" on storage.objects;
create policy "quote_documents storage insert admin"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'quote-documents'
  and public.current_role() in ('admin', 'manager')
);

drop policy if exists "quote_documents storage update admin" on storage.objects;
create policy "quote_documents storage update admin"
on storage.objects for update
to authenticated
using (
  bucket_id = 'quote-documents'
  and public.current_role() in ('admin', 'manager')
)
with check (
  bucket_id = 'quote-documents'
  and public.current_role() in ('admin', 'manager')
);

drop policy if exists "quote_documents storage delete admin" on storage.objects;
create policy "quote_documents storage delete admin"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'quote-documents'
  and public.current_role() in ('admin', 'manager')
);
