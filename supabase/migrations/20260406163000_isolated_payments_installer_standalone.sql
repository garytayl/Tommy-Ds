-- Allow installer/field users to create and read standalone isolated payments
-- (no linked job/customer), while preserving assigned-job access.

drop policy if exists "isolated_payments installer read assigned job" on public.isolated_payments;
create policy "isolated_payments installer read assigned job"
on public.isolated_payments
for select
using (
  public.current_role() = 'installer'
  and (
    exists (
      select 1
      from public.jobs j
      where j.id = isolated_payments.job_id
        and j.assigned_installer_id = auth.uid()
    )
    or isolated_payments.created_by = auth.uid()
  )
);

drop policy if exists "isolated_payments installer insert assigned job" on public.isolated_payments;
create policy "isolated_payments installer insert assigned job"
on public.isolated_payments
for insert
with check (
  public.current_role() = 'installer'
  and (
    (
      isolated_payments.job_id is not null
      and exists (
        select 1
        from public.jobs j
        where j.id = isolated_payments.job_id
          and j.assigned_installer_id = auth.uid()
      )
    )
    or (
      isolated_payments.job_id is null
      and isolated_payments.created_by = auth.uid()
    )
  )
);
