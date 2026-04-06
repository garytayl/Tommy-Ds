-- Stripe isolated payment requests ("pay links") created by office users.
-- Each row tracks one request and the corresponding Stripe Checkout session.

create table if not exists public.isolated_payments (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references public.jobs(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  amount_cents int not null check (amount_cents > 0),
  currency text not null default 'usd',
  description text not null,
  note text,
  status text not null default 'open' check (status in ('open', 'paid', 'expired', 'canceled', 'failed')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  stripe_checkout_url text,
  paid_at timestamptz,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_isolated_payments_job_id on public.isolated_payments(job_id);
create index if not exists idx_isolated_payments_invoice_id on public.isolated_payments(invoice_id);
create index if not exists idx_isolated_payments_customer_id on public.isolated_payments(customer_id);
create index if not exists idx_isolated_payments_status on public.isolated_payments(status);
create index if not exists idx_isolated_payments_created_at on public.isolated_payments(created_at desc);

comment on table public.isolated_payments is 'Standalone Stripe payment requests generated from admin billing tools.';

create or replace function public.set_isolated_payments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_isolated_payments_updated_at on public.isolated_payments;
create trigger trg_isolated_payments_updated_at
before update on public.isolated_payments
for each row execute function public.set_isolated_payments_updated_at();

alter table public.isolated_payments enable row level security;

drop policy if exists "isolated_payments admin manager rw" on public.isolated_payments;
create policy "isolated_payments admin manager rw"
on public.isolated_payments
for all
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));
