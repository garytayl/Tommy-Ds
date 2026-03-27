-- Whether the customer has paid a deposit (tracked before / at convert to job)

alter table public.quotes
  add column if not exists deposit_received boolean not null default false;

comment on column public.quotes.deposit_received is 'Staff confirms customer paid required deposit (can be set before converting to a job)';
