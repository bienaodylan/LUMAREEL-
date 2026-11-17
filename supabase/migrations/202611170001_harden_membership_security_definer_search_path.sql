-- LUMAREEL: harden SECURITY DEFINER membership/NFC RPCs against search_path hijacking.
-- Every application table, helper function, and auth function used by these RPCs
-- is schema-qualified, so only pg_catalog needs to be trusted on the execution path.
-- This changes function-local configuration only: no grants, data, or business rules.

ALTER FUNCTION public.lumareel_current_admin_role()
  SET search_path = pg_catalog;

ALTER FUNCTION public.lumareel_nfc_associate(uuid, text, text)
  SET search_path = pg_catalog;

ALTER FUNCTION public.lumareel_nfc_revoke(uuid, text)
  SET search_path = pg_catalog;

ALTER FUNCTION public.lumareel_assign_received_card(uuid, uuid)
  SET search_path = pg_catalog;

ALTER FUNCTION public.lumareel_update_received_card_status(uuid, text, text, text)
  SET search_path = pg_catalog;

ALTER FUNCTION public.lumareel_replace_physical_card(uuid, uuid, uuid, text)
  SET search_path = pg_catalog;

ALTER FUNCTION public.lumareel_audit_physical_nfc_consistency(integer)
  SET search_path = pg_catalog;

ALTER FUNCTION public.lumareel_audit_physical_nfc_consistency_page(integer, integer)
  SET search_path = pg_catalog;

COMMENT ON FUNCTION public.lumareel_current_admin_role() IS
  'Returns the current application role; SECURITY DEFINER uses pg_catalog-only search_path.';

COMMENT ON FUNCTION public.lumareel_nfc_associate(uuid, text, text) IS
  'Super-admin NFC enrollment RPC; SECURITY DEFINER uses pg_catalog-only search_path.';

COMMENT ON FUNCTION public.lumareel_nfc_revoke(uuid, text) IS
  'Super-admin NFC revocation RPC; SECURITY DEFINER uses pg_catalog-only search_path.';

COMMENT ON FUNCTION public.lumareel_assign_received_card(uuid, uuid) IS
  'Super-admin physical stock assignment RPC; SECURITY DEFINER uses pg_catalog-only search_path.';

COMMENT ON FUNCTION public.lumareel_update_received_card_status(uuid, text, text, text) IS
  'Super-admin physical stock lifecycle RPC; SECURITY DEFINER uses pg_catalog-only search_path.';

COMMENT ON FUNCTION public.lumareel_replace_physical_card(uuid, uuid, uuid, text) IS
  'Super-admin physical card replacement RPC; SECURITY DEFINER uses pg_catalog-only search_path.';

COMMENT ON FUNCTION public.lumareel_audit_physical_nfc_consistency(integer) IS
  'Read-only NFC/physical stock audit; SECURITY DEFINER uses pg_catalog-only search_path.';

COMMENT ON FUNCTION public.lumareel_audit_physical_nfc_consistency_page(integer, integer) IS
  'Paginated read-only NFC/physical stock audit; SECURITY DEFINER uses pg_catalog-only search_path.';
