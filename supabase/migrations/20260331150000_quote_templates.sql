-- User-defined estimate starters (merged with built-in templates in app code).

create table if not exists public.quote_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text not null default '',
  default_title text not null default '',
  notes_text text,
  line_items jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_quote_templates_sort_order on public.quote_templates (sort_order, name);

comment on table public.quote_templates is 'Admin-defined new-estimate templates; line_items is JSON array of {description, qty, unit_price_cents, line_total_cents}.';

alter table public.quote_templates enable row level security;

drop policy if exists "quote_templates admin rw" on public.quote_templates;
create policy "quote_templates admin rw"
on public.quote_templates
for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

create or replace function public.set_quote_templates_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_quote_templates_updated_at on public.quote_templates;
create trigger trg_quote_templates_updated_at
before update on public.quote_templates
for each row execute function public.set_quote_templates_updated_at();
