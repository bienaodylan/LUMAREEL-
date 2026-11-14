import type { VercelRequest, VercelResponse } from '@vercel/node';
import { publicDb, methodNotAllowed } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ success: false, error: 'Session requise.' });
  }

  try {
    const db = publicDb();
    const { data: authData, error: authError } = await db.auth.getUser(token);
    if (authError || !authData.user) {
      return res.status(401).json({ success: false, error: 'Session invalide ou expirée.' });
    }

    const { data: profile, error: profileError } = await db
      .from('users')
      .select('name, role, email_verified')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[api/auth/me] profile lookup failed:', profileError.message);
      return res.status(503).json({ success: false, error: 'Profil utilisateur temporairement indisponible.' });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email || '',
        name: profile?.name || authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'Membre',
        role: profile?.role || 'customer',
        emailVerified: Boolean(authData.user.email_confirmed_at || profile?.email_verified),
        createdAt: authData.user.created_at,
      },
    });
  } catch (error) {
    console.error('[api/auth/me] unexpected error:', error);
    return res.status(503).json({ success: false, error: 'Service d’authentification temporairement indisponible.' });
  }
}
