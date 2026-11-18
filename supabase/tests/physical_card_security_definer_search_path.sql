-- Run after the membership/NFC migrations on a non-production Supabase database.
-- Read-only catalog assertions; this script does not modify application data.

DO $membership_security_test$
DECLARE
  v_function regprocedure;
  v_config text[];
  v_is_security_definer boolean;
  v_role_definition text;
  v_signup_definition text;
  v_functions regprocedure[] := ARRAY[
    'public.lumareel_current_admin_role()'::regprocedure,
    'public.handle_new_user()'::regprocedure,
    'public.lumareel_nfc_associate(uuid,text,text)'::regprocedure,
    'public.lumareel_nfc_revoke(uuid,text)'::regprocedure,
    'public.lumareel_assign_received_card(uuid,uuid)'::regprocedure,
    'public.lumareel_update_received_card_status(uuid,text,text,text)'::regprocedure,
    'public.lumareel_replace_physical_card(uuid,uuid,uuid,text)'::regprocedure,
    'public.lumareel_audit_physical_nfc_consistency(integer)'::regprocedure,
    'public.lumareel_audit_physical_nfc_consistency_page(integer,integer)'::regprocedure
  ];
  v_restricted_functions regprocedure[] := ARRAY[
    'public.lumareel_current_admin_role()'::regprocedure,
    'public.lumareel_nfc_associate(uuid,text,text)'::regprocedure,
    'public.lumareel_nfc_revoke(uuid,text)'::regprocedure,
    'public.lumareel_assign_received_card(uuid,uuid)'::regprocedure,
    'public.lumareel_update_received_card_status(uuid,text,text,text)'::regprocedure,
    'public.lumareel_replace_physical_card(uuid,uuid,uuid,text)'::regprocedure,
    'public.lumareel_audit_physical_nfc_consistency(integer)'::regprocedure,
    'public.lumareel_audit_physical_nfc_consistency_page(integer,integer)'::regprocedure
  ];
BEGIN
  SELECT pg_catalog.pg_get_functiondef('public.lumareel_current_admin_role()'::regprocedure)
    INTO v_role_definition;
  SELECT pg_catalog.pg_get_functiondef('public.handle_new_user()'::regprocedure)
    INTO v_signup_definition;

  IF v_role_definition ~* 'auth\.users|@|lower\s*\(\s*email' THEN
    RAISE EXCEPTION 'Admin role helper must not contain an email allowlist or email-based fallback';
  END IF;
  IF v_role_definition !~* 'where\s+u\.id\s*=\s*auth\.uid\(\)' THEN
    RAISE EXCEPTION 'Admin role helper must resolve roles only from public.users.id = auth.uid()';
  END IF;
  IF v_signup_definition ~* 'super_admin|role\s*=\s*CASE' THEN
    RAISE EXCEPTION 'New-user trigger must never assign a privileged role automatically';
  END IF;


  -- public.users must not expose table-level privileges or role/email mutation.
  IF pg_catalog.has_table_privilege('anon', 'public.users', 'SELECT')
     OR pg_catalog.has_table_privilege('anon', 'public.users', 'INSERT')
     OR pg_catalog.has_table_privilege('anon', 'public.users', 'UPDATE') THEN
    RAISE EXCEPTION 'Anonymous role must not access or mutate public.users';
  END IF;
  IF pg_catalog.has_table_privilege('authenticated', 'public.users', 'UPDATE') THEN
    RAISE EXCEPTION 'Authenticated role must not have table-level UPDATE on public.users';
  END IF;
  IF pg_catalog.has_column_privilege('authenticated', 'public.users', 'role', 'UPDATE')
     OR pg_catalog.has_column_privilege('authenticated', 'public.users', 'email', 'UPDATE')
     OR pg_catalog.has_column_privilege('authenticated', 'public.users', 'email_verified', 'UPDATE') THEN
    RAISE EXCEPTION 'Authenticated role must not update privileged profile columns';
  END IF;
  IF NOT pg_catalog.has_column_privilege('authenticated', 'public.users', 'name', 'UPDATE') THEN
    RAISE EXCEPTION 'Authenticated profile-name update should remain available';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND 'public'::name = ANY(roles)
  ) THEN
    RAISE EXCEPTION 'public.users must not have a PUBLIC RLS policy';
  END IF;

  FOREACH v_function IN ARRAY v_functions LOOP
    SELECT p.prosecdef, p.proconfig
      INTO v_is_security_definer, v_config
    FROM pg_catalog.pg_proc AS p
    WHERE p.oid = v_function::oid;

    IF v_is_security_definer IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Expected SECURITY DEFINER on %', v_function;
    END IF;

    IF NOT coalesce('search_path=pg_catalog' = ANY(v_config), false) THEN
      RAISE EXCEPTION 'Unsafe or missing search_path on %: %', v_function, v_config;
    END IF;
  END LOOP;

  FOREACH v_function IN ARRAY v_restricted_functions LOOP
    IF pg_catalog.has_function_privilege('anon', v_function::oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'Anonymous role must not execute %', v_function;
    END IF;

    IF NOT pg_catalog.has_function_privilege('authenticated', v_function::oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'Authenticated role must be able to execute %', v_function;
    END IF;
  END LOOP;
END
$membership_security_test$;
