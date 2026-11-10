-- Harden audit/QR data exposure. QR verification is handled by trusted server
-- endpoints; anon clients must not enumerate even active token hashes.
DROP POLICY IF EXISTS "Verification publique des tokens QR" ON public.membership_qr_tokens;
REVOKE ALL ON TABLE public.membership_qr_tokens FROM anon;
REVOKE ALL ON TABLE public.membership_qr_tokens FROM authenticated;

-- Scanner staff may create scans through the trusted scanner RPC only; they
-- must not read, edit, or erase the audit trail directly.
DROP POLICY IF EXISTS "Admin full manage scan logs" ON public.membership_scan_logs;
CREATE POLICY "Admins read membership scan audit"
  ON public.membership_scan_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('super_admin','box_office')));

-- Administrative event log is strictly read-only to authenticated super-admins.
CREATE POLICY "Super admins read membership event audit"
  ON public.membership_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_admin'));
REVOKE INSERT, UPDATE, DELETE ON TABLE public.membership_scan_logs FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.membership_events FROM anon, authenticated;
