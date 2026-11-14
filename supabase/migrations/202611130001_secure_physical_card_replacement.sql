-- LUMARÉEL: atomic replacement of a lost/damaged physical membership card.
-- Keeps the logical membership card and its QR identity; revokes the old NFC
-- credential before enrolling the replacement chip, all in one transaction.
-- Never stores raw NFC UIDs or card keys.

CREATE OR REPLACE FUNCTION public.lumareel_replace_physical_card(
  p_membership_card_id uuid,
  p_old_stock_id uuid,
  p_new_stock_id uuid,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_card public.membership_cards%ROWTYPE;
  v_old public.membership_physical_card_stock%ROWTYPE;
  v_new public.membership_physical_card_stock%ROWTYPE;
  v_credential public.membership_chip_credentials%ROWTYPE;
  v_revocation jsonb;
  v_enrollment jsonb;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
BEGIN
  IF public.lumareel_current_admin_role() IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'Accès super-administrateur requis.' USING ERRCODE='42501';
  END IF;
  IF p_membership_card_id IS NULL OR p_old_stock_id IS NULL OR p_new_stock_id IS NULL
     OR p_old_stock_id = p_new_stock_id THEN
    RAISE EXCEPTION 'Identifiants de remplacement invalides.' USING ERRCODE='22023';
  END IF;
  IF v_reason IS NULL OR length(v_reason) < 5 OR length(v_reason) > 500 THEN
    RAISE EXCEPTION 'Motif de remplacement obligatoire (5 à 500 caractères).' USING ERRCODE='22023';
  END IF;

  -- Lock stock rows in a deterministic order. This matches the assignment RPC's
  -- stock-before-membership lock order and avoids replacement/assignment deadlocks.
  PERFORM 1
    FROM public.membership_physical_card_stock
    WHERE id IN (p_old_stock_id, p_new_stock_id)
    ORDER BY id
    FOR UPDATE;
  SELECT * INTO v_old FROM public.membership_physical_card_stock WHERE id=p_old_stock_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ancienne carte physique introuvable.' USING ERRCODE='P0002';
  END IF;
  SELECT * INTO v_new FROM public.membership_physical_card_stock WHERE id=p_new_stock_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carte de remplacement introuvable.' USING ERRCODE='P0002';
  END IF;

  SELECT * INTO v_card FROM public.membership_cards WHERE id=p_membership_card_id FOR UPDATE;
  IF NOT FOUND OR v_card.card_status <> 'active' OR v_card.expires_at <= now()
     OR v_card.membership_order_id IS NULL OR NOT EXISTS (
       SELECT 1 FROM public.membership_orders o
       WHERE o.id=v_card.membership_order_id AND o.user_id=v_card.user_id
         AND o.payment_status='completed'
     ) THEN
    RAISE EXCEPTION 'Adhésion active et payée requise.' USING ERRCODE='23514';
  END IF;

  IF v_old.membership_card_id IS DISTINCT FROM p_membership_card_id
     OR v_old.stock_status NOT IN ('assigned','verified','ready','shipped','delivered') THEN
    RAISE EXCEPTION 'L’ancienne carte n’est pas associée à cette adhésion ou ne peut pas être remplacée.' USING ERRCODE='23514';
  END IF;
  IF v_new.membership_card_id IS NOT NULL
     OR v_new.stock_status NOT IN ('available','verified')
     OR v_new.chip_reference IS NULL THEN
    RAISE EXCEPTION 'Le stock de remplacement doit être disponible, vérifié et doté d’une référence NFC.' USING ERRCODE='23514';
  END IF;
  IF v_new.chip_type NOT IN ('MIFARE_DESFIRE_EV2','MIFARE_DESFIRE_EV3') THEN
    RAISE EXCEPTION 'Type de puce incompatible avec l’association NFC.' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_credential
    FROM public.membership_chip_credentials
    WHERE card_id=p_membership_card_id AND credential_status='active'
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aucun credential NFC actif à révoquer.' USING ERRCODE='23514';
  END IF;

  -- Both RPCs independently re-check super-admin permissions and write their
  -- own audit records. Any failure rolls back revocation and stock changes too.
  v_revocation := public.lumareel_nfc_revoke(v_credential.id, v_reason);
  v_enrollment := public.lumareel_nfc_associate(
    p_membership_card_id, v_new.chip_reference, v_new.chip_type
  );

  -- The old physical item is blocked (not marked returned: it may be lost).
  -- Its association is cleared so the permanent membership card can link to
  -- exactly one replacement stock item. The audit event retains its serial.
  UPDATE public.membership_physical_card_stock
    SET stock_status='blocked', membership_card_id=NULL, updated_at=now()
    WHERE id=p_old_stock_id;
  UPDATE public.membership_physical_card_stock
    SET stock_status='assigned', membership_card_id=p_membership_card_id,
        verified_at=coalesce(verified_at,now()), verified_by=auth.uid(), updated_at=now()
    WHERE id=p_new_stock_id;
  UPDATE public.membership_cards
    SET physical_card_status='in_production',
        physical_card_tracking_number=NULL, updated_at=now()
    WHERE id=p_membership_card_id;

  INSERT INTO public.membership_events(actor_id,action_type,entity_type,entity_id,details)
  VALUES(auth.uid()::text,'PHYSICAL_CARD_REPLACED','membership_cards',p_membership_card_id::text,
    jsonb_build_object(
      'reason',v_reason,
      'old_stock_id',p_old_stock_id,
      'old_manufacturer_serial',v_old.manufacturer_serial,
      'old_stock_status','blocked',
      'new_stock_id',p_new_stock_id,
      'new_manufacturer_serial',v_new.manufacturer_serial,
      'revoked_credential_id',v_credential.id,
      'new_credential_id',v_enrollment->>'credential_id'
    ));

  RETURN jsonb_build_object(
    'membership_card_id',p_membership_card_id,
    'card_number',v_card.card_number,
    'old_stock_id',p_old_stock_id,
    'old_stock_status','blocked',
    'new_stock_id',p_new_stock_id,
    'new_stock_status','assigned',
    'revoked_credential_id',v_credential.id,
    'new_credential_id',v_enrollment->>'credential_id'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.lumareel_replace_physical_card(uuid,uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lumareel_replace_physical_card(uuid,uuid,uuid,text) TO authenticated;

COMMENT ON FUNCTION public.lumareel_replace_physical_card(uuid,uuid,uuid,text) IS
  'Super-admin-only atomic physical card replacement: revoke previous NFC, enroll replacement, block old stock, link new stock and audit reason.';
