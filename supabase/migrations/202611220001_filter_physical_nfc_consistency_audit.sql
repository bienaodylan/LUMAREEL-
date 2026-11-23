-- LUMAREEL: filter the read-only physical/NFC consistency report by anomaly code.
-- The legacy two-argument RPC remains available and delegates to the filtered RPC.
-- No raw NFC references, UIDs, keys, or member PII are returned.

CREATE OR REPLACE FUNCTION public.lumareel_audit_physical_nfc_consistency_filtered_page(
  p_limit integer,
  p_offset integer,
  p_issue_code text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE
  v_limit integer := coalesce(p_limit, 100);
  v_offset integer := coalesce(p_offset, 0);
  v_result jsonb;
BEGIN
  IF public.lumareel_current_admin_role() IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'Accès super-administrateur requis.' USING ERRCODE = '42501';
  END IF;
  IF v_limit < 1 OR v_limit > 500 OR v_offset < 0 OR v_offset > 100000 THEN
    RAISE EXCEPTION 'Paramètres de pagination invalides (limit 1–500, offset 0–100000).' USING ERRCODE = '22023';
  END IF;
  IF p_issue_code IS NOT NULL AND p_issue_code NOT IN (
    'STOCK_WITHOUT_ACTIVE_NFC',
    'LINKED_STOCK_MISSING_NFC_REFERENCE',
    'STOCK_NFC_METADATA_MISMATCH',
    'ACTIVE_NFC_WITHOUT_PHYSICAL_STOCK',
    'BLOCKED_STOCK_STILL_LINKED'
  ) THEN
    RAISE EXCEPTION 'Code d’anomalie NFC invalide.' USING ERRCODE = '22023';
  END IF;

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
    SELECT
      'STOCK_WITHOUT_ACTIVE_NFC'::text AS issue_code,
      s.membership_card_id,
      s.id AS stock_id,
      s.manufacturer_serial,
      NULL::uuid AS credential_id,
      jsonb_build_object('stock_status',s.stock_status,'chip_type',s.chip_type) AS details
    FROM linked_stock s
    WHERE s.chip_reference IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM active_credentials c WHERE c.card_id=s.membership_card_id)

    UNION ALL

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

    SELECT
      'ACTIVE_NFC_WITHOUT_PHYSICAL_STOCK',
      c.card_id,
      NULL::uuid,
      NULL::text,
      c.id,
      jsonb_build_object('credential_chip_type',c.chip_type)
    FROM active_credentials c
    WHERE NOT EXISTS (SELECT 1 FROM linked_stock s WHERE s.membership_card_id=c.card_id)

    UNION ALL

    SELECT
      'BLOCKED_STOCK_STILL_LINKED',
      s.membership_card_id,
      s.id,
      s.manufacturer_serial,
      NULL::uuid,
      jsonb_build_object('stock_status',s.stock_status,'chip_type',s.chip_type)
    FROM public.membership_physical_card_stock s
    WHERE s.stock_status='blocked' AND s.membership_card_id IS NOT NULL
  ),
  filtered_anomalies AS (
    SELECT a.*
    FROM anomalies a
    WHERE p_issue_code IS NULL OR a.issue_code = p_issue_code
  )
  SELECT jsonb_build_object(
    'total_count',(SELECT count(*) FROM filtered_anomalies),
    'limit',v_limit,
    'offset',v_offset,
    'issue_code',p_issue_code,
    'anomalies',coalesce((
      SELECT jsonb_agg(to_jsonb(page_row) ORDER BY page_row.issue_code,page_row.membership_card_id NULLS LAST,page_row.stock_id NULLS LAST,page_row.credential_id NULLS LAST)
      FROM (
        SELECT a.issue_code,a.membership_card_id,a.stock_id,a.manufacturer_serial,a.credential_id,a.details
        FROM filtered_anomalies a
        ORDER BY a.issue_code,a.membership_card_id NULLS LAST,a.stock_id NULLS LAST,a.credential_id NULLS LAST
        LIMIT v_limit OFFSET v_offset
      ) page_row
    ),'[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Preserve the existing RPC signature for clients that do not use filtering.
CREATE OR REPLACE FUNCTION public.lumareel_audit_physical_nfc_consistency_page(
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
) RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog
AS $$
  SELECT public.lumareel_audit_physical_nfc_consistency_filtered_page(
    p_limit, p_offset, NULL::text
  ) - 'issue_code';
$$;

REVOKE ALL ON FUNCTION public.lumareel_audit_physical_nfc_consistency_filtered_page(integer,integer,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lumareel_audit_physical_nfc_consistency_page(integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lumareel_audit_physical_nfc_consistency_filtered_page(integer,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lumareel_audit_physical_nfc_consistency_page(integer,integer) TO authenticated;

COMMENT ON FUNCTION public.lumareel_audit_physical_nfc_consistency_filtered_page(integer,integer,text) IS
  'Paginated, read-only super-admin NFC consistency report filtered by a known anomaly code; never returns opaque NFC references or raw UIDs.';
COMMENT ON FUNCTION public.lumareel_audit_physical_nfc_consistency_page(integer,integer) IS
  'Compatibility wrapper for the paginated read-only NFC consistency report without an anomaly filter.';
