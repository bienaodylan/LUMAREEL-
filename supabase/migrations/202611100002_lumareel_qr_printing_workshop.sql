-- ============================================================================
-- LUMARÉEL CO. — LUMARÉEL CARD QR IDENTITY & PHYSICAL CARD PRINTING WORKSHOP
-- Migration : 202611100002_lumareel_qr_printing_workshop.sql
-- Modules :
-- 1. membership_cards (Mise à jour pour cycle de production physique en 13 statuts)
-- 2. membership_qr_tokens (Jetons cryptographiques 256-bit SHA-256 avec rotation)
-- 3. membership_physical_card_orders (Commandes d'impression et personnalisation)
-- 4. membership_card_inventory (Stock de cartes PVC vierges et rubans d'impression)
-- 5. membership_print_jobs (Files d'attente d'impression unitaire et par lots)
-- 6. membership_card_quality_checks (Contrôle qualité obligatoire par scan réel du QR)
-- 7. membership_readers (Lecteurs QR 2D USB, caméras certifiées et stations d'accès)
-- 8. membership_scan_logs (Audit de passage et alertes anti-fraude / scans répétés)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop old NFC chip credentials table if exists (NFC architecture deprecated in favor of pure QR)
DROP TABLE IF EXISTS public.membership_chip_credentials CASCADE;

-- 1. MISE À JOUR DES STATUTS D'IMPRESSION DE CARTES PHYSIQUES
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'membership_physical_card_status'
    ) THEN
        CREATE TYPE public.membership_physical_card_status AS ENUM (
            'requested',
            'payment_pending',
            'approved',
            'in_production',
            'printed',
            'quality_checked',
            'ready_for_dispatch',
            'shipped',
            'delivered',
            'cancelled',
            'blocked',
            'lost',
            'returned',
            'replacement_requested',
            'defective'
        );
    END IF;
END$$;

-- 2. GESTION RENFORCÉE DES JETONS QR CRYPTOGRAPHIQUES
CREATE TABLE IF NOT EXISTS public.membership_qr_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.membership_cards(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE, -- SHA-256 du jeton secret
    token_prefix TEXT NOT NULL DEFAULT 'LMR_SEC_',
    token_version INTEGER NOT NULL DEFAULT 1 CHECK (token_version > 0),
    is_current BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'rotated', 'revoked')),
    revocation_reason TEXT,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ,
    verification_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_tokens_hash ON public.membership_qr_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_card ON public.membership_qr_tokens(card_id, is_current);

-- 3. COMMANDES ET SUIVI DE FABRICATION DE CARTES PHYSIQUES
CREATE TABLE IF NOT EXISTS public.membership_physical_card_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.membership_cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL UNIQUE,
    card_number TEXT NOT NULL,
    cardholder_name TEXT NOT NULL,
    cardholder_email TEXT NOT NULL,
    cardholder_phone TEXT,
    edition_name TEXT NOT NULL DEFAULT 'LUMARÉEL FOUNDERS EDITION',
    shipping_street TEXT NOT NULL,
    shipping_city TEXT NOT NULL,
    shipping_postal_code TEXT,
    shipping_country TEXT NOT NULL,
    recipient_name TEXT,
    production_status TEXT NOT NULL DEFAULT 'requested' CHECK (
        production_status IN (
            'requested',
            'payment_pending',
            'approved',
            'in_production',
            'printed',
            'quality_checked',
            'ready_for_dispatch',
            'shipped',
            'delivered',
            'cancelled',
            'blocked',
            'lost',
            'returned',
            'replacement_requested',
            'defective'
        )
    ),
    batch_id TEXT,
    print_job_id TEXT,
    quality_check_id TEXT,
    tracking_number TEXT,
    shipping_carrier TEXT DEFAULT 'DHL Express / Messagerie Privée',
    reprint_count INTEGER NOT NULL DEFAULT 0,
    reprint_reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
    history_notes JSONB DEFAULT '[]'::JSONB,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    printed_at TIMESTAMPTZ,
    quality_checked_at TIMESTAMPTZ,
    dispatched_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_physical_orders_status ON public.membership_physical_card_orders(production_status);
CREATE INDEX IF NOT EXISTS idx_physical_orders_card ON public.membership_physical_card_orders(card_id);

-- 4. INVENTAIRE DE L'ATELIER D'IMPRESSION (CONSOMMABLES & CARTES VIERGES)
CREATE TABLE IF NOT EXISTS public.membership_card_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK (
        item_type IN (
            'blank_pvc_card',
            'gold_foil_ribbon',
            'ymcko_ribbon',
            'monochrome_black_ribbon',
            'laminate_overlay',
            'collector_box'
        )
    ),
    sku TEXT NOT NULL UNIQUE,
    total_quantity INTEGER NOT NULL DEFAULT 0 CHECK (total_quantity >= 0),
    reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    available_quantity INTEGER NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
    min_threshold_alert INTEGER NOT NULL DEFAULT 10,
    unit TEXT NOT NULL DEFAULT 'unités',
    notes TEXT,
    last_restocked_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Données initiales d'inventaire Atelier
INSERT INTO public.membership_card_inventory (item_name, item_type, sku, total_quantity, reserved_quantity, available_quantity, min_threshold_alert, unit)
VALUES
    ('Cartes PVC Noires Mates CR-80 (0.76mm)', 'blank_pvc_card', 'PVC-CR80-BLK-MATTE', 250, 1, 249, 20, 'cartes'),
    ('Ruban Doré Chaud Métallique (Gold Foil)', 'gold_foil_ribbon', 'RIB-GOLD-FOIL-1000', 3, 0, 3, 1, 'rouleaux'),
    ('Ruban Couleur YMCKO Haute Définition', 'ymcko_ribbon', 'RIB-YMCKO-HD-500', 2, 0, 2, 1, 'rouleaux'),
    ('Ruban Monochrome Noir Résine Haute Précision', 'monochrome_black_ribbon', 'RIB-MONO-K-1500', 4, 0, 4, 1, 'rouleaux'),
    ('Film Holographique de Protection Ultra-Durable', 'laminate_overlay', 'LAM-HOLO-LMR-1000', 2, 0, 2, 1, 'rouleaux'),
    ('Coffrets Collector de Luxe Founders Edition', 'collector_box', 'BOX-FOUNDERS-LUX-01', 100, 1, 99, 10, 'coffrets')
ON CONFLICT (sku) DO NOTHING;

-- 5. TRAVAUX D'IMPRESSION (JOBS UNITAIRES & LOTS)
CREATE TABLE IF NOT EXISTS public.membership_print_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_code TEXT NOT NULL UNIQUE,
    batch_id TEXT,
    card_id UUID NOT NULL REFERENCES public.membership_cards(id) ON DELETE CASCADE,
    card_number TEXT NOT NULL,
    cardholder_name TEXT NOT NULL,
    order_id UUID REFERENCES public.membership_physical_card_orders(id) ON DELETE SET NULL,
    printer_model TEXT NOT NULL DEFAULT 'Evolis Primacy 2 / Zebra ZC300 (Simulated)',
    printer_type TEXT NOT NULL DEFAULT 'simulated' CHECK (printer_type IN ('simulated', 'evolis', 'zebra', 'magicard', 'fargo')),
    duplex BOOLEAN NOT NULL DEFAULT true,
    resolution_dpi INTEGER NOT NULL DEFAULT 300 CHECK (resolution_dpi IN (300, 600)),
    is_reprint BOOLEAN NOT NULL DEFAULT false,
    reprint_reason TEXT CHECK (reprint_reason IN ('damaged', 'lost', 'defect', 'data_update', 'member_request')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'spooling', 'printing', 'completed', 'failed', 'cancelled')),
    operator_id TEXT NOT NULL DEFAULT 'Atelier Central LUMARÉEL',
    failure_reason TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_print_jobs_card ON public.membership_print_jobs(card_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON public.membership_print_jobs(status);

-- 6. CONTRÔLE QUALITÉ OBLIGATOIRE POST-IMPRESSION (SCAN RÉEL DU QR IMPRIMÉ)
CREATE TABLE IF NOT EXISTS public.membership_card_quality_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.membership_cards(id) ON DELETE CASCADE,
    card_number TEXT NOT NULL,
    order_id UUID REFERENCES public.membership_physical_card_orders(id) ON DELETE SET NULL,
    print_job_id UUID REFERENCES public.membership_print_jobs(id) ON DELETE SET NULL,
    scanned_qr_token TEXT NOT NULL,
    qr_verified_server BOOLEAN NOT NULL DEFAULT false,
    visual_check_passed BOOLEAN NOT NULL DEFAULT false,
    centering_passed BOOLEAN NOT NULL DEFAULT false,
    contrast_passed BOOLEAN NOT NULL DEFAULT false,
    no_scratches_passed BOOLEAN NOT NULL DEFAULT false,
    operator_id TEXT NOT NULL,
    operator_notes TEXT,
    status TEXT NOT NULL DEFAULT 'rejected' CHECK (status IN ('passed', 'rejected')),
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qc_card ON public.membership_card_quality_checks(card_id);

-- 7. AUDIT DES SCANS & DÉTECTION DES ANOMALIES ANTI-FRAUDE
ALTER TABLE public.membership_scan_logs
    DROP COLUMN IF EXISTS scan_method,
    ADD COLUMN IF NOT EXISTS scan_method TEXT NOT NULL DEFAULT 'qr_code' CHECK (scan_method IN ('qr_code', 'manual_override')),
    ADD COLUMN IF NOT EXISTS flagged_suspicious BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS repeat_scan_count INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_scan_logs_suspicious ON public.membership_scan_logs(flagged_suspicious) WHERE flagged_suspicious = true;

-- 8. POLITIQUES DE SÉCURITÉ ROW LEVEL SECURITY (RLS)
ALTER TABLE public.membership_qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_physical_card_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_card_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_card_quality_checks ENABLE ROW LEVEL SECURITY;

-- Lecture publique protégée uniquement via tokens hachés
CREATE POLICY "Verification publique des tokens QR"
    ON public.membership_qr_tokens FOR SELECT
    USING (status = 'active');

-- Les clients peuvent consulter leur propre commande physique
CREATE POLICY "Clients consultent leurs commandes de cartes"
    ON public.membership_physical_card_orders FOR SELECT
    USING (auth.uid() = user_id);

-- Accès complet administrateur
CREATE POLICY "Gestion complete atelier admin"
    ON public.membership_physical_card_orders FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'organizer')
        )
    );

CREATE POLICY "Gestion complete inventaire admin"
    ON public.membership_card_inventory FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'organizer')
        )
    );

CREATE POLICY "Gestion print jobs admin"
    ON public.membership_print_jobs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'organizer')
        )
    );

CREATE POLICY "Gestion qc admin"
    ON public.membership_card_quality_checks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'organizer')
        )
    );
