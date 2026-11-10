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
