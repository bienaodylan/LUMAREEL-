-- LUMAREEL: remove email-based administrator privilege escalation.
-- Roles are resolved only from the authenticated Supabase UUID and public.users.
-- Existing profile rows are intentionally left untouched.

CREATE OR REPLACE FUNCTION public.lumareel_current_admin_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT u.role
      INTO v_role
      FROM public.users AS u
     WHERE u.id = auth.uid();

    RETURN COALESCE(v_role, 'customer');
END;
$$;

REVOKE ALL ON FUNCTION public.lumareel_current_admin_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lumareel_current_admin_role() TO authenticated;

-- Auth signup/update trigger: new profiles are customers by default. Auth metadata
-- changes must never grant or change application roles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
    INSERT INTO public.users (id, email, name, role, email_verified, created_at, updated_at)
    VALUES (
        NEW.id,
        LOWER(NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
        'customer',
        COALESCE(NEW.email_confirmed_at IS NOT NULL, FALSE),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.users.name),
        email_verified = EXCLUDED.email_verified,
        updated_at = NOW();
    RETURN NEW;
END;
$$;
