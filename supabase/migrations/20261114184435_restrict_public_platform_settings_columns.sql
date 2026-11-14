-- Public settings endpoint exposes only display/contact columns. Never expose
-- gate tokens, repository metadata, or allow direct client-side writes.
REVOKE ALL ON public.platform_settings FROM anon, authenticated;
GRANT SELECT (platform_name, tagline, logo_monogram, logo_url, currency, infoline, social_links)
  ON public.platform_settings TO anon, authenticated;
