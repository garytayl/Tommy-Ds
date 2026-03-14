-- Fix "Database error creating new user" when adding users (Dashboard or API).
-- A trigger on auth.users that inserts into public.profiles often fails because
-- profiles.role is NOT NULL and the trigger may not set it. This migration
-- drops common trigger names so user creation succeeds. Profile creation is
-- done by the app (Admin → Team) or manually in Table Editor.

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists handle_new_user on auth.users;

-- If you still see "Database error creating new user", check for other triggers:
--   select tgname from pg_trigger t
--   join pg_class c on c.oid = t.tgrelid
--   join pg_namespace n on n.oid = c.relnamespace
--   where n.nspname = 'auth' and c.relname = 'users';
-- Then drop with: drop trigger "<name>" on auth.users;
