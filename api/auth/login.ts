import type { VercelRequest, VercelResponse } from '@vercel/node';
import { publicDb, methodNotAllowed } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'E-mail et mot de passe requis.' });
    }

    try {
      const db = publicDb();
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        return res.status(401).json({ success: false, error: 'E-mail ou mot de passe incorrect.' });
      }

      const { data: profile } = await db.from('users').select('name,role,email_verified').eq('id', data.user.id).maybeSingle();
      return res.status(200).json({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email || email,
          name: profile?.name || data.user.user_metadata?.name || email.split('@')[0],
          role: profile?.role || 'customer',
          emailVerified: Boolean(data.user.email_confirmed_at || profile?.email_verified),
          createdAt: data.user.created_at,
        },
        session: data.session,
      });
    } catch (dbErr: any) {
      return res.status(500).json({ success: false, error: dbErr?.message || 'Configuration Supabase indisponible.' });
    }
  } catch (e: any) {
    console.error('[auth/login]', e);
    return res.status(500).json({
      success: false,
      error: e?.message || 'Erreur interne authentification',
      code: e?.code || e?.name || 'AUTH_INTERNAL',
    });
  }
}