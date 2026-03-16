-- Run this in Supabase Dashboard → SQL Editor if your admin account gets
-- "You don't have access" or a 500 on profiles. Replace the email with your admin email.

insert into public.profiles (user_id, role)
select id, 'admin'
from auth.users
where email = 'contact@layerlane.io'
on conflict (user_id) do update set role = 'admin';
