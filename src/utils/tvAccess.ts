import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export type TvAccessTier = 'free' | 'tv_pass' | 'card' | 'vip';
export type TvAccessSource = 'none' | 'tv_pass' | 'lumareel_card' | 'both';
export type TvSubscriptionStatus =
  | 'pending_payment'
  | 'active'
  | 'expired'
  | 'revoked'
  | 'cancelled';

export interface TvPassPlanClient {
  id: string;
  name: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  price: number;
  currency: string;
  durationDays: number;
  billingCycleLabel: string;
  billingCycleLabelEn?: string;
  autoRenew: boolean;
  renewalPolicy: string;
  conditions: string;
  status: 'active' | 'inactive' | 'archived';
}

export interface TvCardEligibilityClient {
  enabledPlanIds: string[];
  blackCardIncludesVipTier: boolean;
  cardAccessEnabled: boolean;
  updatedAt?: string;
}

export interface TvEntitlementClient {
  hasAccess: boolean;
  source: TvAccessSource;
  maxTier: TvAccessTier;
  cardAccess: {
    eligible: boolean;
    cardNumber?: string;
    cardStatus?: string;
    planId?: string;
    clubVipLevel?: string;
    expiresAt?: string;
    reason?: string;
  };
  subscriptionAccess: {
    active: boolean;
    subscriptionId?: string;
    planId?: string;
    planName?: string;
    status?: TvSubscriptionStatus;
    startsAt?: string;
    expiresAt?: string;
    autoRenew?: boolean;
    reason?: string;
  };
  checkedAt: string;
}

export interface TvPlansResponse {
  plans: TvPassPlanClient[];
  cardEligibility: TvCardEligibilityClient;
  paymentReady: boolean;
  paymentProvider: string;
  paymentEnvironment: 'sandbox' | 'production';
  channels: Array<{ id: string; label: string; type: string }>;
}

export const EMPTY_TV_ENTITLEMENT: TvEntitlementClient = {
  hasAccess: false,
  source: 'none',
  maxTier: 'free',
  cardAccess: { eligible: false },
  subscriptionAccess: { active: false },
  checkedAt: '',
};

async function getSupabaseAccessToken(): Promise<string | null> {
  try {
    if (!isSupabaseConfigured) return null;
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  } catch {
    return null;
  }
}

export async function fetchTvPlans(): Promise<TvPlansResponse | null> {
  try {
    const res = await fetch('/api/tv/plans');
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.success) return null;
    return {
      plans: Array.isArray(data.plans) ? data.plans : [],
      cardEligibility: data.cardEligibility || {
        enabledPlanIds: [],
        blackCardIncludesVipTier: true,
        cardAccessEnabled: true,
      },
      paymentReady: Boolean(data.paymentReady),
      paymentProvider: data.paymentProvider || 'paymetrust',
      paymentEnvironment: data.paymentEnvironment || 'sandbox',
      channels: Array.isArray(data.channels) ? data.channels : [],
    };
  } catch {
    return null;
  }
}

/**
 * Queries the real server-side LUMARÉEL TV entitlement engine.
 * Never grants access locally without server confirmation of an active Card or active TV Pass.
 */
export async function fetchTvEntitlement(
  userEmail?: string | null
): Promise<{ entitlement: TvEntitlementClient; paymentReady: boolean }> {
  const cleanEmail = (userEmail || '').trim().toLowerCase();
  const token = await getSupabaseAccessToken();

  if (!cleanEmail && !token) {
    return { entitlement: { ...EMPTY_TV_ENTITLEMENT, checkedAt: new Date().toISOString() }, paymentReady: false };
  }

  try {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const qs = cleanEmail ? `?email=${encodeURIComponent(cleanEmail)}` : '';
    const res = await fetch(`/api/tv/entitlement${qs}`, { headers });
    if (!res.ok) {
      return { entitlement: { ...EMPTY_TV_ENTITLEMENT, checkedAt: new Date().toISOString() }, paymentReady: false };
    }
    const data = await res.json();
    if (data?.success && data.entitlement) {
      return {
        entitlement: data.entitlement as TvEntitlementClient,
        paymentReady: Boolean(data.paymentReady),
      };
    }
  } catch {
    // Fall back safely to no access rather than granting fake access
  }

  return { entitlement: { ...EMPTY_TV_ENTITLEMENT, checkedAt: new Date().toISOString() }, paymentReady: false };
}

// ============================================================================
// CONTINUE WATCHING — REAL USER PLAYBACK TRACKING (ONLY SHOWN WHEN NON-EMPTY)
// ============================================================================

export interface TvWatchProgressEntry {
  mediaId: string;
  progressPercent: number; // 1..100
  positionSeconds?: number;
  durationSeconds?: number;
  updatedAt: string;
}

const WATCH_HISTORY_PREFIX = 'lumareel_tv_watch_history_v1_';
const WATCH_HISTORY_EVENT = 'lumareel-tv-watch-history-updated';

function getWatchKey(userEmail?: string | null): string {
  const clean = (userEmail || '').trim().toLowerCase();
  return `${WATCH_HISTORY_PREFIX}${clean || 'guest'}`;
}

export function loadTvWatchHistory(userEmail?: string | null): TvWatchProgressEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(getWatchKey(userEmail));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e: any) =>
          e &&
          typeof e.mediaId === 'string' &&
          typeof e.progressPercent === 'number' &&
          e.progressPercent > 0 &&
          e.progressPercent < 98
      )
      .sort((a, b) => Date.parse(b.updatedAt || '') - Date.parse(a.updatedAt || ''));
  } catch {
    return [];
  }
}

export function recordTvWatchProgress(
  userEmail: string | null | undefined,
  entry: Omit<TvWatchProgressEntry, 'updatedAt'>
): TvWatchProgressEntry[] {
  if (typeof window === 'undefined') return [];
  const current = loadTvWatchHistory(userEmail);
  const clamped = Math.max(1, Math.min(100, Math.round(entry.progressPercent)));
  const updated: TvWatchProgressEntry = {
    ...entry,
    progressPercent: clamped,
    updatedAt: new Date().toISOString(),
  };

  // Remove completed entries (>= 98%) from Continue Watching automatically
  const filtered = current.filter((item) => item.mediaId !== entry.mediaId);
  const next = clamped >= 98 ? filtered : [updated, ...filtered].slice(0, 12);

  try {
    window.localStorage.setItem(getWatchKey(userEmail), JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(WATCH_HISTORY_EVENT));
  } catch {
    // ignore storage errors
  }
  return next;
}

export function removeTvWatchProgress(
  userEmail: string | null | undefined,
  mediaId: string
): TvWatchProgressEntry[] {
  if (typeof window === 'undefined') return [];
  const next = loadTvWatchHistory(userEmail).filter((item) => item.mediaId !== mediaId);
  try {
    window.localStorage.setItem(getWatchKey(userEmail), JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(WATCH_HISTORY_EVENT));
  } catch {
    // ignore
  }
  return next;
}

export function subscribeTvWatchHistory(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(WATCH_HISTORY_EVENT, listener);
  return () => window.removeEventListener(WATCH_HISTORY_EVENT, listener);
}
