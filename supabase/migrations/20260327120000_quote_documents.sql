-- Attachments on quotes (estimates): PDFs/scans from fabricators, etc.

create table if not exists public.quote_documents (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  fabricator_label text,
  content_type text,
  created_at timestamptz not null default now()
);

create index if not exists idx_quote_documents_quote_id on public.quote_documents(quote_id);

alter table public.quote_documents enable row level security;

drop policy if exists "quote_documents admin rw" on public.quote_documents;
create policy "quote_documents admin rw"
on public.quote_documents
for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

insert into storage.buckets (id, name, public)
values ('quote-documents', 'quote-documents', false)
on conflict (id) do nothing;
