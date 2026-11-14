import type { VercelRequest, VercelResponse } from '@vercel/node';
import { publicDb, methodNotAllowed } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.query.__route === 'me') {
    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
    const authorization = req.headers.authorization || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
    if (!token) return res.status(401).json({ success: false, error: 'Session requise.' });
    try {
      const db = publicDb();
      const { data: authData, error: authError } = await db.auth.getUser(token);
      if (authError || !authData.user) return res.status(401).json({ success: false, error: 'Session invalide ou expirée.' });
      const { data: profile, error: profileError } = await db.from('users')
        .select('name, role, email_verified').eq('id', authData.user.id).maybeSingle();
      if (profileError) {
        console.error('[api/auth/me] profile lookup failed:', profileError.message);
        return res.status(503).json({ success: false, error: 'Profil utilisateur temporairement indisponible.' });
      }
      return res.status(200).json({ success: true, user: {
        id: authData.user.id, email: authData.user.email || '',
        name: profile?.name || authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'Membre',
        role: profile?.role || 'customer',
        emailVerified: Boolean(authData.user.email_confirmed_at || profile?.email_verified),
        createdAt: authData.user.created_at,
      } });
    } catch (error) {
      console.error('[api/auth/me] unexpected error:', error);
      return res.status(503).json({ success: false, error: 'Service d’authentification temporairement indisponible.' });
    }
  }

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