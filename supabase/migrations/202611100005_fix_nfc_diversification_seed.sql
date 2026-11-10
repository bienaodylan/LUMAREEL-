-- Fix NFC enrollment: the atomic RPC intentionally omits diversification_seed.
-- Add the metadata column after registry restoration and generate a fresh random
-- per-credential value. This is NOT a DESFire master key.
ALTER TABLE public.membership_chip_credentials
  ADD COLUMN IF NOT EXISTS diversification_seed TEXT
  NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex');

ALTER TABLE public.membership_chip_credentials
  ALTER COLUMN diversification_seed
  SET DEFAULT encode(gen_random_bytes(32), 'hex');

COMMENT ON COLUMN public.membership_chip_credentials.diversification_seed IS
  'Random per-credential diversification material; never store a DESFire master key here.';
