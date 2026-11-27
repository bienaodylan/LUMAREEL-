import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { loadStoredMemberCard } from './memberCardStorage';

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

export const DEFAULT_TV_PASS_PLANS: TvPassPlanClient[] = [
  {
    id: 'tv_pass_monthly',
    name: 'LUMARÉEL TV Pass Mensuel',
    nameEn: 'LUMARÉEL TV Monthly Pass',
    description:
      'Accès illimité aux Originals, concerts filmés, backstage, interviews et rétrospectives LUMARÉEL TV.',
    descriptionEn:
      'Unlimited access to LUMARÉEL TV Originals, filmed concerts, backstage sessions, interviews, and retrospectives.',
    price: 3500,
    currency: 'FCFA',
    durationDays: 30,
    billingCycleLabel: 'Mensuel · 30 jours',
    billingCycleLabelEn: 'Monthly · 30 days',
    autoRenew: false,
    renewalPolicy: 'Sans engagement — renouvellement manuel à l’échéance.',
    conditions: 'Accès personnel multi-écrans sur votre compte LUMARÉEL.',
    status: 'active',
  },
  {
    id: 'tv_pass_annual',
    name: 'LUMARÉEL TV Pass Annuel',
    nameEn: 'LUMARÉEL TV Annual Pass',
    description:
      '12 mois d’accès complet à l’ensemble du catalogue LUMARÉEL TV avec 2 mois offerts.',
    descriptionEn:
      '12 months of full access to the entire LUMARÉEL TV catalog with 2 months included.',
    price: 35000,
    currency: 'FCFA',
    durationDays: 365,
    billingCycleLabel: 'Annuel · 365 jours',
    billingCycleLabelEn: 'Annual · 365 days',
    autoRenew: false,
    renewalPolicy: 'Valable 12 mois — rappel avant renouvellement.',
    conditions: 'Accès complet à toutes les sorties de la saison.',
    status: 'active',
  },
];

export const DEFAULT_TV_PAYMENT_CHANNELS: Array<{ id: string; label: string; type: string }> = [
  { id: 'wave', label: 'Wave', type: 'mobile_money' },
  { id: 'orange_money', label: 'Orange Money', type: 'mobile_money' },
  { id: 'mtn_momo', label: 'MTN MoMo', type: 'mobile_money' },
  { id: 'moov_money', label: 'Moov Money', type: 'mobile_money' },
  { id: 'card', label: 'Visa / Mastercard', type: 'card' },
];

export interface LocalTvSubscriptionRecord {
  subscriptionId: string;
  planId: string;
  planName: string;
  status: TvSubscriptionStatus;
  startsAt: string;
  expiresAt: string;
  autoRenew: boolean;
  paymentReference?: string;
}

const LOCAL_TV_SUB_PREFIX = 'lumareel_effective_tv_sub_v1_';
const TV_ENTITLEMENT_EVENT = 'lumareel-tv-entitlement-updated';

function getLocalTvSubKey(email: string): string {
  return `${LOCAL_TV_SUB_PREFIX}${email.trim().toLowerCase()}`;
}

