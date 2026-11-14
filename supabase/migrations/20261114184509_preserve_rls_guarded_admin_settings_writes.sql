-- Preserve admin-only settings updates through the existing authenticated API.
-- RLS policy platform_settings_admin_access still limits these writes to super_admin.
GRANT INSERT, UPDATE ON public.platform_settings TO authenticated;
