-- Quote revision history (snapshots) + optional print-only overrides for PDF output

alter table public.quotes
  add column if not exists print_overrides jsonb;

comment on column public.quotes.print_overrides is 'Optional overrides for PDF/print: title, notes, customer lines, line_items, etc.';

create table if not exists public.quote_revisions (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  revision_number int not null,
  label text,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(user_id) on delete set null,
  constraint quote_revisions_quote_number_unique unique (quote_id, revision_number)
);

create index if not exists idx_quote_revisions_quote_id on public.quote_revisions(quote_id, revision_number desc);

alter table public.quote_revisions enable row level security;

drop policy if exists "quote_revisions admin rw" on public.quote_revisions;
create policy "quote_revisions admin rw"
on public.quote_revisions
for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));
