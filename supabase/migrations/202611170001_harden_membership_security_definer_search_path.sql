-- LUMAREEL: harden SECURITY DEFINER membership/NFC RPCs against search_path hijacking.
-- Every application table, helper function, and auth function used by these RPCs
-- is schema-qualified, so only pg_catalog needs to be trusted on the execution path.
-- This changes function-local configuration only: no grants, data, comments, or business rules.

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
