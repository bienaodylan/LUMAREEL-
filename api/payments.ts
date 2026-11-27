import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import {
  applyCors,
  getAuthenticatedUser,
  isSupabasePublicConfigured,
  isSupabaseServiceConfigured,
  requireRole,
  serviceDb,
} from './_lib/supabase';
import {
  getResendFromAddress,
  isResendConfigured,
  sendBlackCardActivationEmail,
  sendResendEmail,
  sendTicketConfirmationEmail,
  sendTicketTransferEmail,
} from './_lib/emailService';

const VALID_CHANNELS = new Set([
  'wave',
  'orange_money',
  'mtn_momo',
  'moov_money',
  'djamo',
  'card',
]);

const PAYMETRUST_CHANNEL_MAP: Record<string, string> = {
  wave: 'WAVE_CI',
  orange_money: 'OM_CI',
  mtn_momo: 'MOMO_CI',
  moov_money: 'FLOOZ_CI',
  djamo: 'CARD',
  card: 'CARD',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PMT_REF_REGEX = /^PMT-[A-Z0-9_-]{4,64}$/i;

function resolvePublicBaseUrl(req: VercelRequest): string {
  const explicit = (
    process.env.APP_PUBLIC_URL ||
    process.env.APP_URL ||
    process.env.PUBLIC_URL ||
    ''
  )
    .trim()
    .replace(/\/+$/, '');
  if (explicit) return explicit;
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return host ? `${proto}://${host}` : 'https://lumareel-theta.vercel.app';
}

function parseJsonBody(req: VercelRequest): { raw: string; parsed: any } {
  if (typeof req.body === 'string') {
    const raw = req.body;
    try {
      return { raw, parsed: raw ? JSON.parse(raw) : {} };
    } catch {
      return { raw, parsed: {} };
    }
  }
  const parsed = req.body || {};
  return { raw: JSON.stringify(parsed), parsed };
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function verifyPayMeTrustSignature(rawBody: string, signatureHeader: string, envName: string): boolean {
  const webhookSecret = (process.env.PAYMETRUST_WEBHOOK_SECRET || '').trim();
  if (!webhookSecret) {
    // En production, un webhook non signé est toujours refusé
    return envName !== 'production';
  }
  if (!signatureHeader) return false;
  const cleaned = signatureHeader.replace(/^sha256=/i, '').trim();
  const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return safeEqual(cleaned, expected);
}

function normalizePayMeTrustStatus(raw: unknown): 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'PENDING' {
  const val = String(raw ?? '').trim().toUpperCase();
  if (['SUCCESS', 'SUCCEEDED', 'COMPLETED', 'PAID', 'OK', '200', '00'].includes(val)) return 'SUCCESS';
  if (['FAILED', 'ERROR', 'DECLINED', 'REJECTED', 'EXPIRED'].includes(val)) return 'FAILED';
  if (['CANCELLED', 'CANCELED', 'ABORTED'].includes(val)) return 'CANCELLED';
  return 'PENDING';
}

function mapCardRowToFrontend(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    editionId: row.edition_id,
    planId: row.plan_id,
    cardNumber: row.card_number,
    sequenceNumber: Number(row.card_sequence || 1),
    cardholderName: row.cardholder_name,
    cardholderEmail: row.cardholder_email,
    cardholderPhone: row.cardholder_phone || '',
    tier: 'LUMARÉEL Black Card',
    status: row.card_status || 'active',
    issuedAt: row.issued_at || row.created_at,
    expiresAt: row.expires_at,
    physicalStatus: row.physical_card_status || 'in_production',
    walletBalance: 0,
    currency: 'FCFA',
  };
}

function buildPreviewCard(payload: any) {
  const now = new Date();
  const expires = new Date(now);
  expires.setFullYear(expires.getFullYear() + 3);

  const seq = Math.floor(15 + Math.random() * 80);
  const cardNumber = `LMR-BC-${String(seq).padStart(4, '0')}`;
  const cardholderName = String(payload?.customerName || payload?.fullName || 'MEMBRE LUMARÉEL')
    .trim()
    .toUpperCase();
  const cardholderEmail = String(payload?.customerEmail || payload?.email || '')
    .trim()
    .toLowerCase();
  const cardholderPhone = String(payload?.customerPhone || payload?.phone || '').trim();

  return {
    id: `card_${randomBytes(6).toString('hex')}`,
    userId: payload?.userId || `usr_${randomBytes(6).toString('hex')}`,
    editionId: 'ed_founders_2026',
    planId: payload?.planId || 'plan_founders_annual',
    cardNumber,
    sequenceNumber: seq,
    cardholderName,
    cardholderEmail,
    cardholderPhone,
    tier: 'LUMARÉEL Black Card',
    status: 'active',
    issuedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    physicalStatus: 'preparing',
    walletBalance: 0,
    currency: 'FCFA',
  };
}

/**
 * S'assure qu'un profil public.users existe dans Supabase pour l'e-mail membre
 * et retourne son UUID pour respecter la contrainte de clé étrangère membership_cards.user_id.
 */
async function ensureSupabaseUserId(
  db: SupabaseClient,
  email: string,
  name: string,
  providedUserId?: string
): Promise<string | null> {
  const cleanEmail = email.trim().toLowerCase();
  const { data: existing } = await db
    .from('users')
    .select('id')
    .ilike('email', cleanEmail)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const isUuid =
    typeof providedUserId === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(providedUserId);

  const newId = isUuid ? providedUserId : randomUUID();
  const { data: inserted } = await db
    .from('users')
    .upsert(
      {
        id: newId,
        email: cleanEmail,
        name: name || cleanEmail.split('@')[0],
        role: 'customer',
        email_verified: false,
      },
      { onConflict: 'email' }
    )
    .select('id')
    .maybeSingle();

  return inserted?.id || newId;
}

/**
 * Émet ou retrouve de manière idempotente une LUMARÉEL Black Card dans Supabase Postgres.
 */
async function issueOrGetSupabaseBlackCard(
  db: SupabaseClient,
  params: {
    email: string;
    name: string;
    phone?: string;
    userId?: string;
    orderReference: string;
    providerTxId?: string;
    amount?: number;
    channel?: string;
    shippingAddress?: any;
  }
) {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanName = (params.name || 'MEMBRE LUMARÉEL').trim().toUpperCase();

  // 1. Idempotence : si une carte active existe déjà pour cet e-mail, la retourner
  const { data: existingCard } = await db
    .from('membership_cards')
    .select('*')
    .ilike('cardholder_email', cleanEmail)
    .eq('card_status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingCard) {
    return mapCardRowToFrontend(existingCard);
  }

  // 2. Retrouver l'édition & formule actives (ou les créer si absentes)
  let { data: edition } = await db
    .from('membership_editions')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!edition) {
    const { data: createdEd } = await db
      .from('membership_editions')
      .insert({
        name: 'LUMARÉEL Black Card',
        edition_code: 'BLACK_2026',
        description: 'LUMARÉEL Black Card valable 3 ans avec vos 8 avantages inclus.',
        quota: 100,
        allocated_count: 0,
        starts_at: new Date().toISOString(),
        status: 'active',
      })
      .select('*')
      .single();
    edition = createdEd;
  }

  if (!edition) return null;

  let { data: plan } = await db
    .from('membership_plans')
    .select('*')
    .eq('edition_id', edition.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!plan) {
    const { data: createdPlan } = await db
      .from('membership_plans')
      .insert({
        edition_id: edition.id,
        name: 'LUMARÉEL Black Card 3 Ans',
        description: 'Accès complet 3 ans : carte noire officielle LUMARÉEL et vos 8 avantages inclus.',
        price: 50000,
        currency: 'XOF',
        duration_months: 36,
        physical_card_included: true,
        renewal_enabled: true,
        status: 'active',
      })
      .select('*')
      .single();
    plan = createdPlan;
  }

  if (!plan) return null;

  const userId = await ensureSupabaseUserId(db, cleanEmail, cleanName, params.userId);
  if (!userId) return null;

  // 3. Upsert de la commande d'adhésion complétée
  const { data: orderRow } = await db
    .from('membership_orders')
    .upsert(
      {
        user_id: userId,
        order_reference: params.orderReference,
        amount: Number(params.amount || plan.price || 50000),
        currency: 'XOF',
        payment_provider: params.channel || 'paymetrust',
        provider_transaction_id: params.providerTxId || params.orderReference,
        payment_status: 'completed',
        paid_at: new Date().toISOString(),
        metadata: {
          customerName: cleanName,
          customerEmail: cleanEmail,
          customerPhone: params.phone || '',
          shippingAddress: params.shippingAddress || null,
        },
      },
      { onConflict: 'order_reference' }
    )
    .select('id')
    .maybeSingle();

  // 4. Calculer le prochain numéro de séquence disponible pour l'édition
  const { data: latestCard } = await db
    .from('membership_cards')
    .select('card_sequence')
    .eq('edition_id', edition.id)
    .order('card_sequence', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSeq = Number(latestCard?.card_sequence || 0) + 1;
  const cardNumber = `LMR-BC-${String(nextSeq).padStart(4, '0')}`;
  const now = new Date();
  const expires = new Date(now);
  expires.setMonth(expires.getMonth() + Number(plan.duration_months || 36));

  const { data: createdCard, error: insertErr } = await db
    .from('membership_cards')
    .insert({
      user_id: userId,
      plan_id: plan.id,
      edition_id: edition.id,
      membership_order_id: orderRow?.id || null,
      card_number: cardNumber,
      card_sequence: nextSeq,
      cardholder_name: cleanName,
      cardholder_email: cleanEmail,
      card_status: 'active',
      issued_at: now.toISOString(),
      valid_from: now.toISOString(),
      expires_at: expires.toISOString(),
      physical_card_status: 'in_production',
    })
    .select('*')
    .single();

  if (insertErr || !createdCard) {
    console.error('[membership] Failed to persist card in Supabase:', insertErr?.message);
    return null;
  }

  // Mettre à jour le compteur allocated_count de l'édition
  await db
    .from('membership_editions')
    .update({
      allocated_count: Math.min(Number(edition.quota || 100), nextSeq),
      updated_at: now.toISOString(),
    })
    .eq('id', edition.id);

  return mapCardRowToFrontend(createdCard);
}

async function isAdminAuthorized(req: VercelRequest): Promise<boolean> {
  const adminKey = (process.env.ADMIN_API_KEY || '').trim();
  const providedKey = String(req.headers['x-admin-api-key'] || '').trim();
  if (adminKey && providedKey && safeEqual(adminKey, providedKey)) {
    return true;
  }
  const roleCheck = await requireRole(req, ['super_admin']);
  return roleCheck.ok;
}

async function activateTvPassSubscription(
  db: SupabaseClient,
  reference: string,
  providerTransactionId: string
) {
  const { data: pending, error } = await db
    .from('tv_subscriptions')
    .select('*')
    .eq('payment_reference', reference)
    .maybeSingle();
  if (error) throw error;
  if (!pending) return null;
  if (pending.status === 'active' && pending.expires_at) return pending;

  const now = new Date();
  let startAt = now;
  if (pending.user_id) {
    const { data: current } = await db
      .from('tv_subscriptions')
      .select('expires_at')
      .eq('user_id', pending.user_id)
      .eq('status', 'active')
      .gt('expires_at', now.toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (current?.expires_at) startAt = new Date(Math.max(now.getTime(), Date.parse(current.expires_at)));
  }
  const expiresAt = new Date(startAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  const { data: activated, error: updateError } = await db
    .from('tv_subscriptions')
    .update({
      status: 'active',
      provider_transaction_id: providerTransactionId || reference,
      auto_renew: false,
      starts_at: startAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('payment_reference', reference)
    .select('*')
    .single();
  if (updateError) throw updateError;
  return activated;
}

const mapTvPlan = (p: any) => ({
  id: p.id, name: p.name, nameEn: p.name_en || undefined,
  description: p.description || '', descriptionEn: p.description_en || undefined,
  price: Number(p.price || 0), currency: p.currency || 'FCFA',
  durationDays: 30, billingCycleLabel: 'Par mois', billingCycleLabelEn: 'Per month',
  autoRenew: false, renewalPolicy: p.renewal_policy || 'Renouvellement manuel à chaque échéance.',
  conditions: p.conditions || '', status: p.status,
});
const mapTvEligibility = (row: any) => ({
  enabledPlanIds: Array.isArray(row?.enabled_plan_ids) ? row.enabled_plan_ids : [],
  blackCardIncludesVipTier: row?.black_card_includes_vip_tier !== false,
  cardAccessEnabled: row?.card_access_enabled !== false,
  updatedAt: row?.updated_at,
});
const mapTvSubscription = (s: any) => ({
  id: s.id, userId: s.user_id, userEmail: s.user_email, userName: s.user_name,
  planId: s.plan_id, planName: s.plan_name, status: s.status, source: s.source,
  paymentReference: s.payment_reference, providerTransactionId: s.provider_transaction_id,
  amountPaid: Number(s.amount_paid || 0), currency: s.currency || 'FCFA',
  autoRenew: false, startsAt: s.starts_at, expiresAt: s.expires_at,
  revocationReason: s.revocation_reason, createdAt: s.created_at,
});
async function listTvSubscriptions(db: SupabaseClient) {
  const { data, error } = await db.from('tv_subscriptions').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) throw error;
  const rows = data || [];
  const expiredIds = rows
    .filter((row: any) => row.status === 'active' && row.expires_at && Date.parse(row.expires_at) <= Date.now())
    .map((row: any) => row.id);
  if (expiredIds.length) {
    const { error: expiryError } = await db.from('tv_subscriptions')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .in('id', expiredIds);
    if (expiryError) throw expiryError;
  }
  return rows.map((row: any) => mapTvSubscription(expiredIds.includes(row.id) ? { ...row, status: 'expired' } : row));
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ success: true, message: 'Full payments module loaded.' });
}
