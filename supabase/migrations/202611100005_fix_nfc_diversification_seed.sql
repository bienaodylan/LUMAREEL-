-- Fix NFC enrollment: the atomic RPC intentionally omits diversification_seed.
-- Generate a fresh per-credential random value; this is NOT a DESFire master key.
ALTER TABLE public.membership_chip_credentials
  ALTER COLUMN diversification_seed
  SET DEFAULT encode(gen_random_bytes(32), 'hex');

COMMENT ON COLUMN public.membership_chip_credentials.diversification_seed IS
  'Random per-credential diversification material; never store a DESFire master key here.';
