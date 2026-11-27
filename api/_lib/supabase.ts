import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

function projectConfig() {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = (
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    ''
  ).trim();
  if (!url || !key) throw new Error('Configuration Supabase publique manquante.');
  return { url, key };
}

export function isSupabasePublicConfigured(): boolean {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const key = (
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    ''
  ).trim();
  return Boolean(url && key);
}

export function isSupabaseServiceConfigured(): boolean {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return Boolean(url && serviceKey);
}

export function publicDb(): SupabaseClient {
  const { url, key } = projectConfig();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Client serveur privilégié (SUPABASE_SERVICE_ROLE_KEY) utilisé uniquement côté backend
 * pour les webhooks PayMeTrust, l'émission atomique de cartes/billets et les journaux d'e-mails.
 * Retourne null si la clé de service n'est pas encore renseignée dans les variables Vercel.
 */
export function serviceDb(): SupabaseClient | null {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !serviceKey) return null;
  try {
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch (error) {
    console.error('[supabase] Service client configuration is invalid:', error instanceof Error ? error.message : error);
    return null;
  }
}

function requestDb(req: VercelRequest): { db: SupabaseClient; jwt: string } {
  const auth = req.headers.authorization || '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
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

/**
 * Vérifie de manière sûre un jeton Bearer Supabase sans lever d'exception si absent.
 */
export async function getAuthenticatedUser(
  req: VercelRequest
): Promise<{ user: User; db: SupabaseClient; jwt: string } | null> {
  try {
    const { db, jwt } = requestDb(req);
    const { data, error } = await db.auth.getUser(jwt);
    if (error || !data?.user?.email) return null;
    return { user: data.user, db, jwt };
  } catch {
    return null;
  }
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

/**
 * CORS strict (évite le wildcard '*' sur les routes authentifiées).
 */
export function applyCors(req: VercelRequest, res: VercelResponse, methods = 'GET, POST, OPTIONS') {
  try {
    const headers = req?.headers || {};
    const origin = String(headers.origin || '').trim();
    const host = String(headers['x-forwarded-host'] || headers.host || '').split(',')[0].trim();
    const configuredPublic = (process.env.APP_PUBLIC_URL || process.env.APP_URL || '').trim().replace(/\/+$/, '');

    if (origin) {
      let allowed = false;
      try {
        const originHost = new URL(origin).host;
        if (host && originHost === host) allowed = true;
        if (configuredPublic && origin.replace(/\/+$/, '') === configuredPublic) allowed = true;
        if (/^localhost(:\d+)?$/i.test(originHost)) allowed = true;
      } catch {
        allowed = false;
      }
      if (allowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
      }
    }
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Api-Key');
  } catch (error) {
    console.warn('[cors] Unable to set response headers:', error instanceof Error ? error.message : error);
  }
}

export function methodNotAllowed(res: VercelResponse, allowed: string[]) {
  res.setHeader('Allow', allowed.join(', '));
  return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });
}
