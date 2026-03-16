-- Fix 500 when reading profiles: current_role() used in RLS can cause recursion.
-- Make it SECURITY DEFINER so the inner SELECT from profiles bypasses RLS.

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where user_id = auth.uid()
  limit 1
$$;
