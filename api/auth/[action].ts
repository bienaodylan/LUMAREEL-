import type { VercelRequest, VercelResponse } from '@vercel/node';
import { publicDb, methodNotAllowed } from '../_lib/supabase.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FULL_NAME_PART = /^[\p{L}][\p{L}\p{M}'’-]{1,39}$/u;

function validateFullName(value: string): string | null {
  const clean = value.replace(/\s+/g, ' ').trim();
  const parts = clean.split(' ');
  if (clean.length < 3 || clean.length > 80 || parts.length < 2) return null;
  if (!parts.every((part) => FULL_NAME_PART.test(part) && !/(.)\1{3,}/iu.test(part))) return null;
  return clean;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;

  if (action === 'login') {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!EMAIL_REGEX.test(email) || !password) {
      return res.status(400).json({ success: false, error: 'E-mail et mot de passe requis.' });
    }
    try {
      const db = publicDb();
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error || !data.user) return res.status(401).json({ success: false, error: 'E-mail ou mot de passe incorrect.' });
      if (!data.user.email_confirmed_at) {
        await db.auth.signOut();
        return res.status(403).json({ success: false, error: 'Veuillez confirmer votre adresse e-mail avant de vous connecter.' });
      }
      const { data: profile } = await db.from('users').select('name,role').eq('id', data.user.id).maybeSingle();
      return res.status(200).json({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email || email,
          name: profile?.name || data.user.user_metadata?.name || email.split('@')[0],
          role: profile?.role || 'customer',
          emailVerified: true,
          createdAt: data.user.created_at,
        },
        session: data.session,
      });
    } catch (error: any) {
      console.error('[auth/login]', error);
      return res.status(500).json({ success: false, error: 'Configuration Supabase indisponible.' });
    }
  }

  if (action === 'register') {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const name = String(req.body?.name || '');
    const password = String(req.body?.password || '');
    const cleanName = validateFullName(name);
    if (!EMAIL_REGEX.test(email) || !cleanName || password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Nom complet valide, e-mail valide et mot de passe (8 caractères minimum) requis.',
      });
    }
    try {
      const db = publicDb();
      const { data, error } = await db.auth.signUp({ email, password, options: { data: { name: cleanName } } });
      if (error) return res.status(400).json({ success: false, error: error.message });
      if (!data.user) return res.status(500).json({ success: false, error: 'Inscription impossible.' });
      return res.status(201).json({
        success: true,
        user: {
          id: data.user.id,
          email,
          name: cleanName,
          role: 'customer',
          emailVerified: Boolean(data.user.email_confirmed_at),
          createdAt: data.user.created_at,
        },
        session: data.session,
        requiresEmailConfirmation: !data.user.email_confirmed_at,
      });
    } catch (error: any) {
      console.error('[auth/register]', error);
      return res.status(500).json({ success: false, error: 'Configuration Supabase indisponible.' });
    }
  }
  return res.status(404).json({ success: false, error: 'Action authentification introuvable.' });
}
