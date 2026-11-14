CREATE TABLE IF NOT EXISTS public.membership_editions (
  id text PRIMARY KEY,
  name text NOT NULL,
  edition_code text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  quota integer NOT NULL DEFAULT 100 CHECK (quota > 0),
  allocated_count integer NOT NULL DEFAULT 0 CHECK (allocated_count >= 0),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','sold_out','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.membership_plans (
  id text PRIMARY KEY,
  edition_id text NOT NULL REFERENCES public.membership_editions(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric(14,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'FCFA',
  duration_months integer NOT NULL DEFAULT 12 CHECK (duration_months > 0),
  physical_card_included boolean NOT NULL DEFAULT true,
  renewal_enabled boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('active','inactive','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.membership_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_id text REFERENCES public.membership_plans(id) ON DELETE SET NULL,
  edition_id text NOT NULL REFERENCES public.membership_editions(id) ON DELETE RESTRICT,
  membership_order_id text,
  card_number text NOT NULL UNIQUE,
  card_sequence integer NOT NULL CHECK (card_sequence > 0),
  cardholder_name text NOT NULL,
  cardholder_email text NOT NULL,
  card_status text NOT NULL DEFAULT 'pending' CHECK (card_status IN ('pending','active','suspended','revoked','expired')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  valid_from timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  renewed_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text,
  physical_card_status text NOT NULL DEFAULT 'not_requested'
    CHECK (physical_card_status IN ('not_requested','requested','payment_pending','approved','in_production','printed','quality_checked','ready_for_dispatch','shipped','delivered','cancelled','blocked','lost','returned','replacement_requested','defective','replaced')),
  physical_card_tracking_number text,
  chip_uid text UNIQUE,
  chip_type text,
  chip_encoded_at timestamptz,
  chip_encoded_by text,
  chip_lock_status text CHECK (chip_lock_status IS NULL OR chip_lock_status IN ('unlocked','locked_aes128','read_only')),
  wallet_balance numeric(14,2) NOT NULL DEFAULT 0 CHECK (wallet_balance >= 0),
  wallet_currency text NOT NULL DEFAULT 'FCFA',
  club_vip_level text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > valid_from)
);

CREATE TABLE IF NOT EXISTS public.membership_qr_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.membership_cards(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  token_prefix text NOT NULL DEFAULT '',
  token_version integer NOT NULL DEFAULT 1 CHECK (token_version > 0),
  is_current boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','rotated','revoked')),
  revocation_reason text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  last_verified_at timestamptz,
  verification_count bigint NOT NULL DEFAULT 0 CHECK (verification_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS membership_qr_one_current_token_per_card
  ON public.membership_qr_tokens(card_id) WHERE is_current = true AND revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.membership_benefits (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  benefit_type text NOT NULL CHECK (benefit_type IN ('private_presale','priority_access','exclusive_invitation','preferential_rate','vip_lounge','artist_experience','gift_surprise','partner_offer')),
  edition_id text REFERENCES public.membership_editions(id) ON DELETE SET NULL,
  event_id text,
  event_title text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  max_redemptions integer CHECK (max_redemptions IS NULL OR max_redemptions >= 0),
  current_redemptions integer NOT NULL DEFAULT 0 CHECK (current_redemptions >= 0),
  per_member_limit integer NOT NULL DEFAULT 1 CHECK (per_member_limit > 0),
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','expired','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.membership_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.membership_cards(id) ON DELETE CASCADE,
  benefit_id text NOT NULL REFERENCES public.membership_benefits(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  used_quantity integer NOT NULL DEFAULT 0 CHECK (used_quantity >= 0 AND used_quantity <= quantity),
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','reserved','confirmed','used','cancelled','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(card_id, benefit_id)
);

CREATE TABLE IF NOT EXISTS public.membership_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.membership_cards(id) ON DELETE RESTRICT,
  benefit_id text NOT NULL REFERENCES public.membership_benefits(id) ON DELETE RESTRICT,
  event_id text,
  redeemed_by text NOT NULL,
  redemption_reference text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','disputed')),
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.membership_scan_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  card_id uuid REFERENCES public.membership_cards(id) ON DELETE SET NULL,
  card_number text,
  cardholder_name text,
  event_id text,
  event_title text,
  reader_id text,
  reader_name text,
  access_point_id text,
  access_point_name text,
  scan_method text NOT NULL CHECK (scan_method IN ('qr_code','manual_override')),
  verification_result text NOT NULL CHECK (verification_result IN ('AUTHORIZED','DENIED')),
  rejection_reason text,
  operator_id text NOT NULL,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  flagged_suspicious boolean NOT NULL DEFAULT false,
  repeat_scan_count integer NOT NULL DEFAULT 0 CHECK (repeat_scan_count >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.membership_event_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id text NOT NULL,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS membership_cards_user_id_idx ON public.membership_cards(user_id);
CREATE INDEX IF NOT EXISTS membership_cards_status_idx ON public.membership_cards(card_status);
CREATE INDEX IF NOT EXISTS membership_cards_edition_idx ON public.membership_cards(edition_id);
CREATE INDEX IF NOT EXISTS membership_benefits_active_idx ON public.membership_benefits(status, benefit_type);
CREATE INDEX IF NOT EXISTS membership_entitlements_card_idx ON public.membership_entitlements(card_id, status);
CREATE INDEX IF NOT EXISTS membership_redemptions_card_idx ON public.membership_redemptions(card_id, redeemed_at DESC);
CREATE INDEX IF NOT EXISTS membership_scan_logs_recent_idx ON public.membership_scan_logs(scanned_at DESC);
CREATE INDEX IF NOT EXISTS membership_event_logs_recent_idx ON public.membership_event_logs(created_at DESC);

ALTER TABLE public.membership_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_event_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.membership_editions, public.membership_plans, public.membership_cards,
  public.membership_qr_tokens, public.membership_benefits, public.membership_entitlements,
  public.membership_redemptions, public.membership_scan_logs, public.membership_event_logs
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.membership_editions, public.membership_plans, public.membership_cards,
  public.membership_qr_tokens, public.membership_benefits, public.membership_entitlements,
  public.membership_redemptions, public.membership_scan_logs, public.membership_event_logs
  TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
