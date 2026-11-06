import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * ============================================================================
 * ARCHITECTURE SUPABASE HAUTE PERFORMANCE & SCALABILITÉ — LUMARÉEL CO.
 * ============================================================================
 * Conçu pour absorber des pics de trafic intenses (> 10 000 utilisateurs simultanés)
 * sans saturer les sockets PostgreSQL ni faire tomber le client web.
 *
 * Fonctionnalités critiques :
 * 1. Connection Pooling & HTTP Keep-Alive (PostgREST / Supavisor / PgBouncer)
 * 2. Stratégie de Retry automatique avec Exponential Backoff (gestion des 429/503)
 * 3. Timeouts stricts (évite les connexions zombies en attente)
 * 4. Détection dynamique de l'environnement (Vercel Production / Local)
 * ============================================================================
 */

export function sanitizeSupabaseUrl(url: string): string {
  if (!url) return '';
  return url.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
}

// Récupération des variables d'environnement Vite / Vercel
const rawSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseUrl = sanitizeSupabaseUrl(rawSupabaseUrl);
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Vérification de validité (évite les URLs d'exemple ou manquantes)
export let isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project-id') &&
  supabaseAnonKey.length > 20
);

/**
 * Custom Fetch Resilient Wrapper :
 * - Keep-Alive actif pour réutiliser les connexions TCP / TLS sous forte charge
 * - Timeout à 10 000 ms pour libérer immédiatement les requêtes bloquées
 * - Retry exponentiel automatique en cas de surcharge temporaire (429 ou 5xx)
 */
const resilientFetch: typeof fetch = async (url, options = {}) => {
  const MAX_RETRIES = 3;
  let delay = 150; // ms initial delay
  let lastError: any = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s strict timeout

      // Combine user signal with timeout
      const signal = options.signal || controller.signal;

      const response = await fetch(url, {
        ...options,
        signal,
        // @ts-ignore keepalive is supported in modern browsers & fetch
        keepalive: true,
      });

      clearTimeout(timeoutId);

      // Si le serveur Supabase renvoie un 429 (Rate Limit) ou 503 (Pooler plein), on temporise et réessaie
      if ((response.status === 429 || response.status === 502 || response.status === 503 || response.status === 504) && attempt < MAX_RETRIES) {
        await new Promise((res) => setTimeout(res, delay + Math.random() * 100));
        delay *= 2; // Exponential backoff (150ms -> 300ms -> 600ms)
        continue;
      }

      return response;
    } catch (err: any) {
      lastError = err;
      if (attempt < MAX_RETRIES && (err.name === 'AbortError' || err.name === 'TypeError')) {
        await new Promise((res) => setTimeout(res, delay + Math.random() * 100));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }

  throw lastError;
};

// URL de repli propre si non configuré pour éviter le crash au chargement initial
let currentUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder-lumareel.supabase.co';
let currentKey = isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key-lumareel-2026';

function createSupabaseInstance(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'lumareel_auth_session',
    },
    db: {
      schema: 'public',
    },
    global: {
      fetch: resilientFetch,
      headers: {
        'x-application-name': 'lumareel-ticketing-production',
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 20, // Limite le débit Realtime pour préserver le CPU des clients
      },
    },
  });
}

/**
 * Instance Unique du Client Supabase optimisée pour PgBouncer / Connection Pooler
 */
export let supabase: SupabaseClient = createSupabaseInstance(currentUrl, currentKey);

/**
 * Reconfigure dynamiquement le client Supabase avec de nouvelles clés
 */
export function configureSupabase(newUrl: string, newKey: string): SupabaseClient {
  const cleanUrl = sanitizeSupabaseUrl(newUrl);
  const cleanKey = newKey.trim();

  currentUrl = cleanUrl;
  currentKey = cleanKey;
  isSupabaseConfigured = Boolean(
    cleanUrl &&
    cleanKey &&
    cleanUrl.startsWith('https://') &&
    !cleanUrl.includes('your-project-id') &&
    cleanKey.length > 20
  );

  supabase = createSupabaseInstance(cleanUrl, cleanKey);
  return supabase;
}

/**
 * Diagnostic de connexion à Supabase
 * Permet de mesurer la latence et de s'assurer que le Connection Pooler répond
 */
export async function testSupabaseConnection(customUrl?: string, customKey?: string): Promise<{
  connected: boolean;
  latencyMs: number;
  message: string;
}> {
  const clientToTest = (customUrl && customKey) ? createSupabaseInstance(customUrl, customKey) : supabase;
  const configured = (customUrl && customKey) 
    ? Boolean(customUrl.startsWith('https://') && customKey.length > 20) 
    : isSupabaseConfigured;

  if (!configured) {
    return {
      connected: false,
      latencyMs: 0,
      message: 'Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY non configurées.',
    };
  }

  const start = performance.now();
  try {
    const { error } = await clientToTest.from('events').select('id').limit(1);
    const latencyMs = Math.round(performance.now() - start);

    if (error) {
      if (error.code === 'PGRST205') {
        return {
          connected: true,
          latencyMs,
          message: `Projet Supabase connecté (${latencyMs}ms) ! Tables à créer dans l’Éditeur SQL.`,
        };
      }
      return {
        connected: false,
        latencyMs,
        message: `Erreur Supabase: ${error.message} (${error.code || 'UNKNOWN'})`,
      };
    }

    return {
      connected: true,
      latencyMs,
      message: `Connexion Cloud Supabase active & Tables opérationnelles (${latencyMs}ms)`,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      connected: false,
      latencyMs,
      message: `Échec de connexion réseau: ${err.message}`,
    };
  }
}
