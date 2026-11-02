-- Restrict profile access to the authenticated owner.
-- Privileged roles are assigned only by trusted administrators in the database.
drop policy if exists "Insertion libre users" on public.users;
drop policy if exists "Lecture publique users" on public.users;
drop policy if exists "Mise à jour users" on public.users;
drop policy if exists "users_self_select" on public.users;
drop policy if exists "users_self_insert_customer" on public.users;

create policy "users_self_select"
on public.users for select to authenticated
using (lower(email)=lower((select auth.jwt()->>'email')));

create policy "users_self_insert_customer"
on public.users for insert to authenticated
with check (
  lower(email)=lower((select auth.jwt()->>'email'))
  and role='customer'
);
