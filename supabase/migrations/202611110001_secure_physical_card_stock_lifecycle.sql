-- LUMARÉEL CARD: enforce the received-card logistics lifecycle at the database boundary.
-- Audit writes are intentionally performed inside trusted RPCs because direct INSERT
-- on membership_events is revoked from authenticated clients (migration 202611100007).

-- Existing NFC/assignment RPCs insert into the protected audit table. Convert them
-- to SECURITY DEFINER while retaining their in-function super_admin checks.
ALTER FUNCTION public.lumareel_nfc_associate(uuid,text,text) SECURITY DEFINER;
ALTER FUNCTION public.lumareel_nfc_revoke(uuid,text) SECURITY DEFINER;
ALTER FUNCTION public.lumareel_assign_received_card(uuid,uuid) SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.lumareel_nfc_associate(uuid,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lumareel_nfc_revoke(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lumareel_assign_received_card(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lumareel_nfc_associate(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lumareel_nfc_revoke(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lumareel_assign_received_card(uuid,uuid) TO authenticated;

-- Prevent direct table UPDATE from bypassing the lifecycle RPC.
REVOKE UPDATE ON TABLE public.membership_physical_card_stock FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.membership_physical_card_stock TO authenticated;

CREATE OR REPLACE FUNCTION public.lumareel_update_received_card_status(
  p_stock_id uuid,
  p_status text,
  p_carrier text DEFAULT NULL,
  p_tracking_reference text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stock public.membership_physical_card_stock%ROWTYPE;
  v_previous_status text;
  v_carrier text := nullif(trim(coalesce(p_carrier,'')), '');
  v_tracking text := nullif(trim(coalesce(p_tracking_reference,'')), '');
  v_action text;
BEGIN
  IF public.lumareel_current_admin_role() IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'Accès super-administrateur requis.' USING ERRCODE='42501';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('verified','ready','shipped','delivered','blocked','returned') THEN
    RAISE EXCEPTION 'Statut physique invalide.' USING ERRCODE='22023';
  END IF;
  IF length(coalesce(v_carrier,'')) > 100 OR length(coalesce(v_tracking,'')) > 160 THEN
    RAISE EXCEPTION 'Transporteur ou référence de suivi trop long.' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_stock
    FROM public.membership_physical_card_stock
    WHERE id=p_stock_id
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carte physique reçue introuvable.' USING ERRCODE='P0002';
  END IF;
  v_previous_status := v_stock.stock_status;

  -- Repeated shipping may safely refresh tracking metadata; other repeated
  -- transitions are rejected to avoid duplicate audit noise.
  IF p_status = v_previous_status AND p_status <> 'shipped' THEN
    RAISE EXCEPTION 'La carte possède déjà ce statut.' USING ERRCODE='23514';
  END IF;

  IF p_status <> v_previous_status AND NOT (
    (v_previous_status='available' AND p_status IN ('verified','blocked','returned')) OR
    (v_previous_status='assigned' AND p_status IN ('verified','ready','blocked','returned')) OR
    (v_previous_status='verified' AND p_status IN ('ready','blocked','returned')) OR
    (v_previous_status='ready' AND p_status IN ('shipped','blocked','returned')) OR
    (v_previous_status='shipped' AND p_status IN ('delivered','blocked','returned')) OR
    (v_previous_status='delivered' AND p_status IN ('blocked','returned')) OR
    (v_previous_status='blocked' AND p_status IN ('verified','returned'))
  ) THEN
    RAISE EXCEPTION 'Transition de statut physique interdite (% → %).',v_previous_status,p_status
      USING ERRCODE='23514';
  END IF;

  IF p_status IN ('ready','shipped','delivered') THEN
    IF v_stock.membership_card_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.membership_cards c
      JOIN public.membership_orders o ON o.id=c.membership_order_id AND o.user_id=c.user_id
      WHERE c.id=v_stock.membership_card_id AND c.card_status='active'
        AND c.expires_at>now() AND o.payment_status='completed'
    ) THEN
      RAISE EXCEPTION 'Une carte membre active et payée est requise pour la remise.' USING ERRCODE='23514';
    END IF;
  END IF;

  UPDATE public.membership_physical_card_stock
  SET stock_status=p_status,
      verified_at=CASE WHEN p_status='verified' THEN now() ELSE verified_at END,
      verified_by=CASE WHEN p_status='verified' THEN auth.uid() ELSE verified_by END,
      shipped_at=CASE WHEN p_status='shipped' AND v_previous_status<>'shipped' THEN now() ELSE shipped_at END,
      delivered_at=CASE WHEN p_status='delivered' AND v_previous_status<>'delivered' THEN now() ELSE delivered_at END,
      carrier=CASE WHEN p_status='shipped' THEN v_carrier ELSE carrier END,
      tracking_reference=CASE WHEN p_status='shipped' THEN v_tracking ELSE tracking_reference END,
      updated_at=now()
  WHERE id=p_stock_id
  RETURNING * INTO v_stock;

  -- Keep the member-facing card status/tracking in sync with the stock ledger.
  IF v_stock.membership_card_id IS NOT NULL AND p_status IN ('shipped','delivered') THEN
    UPDATE public.membership_cards
    SET physical_card_status=p_status,
        physical_card_tracking_number=CASE WHEN p_status='shipped'
          THEN v_stock.tracking_reference ELSE physical_card_tracking_number END,
        updated_at=now()
    WHERE id=v_stock.membership_card_id;
  END IF;

  v_action := CASE WHEN p_status=v_previous_status THEN 'PHYSICAL_CARD_TRACKING_UPDATED'
                   ELSE 'PHYSICAL_CARD_STATUS_UPDATED' END;
  INSERT INTO public.membership_events(actor_id,action_type,entity_type,entity_id,details)
  VALUES(auth.uid()::text,v_action,'membership_physical_card_stock',p_stock_id::text,
    jsonb_build_object('previous_status',v_previous_status,'status',p_status,
      'manufacturer_serial',v_stock.manufacturer_serial,'membership_card_id',v_stock.membership_card_id,
      'carrier',v_stock.carrier,'tracking_reference',v_stock.tracking_reference));

  RETURN jsonb_build_object('id',v_stock.id,'manufacturer_serial',v_stock.manufacturer_serial,
    'stock_status',v_stock.stock_status,'membership_card_id',v_stock.membership_card_id,
    'carrier',v_stock.carrier,'tracking_reference',v_stock.tracking_reference,
    'shipped_at',v_stock.shipped_at,'delivered_at',v_stock.delivered_at);
END;
$$;

REVOKE ALL ON FUNCTION public.lumareel_update_received_card_status(uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lumareel_update_received_card_status(uuid,text,text,text) TO authenticated;

COMMENT ON FUNCTION public.lumareel_update_received_card_status(uuid,text,text,text) IS
  'Super-admin-only, locked, audited physical stock transition. Requires paid active membership before ready/shipped/delivered.';
