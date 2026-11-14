-- Remove legacy permissive policies. Preserve existing INSERT policies on
-- orders/tickets so the current checkout/payment implementation is untouched.
DROP POLICY IF EXISTS "Public Manage Events Admin" ON public.events;
DROP POLICY IF EXISTS "Public Read Events" ON public.events;
DROP POLICY IF EXISTS "Public Manage Archives Admin" ON public.archives;
DROP POLICY IF EXISTS "Public Read Archives" ON public.archives;
DROP POLICY IF EXISTS "Public Manage News Admin" ON public.news_articles;
DROP POLICY IF EXISTS "Public Read News" ON public.news_articles;
DROP POLICY IF EXISTS "Public Manage Settings Admin" ON public.platform_settings;
DROP POLICY IF EXISTS "Public Read Users" ON public.users;
DROP POLICY IF EXISTS "Public Update Users" ON public.users;
DROP POLICY IF EXISTS "Public Read Orders" ON public.orders;
DROP POLICY IF EXISTS "Public Read Tickets" ON public.tickets;
DROP POLICY IF EXISTS "Public Update Tickets" ON public.tickets;
DROP POLICY IF EXISTS "Public Read Scanner Tokens" ON public.scanner_tokens;
DROP POLICY IF EXISTS "Public Insert Scanner Tokens" ON public.scanner_tokens;
DROP POLICY IF EXISTS "Public Read Organizers" ON public.external_organizers;

-- Events and archives retain their purpose-built published/admin read policies.
-- Platform settings remain publicly readable, but never publicly writable.
DROP POLICY IF EXISTS "Public Manage Settings Admin" ON public.platform_settings;

-- Customers can read only their own order history.
DROP POLICY IF EXISTS orders_customer_read_own ON public.orders;
CREATE POLICY orders_customer_read_own ON public.orders
  FOR SELECT TO authenticated
  USING (
    customer_id = (SELECT auth.uid())::text
    OR lower(customer_email) = lower(COALESCE((SELECT auth.jwt() ->> 'email'), ''))
  );

-- Ticket visibility is inherited from ownership of the associated order.
DROP POLICY IF EXISTS tickets_customer_read_own ON public.tickets;
CREATE POLICY tickets_customer_read_own ON public.tickets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = tickets.order_id
        AND (
          o.customer_id = (SELECT auth.uid())::text
          OR lower(o.customer_email) = lower(COALESCE((SELECT auth.jwt() ->> 'email'), ''))
        )
    )
  );

-- Administrative reads of operational records are limited to verified admins.
DROP POLICY IF EXISTS transactional_emails_admin_read ON public.transactional_emails;
CREATE POLICY transactional_emails_admin_read ON public.transactional_emails
  FOR SELECT TO authenticated
  USING ((SELECT lumareel_current_admin_role()) IN ('super_admin', 'box_office'));

DROP POLICY IF EXISTS external_organizers_admin_read ON public.external_organizers;
CREATE POLICY external_organizers_admin_read ON public.external_organizers
  FOR SELECT TO authenticated
  USING ((SELECT lumareel_current_admin_role()) = 'super_admin');

DROP POLICY IF EXISTS external_organizers_admin_write ON public.external_organizers;
CREATE POLICY external_organizers_admin_write ON public.external_organizers
  FOR ALL TO authenticated
  USING ((SELECT lumareel_current_admin_role()) = 'super_admin')
  WITH CHECK ((SELECT lumareel_current_admin_role()) = 'super_admin');
