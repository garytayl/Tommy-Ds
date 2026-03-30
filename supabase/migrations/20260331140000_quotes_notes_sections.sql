-- Structured estimate scope: JSON fields per section; quotes.notes remains the composed string for print/PDF.

alter table public.quotes
  add column if not exists notes_sections jsonb;

comment on column public.quotes.notes_sections is 'Per-section bodies (cover, customer, project, pricing, scope, terms, misc); composed into notes on save.';

-- Restore clears structured JSON so UI re-derives sections from composed notes.
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
