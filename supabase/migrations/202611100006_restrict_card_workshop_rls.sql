-- Tighten workshop RLS: the original workshop migration included organizer/admin
-- roles that are broader than the physical-card production authorization model.
-- API routes independently require a verified super_admin session.
DO $$
BEGIN
  DROP POLICY IF EXISTS "Gestion complete atelier admin" ON public.membership_physical_card_orders;
  DROP POLICY IF EXISTS "Gestion complete inventaire admin" ON public.membership_card_inventory;
  DROP POLICY IF EXISTS "Gestion print jobs admin" ON public.membership_print_jobs;
  DROP POLICY IF EXISTS "Gestion qc admin" ON public.membership_card_quality_checks;
END $$;

CREATE POLICY "Super admins manage physical card workshop orders"
  ON public.membership_physical_card_orders FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_admin'));

CREATE POLICY "Super admins manage card inventory"
  ON public.membership_card_inventory FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_admin'));

CREATE POLICY "Super admins manage print jobs"
  ON public.membership_print_jobs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_admin'));

CREATE POLICY "Super admins manage card quality checks"
  ON public.membership_card_quality_checks FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_admin'));
