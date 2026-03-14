-- Ensure every new auth user gets a profile so they can sign in.
-- Default role is 'manager' (office). Admins can change it in Team or Table Editor.

-- Backfill: give a profile to any auth user who doesn't have one yet
insert into public.profiles (user_id, role)
select id, 'manager' from auth.users
where id not in (select user_id from public.profiles)
on conflict (user_id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, role, full_name)
  values (
    new.id,
    'manager',
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (user_id) do update set
    full_name = coalesce(excluded.full_name, profiles.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
