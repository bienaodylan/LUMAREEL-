import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client.
 *
 * Never import this module from browser code. The service-role credential must
 * remain in the server runtime (Cloud Run / server environment), not VITE_*.
 * Lazy initialization keeps local/dev boot possible when Supabase is not yet
 * configured; callers must explicitly handle a missing configuration.
 */
let cachedClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!url || !url.startsWith('https://') || !serviceRoleKey) {
    return null;
  }

  cachedClient = createClient(url.replace(/\/+$/, ''), serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'x-application-name': 'lumareel-server',
      },
    },
  });

  return cachedClient;
}

/** Fail closed for server routes that require Supabase persistence. */
export function requireSupabaseAdmin(): SupabaseClient {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new Error('Supabase serveur non configuré (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
  }
  return client;
}
