import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { membershipService } from './membershipService';

export type TvPassPlanStatus = 'active' | 'inactive' | 'archived';

export type TvSubscriptionStatus =
  | 'pending_payment'
  | 'active'
  | 'expired'
  | 'revoked'
  | 'cancelled';

export type TvAccessSource = 'none' | 'tv_pass' | 'lumareel_card' | 'both';

export type TvAccessTier = 'free' | 'tv_pass' | 'card' | 'vip';

export interface TvPassPlan {
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
  status: TvPassPlanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TvSubscription {
  id: string;
  userId?: string;
  userEmail: string;
  userName: string;
  planId: string;
  planName: string;
  status: TvSubscriptionStatus;
  source: 'jekopay' | 'admin_grant';
  paymentReference?: string;
  providerTransactionId?: string;
  amountPaid?: number;
  currency?: string;
  autoRenew: boolean;
  startsAt?: string;
  expiresAt?: string;
  revokedAt?: string;
  revocationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TvCardEligibilityConfig {
  /** Plan IDs or club VIP levels eligible for LUMARÉEL TV access */
  enabledPlanIds: string[];
  /** Whether active LUMARÉEL Black Cards include VIP TV tier automatically */
  blackCardIncludesVipTier: boolean;
  /** Global toggle for card-based LUMARÉEL TV access */
  cardAccessEnabled: boolean;
  updatedAt: string;
}

export interface TvEntitlementResult {
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

interface TvStoreData {
  plans: TvPassPlan[];
  subscriptions: TvSubscription[];
  cardEligibility: TvCardEligibilityConfig;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const TV_STORE_FILE = path.join(DATA_DIR, 'lumareel_tv.json');

class LumareelTvService {
  private plans: Map<string, TvPassPlan> = new Map();
  private subscriptions: Map<string, TvSubscription> = new Map();
  private cardEligibility: TvCardEligibilityConfig = {
    enabledPlanIds: ['plan_founders_annual'],
    blackCardIncludesVipTier: true,
    cardAccessEnabled: true,
    updatedAt: new Date().toISOString(),
  };

  constructor() {
    this.ensureDataDir();
    this.loadFromDisk();
    if (this.plans.size === 0) {
      this.seedDefaultPlans();
    }
  }

  private ensureDataDir() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (err) {
      console.warn('[LumareelTvService] Unable to create data dir:', err);
    }
  }

  private loadFromDisk() {
    if (!fs.existsSync(TV_STORE_FILE)) return;
    try {
      const raw = fs.readFileSync(TV_STORE_FILE, 'utf-8');
      const parsed: Partial<TvStoreData> = JSON.parse(raw);
      (parsed.plans || []).forEach((p) => {
        if (p?.id) this.plans.set(p.id, p);
      });
      (parsed.subscriptions || []).forEach((s) => {
        if (s?.id) this.subscriptions.set(s.id, s);
      });
      if (parsed.cardEligibility) {
        this.cardEligibility = {
          ...this.cardEligibility,
          ...parsed.cardEligibility,
        };
      }
    } catch (err) {
      console.warn('[LumareelTvService] Unable to load store:', err);
    }
  }

  private saveToDisk() {
    try {
      this.ensureDataDir();
      const payload: TvStoreData = {
        plans: Array.from(this.plans.values()),
        subscriptions: Array.from(this.subscriptions.values()),
        cardEligibility: this.cardEligibility,
      };
      fs.writeFileSync(TV_STORE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[LumareelTvService] Unable to persist store:', err);
    }
  }

  private seedDefaultPlans() {
    const now = new Date().toISOString();
    const defaults: TvPassPlan[] = [
      {
        id: 'tv_pass_monthly',
        name: 'LUMARÉEL TV Pass · Mensuel',
        nameEn: 'LUMARÉEL TV Pass · Monthly',
        description:
          'Accès illimité aux LUMARÉEL Originals, concerts filmés, backstage, interviews et rétrospectives.',
        descriptionEn:
          'Unlimited access to LUMARÉEL Originals, filmed concerts, backstage, interviews, and retrospectives.',
        price: 3500,
        currency: 'FCFA',
        durationDays: 30,
        billingCycleLabel: 'Par mois',
        billingCycleLabelEn: 'Per month',
        autoRenew: true,
        renewalPolicy: 'Renouvellement mensuel résiliable à tout moment avant l’échéance.',
        conditions: 'Accès personnel sur tous vos écrans · Sans carte physique requise.',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'tv_pass_annual',
        name: 'LUMARÉEL TV Pass · Annuel',
        nameEn: 'LUMARÉEL TV Pass · Annual',
        description:
          'Une année complète de streaming exclusif LUMARÉEL TV avec tarif préférentiel.',
        descriptionEn:
          'A full year of exclusive LUMARÉEL TV streaming at a preferential annual rate.',
        price: 35000,
        currency: 'FCFA',
        durationDays: 365,
        billingCycleLabel: 'Par an',
        billingCycleLabelEn: 'Per year',
        autoRenew: true,
        renewalPolicy: 'Renouvellement annuel sur confirmation · Rappel envoyé avant échéance.',
        conditions: '2 mois offerts par rapport au pass mensuel · Sans engagement après période.',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
    ];
    defaults.forEach((p) => this.plans.set(p.id, p));
    this.saveToDisk();
  }

  // ============================================================================
  // PLANS MANAGEMENT (ADMIN-CONFIGURABLE)
  // ============================================================================

  public getAllPlans(): TvPassPlan[] {
    return Array.from(this.plans.values()).sort((a, b) => a.price - b.price);
  }

  public getActivePlans(): TvPassPlan[] {
    return this.getAllPlans().filter((p) => p.status === 'active');
  }

  public getPlanById(id: string): TvPassPlan | undefined {
    return this.plans.get(id);
  }

  public upsertPlan(
    input: Partial<TvPassPlan> & { name: string; price: number; durationDays: number }
  ): TvPassPlan {
    const now = new Date().toISOString();
    const existing = input.id ? this.plans.get(input.id) : undefined;
    const safePrice = Math.max(0, Math.round(Number(input.price) || 0));
    const safeDuration = Math.max(1, Math.round(Number(input.durationDays) || 30));

    const plan: TvPassPlan = {
      id: existing?.id || input.id || `tv_pass_${crypto.randomBytes(4).toString('hex')}`,
      name: String(input.name).trim(),
      nameEn: input.nameEn ? String(input.nameEn).trim() : existing?.nameEn,
      description: String(input.description ?? existing?.description ?? '').trim(),
      descriptionEn: input.descriptionEn
        ? String(input.descriptionEn).trim()
        : existing?.descriptionEn,
      price: safePrice,
      currency: String(input.currency || existing?.currency || 'FCFA').trim(),
      durationDays: safeDuration,
      billingCycleLabel: String(
        input.billingCycleLabel ||
          existing?.billingCycleLabel ||
          (safeDuration >= 360 ? 'Par an' : safeDuration >= 85 ? 'Par trimestre' : 'Par mois')
      ).trim(),
      billingCycleLabelEn:
        input.billingCycleLabelEn ||
        existing?.billingCycleLabelEn ||
        (safeDuration >= 360 ? 'Per year' : safeDuration >= 85 ? 'Per quarter' : 'Per month'),
      autoRenew: Boolean(input.autoRenew ?? existing?.autoRenew ?? true),
      renewalPolicy: String(
        input.renewalPolicy ??
          existing?.renewalPolicy ??
          'Renouvelable à l’échéance selon les conditions en vigueur.'
      ).trim(),
      conditions: String(
        input.conditions ??
          existing?.conditions ??
          'Accès personnel LUMARÉEL TV sans carte physique requise.'
      ).trim(),
      status: input.status || existing?.status || 'active',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    this.plans.set(plan.id, plan);
    this.saveToDisk();
    return plan;
  }

  // ============================================================================
  // CARD ELIGIBILITY CONFIGURATION (SINGLE PERMISSION MODEL)
  // ============================================================================

  public getCardEligibilityConfig(): TvCardEligibilityConfig {
    return { ...this.cardEligibility };
  }

  public updateCardEligibilityConfig(
    patch: Partial<TvCardEligibilityConfig>
  ): TvCardEligibilityConfig {
    this.cardEligibility = {
      ...this.cardEligibility,
      ...patch,
      enabledPlanIds: Array.isArray(patch.enabledPlanIds)
        ? patch.enabledPlanIds.map((id) => String(id).trim()).filter(Boolean)
        : this.cardEligibility.enabledPlanIds,
      updatedAt: new Date().toISOString(),
    };
    this.saveToDisk();
    return this.getCardEligibilityConfig();
  }

  // ============================================================================
  // SUBSCRIPTIONS LIFECYCLE (REAL STATUS, EXPIRY & REVOCATION)
  // ============================================================================

  /** Automatically marks active subscriptions past expiresAt as expired. */
  private reconcileExpiredSubscriptions(): boolean {
    const nowMs = Date.now();
    let changed = false;
    for (const sub of this.subscriptions.values()) {
      if (sub.status === 'active' && sub.expiresAt) {
        const expMs = Date.parse(sub.expiresAt);
        if (!Number.isNaN(expMs) && expMs <= nowMs) {
          sub.status = 'expired';
          sub.updatedAt = new Date().toISOString();
          changed = true;
        }
      }
    }
    if (changed) {
      this.saveToDisk();
    }
    return changed;
  }

  public getAllSubscriptions(): TvSubscription[] {
    this.reconcileExpiredSubscriptions();
    return Array.from(this.subscriptions.values()).sort(
      (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
    );
  }

  public getSubscriptionsByEmail(email: string): TvSubscription[] {
    this.reconcileExpiredSubscriptions();
    const clean = String(email || '').trim().toLowerCase();
    if (!clean) return [];
    return this.getAllSubscriptions().filter(
      (s) => s.userEmail.trim().toLowerCase() === clean
    );
  }

  /**
   * Creates a PENDING subscription before real payment redirection.
   * Never marks status='active' until verified payment confirmation.
   */
  public createPendingSubscription(params: {
    userId?: string;
    userEmail: string;
    userName: string;
    planId: string;
    paymentReference: string;
  }): TvSubscription {
    const plan = this.plans.get(params.planId);
    if (!plan || plan.status !== 'active') {
      throw new Error('Formule LUMARÉEL TV Pass indisponible.');
    }

    const now = new Date().toISOString();
    const sub: TvSubscription = {
      id: `tvsub_${crypto.randomBytes(6).toString('hex')}`,
      userId: params.userId,
      userEmail: params.userEmail.trim().toLowerCase(),
      userName: params.userName.trim() || 'Membre LUMARÉEL',
      planId: plan.id,
      planName: plan.name,
      status: 'pending_payment',
      source: 'jekopay',
      paymentReference: params.paymentReference,
      amountPaid: plan.price,
      currency: plan.currency,
      autoRenew: plan.autoRenew,
      createdAt: now,
      updatedAt: now,
    };

    this.subscriptions.set(sub.id, sub);
    this.saveToDisk();
    return sub;
  }

  /**
   * Idempotently activates a TV Pass subscription ONLY after real verified payment
   * (JekoPay webhook or JekoPay verify endpoint returning SUCCESS).
   */
  public activateSubscriptionFromPayment(
    paymentReference: string,
    providerTransactionId?: string
  ): TvSubscription | null {
    const target = Array.from(this.subscriptions.values()).find(
      (s) => s.paymentReference === paymentReference
    );
    if (!target) return null;

    if (target.status === 'active' && target.expiresAt) {
      return target;
    }

    const plan = this.plans.get(target.planId);
    const durationDays = plan?.durationDays || 30;
    const now = new Date();
    const expires = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    target.status = 'active';
    target.providerTransactionId = providerTransactionId || paymentReference;
    target.startsAt = now.toISOString();
    target.expiresAt = expires.toISOString();
    target.updatedAt = now.toISOString();

    this.subscriptions.set(target.id, target);
    this.saveToDisk();
    return target;
  }

  /** Admin-authorized manual grant (with audit source = 'admin_grant'). */
  public adminGrantSubscription(params: {
    userEmail: string;
    userName: string;
    planId: string;
    durationDays?: number;
  }): TvSubscription {
    const cleanEmail = params.userEmail.trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error('Adresse e-mail membre requise.');
    }
    const plan = this.plans.get(params.planId) || this.getActivePlans()[0];
    if (!plan) {
      throw new Error('Aucune formule LUMARÉEL TV Pass disponible.');
    }

    const days = Math.max(1, Math.round(Number(params.durationDays) || plan.durationDays));
    const now = new Date();
    const expires = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const sub: TvSubscription = {
      id: `tvsub_${crypto.randomBytes(6).toString('hex')}`,
      userEmail: cleanEmail,
      userName: params.userName.trim() || cleanEmail.split('@')[0],
      planId: plan.id,
      planName: plan.name,
      status: 'active',
      source: 'admin_grant',
      amountPaid: 0,
      currency: plan.currency,
      autoRenew: false,
      startsAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.subscriptions.set(sub.id, sub);
    this.saveToDisk();
    return sub;
  }

  public updateSubscriptionStatus(
    subscriptionId: string,
    status: TvSubscriptionStatus,
    reason?: string
  ): TvSubscription | null {
    const sub = this.subscriptions.get(subscriptionId);
    if (!sub) return null;
    const now = new Date();
    sub.status = status;
    sub.updatedAt = now.toISOString();

    if (status === 'revoked' || status === 'cancelled') {
      sub.revokedAt = now.toISOString();
      sub.revocationReason = reason?.trim() || 'Révoqué par l’administration LUMARÉEL.';
    } else if (status === 'active') {
      const plan = this.plans.get(sub.planId);
      const days = plan?.durationDays || 30;
      const currentExp = sub.expiresAt ? Date.parse(sub.expiresAt) : 0;
      if (!currentExp || currentExp <= Date.now()) {
        sub.startsAt = now.toISOString();
        sub.expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
      }
      sub.revokedAt = undefined;
      sub.revocationReason = undefined;
    }

    this.subscriptions.set(sub.id, sub);
    this.saveToDisk();
    return sub;
  }

  // ============================================================================
  // CENTRAL UNIFIED ENTITLEMENT RESOLVER (CARD + TV PASS)
  // ============================================================================

  public evaluateUserEntitlement(email?: string | null): TvEntitlementResult {
    this.reconcileExpiredSubscriptions();
    const nowIso = new Date().toISOString();
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanEmail) {
      return {
        hasAccess: false,
        source: 'none',
        maxTier: 'free',
        cardAccess: { eligible: false, reason: 'Utilisateur non connecté.' },
        subscriptionAccess: { active: false, reason: 'Aucun abonnement actif.' },
        checkedAt: nowIso,
      };
    }

    // 1. Check LUMARÉEL Card real status & plan eligibility
    const card = membershipService.getCardByEmail(cleanEmail);
    let cardEligible = false;
    let cardReason: string | undefined;

    if (!this.cardEligibility.cardAccessEnabled) {
      cardReason = 'L’accès LUMARÉEL TV par carte est temporairement désactivé.';
    } else if (!card) {
      cardReason = 'Aucune LUMARÉEL Card associée à ce compte.';
    } else {
      const cardExpiresMs = card.expiresAt ? Date.parse(card.expiresAt) : NaN;
      const isCardExpired = !Number.isNaN(cardExpiresMs) && cardExpiresMs <= Date.now();
      const isPlanAllowed =
        this.cardEligibility.enabledPlanIds.length === 0 ||
        this.cardEligibility.enabledPlanIds.includes(card.planId);

      if (card.cardStatus !== 'active') {
        cardReason = `Carte au statut « ${card.cardStatus} ».`;
      } else if (isCardExpired) {
        cardReason = 'LUMARÉEL Card expirée.';
      } else if (!isPlanAllowed) {
        cardReason = 'Cette formule de carte n’inclut pas LUMARÉEL TV.';
      } else {
        cardEligible = true;
      }
    }

    // 2. Check LUMARÉEL TV Pass real subscription status
    const userSubs = this.getSubscriptionsByEmail(cleanEmail);
    const activeSub = userSubs.find(
      (s) =>
        s.status === 'active' &&
        (!s.expiresAt || Date.parse(s.expiresAt) > Date.now())
    );
    const latestSub = activeSub || userSubs[0];

    const subActive = Boolean(activeSub);
    const subReason = subActive
      ? undefined
      : latestSub?.status === 'expired'
      ? 'Votre LUMARÉEL TV Pass a expiré.'
      : latestSub?.status === 'revoked'
      ? latestSub.revocationReason || 'Votre LUMARÉEL TV Pass a été révoqué.'
      : latestSub?.status === 'pending_payment'
      ? 'Paiement en attente de confirmation.'
      : 'Aucun abonnement LUMARÉEL TV Pass actif.';

    // 3. Combine into unified source & max access tier
    const source: TvAccessSource =
      cardEligible && subActive
        ? 'both'
        : cardEligible
        ? 'lumareel_card'
        : subActive
        ? 'tv_pass'
        : 'none';

    let maxTier: TvAccessTier = 'free';
    if (cardEligible) {
      maxTier = this.cardEligibility.blackCardIncludesVipTier ? 'vip' : 'card';
    } else if (subActive) {
      maxTier = 'tv_pass';
    }

    return {
      hasAccess: cardEligible || subActive,
      source,
      maxTier,
      cardAccess: {
        eligible: cardEligible,
        cardNumber: card?.cardNumber,
        cardStatus: card?.cardStatus,
        planId: card?.planId,
        clubVipLevel: card?.clubVipLevel,
        expiresAt: card?.expiresAt,
        reason: cardReason,
      },
      subscriptionAccess: {
        active: subActive,
        subscriptionId: latestSub?.id,
        planId: latestSub?.planId,
        planName: latestSub?.planName,
        status: latestSub?.status,
        startsAt: latestSub?.startsAt,
        expiresAt: latestSub?.expiresAt,
        autoRenew: latestSub?.autoRenew,
        reason: subReason,
      },
      checkedAt: nowIso,
    };
  }
}

export const lumareelTvService = new LumareelTvService();
