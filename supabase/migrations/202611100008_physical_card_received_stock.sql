-- LUMARÉEL CARD: physical stock received from external manufacturer.
-- Store only manufacturer serial + opaque NFC reference; never raw UID or card keys.
CREATE TABLE IF NOT EXISTS public.membership_physical_card_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_serial text NOT NULL UNIQUE,
  chip_reference text UNIQUE,
  batch_reference text,
  chip_type text NOT NULL DEFAULT 'MIFARE_DESFIRE_EV3'
    CHECK (chip_type IN ('MIFARE_DESFIRE_EV3','MIFARE_DESFIRE_EV2','OTHER')),
  stock_status text NOT NULL DEFAULT 'available'
    CHECK (stock_status IN ('available','assigned','verified','ready','shipped','delivered','blocked','returned')),
  membership_card_id uuid UNIQUE REFERENCES public.membership_cards(id) ON DELETE RESTRICT,
  received_at timestamptz NOT NULL DEFAULT now(),
  received_by uuid REFERENCES public.users(id),
  verified_at timestamptz,
  verified_by uuid REFERENCES public.users(id),
  shipped_at timestamptz,
  delivered_at timestamptz,
  carrier text,
  tracking_reference text,
  internal_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT physical_stock_chip_reference_format CHECK (chip_reference IS NULL OR chip_reference ~ '^[A-Za-z0-9_-]{16,160}$')
);
CREATE INDEX IF NOT EXISTS idx_physical_card_stock_status ON public.membership_physical_card_stock(stock_status);
CREATE INDEX IF NOT EXISTS idx_physical_card_stock_batch ON public.membership_physical_card_stock(batch_reference);
ALTER TABLE public.membership_physical_card_stock ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.membership_physical_card_stock FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.membership_physical_card_stock TO authenticated;
CREATE POLICY "Super admins manage received physical card stock"
 ON public.membership_physical_card_stock FOR ALL TO authenticated
 USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id=auth.uid() AND u.role='super_admin'))
 WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id=auth.uid() AND u.role='super_admin'));

-- Atomic assignment of one received chip/card to one paid membership card.
CREATE OR REPLACE FUNCTION public.lumareel_assign_received_card(
  p_stock_id uuid, p_membership_card_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public
AS $$
DECLARE v_stock public.membership_physical_card_stock%ROWTYPE;
        v_card public.membership_cards%ROWTYPE;
        v_credential jsonb;
BEGIN
  IF public.lumareel_current_admin_role() IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'Accès super-administrateur requis.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_stock FROM public.membership_physical_card_stock WHERE id=p_stock_id FOR UPDATE;
  IF NOT FOUND OR v_stock.stock_status NOT IN ('available','verified') THEN
    RAISE EXCEPTION 'Carte physique non disponible ou déjà attribuée.' USING ERRCODE='23514';
  END IF;
  IF v_stock.chip_reference IS NULL THEN
    RAISE EXCEPTION 'Cette carte reçue n’a pas encore de référence NFC enregistrée.' USING ERRCODE='23514';
  END IF;
  SELECT * INTO v_card FROM public.membership_cards WHERE id=p_membership_card_id FOR UPDATE;
  IF NOT FOUND OR v_card.card_status<>'active' OR v_card.expires_at<=now()
    OR v_card.membership_order_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.membership_orders o WHERE o.id=v_card.membership_order_id
      AND o.user_id=v_card.user_id AND o.payment_status='completed'
    ) THEN
    RAISE EXCEPTION 'Carte membre ou paiement non valide.' USING ERRCODE='23514';
  END IF;
  IF EXISTS(SELECT 1 FROM public.membership_physical_card_stock WHERE membership_card_id=p_membership_card_id) THEN
    RAISE EXCEPTION 'Une carte physique est déjà liée à ce membre.' USING ERRCODE='23505';
  END IF;
  v_credential:=public.lumareel_nfc_associate(p_membership_card_id,v_stock.chip_reference,v_stock.chip_type);
  UPDATE public.membership_physical_card_stock SET membership_card_id=p_membership_card_id,
    stock_status='assigned',verified_at=now(),verified_by=auth.uid(),updated_at=now()
    WHERE id=p_stock_id;
  INSERT INTO public.membership_events(actor_id,action_type,entity_type,entity_id,details)
  VALUES(auth.uid()::text,'PHYSICAL_CARD_ASSIGNED','membership_physical_card_stock',p_stock_id::text,
    jsonb_build_object('membership_card_id',p_membership_card_id,'manufacturer_serial',v_stock.manufacturer_serial));
  RETURN jsonb_build_object('stock_id',p_stock_id,'membership_card_id',p_membership_card_id,
    'manufacturer_serial',v_stock.manufacturer_serial,'card_number',v_card.card_number,'credential',v_credential);
END;
$$;
REVOKE ALL ON FUNCTION public.lumareel_assign_received_card(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lumareel_assign_received_card(uuid,uuid) TO authenticated;
