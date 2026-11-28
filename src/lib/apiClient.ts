import { supabase } from './supabaseClient';

/**
 * Retrieves authenticated request headers carrying the live Supabase JWT Bearer token
 * so the Express backend can verify the member's identity server-side without trusting
 * client-supplied email/userId fields.
 */
export async function getAuthHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...extra };
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else if (typeof window !== 'undefined') {
      const savedRaw = localStorage.getItem('lumareel_persisted_user_v5');
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        if (saved?.email) {
          headers['x-member-email'] = String(saved.email).trim().toLowerCase();
        }
      }
    }
  } catch {
    // Fallback to unauthenticated request when no active session exists
  }
  return headers;
}

export async function apiFetchJson<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const authHeaders = await getAuthHeaders(
    isFormData ? {} : { 'Content-Type': 'application/json' }
  );
  const mergedHeaders = {
    ...authHeaders,
    ...(options.headers as Record<string, string> | undefined),
  };
  const res = await fetch(url, { ...options, headers: mergedHeaders });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Erreur serveur (${res.status})`);
  }
  return data as T;
}

const REFERRAL_STORAGE_KEY = 'lumareel_pending_referral_code';

export function captureReferralCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('ref') || params.get('referral');
  if (raw && raw.trim().length >= 5) {
    const clean = raw.trim().toUpperCase().slice(0, 32);
    try {
      localStorage.setItem(REFERRAL_STORAGE_KEY, clean);
    } catch {
      // ignore storage errors
    }
    return clean;
  }
  return getStoredPendingReferralCode();
}

export function getStoredPendingReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(REFERRAL_STORAGE_KEY);
    return saved && saved.trim().length >= 5 ? saved.trim().toUpperCase() : null;
  } catch {
    return null;
  }
}

export function clearStoredPendingReferralCode(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    // ignore
  }
}
