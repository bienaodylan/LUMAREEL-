-- Run after the membership/NFC migrations on a non-production Supabase database.
-- Read-only catalog assertions; this script does not modify application data.

DO $membership_security_test$
DECLARE
  v_function regprocedure;
  v_config text[];
  v_is_security_definer boolean;
  v_functions regprocedure[] := ARRAY[
    'public.lumareel_current_admin_role()'::regprocedure,
    'public.lumareel_nfc_associate(uuid,text,text)'::regprocedure,
    'public.lumareel_nfc_revoke(uuid,text)'::regprocedure,
    'public.lumareel_assign_received_card(uuid,uuid)'::regprocedure,
    'public.lumareel_update_received_card_status(uuid,text,text,text)'::regprocedure,
    'public.lumareel_replace_physical_card(uuid,uuid,uuid,text)'::regprocedure,
    'public.lumareel_audit_physical_nfc_consistency(integer)'::regprocedure,
    'public.lumareel_audit_physical_nfc_consistency_page(integer,integer)'::regprocedure
  ];
  v_restricted_functions regprocedure[] := ARRAY[
    'public.lumareel_nfc_associate(uuid,text,text)'::regprocedure,
    'public.lumareel_nfc_revoke(uuid,text)'::regprocedure,
    'public.lumareel_assign_received_card(uuid,uuid)'::regprocedure,
    'public.lumareel_update_received_card_status(uuid,text,text,text)'::regprocedure,
    'public.lumareel_replace_physical_card(uuid,uuid,uuid,text)'::regprocedure,
    'public.lumareel_audit_physical_nfc_consistency(integer)'::regprocedure,
    'public.lumareel_audit_physical_nfc_consistency_page(integer,integer)'::regprocedure
  ];
BEGIN
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
