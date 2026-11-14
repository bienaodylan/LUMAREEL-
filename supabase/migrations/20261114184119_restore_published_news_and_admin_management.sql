CREATE POLICY news_articles_public_read ON public.news_articles
  FOR SELECT TO anon, authenticated
  USING (is_published = true OR (SELECT lumareel_current_admin_role()) = 'super_admin');

CREATE POLICY news_articles_admin_write ON public.news_articles
  FOR ALL TO authenticated
  USING ((SELECT lumareel_current_admin_role()) = 'super_admin')
  WITH CHECK ((SELECT lumareel_current_admin_role()) = 'super_admin');
