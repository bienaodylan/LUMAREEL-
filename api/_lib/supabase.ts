import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

let client: SupabaseClient | null = null;

export function adminDb(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Configuration serveur Supabase manquante : SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.');
  if (!client) client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export async function requireRole(req: VercelRequest, roles: string[]) {
  const auth = req.headers.authorization || '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!jwt) return { ok: false as const, status: 401, error: 'Session Supabase requise.' };
  const db = adminDb();
  const { data: authData, error: authError } = await db.auth.getUser(jwt);
  if (authError || !authData.user?.email) return { ok: false as const, status: 401, error: 'Session invalide ou expirée.' };
  const { data: profile, error } = await db.from('users').select('role,email_verified').eq('email', authData.user.email.toLowerCase()).maybeSingle();
  if (error || !profile || !profile.email_verified || !roles.includes(profile.role)) {
    return { ok: false as const, status: 403, error: 'Accès non autorisé pour ce compte.' };
  }
  return { ok: true as const, db, user: authData.user, profile };
}

export function methodNotAllowed(res: VercelResponse, allowed: string[]) {
  res.setHeader('Allow', allowed.join(', '));
  return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });
}
