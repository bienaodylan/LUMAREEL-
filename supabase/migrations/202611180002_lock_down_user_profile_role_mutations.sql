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

-- Owners can read their profile; trusted administrative roles can inspect
-- profiles for support workflows, but no client can change role or identity fields.
CREATE POLICY "users_self_select"
    ON public.users FOR SELECT TO authenticated
    USING (id = auth.uid());

CREATE POLICY "users_admin_select"
    ON public.users FOR SELECT TO authenticated
    USING (
        id = auth.uid()
        OR public.lumareel_current_admin_role() IN ('super_admin', 'box_office')
    );

CREATE POLICY "users_self_insert_customer"
    ON public.users FOR INSERT TO authenticated
    WITH CHECK (
        id = auth.uid()
        AND LOWER(email) = LOWER((SELECT auth.jwt()->>'email'))
        AND role = 'customer'
    );

CREATE POLICY "users_self_update_profile"
    ON public.users FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

REVOKE ALL ON TABLE public.users FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.users TO authenticated;
GRANT UPDATE (name) ON TABLE public.users TO authenticated;
