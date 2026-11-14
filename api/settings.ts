import type { VercelRequest, VercelResponse } from '@vercel/node';
import { publicDb, methodNotAllowed } from './_lib/supabase.js';

const defaults = {
  platformName: 'LUMARÉEL',
  tagline: 'CO.',
  logoMonogram: 'LR',
  logoUrl: '/assets/logo-lumareel.png',
  currency: 'FCFA',
  infoline: '+225 01 53 508 210',
  socialLinks: {
    tiktok: 'https://www.tiktok.com/@lumareelco',
    instagram: 'https://www.instagram.com/lumareelco/',
    snapchat: 'https://www.snapchat.com/add/lumareelco',
    youtube: '',
    facebook: '',
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  try {
    const db = publicDb();
    const { data, error } = await db
      .from('platform_settings')
      .select('platform_name, tagline, logo_monogram, logo_url, currency, infoline, social_links')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.warn('[api/settings] settings read unavailable:', error.message);
      return res.status(200).json({ success: true, settings: defaults });
    }

    if (!data) return res.status(200).json({ success: true, settings: defaults });

    return res.status(200).json({
      success: true,
      settings: {
        platformName: data.platform_name || defaults.platformName,
        tagline: data.tagline || defaults.tagline,
        logoMonogram: data.logo_monogram || defaults.logoMonogram,
        logoUrl: data.logo_url || defaults.logoUrl,
        currency: data.currency || defaults.currency,
        infoline: data.infoline || defaults.infoline,
        socialLinks: data.social_links || defaults.socialLinks,
      },
    });
  } catch (error) {
    console.warn('[api/settings] Supabase unavailable:', error);
    return res.status(200).json({ success: true, settings: defaults });
  }
}
