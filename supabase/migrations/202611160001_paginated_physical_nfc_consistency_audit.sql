-- LUMAREEL: paginated, read-only reconciliation report for physical stock / NFC metadata.
-- Preserves the original audit RPC for compatibility. This page RPC adds total_count
-- and offset so admins can inspect every anomaly without any automatic repair.
-- Never returns raw NFC UIDs, opaque chip references, keys, or member PII.

CREATE OR REPLACE FUNCTION public.lumareel_audit_physical_nfc_consistency_page(
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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
  )
  SELECT jsonb_build_object(
    'total_count',(SELECT count(*) FROM anomalies),
    'limit',v_limit,
    'offset',v_offset,
    'anomalies',coalesce((
      SELECT jsonb_agg(to_jsonb(page_row))
      FROM (
        SELECT a.issue_code,a.membership_card_id,a.stock_id,a.manufacturer_serial,a.credential_id,a.details
        FROM anomalies a
        ORDER BY a.issue_code,a.membership_card_id NULLS LAST,a.stock_id NULLS LAST
        LIMIT v_limit OFFSET v_offset
      ) page_row
    ),'[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.lumareel_audit_physical_nfc_consistency_page(integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lumareel_audit_physical_nfc_consistency_page(integer,integer) TO authenticated;

COMMENT ON FUNCTION public.lumareel_audit_physical_nfc_consistency_page(integer,integer) IS
  'Paginated read-only super-admin reconciliation report; includes total_count and never returns opaque NFC references or raw UIDs.';
