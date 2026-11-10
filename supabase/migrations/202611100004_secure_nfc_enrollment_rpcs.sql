-- Atomic NFC enrollment/revocation RPCs. Admin authorization is checked in the
-- API (verified Supabase session + role RPC) and again here via auth.uid().
CREATE OR REPLACE FUNCTION public.lumareel_nfc_associate(
    p_card_id UUID,
    p_chip_reference TEXT,
    p_chip_type TEXT DEFAULT 'MIFARE_DESFIRE_EV3'
) RETURNS JSONB
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
    v_card public.membership_cards%ROWTYPE;
    v_credential public.membership_chip_credentials%ROWTYPE;
    v_actor_role TEXT;
BEGIN
    SELECT public.lumareel_current_admin_role() INTO v_actor_role;
    IF v_actor_role IS DISTINCT FROM 'super_admin' THEN
        RAISE EXCEPTION 'Accès super-administrateur requis.' USING ERRCODE = '42501';
    END IF;
    IF p_chip_reference IS NULL OR length(trim(p_chip_reference)) < 16 OR length(trim(p_chip_reference)) > 160
       OR p_chip_reference !~ '^[A-Za-z0-9_-]+$' THEN
        RAISE EXCEPTION 'Référence NFC opaque invalide (16 à 160 caractères alphanumériques).' USING ERRCODE = '22023';
    END IF;
    IF p_chip_type NOT IN ('MIFARE_DESFIRE_EV2','MIFARE_DESFIRE_EV3') THEN
        RAISE EXCEPTION 'Type de puce non pris en charge.' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_card FROM public.membership_cards WHERE id = p_card_id FOR UPDATE;
    IF NOT FOUND OR v_card.card_status <> 'active' OR v_card.expires_at <= NOW() THEN
        RAISE EXCEPTION 'Carte membre inactive, expirée ou introuvable.' USING ERRCODE = '23514';
    END IF;
    IF v_card.membership_order_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.membership_orders o
        WHERE o.id = v_card.membership_order_id AND o.user_id = v_card.user_id
          AND o.payment_status = 'completed'
    ) THEN
        RAISE EXCEPTION 'Commande d’adhésion payée non vérifiée.' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (SELECT 1 FROM public.membership_chip_credentials
               WHERE chip_reference = trim(p_chip_reference)) THEN
        RAISE EXCEPTION 'Cette référence NFC est déjà enregistrée.' USING ERRCODE = '23505';
    END IF;
    IF EXISTS (SELECT 1 FROM public.membership_chip_credentials
               WHERE card_id = p_card_id AND credential_status = 'active') THEN
        RAISE EXCEPTION 'Cette carte possède déjà une puce active.' USING ERRCODE = '23505';
    END IF;

    INSERT INTO public.membership_chip_credentials
      (card_id, chip_reference, chip_type, credential_status, enrolled_at)
    VALUES (p_card_id, trim(p_chip_reference), p_chip_type, 'active', NOW())
    RETURNING * INTO v_credential;

    INSERT INTO public.membership_events(actor_id, action_type, entity_type, entity_id, details)
    VALUES (auth.uid()::TEXT, 'NFC_ASSOCIATED', 'membership_chip_credential', v_credential.id::TEXT,
      jsonb_build_object('card_id',p_card_id,'card_number',v_card.card_number,'chip_type',p_chip_type));

    RETURN jsonb_build_object('credential_id',v_credential.id,'card_id',p_card_id,
      'card_number',v_card.card_number,'credential_status',v_credential.credential_status,
      'enrolled_at',v_credential.enrolled_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.lumareel_nfc_revoke(
    p_credential_id UUID,
    p_reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_credential public.membership_chip_credentials%ROWTYPE;
BEGIN
    SELECT public.lumareel_current_admin_role() INTO v_role;
    IF v_role IS DISTINCT FROM 'super_admin' THEN
        RAISE EXCEPTION 'Accès super-administrateur requis.' USING ERRCODE = '42501';
    END IF;
    IF p_reason IS NULL OR length(trim(p_reason)) < 5 OR length(trim(p_reason)) > 500 THEN
        RAISE EXCEPTION 'Motif de révocation obligatoire (5 à 500 caractères).' USING ERRCODE = '22023';
    END IF;
    SELECT * INTO v_credential FROM public.membership_chip_credentials
      WHERE id = p_credential_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Credential NFC introuvable.' USING ERRCODE = 'P0002'; END IF;
    IF v_credential.credential_status = 'revoked' THEN
        RAISE EXCEPTION 'Credential déjà révoqué.' USING ERRCODE = '23514';
    END IF;

    UPDATE public.membership_chip_credentials
      SET credential_status='revoked', revoked_at=NOW(), updated_at=NOW()
      WHERE id=p_credential_id RETURNING * INTO v_credential;
    INSERT INTO public.membership_events(actor_id, action_type, entity_type, entity_id, details)
    VALUES (auth.uid()::TEXT, 'NFC_REVOKED', 'membership_chip_credential', p_credential_id::TEXT,
      jsonb_build_object('card_id',v_credential.card_id,'reason',trim(p_reason)));
    RETURN jsonb_build_object('credential_id',v_credential.id,'card_id',v_credential.card_id,
      'credential_status',v_credential.credential_status,'revoked_at',v_credential.revoked_at);
END;
$$;

REVOKE ALL ON FUNCTION public.lumareel_nfc_associate(UUID,TEXT,TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lumareel_nfc_revoke(UUID,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lumareel_nfc_associate(UUID,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lumareel_nfc_revoke(UUID,TEXT) TO authenticated;
