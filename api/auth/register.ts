import type { VercelRequest, VercelResponse } from '@vercel/node';
import { publicDb, methodNotAllowed } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const name = String(req.body?.name || '').trim();
    const password = String(req.body?.password || '');
    if (!email || !name || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Nom, e-mail et mot de passe (6 car. min.) requis.' });
    }

    try {
      const db = publicDb();
      const { data, error } = await db.auth.signUp({ email, password, options: { data: { name } } });
      if (error) return res.status(400).json({ success: false, error: error.message });
      if (!data.user) return res.status(500).json({ success: false, error: 'Inscription impossible.' });
      return res.status(201).json({
        success: true,
        user: {
          id: data.user.id,
          email,
          name,
          // A public signup always starts with the least-privileged role.
          role: 'customer',
          emailVerified: Boolean(data.user.email_confirmed_at),
          createdAt: data.user.created_at,
        },
        session: data.session,
        requiresEmailConfirmation: !data.session,
      });
    } catch (dbErr: any) {
      return res.status(500).json({ success: false, error: dbErr?.message || 'Configuration Supabase indisponible.' });
    }
  } catch (e: any) {
    console.error('[auth/register]', e);
    return res.status(500).json({ success: false, error: 'Inscription indisponible.' });
  }
}