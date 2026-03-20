-- Distinguish installation vs service jobs (one schedulable row per jobs record).

do $$ begin
  create type public.job_kind as enum ('installation', 'service');
exception when duplicate_object then null;
end $$;

alter table public.jobs
  add column if not exists job_kind public.job_kind not null default 'installation';

-- Optional: infer from legacy free-text project_type
update public.jobs
set job_kind = 'service'
where project_type is not null
  and lower(trim(project_type)) like '%service%';
