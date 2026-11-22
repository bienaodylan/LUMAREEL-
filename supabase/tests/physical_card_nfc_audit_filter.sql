-- Run after 202611220001 on a non-production Supabase database.
-- Read-only catalog assertions; this script does not change application data.

DO $physical_nfc_audit_filter_test$
DECLARE
  v_filtered regprocedure := 'public.lumareel_audit_physical_nfc_consistency_filtered_page(integer,integer,text)'::regprocedure;
  v_legacy regprocedure := 'public.lumareel_audit_physical_nfc_consistency_page(integer,integer)'::regprocedure;
  v_filtered_config text[];
  v_legacy_config text[];
  v_filtered_def text;
  v_legacy_def text;
  v_filtered_security_definer boolean;
  v_legacy_security_definer boolean;
BEGIN
  SELECT p.proconfig, p.prosecdef, pg_catalog.pg_get_functiondef(p.oid)
    INTO v_filtered_config, v_filtered_security_definer, v_filtered_def
  FROM pg_catalog.pg_proc p
  WHERE p.oid = v_filtered::oid;

  SELECT p.proconfig, p.prosecdef, pg_catalog.pg_get_functiondef(p.oid)
    INTO v_legacy_config, v_legacy_security_definer, v_legacy_def
  FROM pg_catalog.pg_proc p
  WHERE p.oid = v_legacy::oid;

  IF v_filtered_security_definer IS DISTINCT FROM true
     OR NOT coalesce('search_path=pg_catalog' = ANY(v_filtered_config), false) THEN
    RAISE EXCEPTION 'Filtered audit RPC must be SECURITY DEFINER with search_path=pg_catalog';
  END IF;
  IF v_legacy_security_definer IS DISTINCT FROM true
     OR NOT coalesce('search_path=pg_catalog' = ANY(v_legacy_config), false) THEN
    RAISE EXCEPTION 'Legacy paginated audit RPC must remain a hardened SECURITY DEFINER wrapper';
  END IF;

  IF pg_catalog.has_function_privilege('anon', v_filtered::oid, 'EXECUTE')
     OR pg_catalog.has_function_privilege('anon', v_legacy::oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous role must not execute NFC audit RPCs';
  END IF;
  IF NOT pg_catalog.has_function_privilege('authenticated', v_filtered::oid, 'EXECUTE')
     OR NOT pg_catalog.has_function_privilege('authenticated', v_legacy::oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'Authenticated role must retain RPC execution (super-admin is enforced in-function)';
  END IF;

  IF v_filtered_def !~* 'p_issue_code IS NULL'
     OR v_filtered_def !~* 'issue_code = p_issue_code' THEN
    RAISE EXCEPTION 'Filtered audit RPC must apply the issue code to both page and total count';
  END IF;
  IF v_filtered_def !~* 'STOCK_WITHOUT_ACTIVE_NFC'
     OR v_filtered_def !~* 'LINKED_STOCK_MISSING_NFC_REFERENCE'
     OR v_filtered_def !~* 'STOCK_NFC_METADATA_MISMATCH'
     OR v_filtered_def !~* 'ACTIVE_NFC_WITHOUT_PHYSICAL_STOCK'
     OR v_filtered_def !~* 'BLOCKED_STOCK_STILL_LINKED' THEN
    RAISE EXCEPTION 'Filtered audit RPC must retain all known anomaly codes';
  END IF;
  IF v_legacy_def !~* 'lumareel_audit_physical_nfc_consistency_filtered_page' THEN
    RAISE EXCEPTION 'Legacy pagination RPC must delegate to the filtered implementation with no filter';
  END IF;
  IF v_filtered_def ~* 'jsonb_build_object\s*\([^)]*(chip_reference|raw_uid|card_key)' THEN
    RAISE EXCEPTION 'Filtered audit RPC must not serialize NFC references, raw UIDs, or card keys';
  END IF;
END
$physical_nfc_audit_filter_test$;
