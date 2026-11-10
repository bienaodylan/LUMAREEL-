-- ============================================================================
-- LUMARÉEL CO. — SCHÉMA SQL COMPLET & TABLES SUPABASE CLOUD (POSTGRESQL 15+)
-- Ce fichier regroupe TOUTES les tables requises pour le fonctionnement complet :
-- 1. users (profils synchronisés avec Supabase Auth)
-- 2. events (concerts officiels & partenaires)
-- 3. orders (commandes de billetterie & paiements)
-- 4. tickets (billets individuels QR sécurisés)
-- 5. archives (mémoire d'essai & vidéos live)
-- 6. news_articles (actualités de la programmation)
-- 7. external_organizers (organisateurs partenaires)
-- 8. platform_settings (configuration globale plateforme)
-- 9. scanner_tokens (liens magiques vigiles)
-- 10. physical_ticket_batches (lots de billets physiques pour guichet)
-- 11. physical_ticket_serial_counters (compteurs de numéros de série annuels)
-- 12. physical_ticket_scan_logs (journal d'audit des scans en direct)
-- 13. transactional_emails (journal des e-mails envoyés)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('super_admin', 'box_office', 'gate_agent', 'customer')),
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. EVENTS
CREATE TABLE IF NOT EXISTS public.events (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    subtitle TEXT DEFAULT '',
    artist TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    doors_open TEXT NOT NULL,
    venue TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    address TEXT DEFAULT '',
    description TEXT DEFAULT '',
    artist_portrait TEXT DEFAULT '',
    official_poster TEXT DEFAULT '',
    banner_image TEXT DEFAULT '',
    cover_image TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft', 'sold_out', 'cancelled', 'completed')),
    is_featured BOOLEAN DEFAULT false,
    organizer_type TEXT DEFAULT 'lumareel' CHECK (organizer_type IN ('lumareel', 'partner')),
    organizer_name TEXT DEFAULT 'LUMARÉEL CO.',
    organizer_id TEXT,
    genre TEXT DEFAULT 'Concert Live',
    platform_fee_percent NUMERIC(4,2) DEFAULT 0.00,
    infoline TEXT DEFAULT '+225 01 53 508 210',
    categories JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    reference TEXT NOT NULL UNIQUE,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    event_title TEXT NOT NULL,
    event_date TEXT NOT NULL,
    event_venue TEXT NOT NULL,
    category_id TEXT NOT NULL,
    category_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'XOF',
    payment_status TEXT NOT NULL DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_provider TEXT NOT NULL DEFAULT 'geniuspay',
    payment_ref TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TICKETS
CREATE TABLE IF NOT EXISTS public.tickets (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    order_ref TEXT NOT NULL,
    event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    event_title TEXT NOT NULL,
    event_date TEXT NOT NULL,
    event_time TEXT NOT NULL,
    event_venue TEXT NOT NULL,
    category_id TEXT NOT NULL,
    category_name TEXT NOT NULL,
    serial_number TEXT NOT NULL UNIQUE,
    token TEXT NOT NULL UNIQUE,
    holder_name TEXT NOT NULL,
    holder_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'cancelled')),
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    checked_in_at TIMESTAMPTZ,
    checked_in_by TEXT
);

-- 5. ARCHIVES
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

-- 6. NEWS_ARTICLES
CREATE TABLE IF NOT EXISTS public.news_articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    summary TEXT NOT NULL,
    content TEXT NOT NULL,
    cover_image TEXT NOT NULL,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    author TEXT NOT NULL DEFAULT 'Direction LUMARÉEL',
    category TEXT NOT NULL DEFAULT 'Annonce Officielle',
    is_published BOOLEAN DEFAULT true,
    tags TEXT[] NOT NULL DEFAULT '{}'::text[],
    read_time TEXT DEFAULT '3 min',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sécurisation rétroactive des colonnes si les tables existaient déjà
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'archives' AND column_name = 'artists') THEN
        ALTER TABLE public.archives ADD COLUMN artists TEXT[] NOT NULL DEFAULT '{}'::text[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'archives' AND column_name = 'photos') THEN
        ALTER TABLE public.archives ADD COLUMN photos TEXT[] NOT NULL DEFAULT '{}'::text[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'news_articles' AND column_name = 'tags') THEN
        ALTER TABLE public.news_articles ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}'::text[];
    END IF;
