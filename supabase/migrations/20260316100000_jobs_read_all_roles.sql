-- Allow all office/field/admin roles to read any job
-- while keeping stricter rules for updates.

-- Relax jobs read policy: any non-null profile role can read all jobs.
-- Roles include 'admin', 'manager' (office), 'installer', etc.

drop policy if exists "jobs any role read" on public.jobs;

create policy "jobs any role read"
on public.jobs
for select
using (
  public.current_role() is not null
);

-- Keep existing admin rw and installer update policies in place.
