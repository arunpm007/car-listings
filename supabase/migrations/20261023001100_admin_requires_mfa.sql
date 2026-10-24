-- Admin rights need two-step login. A session that only passed the password check (aal1)
-- gets nothing from the admin-only tables and buckets, even if the password was phished.
-- The "admins see themselves" policy still works at aal1, so the app can tell an admin
-- that they need to finish two-step login.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
    and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;
