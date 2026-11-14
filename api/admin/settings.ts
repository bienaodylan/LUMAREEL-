import type { VercelRequest, VercelResponse } from '@vercel/node';
import { methodNotAllowed, requireRole } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') return methodNotAllowed(res, ['PUT']);

  const auth = await requireRole(req, ['super_admin']);
  if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });

  const input = req.body;
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return res.status(400).json({ success: false, error: 'Paramètres invalides.' });
  }

  const textValue = (value: unknown, fallback = '') =>
    typeof value === 'string' ? value.trim().slice(0, 500) : fallback;

  const row = {
    id: 1,
    platform_name: textValue(input.platformName, 'LUMARÉEL'),
    tagline: textValue(input.tagline, 'CO.'),
    logo_monogram: textValue(input.logoMonogram, 'LR').slice(0, 12),
    logo_url: textValue(input.logoUrl, '/assets/logo-lumareel.png'),
    currency: textValue(input.currency, 'FCFA').slice(0, 12),
    infoline: textValue(input.infoline, '+225 01 53 508 210'),
    social_links: input.socialLinks && typeof input.socialLinks === 'object' && !Array.isArray(input.socialLinks)
      ? input.socialLinks
      : {},
    updated_at: new Date().toISOString(),
  };

  try {
    const { error } = await auth.db.from('platform_settings').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('[api/admin/settings] update failed:', error.message);
      return res.status(500).json({ success: false, error: 'Enregistrement des paramètres impossible.' });
    }
    return res.status(200).json({ success: true, settings: {
      platformName: row.platform_name,
      tagline: row.tagline,
      logoMonogram: row.logo_monogram,
      logoUrl: row.logo_url,
      currency: row.currency,
      infoline: row.infoline,
      socialLinks: row.social_links,
    } });
  } catch (error) {
    console.error('[api/admin/settings] unexpected error:', error);
    return res.status(500).json({ success: false, error: 'Service paramètres temporairement indisponible.' });
  }
}
