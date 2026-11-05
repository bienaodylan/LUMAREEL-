import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

function projectConfig() {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';
  if (!url || !key) throw new Error('Configuration Supabase publique manquante.');
  return { url, key };
}

export function publicDb(): SupabaseClient {
  const { url, key } = projectConfig();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function requestDb(req: VercelRequest): { db: SupabaseClient; jwt: string } {
  const auth = req.headers.authorization || '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!jwt) throw Object.assign(new Error('Session Supabase requise.'), { status: 401 });
  const { url, key } = projectConfig();
  return {
    db: createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    }),
    jwt,
  };
}

export async function requireRole(req: VercelRequest, roles: string[]) {
  let db: SupabaseClient;
  let jwt: string;
  try {
    ({ db, jwt } = requestDb(req));
  } catch (error: any) {
    return { ok: false as const, status: error.status || 500, error: error.message || 'Configuration Supabase indisponible.' };
  }
  const { data: authData, error: authError } = await db.auth.getUser(jwt);
  if (authError || !authData.user?.email) {
    return { ok: false as const, status: 401, error: 'Session invalide ou expirée.' };
  }
  const { data: role, error: roleError } = await db.rpc('lumareel_current_admin_role');
  if (roleError) {
    console.error('[auth] role RPC:', roleError.message);
    return { ok: false as const, status: 500, error: 'Vérification des autorisations indisponible.' };
  }
  if (!role || !roles.includes(String(role))) {
    return { ok: false as const, status: 403, error: 'Accès non autorisé pour ce compte.' };
  }
  return { ok: true as const, db, user: authData.user, profile: { role, email_verified: true } };
}

export function methodNotAllowed(res: VercelResponse, allowed: string[]) {
  res.setHeader('Allow', allowed.join(', '));
  return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });
}
