-- LUMAREEL: read-only reconciliation report for physical stock / NFC metadata.
-- Never returns raw NFC UIDs, opaque chip references, keys, or member PII.
-- Intended for super-admin review before any manual remediation.

CREATE OR REPLACE FUNCTION public.lumareel_audit_physical_nfc_consistency(
  p_limit integer DEFAULT 100
) RETURNS TABLE (
  issue_code text,
  membership_card_id uuid,
  stock_id uuid,
  manufacturer_serial text,
  credential_id uuid,
  details jsonb
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 500));
BEGIN
  IF public.lumareel_current_admin_role() IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'Accès super-administrateur requis.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH linked_stock AS (
    SELECT s.*
    FROM public.membership_physical_card_stock s
    WHERE s.membership_card_id IS NOT NULL
      AND s.stock_status IN ('assigned','verified','ready','shipped','delivered')
  ),
  active_credentials AS (
    SELECT c.id, c.card_id, c.chip_reference, c.chip_type
    FROM public.membership_chip_credentials c
    WHERE c.credential_status = 'active'
  ),
  anomalies AS (
    -- A physical stock item is linked to a member card, but no active NFC
    -- credential exists for that card. Missing references are reported below.
    SELECT
      'STOCK_WITHOUT_ACTIVE_NFC'::text AS issue_code,
      s.membership_card_id,
      s.id AS stock_id,
      s.manufacturer_serial,
      NULL::uuid AS credential_id,
      jsonb_build_object('stock_status',s.stock_status,'chip_type',s.chip_type) AS details
    FROM linked_stock s
    WHERE s.chip_reference IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM active_credentials c WHERE c.card_id=s.membership_card_id
      )

    UNION ALL

    -- A linked physical item has no opaque NFC reference.
    SELECT
      'LINKED_STOCK_MISSING_NFC_REFERENCE',
      s.membership_card_id,
      s.id,
      s.manufacturer_serial,
      NULL::uuid,
      jsonb_build_object('stock_status',s.stock_status,'chip_type',s.chip_type)
    FROM linked_stock s
    WHERE s.chip_reference IS NULL

    UNION ALL

    -- Stock and active credential point to different chip metadata. Do not
    -- include either opaque reference in the report payload.
    SELECT
      'STOCK_NFC_METADATA_MISMATCH',
      s.membership_card_id,
      s.id,
      s.manufacturer_serial,
      c.id,
      jsonb_build_object(
        'stock_status',s.stock_status,
        'stock_chip_type',s.chip_type,
        'credential_chip_type',c.chip_type,
        'reference_matches',s.chip_reference IS NOT DISTINCT FROM c.chip_reference
      )
    FROM linked_stock s
    JOIN active_credentials c ON c.card_id=s.membership_card_id
    WHERE s.chip_reference IS DISTINCT FROM c.chip_reference
       OR s.chip_type IS DISTINCT FROM c.chip_type

    UNION ALL

    -- A credential is active while the membership card has no linked
    -- physical item in an operational state (possibly NFC-only or legacy).
    SELECT
      'ACTIVE_NFC_WITHOUT_PHYSICAL_STOCK',
      c.card_id,
      NULL::uuid,
      NULL::text,
      c.id,
      jsonb_build_object('credential_chip_type',c.chip_type)
    FROM active_credentials c
    WHERE NOT EXISTS (
      SELECT 1 FROM linked_stock s WHERE s.membership_card_id=c.card_id
    )

    UNION ALL

    -- A blocked card should never remain attached to a member card.
    SELECT
      'BLOCKED_STOCK_STILL_LINKED',
      s.membership_card_id,
      s.id,
      s.manufacturer_serial,
      NULL::uuid,
      jsonb_build_object('stock_status',s.stock_status,'chip_type',s.chip_type)
    FROM public.membership_physical_card_stock s
    WHERE s.stock_status='blocked' AND s.membership_card_id IS NOT NULL
  )
  SELECT a.issue_code,a.membership_card_id,a.stock_id,a.manufacturer_serial,a.credential_id,a.details
  FROM anomalies a
  ORDER BY a.issue_code,a.membership_card_id NULLS LAST,a.stock_id NULLS LAST
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.lumareel_audit_physical_nfc_consistency(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lumareel_audit_physical_nfc_consistency(integer) TO authenticated;

COMMENT ON FUNCTION public.lumareel_audit_physical_nfc_consistency(integer) IS
  'Read-only super-admin reconciliation report for physical stock and NFC metadata; never returns opaque chip references or raw UIDs.';
