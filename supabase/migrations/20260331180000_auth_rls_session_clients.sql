-- Harden auth for session-based Supabase clients: tighten job reads, storage for job-photos,
-- profile self-service updates, and authorize restore_quote_from_revision by role.

-- -----------------------------------------------------------------------------
-- 1. Jobs: installers must not read every job (replace overly broad "jobs any role read").
-- -----------------------------------------------------------------------------
drop policy if exists "jobs any role read" on public.jobs;

create policy "jobs office read all"
on public.jobs
for select
using (public.current_role() in ('admin', 'manager'));

-- Existing policies remain: jobs admin rw, jobs installer read assigned, installer update, etc.

-- -----------------------------------------------------------------------------
-- 2. Profiles: allow users to update their own row (onboarding) + guard role changes.
-- -----------------------------------------------------------------------------
drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self"
on public.profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "profiles admin manager update" on public.profiles;
create policy "profiles admin manager update"
on public.profiles
for update
to authenticated
using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

create or replace function public.prevent_profile_unauthorized_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor text;
begin
  if auth.uid() is null then
    return new;
  end if;
  v_actor := public.current_role();
  if new.role is distinct from old.role then
    if v_actor is null or v_actor not in ('admin', 'manager') then
      raise exception 'Only office staff can change roles'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_role_guard on public.profiles;
create trigger trg_profiles_role_guard
before update on public.profiles
for each row execute function public.prevent_profile_unauthorized_role_change();

-- -----------------------------------------------------------------------------
-- 3. Storage: job-photos bucket — session clients can sign URLs and upload when allowed.
-- -----------------------------------------------------------------------------
drop policy if exists "job_photos storage admin manager select" on storage.objects;
create policy "job_photos storage admin manager select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'job-photos'
  and public.current_role() in ('admin', 'manager')
);

drop policy if exists "job_photos storage installer select assigned" on storage.objects;
create policy "job_photos storage installer select assigned"
on storage.objects for select
to authenticated
using (
  bucket_id = 'job-photos'
  and public.current_role() = 'installer'
  and exists (
    select 1
    from public.jobs j
    where j.id::text = split_part(name, '/', 1)
      and j.assigned_installer_id = auth.uid()
  )
);

drop policy if exists "job_photos storage admin manager insert" on storage.objects;
create policy "job_photos storage admin manager insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'job-photos'
  and public.current_role() in ('admin', 'manager')
);

drop policy if exists "job_photos storage installer insert assigned" on storage.objects;
create policy "job_photos storage installer insert assigned"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'job-photos'
  and public.current_role() = 'installer'
  and exists (
    select 1
    from public.jobs j
    where j.id::text = split_part(name, '/', 1)
      and j.assigned_installer_id = auth.uid()
  )
);

drop policy if exists "job_photos storage admin manager update" on storage.objects;
create policy "job_photos storage admin manager update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'job-photos'
  and public.current_role() in ('admin', 'manager')
)
with check (
  bucket_id = 'job-photos'
  and public.current_role() in ('admin', 'manager')
);

drop policy if exists "job_photos storage admin manager delete" on storage.objects;
create policy "job_photos storage admin manager delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'job-photos'
  and public.current_role() in ('admin', 'manager')
);

-- -----------------------------------------------------------------------------
-- 4. restore_quote_from_revision: require office role (SECURITY DEFINER bypasses RLS).
-- -----------------------------------------------------------------------------
create or replace function public.restore_quote_from_revision(p_revision_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rev public.quote_revisions%rowtype;
  snap jsonb;
  qid uuid;
begin
  if coalesce(public.current_role(), '') not in ('admin', 'manager') then
    raise exception 'Not authorized to restore quote revisions'
      using errcode = '42501';
  end if;

  select * into rev from public.quote_revisions where id = p_revision_id;
  if not found then
    raise exception 'Revision not found';
  end if;

  qid := rev.quote_id;
  if exists (select 1 from public.quotes where id = qid and job_id is not null) then
    raise exception 'Cannot restore: quote is already linked to a job';
  end if;

  snap := rev.snapshot;

  update public.quotes set
    title = coalesce(nullif(trim(snap->>'title'), ''), title),
    address_line1 = coalesce(nullif(trim(snap->>'address_line1'), ''), address_line1),
    address_line2 = case when snap ? 'address_line2' then nullif(trim(snap->>'address_line2'), '') else address_line2 end,
    city = coalesce(nullif(trim(snap->>'city'), ''), city),
    state = coalesce(nullif(trim(snap->>'state'), ''), state),
    zip = coalesce(nullif(trim(snap->>'zip'), ''), zip),
    status = case
      when snap->>'status' in ('draft', 'sent', 'accepted', 'declined') then (snap->>'status')::public.quote_status
      else status
    end,
    workflow_stage = case
      when coalesce(nullif(trim(snap->>'workflow_stage'), ''), '') in ('estimate', 'quote') then trim(snap->>'workflow_stage')
      else workflow_stage
    end,
    notes = case when snap ? 'notes' then snap->>'notes' else notes end,
    notes_sections = null,
    subtotal_cents = coalesce((snap->>'subtotal_cents')::int, subtotal_cents),
    tax_cents = coalesce((snap->>'tax_cents')::int, tax_cents),
    total_cents = coalesce((snap->>'total_cents')::int, total_cents),
    deposit_received = case
      when snap ? 'deposit_received' then coalesce((snap->>'deposit_received')::boolean, deposit_received)
      else deposit_received
    end,
    print_overrides = case when snap ? 'print_overrides' then snap->'print_overrides' else print_overrides end
  where id = qid;

  delete from public.quote_items where quote_id = qid;

  insert into public.quote_items (quote_id, description, qty, unit_price_cents, line_total_cents, sort_order)
  select
    qid,
    coalesce(elem->>'description', ''),
    coalesce((elem->>'qty')::numeric, 1),
    coalesce((elem->>'unit_price_cents')::int, 0),
    coalesce((elem->>'line_total_cents')::int, 0),
    (ord - 1)::int
  from jsonb_array_elements(coalesce(snap->'items', '[]'::jsonb))
  with ordinality as t(elem, ord);

  perform public.recompute_quote_totals(qid);
end;
$$;
