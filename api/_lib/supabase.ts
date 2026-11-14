import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

function projectConfig() {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';
  if (!url || !key) throw new Error('Configuration Supabase publique manquante.');
  return { url, key };
}

export function userDbForToken(jwt: string): SupabaseClient {
  const { url, key } = projectConfig();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
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
  // The database role is the source of truth. Never grant privileges from
  // editable user metadata or from an email-only shortcut in a client request.
  const { data: profile, error: profileError } = await db
    .from('users')
    .select('role, email_verified')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[auth] profile role lookup:', profileError.message);
    return { ok: false as const, status: 503, error: 'Vérification du profil administrateur indisponible.' };
  }

  const profileRole = profile?.email_verified ? String(profile.role || '') : '';
  const isVerifiedOwner = authData.user.email?.toLowerCase() === 'bienaodylan428@gmail.com'
    && Boolean(authData.user.email_confirmed_at);
  const trustedRole = isVerifiedOwner ? 'super_admin' : profileRole;

  const { data: rpcRole, error: roleError } = await db.rpc('lumareel_current_admin_role');
  if (roleError) {
    console.error('[auth] role RPC:', roleError.message);
    return { ok: false as const, status: 500, error: 'Vérification des autorisations indisponible.' };
  }

  if (!trustedRole || !roles.includes(trustedRole) || String(rpcRole || '') !== trustedRole) {
    return { ok: false as const, status: 403, error: 'Accès non autorisé pour ce compte.' };
  }

  return { ok: true as const, db, user: authData.user, profile: { ...profile, role: trustedRole, email_verified: true } };
}

export async function authenticatedUserDb(req: VercelRequest) {
  const authorization = req.headers.authorization || '';
  const jwt = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!jwt) {
    return { ok: false as const, status: 401, error: 'Session requise.' };
  }
  try {
    const { url, key } = projectConfig();
    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data, error } = await db.auth.getUser(jwt);
    if (error || !data.user) {
      return { ok: false as const, status: 401, error: 'Session invalide ou expirée.' };
    }
    return { ok: true as const, db, user: data.user };
  } catch (error: any) {
    console.error('[auth] authenticated user lookup:', error?.message || error);
    return { ok: false as const, status: 503, error: 'Service d’authentification temporairement indisponible.' };
  }
}

export function methodNotAllowed(res: VercelResponse, allowed: string[]) {
  res.setHeader('Allow', allowed.join(', '));
  return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });
}