END $$;

-- 7. EXTERNAL_ORGANIZERS
CREATE TABLE IF NOT EXISTS public.external_organizers (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'suspended')),
    commission_rate NUMERIC(4,2) DEFAULT 10.00,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PLATFORM_SETTINGS
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    platform_name TEXT NOT NULL DEFAULT 'LUMARÉEL',
    tagline TEXT NOT NULL DEFAULT 'CO.',
    logo_monogram TEXT NOT NULL DEFAULT 'LR',
    logo_url TEXT DEFAULT '',
    currency TEXT NOT NULL DEFAULT 'XOF (FCFA)',
    infoline TEXT NOT NULL DEFAULT '+225 01 53 508 210',
    gate_token TEXT NOT NULL DEFAULT 'VIGILE_AUTH_LMR_2026',
    github_repo_url TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SCANNER_TOKENS
CREATE TABLE IF NOT EXISTS public.scanner_tokens (
    token TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN DEFAULT false
);

-- 10. PHYSICAL TICKETS
CREATE TABLE IF NOT EXISTS public.physical_ticket_batches (
    id TEXT PRIMARY KEY,
    reference TEXT NOT NULL UNIQUE,
    event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
    category_id TEXT NOT NULL,
    category_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 10000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT NOT NULL DEFAULT 'LUMARÉEL CO.'
);

CREATE TABLE IF NOT EXISTS public.physical_ticket_serial_counters (
    serial_year INTEGER PRIMARY KEY,
    last_value BIGINT NOT NULL DEFAULT 0 CHECK (last_value >= 0)
);

CREATE TABLE IF NOT EXISTS public.physical_ticket_scan_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id TEXT,
    token_or_serial TEXT NOT NULL,
    event_id TEXT,
    agent_name TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('SUCCESS','ALREADY_USED','INVALID','CANCELLED','WRONG_EVENT')),
    message TEXT NOT NULL,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ticket_serial TEXT,
    ticket_holder TEXT
);

