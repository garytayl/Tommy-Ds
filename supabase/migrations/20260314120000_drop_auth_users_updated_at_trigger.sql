-- Drop any trigger that calls update_updated_at_column() on tables that don't have updated_at
-- (e.g. auth.users, public.profiles). Fixes: record "new" has no field "updated_at".

do $$
declare
  r record;
begin
  for r in
    select n.nspname as schema_name, c.relname as table_name, t.tgname as trigger_name
    from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.proname = 'update_updated_at_column'
      and not t.tgisinternal
  loop
    execute format('drop trigger if exists %I on %I.%I', r.trigger_name, r.schema_name, r.table_name);
  end loop;
end;
$$;