export function loadLocalTvSubscription(email?: string | null): LocalTvSubscriptionRecord | null {
  if (typeof window === 'undefined' || !email) return null;
  try {
    const raw = window.localStorage.getItem(getLocalTvSubKey(email));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalTvSubscriptionRecord;
    if (!parsed || !parsed.subscriptionId || !parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLocalTvSubscription(
  email: string,
  plan: TvPassPlanClient,
  paymentReference?: string
): LocalTvSubscriptionRecord {
  const now = new Date();
  const expires = new Date(now.getTime() + Math.max(1, plan.durationDays || 30) * 24 * 60 * 60 * 1000);
  const record: LocalTvSubscriptionRecord = {
    subscriptionId: `tvsub_${Date.now().toString(36)}`,
    planId: plan.id,
    planName: plan.name,
    status: 'active',
    startsAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    autoRenew: Boolean(plan.autoRenew),
    paymentReference,
  };
  if (typeof window !== 'undefined' && email) {
    try {
      window.localStorage.setItem(getLocalTvSubKey(email), JSON.stringify(record));
      window.dispatchEvent(new CustomEvent(TV_ENTITLEMENT_EVENT));
    } catch {
      // ignore storage quota
    }
  }
  return record;
}

function buildLocalFallbackEntitlement(cleanEmail: string): TvEntitlementClient {
  const checkedAt = new Date().toISOString();
  if (!cleanEmail) {
    return { ...EMPTY_TV_ENTITLEMENT, checkedAt };
  }

  const storedCard = loadStoredMemberCard(cleanEmail);
  const hasCard = Boolean(
    storedCard &&
      storedCard.cardStatus === 'active' &&
      (!storedCard.expiresAt || Date.parse(storedCard.expiresAt) > Date.now())
  );

  const localSub = loadLocalTvSubscription(cleanEmail);
  const hasSub = Boolean(
    localSub &&
      localSub.status === 'active' &&
      Date.parse(localSub.expiresAt) > Date.now()
  );

  if (!hasCard && !hasSub) {
    return { ...EMPTY_TV_ENTITLEMENT, checkedAt };
  }

  const source: TvAccessSource =
    hasCard && hasSub ? 'both' : hasCard ? 'lumareel_card' : 'tv_pass';

  return {
    hasAccess: true,
    source,
    maxTier: hasCard ? 'vip' : 'tv_pass',
    cardAccess: hasCard && storedCard
      ? {
          eligible: true,
          cardNumber: storedCard.cardNumber,
          cardStatus: storedCard.cardStatus,
          planId: storedCard.planId,
          expiresAt: storedCard.expiresAt,
        }
      : { eligible: false },
    subscriptionAccess: hasSub && localSub
      ? {
          active: true,
          subscriptionId: localSub.subscriptionId,
          planId: localSub.planId,
          planName: localSub.planName,
          status: 'active',
          startsAt: localSub.startsAt,
          expiresAt: localSub.expiresAt,
          autoRenew: localSub.autoRenew,
        }
      : { active: false },
    checkedAt,
  };
}

function mergeTvEntitlements(
  serverEnt: TvEntitlementClient | null,
  localEnt: TvEntitlementClient
): TvEntitlementClient {
  if (!serverEnt) return localEnt;
  const hasCard = Boolean(serverEnt.cardAccess?.eligible || localEnt.cardAccess?.eligible);
  const hasSub = Boolean(serverEnt.subscriptionAccess?.active || localEnt.subscriptionAccess?.active);
  const hasAccess = hasCard || hasSub;
  const source: TvAccessSource =
    hasCard && hasSub ? 'both' : hasCard ? 'lumareel_card' : hasSub ? 'tv_pass' : 'none';

  return {
    hasAccess,
    source,
    maxTier: hasCard ? 'vip' : hasSub ? 'tv_pass' : 'free',
    cardAccess: serverEnt.cardAccess?.eligible ? serverEnt.cardAccess : localEnt.cardAccess,
    subscriptionAccess: serverEnt.subscriptionAccess?.active
      ? serverEnt.subscriptionAccess
      : localEnt.subscriptionAccess,
    checkedAt: serverEnt.checkedAt || localEnt.checkedAt,
  };
}

export async function fetchTvPlans(): Promise<TvPlansResponse> {
  return {
    plans: DEFAULT_TV_PASS_PLANS,
    cardEligibility: {
      enabledPlanIds: ['plan_founders_annual', 'plan_black_card_2026'],
      blackCardIncludesVipTier: true,
      cardAccessEnabled: true,
    },
    paymentReady: true,
    paymentProvider: 'paymetrust',
    paymentEnvironment: 'sandbox',
    channels: DEFAULT_TV_PAYMENT_CHANNELS,
  };
}

/**
 * Resolves LUMARÉEL TV entitlement directly from front-end fictif state
 * (active local TV Pass subscription or stored Black Card).
 */
export async function fetchTvEntitlement(
  userEmail?: string | null
): Promise<{ entitlement: TvEntitlementClient; paymentReady: boolean }> {
  const cleanEmail = (userEmail || '').trim().toLowerCase();
  const localEntitlement = buildLocalFallbackEntitlement(cleanEmail);
  return { entitlement: localEntitlement, paymentReady: true };
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
