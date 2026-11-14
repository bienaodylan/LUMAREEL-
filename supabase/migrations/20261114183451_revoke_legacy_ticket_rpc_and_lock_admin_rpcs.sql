-- Registration is performed by the authenticated signup flow and trigger.
-- Anonymous direct profile creation would bypass the intended customer-only policy.
DROP POLICY IF EXISTS "Public Insert Users" ON public.users;

-- The legacy ticket RPC has no scanner-token check and must never be callable
-- by API roles. The current physical-ticket RPC remains token-protected.
REVOKE EXECUTE ON FUNCTION public.verify_and_check_in_ticket(text, text, text) FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.verify_and_check_in_ticket(text, text, text) SET search_path = public;

-- Trigger-only function: it is not an application RPC.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Token creation/listing are administrative RPCs and must not be callable anonymously.
REVOKE EXECUTE ON FUNCTION public.create_lumareel_scanner_token(text, text, text, text, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_lumareel_scanner_token(text, text, text, text, text, text, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.list_lumareel_scanner_tokens(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_lumareel_scanner_tokens(text) TO authenticated;

-- Physical print-batch generation is an authenticated, role-checked operation.
REVOKE EXECUTE ON FUNCTION public.create_physical_ticket_batch(text, text, text, text, text, text, text, text, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_physical_ticket_batch(text, text, text, text, text, text, text, text, text, integer, text) TO authenticated;
