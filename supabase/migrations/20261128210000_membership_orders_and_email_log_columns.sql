-- Restaure la table des commandes Black Card (jamais appliquée en production)
-- et aligne le journal des e-mails transactionnels sur le code serveur.
-- Additif uniquement : aucune donnée existante n'est modifiée.

CREATE TABLE IF NOT EXISTS public.membership_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    order_reference TEXT NOT NULL UNIQUE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'XOF',
    payment_provider TEXT NOT NULL DEFAULT 'jekopay',
    provider_transaction_id TEXT,
    payment_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    paid_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membership_orders_user_id ON public.membership_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_membership_orders_status ON public.membership_orders(payment_status);

-- Table serveur uniquement (service_role) : RLS activée, aucun accès client direct
ALTER TABLE public.membership_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.membership_orders FROM anon, authenticated;
GRANT ALL ON public.membership_orders TO service_role;

-- membership_cards.membership_order_id est en TEXT en production : pas de clé étrangère.

-- Colonnes attendues par api/_lib/emailService.ts
ALTER TABLE public.transactional_emails ADD COLUMN IF NOT EXISTS order_ref TEXT;
ALTER TABLE public.transactional_emails ADD COLUMN IF NOT EXISTS content_preview TEXT DEFAULT '';
