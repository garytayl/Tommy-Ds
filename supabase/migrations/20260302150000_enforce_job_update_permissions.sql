-- Enforce installer update permissions at DB level.
-- RLS can scope rows, but this trigger scopes editable columns.

create or replace function public.enforce_installer_job_update_permissions()
returns trigger
language plpgsql
as $$
declare
  v_role text;
begin
  v_role := public.current_role();

  if v_role = 'installer' then
    -- Installers can only update notes and constrained status values
    -- on jobs assigned to them (row scope handled by RLS policy).
    if new.customer_id is distinct from old.customer_id
      or new.title is distinct from old.title
      or new.address_line1 is distinct from old.address_line1
      or new.address_line2 is distinct from old.address_line2
      or new.city is distinct from old.city
      or new.state is distinct from old.state
      or new.zip is distinct from old.zip
      or new.scheduled_start is distinct from old.scheduled_start
      or new.scheduled_end is distinct from old.scheduled_end
      or new.assigned_installer_id is distinct from old.assigned_installer_id
    then
      raise exception 'Installers cannot modify schedule or core job details'
        using errcode = '42501';
    end if;

    if new.status is distinct from old.status
      and new.status not in ('in_progress', 'completed')
    then
      raise exception 'Installers can only set job status to in_progress or completed'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_installer_job_update_permissions on public.jobs;
create trigger trg_enforce_installer_job_update_permissions
before update on public.jobs
for each row execute function public.enforce_installer_job_update_permissions();
