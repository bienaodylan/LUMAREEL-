-- LUMARÉEL — Restore NFC registry after QR/printing migration.
-- Migration 202611100002 removed this table with CASCADE. NFC remains part of the
-- physical-card roadmap, so restore a metadata-only registry without key material.
-- Never store DESFire master keys, diversification secrets, or raw card UIDs here.

CREATE TABLE IF NOT EXISTS public.membership_chip_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.membership_cards(id) ON DELETE CASCADE,
    -- Opaque external reference or one-way UID digest; never a raw UID/key.
    chip_reference TEXT NOT NULL UNIQUE,
    chip_type TEXT NOT NULL DEFAULT 'MIFARE_DESFIRE_EV3'
        CHECK (chip_type IN ('MIFARE_DESFIRE_EV2', 'MIFARE_DESFIRE_EV3')),
    application_reference TEXT NOT NULL DEFAULT 'LMR_DESFIRE_APP_01',
    key_version INTEGER NOT NULL DEFAULT 1 CHECK (key_version > 0),
    credential_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (credential_status IN ('pending', 'active', 'suspended', 'revoked', 'rotated')),
    enrolled_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membership_chip_card
    ON public.membership_chip_credentials(card_id);
CREATE INDEX IF NOT EXISTS idx_membership_chip_status
    ON public.membership_chip_credentials(credential_status);

-- One active NFC credential per membership card. Historical revoked/rotated
-- credentials remain available for audit and replacement investigations.
CREATE UNIQUE INDEX IF NOT EXISTS uq_membership_chip_one_active_per_card
    ON public.membership_chip_credentials(card_id)
    WHERE credential_status = 'active';

ALTER TABLE public.membership_chip_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full manage chip credentials"
    ON public.membership_chip_credentials;
CREATE POLICY "Admin full manage chip credentials"
    ON public.membership_chip_credentials
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

COMMENT ON TABLE public.membership_chip_credentials IS
    'Metadata-only NFC registry. chip_reference must be opaque or a one-way UID digest; never store master keys or diversification secrets.';
COMMENT ON COLUMN public.membership_chip_credentials.chip_reference IS
    'Opaque chip reference or one-way UID digest; not a raw NFC UID and not cryptographic key material.';

-- QR hashes/card mappings are not a public API. Verify QR tokens through a
-- trusted server endpoint/service-role function instead of direct table SELECT.
DROP POLICY IF EXISTS "Verification publique des tokens QR"
    ON public.membership_qr_tokens;