-- 11. TRANSACTIONAL_EMAILS
CREATE TABLE IF NOT EXISTS public.transactional_emails (
    id TEXT PRIMARY KEY,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'order_confirmation',
    status TEXT NOT NULL DEFAULT 'sent',
    order_id TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- INDEXES
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_token_btree ON public.tickets USING btree (token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_serial_btree ON public.tickets USING btree (serial_number);
CREATE INDEX IF NOT EXISTS idx_tickets_event_status_btree ON public.tickets USING btree (event_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_holder_email_btree ON public.tickets USING btree (holder_email);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email_btree ON public.orders USING btree (customer_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_published_date_btree ON public.events USING btree (date) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_news_published_at_btree ON public.news_articles USING btree (published_at DESC) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_scanner_tokens_active_btree ON public.scanner_tokens USING btree (token, event_id) WHERE is_revoked = false;

-- ROLE RPC FUNCTION
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

-- AUTH SYNC TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, role, email_verified, created_at, updated_at)
    VALUES (
        NEW.id,
        LOWER(NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
        CASE WHEN LOWER(NEW.email) = 'bienaodylan428@gmail.com' THEN 'super_admin' ELSE 'customer' END,
        COALESCE(NEW.email_confirmed_at IS NOT NULL, FALSE),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.users.name),
        role = CASE WHEN LOWER(EXCLUDED.email) = 'bienaodylan428@gmail.com' THEN 'super_admin' ELSE public.users.role END,
        email_verified = EXCLUDED.email_verified,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ATOMIC SCAN FUNCTION
CREATE OR REPLACE FUNCTION public.verify_and_check_in_ticket(
    p_token TEXT,
    p_event_id TEXT,
    p_agent_name TEXT
) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ticket RECORD;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    SELECT * INTO v_ticket 
    FROM public.tickets 
    WHERE (token = p_token OR serial_number = p_token)
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'INVALID', 'valid', false, 'message', 'Billet introuvable ou faux code QR.');
    END IF;

    IF p_event_id IS NOT NULL AND v_ticket.event_id <> p_event_id THEN
        RETURN jsonb_build_object('status', 'WRONG_EVENT', 'valid', false, 'message', 'Ce billet est pour un autre concert.', 'eventTitle', v_ticket.event_title);
    END IF;

    IF v_ticket.status = 'used' THEN
        RETURN jsonb_build_object('status', 'ALREADY_USED', 'valid', false, 'message', 'BILLET DÉJÀ UTILISÉ. REFUS D’ACCÈS.', 'holderName', v_ticket.holder_name, 'categoryName', v_ticket.category_name, 'eventTitle', v_ticket.event_title, 'serialNumber', v_ticket.serial_number, 'scannedAt', v_ticket.checked_in_at, 'checkedInBy', v_ticket.checked_in_by);
    END IF;

    IF v_ticket.status = 'cancelled' THEN
        RETURN jsonb_build_object('status', 'CANCELLED', 'valid', false, 'message', 'Ce billet a été annulé ou remboursé.');
    END IF;

    UPDATE public.tickets 
    SET status = 'used', checked_in_at = v_now, checked_in_by = p_agent_name
    WHERE id = v_ticket.id;

    RETURN jsonb_build_object('status', 'SUCCESS', 'valid', true, 'message', 'ACCÈS AUTORISÉ', 'holderName', v_ticket.holder_name, 'categoryName', v_ticket.category_name, 'eventTitle', v_ticket.event_title, 'serialNumber', v_ticket.serial_number, 'scannedAt', v_now);
END;
$$;
GRANT EXECUTE ON FUNCTION public.verify_and_check_in_ticket(TEXT, TEXT, TEXT) TO authenticated, anon;

-- RLS PERMISSIVE POLICIES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scanner_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_ticket_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_ticket_serial_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_ticket_scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactional_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Public Read Archives" ON public.archives FOR SELECT USING (true);
CREATE POLICY "Public Read News" ON public.news_articles FOR SELECT USING (true);
CREATE POLICY "Public Read Settings" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "Public Read Users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Public Insert Users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Users" ON public.users FOR UPDATE USING (true);
CREATE POLICY "Public Insert Orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Public Read Tickets" ON public.tickets FOR SELECT USING (true);
CREATE POLICY "Public Insert Tickets" ON public.tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Tickets" ON public.tickets FOR UPDATE USING (true);
CREATE POLICY "Public Insert Organizers" ON public.external_organizers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Organizers" ON public.external_organizers FOR SELECT USING (true);
CREATE POLICY "Public Read Scanner Tokens" ON public.scanner_tokens FOR SELECT USING (true);
CREATE POLICY "Public Insert Scanner Tokens" ON public.scanner_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Manage Events Admin" ON public.events FOR ALL USING (true);
CREATE POLICY "Public Manage Archives Admin" ON public.archives FOR ALL USING (true);
CREATE POLICY "Public Manage News Admin" ON public.news_articles FOR ALL USING (true);
CREATE POLICY "Public Manage Settings Admin" ON public.platform_settings FOR ALL USING (true);

-- REALTIME PUBLICATION
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.archives;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.news_articles;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_settings;
EXCEPTION WHEN OTHERS THEN
    NULL;
END;
$$;

-- SUPER ADMIN SEED
INSERT INTO public.users (email, name, role, email_verified)
VALUES ('bienaodylan428@gmail.com', 'Dylan B. (Directeur Artistique & Fondateur)', 'super_admin', true)
ON CONFLICT (email) DO UPDATE SET role = 'super_admin', email_verified = true;

INSERT INTO public.platform_settings (id, platform_name, tagline, logo_monogram, currency, infoline, gate_token)
VALUES (1, 'LUMARÉEL', 'CO.', 'LR', 'XOF (FCFA)', '+225 01 53 508 210', 'VIGILE_AUTH_LMR_2026')
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
