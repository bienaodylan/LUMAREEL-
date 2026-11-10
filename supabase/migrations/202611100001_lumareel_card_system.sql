-- ============================================================================
-- LUMARÉEL CO. — LUMARÉEL CARD & MEMBERSHIP INFRASTRUCTURE
-- Migration : 202611100001_lumareel_card_system.sql
-- Modules :
-- 1. membership_editions (Éditions de membership ex: Founders Edition 100 membres)
-- 2. membership_plans (Formules tarifaires et durées d'adhésion)
-- 3. membership_applications (Dossiers et demandes d'adhésion)
-- 4. membership_orders (Commandes et paiements sécurisés)
-- 5. membership_cards (Identités permanentes des cartes LMR-2026-XXXX)
-- 6. membership_chip_credentials (Métadonnées sécurisées DESFire EV3 / SAM AV3)
-- 7. membership_qr_tokens (Jetons cryptographiques QR révocables)
-- 8. membership_benefits (Catalogue des privilèges, VIP, coupes-files)
-- 9. membership_entitlements (Droits attribués aux membres)
-- 10. membership_redemptions (Journal atomique de consommation des avantages)
-- 11. membership_readers (Terminaux mobiles et lecteurs fixes autorisés)
-- 12. membership_event_access_points (Points de contrôle et zones d'accès)
-- 13. membership_scan_logs (Audit de passage et contrôles en temps réel)
-- 14. membership_events (Journal d'audit des actions administratives)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ÉDITIONS COMMERCIALES (ex: Founders Edition quota 100)
CREATE TABLE IF NOT EXISTS public.membership_editions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    edition_code TEXT NOT NULL UNIQUE, -- 'FOUNDERS_2026'
    description TEXT DEFAULT '',
    quota INTEGER NOT NULL DEFAULT 100 CHECK (quota > 0),
    allocated_count INTEGER NOT NULL DEFAULT 0 CHECK (allocated_count >= 0 AND allocated_count <= quota),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'sold_out', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. FORMULES D'ADHÉSION
CREATE TABLE IF NOT EXISTS public.membership_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edition_id UUID NOT NULL REFERENCES public.membership_editions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    currency TEXT NOT NULL DEFAULT 'XOF',
    duration_months INTEGER NOT NULL DEFAULT 12 CHECK (duration_months > 0),
    physical_card_included BOOLEAN NOT NULL DEFAULT true,
    renewal_enabled BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. DEMANDES D'ADHÉSION
CREATE TABLE IF NOT EXISTS public.membership_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.membership_plans(id) ON DELETE RESTRICT,
    application_reference TEXT NOT NULL UNIQUE,
    application_status TEXT NOT NULL DEFAULT 'pending' CHECK (application_status IN ('pending', 'approved', 'rejected', 'converted')),
    terms_version TEXT NOT NULL DEFAULT 'v1.0',
    applicant_name TEXT NOT NULL,
    applicant_email TEXT NOT NULL,
    applicant_phone TEXT,
    notes TEXT DEFAULT '',
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. COMMANDES D'ADHÉSION
CREATE TABLE IF NOT EXISTS public.membership_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    application_id UUID REFERENCES public.membership_applications(id) ON DELETE SET NULL,
    order_reference TEXT NOT NULL UNIQUE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'XOF',
    payment_provider TEXT NOT NULL DEFAULT 'geniuspay',
    provider_transaction_id TEXT,
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    paid_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. IDENTITÉ PERMANENTE DES CARTES LUMARÉEL CARD
CREATE TABLE IF NOT EXISTS public.membership_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.membership_plans(id) ON DELETE RESTRICT,
    edition_id UUID NOT NULL REFERENCES public.membership_editions(id) ON DELETE RESTRICT,
    membership_order_id UUID REFERENCES public.membership_orders(id) ON DELETE SET NULL,
    card_number TEXT NOT NULL UNIQUE, -- 'LMR-2026-0001' à 'LMR-2026-0100'
    card_sequence INTEGER NOT NULL,
    cardholder_name TEXT NOT NULL,
    cardholder_email TEXT NOT NULL,
    card_status TEXT NOT NULL DEFAULT 'active' CHECK (card_status IN ('pending', 'active', 'suspended', 'revoked', 'expired')),
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    renewed_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT,
    replaced_by_card_id UUID REFERENCES public.membership_cards(id),
    physical_card_status TEXT NOT NULL DEFAULT 'in_production' CHECK (physical_card_status IN ('not_requested', 'in_production', 'shipped', 'delivered', 'replaced')),
    physical_card_tracking_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_card_sequence_per_edition UNIQUE (edition_id, card_sequence)
);

-- 6. GESTION LOGIQUE DES PUCES NFC (DESFire EV3 / SAM AV3)
CREATE TABLE IF NOT EXISTS public.membership_chip_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.membership_cards(id) ON DELETE CASCADE,
    chip_reference TEXT NOT NULL UNIQUE, -- Identifiant logique sécurisé diversifié
    chip_type TEXT NOT NULL DEFAULT 'MIFARE_DESFIRE_EV3',
    application_reference TEXT NOT NULL DEFAULT 'LMR_DESFIRE_APP_01',
    key_version INTEGER NOT NULL DEFAULT 1,
    credential_status TEXT NOT NULL DEFAULT 'active' CHECK (credential_status IN ('active', 'suspended', 'revoked', 'rotated')),
    diversification_seed TEXT NOT NULL, -- Jamais la clé maître !
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. JETONS QR SÉCURISÉS ET RÉVOCABLES
CREATE TABLE IF NOT EXISTS public.membership_qr_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.membership_cards(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE, -- SHA-256 du jeton
    token_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ
);

-- 8. CATALOGUE DES AVANTAGES ET PRIVILÈGES
CREATE TABLE IF NOT EXISTS public.membership_benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    benefit_type TEXT NOT NULL CHECK (benefit_type IN (
        'private_presale',
        'priority_access',
        'exclusive_invitation',
        'preferential_rate',
        'vip_lounge',
        'artist_experience',
        'gift_surprise',
        'partner_offer'
    )),
    edition_id UUID REFERENCES public.membership_editions(id) ON DELETE CASCADE,
    event_id TEXT REFERENCES public.events(id) ON DELETE SET NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    max_redemptions INTEGER, -- Quota global
    current_redemptions INTEGER NOT NULL DEFAULT 0,
    per_member_limit INTEGER NOT NULL DEFAULT 1,
    conditions JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. DROITS INDIVIDUELS ACCORDÉS AUX MEMBRES
CREATE TABLE IF NOT EXISTS public.membership_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.membership_cards(id) ON DELETE CASCADE,
    benefit_id UUID NOT NULL REFERENCES public.membership_benefits(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    used_quantity INTEGER NOT NULL DEFAULT 0 CHECK (used_quantity >= 0 AND used_quantity <= quantity),
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'confirmed', 'used', 'cancelled', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. HISTORIQUE ATOMIQUE DES AVANTAGES CONSOMMÉS
CREATE TABLE IF NOT EXISTS public.membership_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.membership_cards(id) ON DELETE CASCADE,
    benefit_id UUID NOT NULL REFERENCES public.membership_benefits(id) ON DELETE RESTRICT,
    event_id TEXT REFERENCES public.events(id) ON DELETE SET NULL,
    redeemed_by TEXT NOT NULL, -- Opérateur / Agent
    redemption_reference TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'disputed')),
    redeemed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. GESTION DES LECTEURS ET TERMINAUX
CREATE TABLE IF NOT EXISTS public.membership_readers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_name TEXT NOT NULL,
    reader_identifier TEXT NOT NULL UNIQUE, -- Identifiant technique matériel
    reader_type TEXT NOT NULL CHECK (reader_type IN ('mobile_android', 'fixed_gate', 'turnstile', 'pos_desk')),
    hardware_model TEXT DEFAULT 'NFC/DESFire SAM-enabled Terminal',
    event_id TEXT REFERENCES public.events(id) ON DELETE SET NULL,
    assigned_role TEXT NOT NULL DEFAULT 'gate_agent',
    reader_status TEXT NOT NULL DEFAULT 'active' CHECK (reader_status IN ('active', 'suspended', 'revoked', 'maintenance')),
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. POINTS DE CONTRÔLE ET ZONES ÉVÉNEMENTIELLES
CREATE TABLE IF NOT EXISTS public.membership_event_access_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    access_point_type TEXT NOT NULL CHECK (access_point_type IN (
        'main_entrance',
        'priority_lane',
        'member_desk',
        'vip_lounge',
        'backstage_artists',
        'invitations_booth'
    )),
    allowed_benefit_types TEXT[] NOT NULL DEFAULT '{}',
    access_rules JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. JOURNAL D'AUDIT DES CONTRÔLES (SCANS QR & NFC)
CREATE TABLE IF NOT EXISTS public.membership_scan_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID REFERENCES public.membership_cards(id) ON DELETE SET NULL,
    event_id TEXT REFERENCES public.events(id) ON DELETE SET NULL,
    reader_id UUID REFERENCES public.membership_readers(id) ON DELETE SET NULL,
    access_point_id UUID REFERENCES public.membership_event_access_points(id) ON DELETE SET NULL,
    scan_method TEXT NOT NULL CHECK (scan_method IN ('qr_code', 'nfc_desfire', 'manual_override')),
    verification_result TEXT NOT NULL CHECK (verification_result IN ('AUTHORIZED', 'DENIED')),
    rejection_reason TEXT,
    operator_id TEXT NOT NULL,
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 14. JOURNAL D'AUDIT DES OPÉRATIONS ADMINISTRATIVES
CREATE TABLE IF NOT EXISTS public.membership_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id TEXT NOT NULL,
    action_type TEXT NOT NULL, -- 'CARD_ISSUED', 'CARD_SUSPENDED', 'CARD_REVOKED', 'BENEFIT_CREATED'
    entity_type TEXT NOT NULL, -- 'membership_card', 'membership_benefit', 'membership_plan'
    entity_id TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEX POUR RECHERCHE ET HAUTES PERFORMANCES
CREATE INDEX IF NOT EXISTS idx_membership_cards_card_number ON public.membership_cards(card_number);
CREATE INDEX IF NOT EXISTS idx_membership_cards_user_id ON public.membership_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_membership_cards_status ON public.membership_cards(card_status);
CREATE INDEX IF NOT EXISTS idx_membership_qr_tokens_hash ON public.membership_qr_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_membership_scan_logs_card_id ON public.membership_scan_logs(card_id);
CREATE INDEX IF NOT EXISTS idx_membership_scan_logs_event_id ON public.membership_scan_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_membership_readers_ident ON public.membership_readers(reader_identifier);

-- SÉCURITÉ : ROW LEVEL SECURITY (RLS) SUR TOUTES LES TABLES
ALTER TABLE public.membership_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_chip_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_readers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_event_access_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_events ENABLE ROW LEVEL SECURITY;

-- POLITIQUES RLS LECTURE PUBLIQUE POUR LE CATALOGUE
CREATE POLICY "Public can view active editions" ON public.membership_editions
    FOR SELECT USING (status = 'active' OR status = 'sold_out');

CREATE POLICY "Public can view active plans" ON public.membership_plans
    FOR SELECT USING (status = 'active');

CREATE POLICY "Public can view public active benefits" ON public.membership_benefits
    FOR SELECT USING (status = 'active');

-- POLITIQUES RLS MEMBRES AUTHENTIFIÉS : ACCÈS STRICT À LEURS PROPRES DONNÉES
CREATE POLICY "Users view own card" ON public.membership_cards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view own applications" ON public.membership_applications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view own membership orders" ON public.membership_orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view own entitlements" ON public.membership_entitlements
    FOR SELECT USING (card_id IN (SELECT id FROM public.membership_cards WHERE user_id = auth.uid()));

CREATE POLICY "Users view own redemptions" ON public.membership_redemptions
    FOR SELECT USING (card_id IN (SELECT id FROM public.membership_cards WHERE user_id = auth.uid()));

-- POLITIQUES RLS ADMINISTRATEURS : GESTION COMPLÈTE
CREATE POLICY "Admin full manage editions" ON public.membership_editions
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'box_office')));

CREATE POLICY "Admin full manage plans" ON public.membership_plans
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'box_office')));

CREATE POLICY "Admin full manage applications" ON public.membership_applications
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'box_office')));

CREATE POLICY "Admin full manage orders" ON public.membership_orders
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'box_office')));

CREATE POLICY "Admin full manage cards" ON public.membership_cards
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'box_office')));

CREATE POLICY "Admin full manage chip credentials" ON public.membership_chip_credentials
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Admin full manage benefits" ON public.membership_benefits
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'box_office')));

CREATE POLICY "Admin full manage entitlements" ON public.membership_entitlements
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'box_office')));

CREATE POLICY "Admin full manage readers" ON public.membership_readers
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'box_office')));

CREATE POLICY "Admin full manage scan logs" ON public.membership_scan_logs
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'box_office', 'gate_agent')));
