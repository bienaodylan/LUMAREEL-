-- LUMAREEL: close permissive public.users policies that can expose profiles
-- or let clients self-assign privileged roles. No profile rows are modified.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Users" ON public.users;
DROP POLICY IF EXISTS "Public Insert Users" ON public.users;
DROP POLICY IF EXISTS "Public Update Users" ON public.users;
DROP POLICY IF EXISTS "Insertion libre users" ON public.users;
DROP POLICY IF EXISTS "Lecture publique users" ON public.users;
DROP POLICY IF EXISTS "Mise à jour users" ON public.users;
DROP POLICY IF EXISTS "users_self_select" ON public.users;
DROP POLICY IF EXISTS "users_self_insert_customer" ON public.users;
DROP POLICY IF EXISTS "users_self_update_profile" ON public.users;

-- The profile is visible only to its authenticated owner.
CREATE POLICY "users_self_select"
  ON public.users FOR SELECT TO authenticated
  USING (id = auth.uid());

-- A missing profile may only be created for the current Auth identity as customer.
CREATE POLICY "users_self_insert_customer"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND lower(email) = lower((SELECT auth.jwt()->>'email'))
    AND role = 'customer'
  );

-- Keep profile-name editing, but never expose role/email/verification updates.
CREATE POLICY "users_self_update_profile"
  ON public.users FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

REVOKE ALL ON TABLE public.users FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.users TO authenticated;
GRANT UPDATE (name) ON TABLE public.users TO authenticated;
