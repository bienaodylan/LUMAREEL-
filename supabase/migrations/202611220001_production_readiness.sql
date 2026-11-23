-- ============================================================================
-- LUMARÉEL CO. — MIGRATION DE MISE EN PRODUCTION (LUMARÉEL Black Card & Emails)
-- Idempotente : peut être exécutée en toute sécurité plusieurs fois dans Supabase.
-- ============================================================================

-- 1. S'assurer que l'édition officielle LUMARÉEL Black Card (100 membres, 3 ans) existe
INSERT INTO public.membership_editions (
    name,
    edition_code,
    description,
    quota,
    allocated_count,
    starts_at,
    status
)
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

-- 2. S'assurer que la formule 3 Ans (50 000 FCFA) existe pour cette édition
INSERT INTO public.membership_plans (
    edition_id,
    name,
    description,
    price,
    currency,
    duration_months,
    physical_card_included,
    renewal_enabled,
    status
)
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

-- 3. Table de journalisation des e-mails transactionnels Resend (si non créée)
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

-- 4. Index utile pour retrouver rapidement une carte par e-mail
CREATE INDEX IF NOT EXISTS idx_membership_cards_email
    ON public.membership_cards (LOWER(cardholder_email));

CREATE INDEX IF NOT EXISTS idx_membership_orders_ref
    ON public.membership_orders (order_reference);

CREATE INDEX IF NOT EXISTS idx_orders_payment_ref
    ON public.orders (payment_ref);
