import { supabase } from '../lib/supabaseClient';

const LOCAL_AUTH_TOKEN_KEY = 'lumareel_local_auth_token';

// Legacy cleanup: Supabase owns the persisted session; no bearer token is
// copied into localStorage by the application.
export function getLocalAuthToken(): string {
  clearLocalAuthToken();
  return '';
}

export function setLocalAuthToken(_token?: string | null): void {
  clearLocalAuthToken();
}

export function clearLocalAuthToken(): void {
  try {
    localStorage.removeItem(LOCAL_AUTH_TOKEN_KEY);
  } catch {}
}

export async function getAccessToken(): Promise<string> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return '';
    return data.session?.access_token || '';
  } catch {
    return '';
  }
}

export async function getAuthHeaders(extraHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'LUMAREEL',
    ...extraHeaders,
  };
  const token = await getAccessToken();
  if (token && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  if (!headers.has('X-Requested-With')) {
    headers.set('X-Requested-With', 'LUMAREEL');
  }
  const token = await getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, {
    ...init,
    credentials: init.credentials || 'include',
    headers,
  });
}
