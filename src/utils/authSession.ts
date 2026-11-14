const LOCAL_AUTH_TOKEN_KEY = 'lumareel_local_auth_token';

// Legacy cleanup: session authentication uses HttpOnly cookies only.
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
  return '';
}

export async function getAuthHeaders(extraHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
  return {
    'X-Requested-With': 'LUMAREEL',
    ...extraHeaders,
  };
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  if (!headers.has('X-Requested-With')) {
    headers.set('X-Requested-With', 'LUMAREEL');
  }
  return fetch(input, {
    ...init,
    credentials: init.credentials || 'include',
    headers,
  });
}
