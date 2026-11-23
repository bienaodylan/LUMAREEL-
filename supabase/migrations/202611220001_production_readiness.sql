-- ============================================================================
-- LUMARÉEL CO. — SCRIPT SQL TOUT-EN-UN (IDEMPOTENT, SANS ERREUR)
-- À copier-coller une seule fois dans Supabase → SQL Editor → Run.
-- Peut être relancé plusieurs fois sans jamais bloquer sur une table ou politique existante.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Utilisateurs
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('super_admin', 'box_office', 'gate_agent', 'customer')),
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Concerts / Événements
CREATE TABLE IF NOT EXISTS public.events (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    subtitle TEXT DEFAULT '',
    artist TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    doors_open TEXT NOT NULL DEFAULT '19:30',
    venue TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'Côte d''Ivoire',
    address TEXT DEFAULT '',
    description TEXT DEFAULT '',
    artist_portrait TEXT DEFAULT '',
    official_poster TEXT DEFAULT '',
    banner_image TEXT DEFAULT '',
    cover_image TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'published',
    is_featured BOOLEAN DEFAULT false,
    organizer_type TEXT DEFAULT 'lumareel',
    organizer_name TEXT DEFAULT 'LUMARÉEL CO.',
    organizer_id TEXT,
    genre TEXT DEFAULT 'Concert Live',
    platform_fee_percent NUMERIC(4,2) DEFAULT 0.00,
    infoline TEXT DEFAULT '+225 01 53 508 210',
    categories JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Commandes de billets
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    reference TEXT NOT NULL UNIQUE,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    event_id TEXT NOT NULL,
    event_title TEXT NOT NULL,
    event_date TEXT NOT NULL,
    event_venue TEXT NOT NULL,
    category_id TEXT NOT NULL,
    category_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'FCFA',
    payment_status TEXT NOT NULL DEFAULT 'completed',
    payment_provider TEXT NOT NULL DEFAULT 'paymetrust',
    payment_ref TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Billets individuels QR
CREATE TABLE IF NOT EXISTS public.tickets (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    order_ref TEXT NOT NULL,
    event_id TEXT NOT NULL,
    event_title TEXT NOT NULL,
    event_date TEXT NOT NULL,
    event_time TEXT NOT NULL DEFAULT '',
    event_venue TEXT NOT NULL,
    category_id TEXT NOT NULL,
    category_name TEXT NOT NULL,
    serial_number TEXT NOT NULL UNIQUE,
    token TEXT NOT NULL UNIQUE,
    holder_name TEXT NOT NULL,
    holder_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'valid',
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    checked_in_at TIMESTAMPTZ,
    checked_in_by TEXT
);

-- 5. Archives, Actualités & Réglages plateforme
CREATE TABLE IF NOT EXISTS public.archives (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    year TEXT NOT NULL,
    date TEXT DEFAULT '',
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    venue TEXT NOT NULL,
    artists TEXT[] NOT NULL DEFAULT '{}'::text[],
    cover_image TEXT NOT NULL,
    description TEXT DEFAULT '',
    youtube_url TEXT DEFAULT '',
    youtube_embed_url TEXT DEFAULT '',
    duration TEXT DEFAULT 'Live HD',
    photos TEXT[] NOT NULL DEFAULT '{}'::text[],
    is_published BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    platform_name TEXT NOT NULL DEFAULT 'LUMARÉEL',
    tagline TEXT NOT NULL DEFAULT 'CO.',
    logo_monogram TEXT NOT NULL DEFAULT 'LR',
    logo_url TEXT DEFAULT '',
    currency TEXT NOT NULL DEFAULT 'FCFA',
    infoline TEXT NOT NULL DEFAULT '+225 01 53 508 210',
    gate_token TEXT NOT NULL DEFAULT 'VIGILE_AUTH_LMR_2026',
    github_repo_url TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tables LUMARÉEL Black Card (Éditions, Formules, Commandes, Cartes)
CREATE TABLE IF NOT EXISTS public.membership_editions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    edition_code TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    quota INTEGER NOT NULL DEFAULT 100 CHECK (quota > 0),
    allocated_count INTEGER NOT NULL DEFAULT 0 CHECK (allocated_count >= 0),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.membership_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edition_id UUID NOT NULL REFERENCES public.membership_editions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    currency TEXT NOT NULL DEFAULT 'XOF',
    duration_months INTEGER NOT NULL DEFAULT 36 CHECK (duration_months > 0),
    physical_card_included BOOLEAN NOT NULL DEFAULT true,
    renewal_enabled BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.membership_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    order_reference TEXT NOT NULL UNIQUE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'XOF',
    payment_provider TEXT NOT NULL DEFAULT 'paymetrust',
    provider_transaction_id TEXT,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.membership_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.membership_plans(id) ON DELETE RESTRICT,
    edition_id UUID NOT NULL REFERENCES public.membership_editions(id) ON DELETE RESTRICT,
    membership_order_id UUID REFERENCES public.membership_orders(id) ON DELETE SET NULL,
    card_number TEXT NOT NULL UNIQUE,
    card_sequence INTEGER NOT NULL,
    cardholder_name TEXT NOT NULL,
    cardholder_email TEXT NOT NULL,
    card_status TEXT NOT NULL DEFAULT 'active',
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    physical_card_status TEXT NOT NULL DEFAULT 'in_production',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Journal des e-mails transactionnels (Resend)
CREATE TABLE IF NOT EXISTS public.transactional_emails (
    id TEXT PRIMARY KEY,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'ticket_confirmation',
    order_ref TEXT,
    status TEXT NOT NULL DEFAULT 'sent',
    content_preview TEXT DEFAULT '',
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transactional_emails ADD COLUMN IF NOT EXISTS order_ref TEXT;
ALTER TABLE public.transactional_emails ADD COLUMN IF NOT EXISTS content_preview TEXT DEFAULT '';

-- 8. Initialisation de l'édition officielle LUMARÉEL Black Card 3 Ans (50 000 FCFA)
INSERT INTO public.membership_editions (name, edition_code, description, quota, allocated_count, starts_at, status)
VALUES (
    'LUMARÉEL Black Card',
    'BLACK_2026',
    'LUMARÉEL Black Card valable 3 ans avec accès prioritaire, parking réservé, premiers rangs VIP, boisson offerte, préventes, Meet & Greet et réductions partenaires.',
    100,
    0,
    NOW(),
    'active'
)
ON CONFLICT (edition_code) DO NOTHING;

INSERT INTO public.membership_plans (edition_id, name, description, price, currency, duration_months, physical_card_included, renewal_enabled, status)
SELECT
    e.id,
    'LUMARÉEL Black Card 3 Ans',
    'Accès complet 3 ans : carte noire officielle LUMARÉEL et vos 8 avantages inclus.',
    50000,
    'XOF',
    36,
    true,
    true,
    'active'
FROM public.membership_editions e
WHERE e.edition_code = 'BLACK_2026'
  AND NOT EXISTS (
      SELECT 1 FROM public.membership_plans p
      WHERE p.edition_id = e.id AND p.duration_months = 36
  );

-- 9. Fonction de rôle administrateur
CREATE OR REPLACE FUNCTION public.lumareel_current_admin_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_email TEXT;
    v_role TEXT;
BEGIN
    SELECT LOWER(email) INTO v_user_email FROM auth.users WHERE id = auth.uid();
    IF v_user_email = 'bienaodylan428@gmail.com' THEN
        RETURN 'super_admin';
    END IF;
    SELECT role INTO v_role FROM public.users WHERE id = auth.uid() OR LOWER(email) = v_user_email LIMIT 1;
    RETURN COALESCE(v_role, 'customer');
END;
$$;

GRANT EXECUTE ON FUNCTION public.lumareel_current_admin_role() TO authenticated, anon;

-- 10. Index de performance
CREATE INDEX IF NOT EXISTS idx_membership_cards_email ON public.membership_cards (LOWER(cardholder_email));
CREATE INDEX IF NOT EXISTS idx_membership_orders_ref ON public.membership_orders (order_reference);
CREATE INDEX IF NOT EXISTS idx_orders_payment_ref ON public.orders (payment_ref);
CREATE INDEX IF NOT EXISTS idx_tickets_holder_email ON public.tickets (LOWER(holder_email));

-- 11. Compte fondateur & réglages par défaut
INSERT INTO public.users (email, name, role, email_verified)
VALUES ('bienaodylan428@gmail.com', 'Dylan B.', 'super_admin', true)
ON CONFLICT (email) DO UPDATE SET role = 'super_admin', email_verified = true;

INSERT INTO public.platform_settings (id, platform_name, tagline, logo_monogram, currency, infoline, gate_token)
VALUES (1, 'LUMARÉEL', 'CO.', 'LR', 'FCFA', '+225 01 53 508 210', 'VIGILE_AUTH_LMR_2026')
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
