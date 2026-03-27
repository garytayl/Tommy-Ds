-- Estimates → formal quotes → jobs (same `quotes` row; stage tracks where you are before a job exists)

alter table public.quotes
  add column if not exists workflow_stage text not null default 'estimate'
  constraint quotes_workflow_stage_check check (workflow_stage in ('estimate', 'quote'));

comment on column public.quotes.workflow_stage is 'estimate = ballpark / takeoff; quote = priced proposal ready to convert to a job';

update public.quotes
set workflow_stage = 'quote'
where job_id is not null and workflow_stage = 'estimate';
