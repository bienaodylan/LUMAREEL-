import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
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

const JEKOPAY_METHOD_MAP: Record<string, string> = {
  wave: 'wave',
  orange_money: 'orange',
  mtn_momo: 'mtn',
  moov_money: 'moov',
  djamo: 'djamo',
  card: 'card',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAYMENT_REF_REGEX = /^(JEKO|PMT)-[A-Z0-9_-]{4,64}$/i;
let cachedJekoStoreId: string | null = null;

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
  if (Buffer.isBuffer(req.body)) {
    const raw = req.body.toString('utf8');
    try {
      return { raw, parsed: raw ? JSON.parse(raw) : {} };
    } catch {
      return { raw, parsed: {} };
    }
  }
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
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifyJekoPaySignature(rawBody: string, signatureHeader: string, _envName: string): boolean {
  const webhookSecret = (process.env.JEKOPAY_WEBHOOK_SECRET || '').trim();
  if (!webhookSecret) {
    // Refuser systématiquement tout webhook si le secret n'est pas configuré
    return false;
  }
  if (!signatureHeader || !rawBody) return false;
  const cleaned = signatureHeader.replace(/^sha256=/i, '').trim().toLowerCase();
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody, 'utf8')
    .digest('hex')
    .toLowerCase();
  return safeEqual(cleaned, expected);
}

function normalizeJekoPayStatus(raw: unknown): 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'PENDING' {
  const val = String(raw ?? '').trim().toUpperCase();
  if (['SUCCESS', 'SUCCEEDED', 'COMPLETED', 'PAID', 'OK', '200', '00', 'TRANSACTION_COMPLETED'].includes(val)) {
    return 'SUCCESS';
  }
  if (['FAILED', 'ERROR', 'DECLINED', 'REJECTED', 'EXPIRED'].includes(val)) return 'FAILED';
  if (['CANCELLED', 'CANCELED', 'ABORTED'].includes(val)) return 'CANCELLED';
  return 'PENDING';
}

async function resolveJekoStoreId(
  apiBase: string,
  apiKeyId: string,
  apiKeySecret: string
): Promise<string> {
  const explicitStore = (process.env.JEKOPAY_STORE_ID || '').trim();
  if (explicitStore) return explicitStore;
  if (cachedJekoStoreId) return cachedJekoStoreId;

  const res = await fetch(`${apiBase}/partner_api/stores`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-API-KEY-ID': apiKeyId,
      'X-API-KEY': apiKeySecret,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Impossible de récupérer le storeId JekoPay (${res.status}).`);
  }
  const stores = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.stores)
        ? data.stores
        : [];
  const firstId = stores[0]?.id || stores[0]?.storeId || data?.id || data?.storeId;
  if (!firstId || typeof firstId !== 'string') {
    throw new Error('Aucun storeId JekoPay trouvé. Définissez JEKOPAY_STORE_ID côté serveur.');
  }
  cachedJekoStoreId = firstId;
  return firstId;
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
    id: `card_${crypto.randomBytes(6).toString('hex')}`,
    userId: payload?.userId || `usr_${crypto.randomBytes(6).toString('hex')}`,
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

  const newId = isUuid ? providedUserId : crypto.randomUUID();
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
        payment_provider: params.channel || 'jekopay',
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res, 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const route = String(Array.isArray(req.query.route) ? req.query.route[0] : req.query.route || '').trim();
  const envName = (process.env.JEKOPAY_ENV || 'production').toLowerCase() === 'sandbox' ? 'sandbox' : 'production';
  const apiKeyId = (process.env.JEKOPAY_API_KEY_ID || '').trim();
  const apiKeySecret = (process.env.JEKOPAY_API_KEY_SECRET || '').trim();
  const apiBase = (process.env.JEKOPAY_BASE_URL || 'https://api.jeko.africa').trim().replace(/\/+$/, '');
  const isLiveConfigured = Boolean(apiKeyId && apiKeySecret);
  const db = serviceDb();

  // ==========================================================================
  // 1. Public Membership Editions & Plans (Supabase + fallback)
  // ==========================================================================
  if (route === 'editions') {
    if (db) {
      try {
        const [{ data: editions }, { data: plans }] = await Promise.all([
          db.from('membership_editions').select('*').eq('status', 'active').order('created_at', { ascending: true }),
          db.from('membership_plans').select('*').eq('status', 'active').order('created_at', { ascending: true }),
        ]);

        if (editions && editions.length > 0 && plans && plans.length > 0) {
          const mappedEditions = editions.map((e: any) => ({
            id: e.id,
            name: e.name,
            editionCode: e.edition_code,
            description: e.description || '',
            quota: Number(e.quota || 100),
            allocatedCount: Number(e.allocated_count || 0),
            isActive: e.status === 'active',
          }));
          const mappedPlans = plans.map((p: any) => ({
            id: p.id,
            editionId: p.edition_id,
            name: p.name,
            description: p.description || '',
            price: Number(p.price || 50000),
            currency: p.currency === 'XOF' ? 'FCFA' : p.currency || 'FCFA',
            durationMonths: Number(p.duration_months || 36),
            isActive: p.status === 'active',
          }));
          return res.status(200).json({
            success: true,
            activeEdition: mappedEditions[0],
            editions: mappedEditions,
            plans: mappedPlans,
          });
        }
      } catch (err) {
        console.warn('[editions] Supabase fallback:', err);
      }
    }

    const activeEdition = {
      id: 'ed_founders_2026',
      name: 'LUMARÉEL Black Card',
      editionCode: 'BLACK_2026',
      description:
        'LUMARÉEL Black Card valable 3 ans avec accès prioritaire, parking réservé, premiers rangs VIP, boisson offerte, préventes, Meet & Greet et réductions partenaires.',
      quota: 100,
      allocatedCount: 14,
      isActive: true,
    };

    const plans = [
      {
        id: 'plan_founders_annual',
        editionId: 'ed_founders_2026',
        name: 'LUMARÉEL Black Card 3 Ans',
        description: 'Accès complet 3 ans : carte noire officielle LUMARÉEL et vos 8 avantages inclus.',
        price: 50000,
        currency: 'FCFA',
        durationMonths: 36,
        isActive: true,
      },
    ];

    return res.status(200).json({ success: true, activeEdition, editions: [activeEdition], plans });
  }

  // ==========================================================================
  // 2. Public JekoPay Config (zero secrets)
  // ==========================================================================
  if (route === 'config') {
    return res.status(200).json({
      success: true,
      provider: 'jekopay',
      configured: isLiveConfigured,
      environment: envName,
      currency: 'XOF',
      channels: [
        { id: 'wave', label: 'Wave', type: 'mobile_money' },
        { id: 'orange_money', label: 'Orange Money', type: 'mobile_money' },
        { id: 'mtn_momo', label: 'MTN MoMo', type: 'mobile_money' },
        { id: 'moov_money', label: 'Moov Money', type: 'mobile_money' },
        { id: 'djamo', label: 'Djamo', type: 'mobile_money' },
        { id: 'card', label: 'Visa / Mastercard', type: 'card' },
      ],
    });
  }

  // ==========================================================================
  // 3. Admin-Only Production Readiness Check (booleans only, never exposes keys)
  // ==========================================================================
  if (route === 'readiness') {
    const allowed = await isAdminAuthorized(req);
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Accès administrateur requis.' });
    }
    return res.status(200).json({
      success: true,
      readiness: {
        supabasePublicConfigured: isSupabasePublicConfigured(),
        supabaseServiceKeyConfigured: isSupabaseServiceConfigured(),
        jekopayConfigured: isLiveConfigured,
        jekopayApiKeyIdConfigured: Boolean(apiKeyId),
        jekopayWebhookSecretConfigured: Boolean((process.env.JEKOPAY_WEBHOOK_SECRET || '').trim()),
        jekopayStoreIdConfigured: Boolean((process.env.JEKOPAY_STORE_ID || '').trim() || cachedJekoStoreId),
        jekopayEnvironment: envName,
        resendConfigured: isResendConfigured(),
        resendFrom: getResendFromAddress(),
        adminApiKeyConfigured: Boolean((process.env.ADMIN_API_KEY || '').trim()),
        publicUrl: resolvePublicBaseUrl(req),
      },
    });
  }

  // ==========================================================================
  // 4. Admin-Only Resend Test Email (validates RESEND_API_KEY once pasted in Vercel)
  // ==========================================================================
  if (route === 'email-test') {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });
    }
    const allowed = await isAdminAuthorized(req);
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Accès administrateur requis.' });
    }
    const { parsed } = parseJsonBody(req);
    const to = String(parsed?.to || '').trim().toLowerCase();
    if (!EMAIL_REGEX.test(to)) {
      return res.status(400).json({ success: false, error: 'Adresse e-mail destinataire invalide.' });
    }
    const emailResult = await sendResendEmail({
      to,
      subject: 'Test Resend réussi — LUMARÉEL CO.',
      html: '<div style="background:#050505;color:#fff;padding:24px;font-family:sans-serif;"><h2 style="color:#d4af37;">LUMARÉEL CO.</h2><p>Votre intégration Resend est active et prête à envoyer les billets et confirmations LUMARÉEL Black Card.</p></div>',
      text: 'LUMARÉEL CO. — Votre intégration Resend est active et prête pour la production.',
      type: 'system_test',
      db,
    });
    return res.status(emailResult.sent ? 200 : 400).json({
      success: emailResult.sent,
      ...emailResult,
    });
  }

  // ==========================================================================
  // 5. Get User's Active LUMARÉEL Black Card (Supabase persistent, JWT-verified)
  // ==========================================================================
  if (route === 'my-card') {
    const auth = await getAuthenticatedUser(req);
    if (!auth?.user?.email) {
      return res.status(200).json({ success: true, hasCard: false, card: null });
    }
    const lookupEmail = auth.user.email.trim().toLowerCase();

    if (db) {
      try {
        const { data: cardRow } = await db
          .from('membership_cards')
          .select('*')
          .ilike('cardholder_email', lookupEmail)
          .in('card_status', ['active', 'pending'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cardRow) {
          const { data: ticketsRows } = await db
            .from('tickets')
            .select('*')
            .ilike('holder_email', lookupEmail)
            .order('issued_at', { ascending: false });

          const concertTickets = (ticketsRows || []).map((t: any) => ({
            id: t.id,
            orderId: t.order_id,
            orderRef: t.order_ref,
            eventId: t.event_id,
            eventTitle: t.event_title,
            eventDate: t.event_date,
            eventTime: t.event_time,
            eventVenue: t.event_venue,
            categoryId: t.category_id,
            categoryName: t.category_name,
            serialNumber: t.serial_number,
            token: t.token,
            holderName: t.holder_name,
            holderEmail: t.holder_email,
            status: t.status,
            issuedAt: t.issued_at,
            checkedInAt: t.checked_in_at,
            checkedInBy: t.checked_in_by,
          }));

          return res.status(200).json({
            success: true,
            hasCard: true,
            card: mapCardRowToFrontend(cardRow),
            concertTickets,
          });
        }
      } catch (err) {
        console.warn('[my-card] Supabase error:', err);
      }
    }

    return res.status(200).json({ success: true, hasCard: false, card: null });
  }

  // ==========================================================================
  // 6. Member Wallet Overview (Supabase persistent)
  // ==========================================================================
  if (route === 'wallet-overview') {
    const auth = await getAuthenticatedUser(req);
    if (!auth?.user?.email) {
      return res.status(401).json({ success: false, error: 'Authentification requise.' });
    }
    const email = auth.user.email.toLowerCase();

    if (!db) {
      return res.status(200).json({ success: false, overview: null });
    }

    try {
      const [{ data: cardRow }, { data: ticketsRows }, { data: ordersRows }] = await Promise.all([
        db
          .from('membership_cards')
          .select('*')
          .ilike('cardholder_email', email)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        db
          .from('tickets')
          .select('*')
          .ilike('holder_email', email)
          .order('issued_at', { ascending: false }),
        db
          .from('orders')
          .select('*')
          .ilike('customer_email', email)
          .order('created_at', { ascending: false }),
      ]);

      const card = cardRow ? mapCardRowToFrontend(cardRow) : null;
      const tickets = (ticketsRows || []).map((t: any) => ({
        id: t.id,
        orderId: t.order_id,
        orderRef: t.order_ref,
        eventId: t.event_id,
        eventTitle: t.event_title,
        eventDate: t.event_date,
        eventTime: t.event_time,
        eventVenue: t.event_venue,
        categoryId: t.category_id,
        categoryName: t.category_name,
        serialNumber: t.serial_number,
        token: t.token,
        holderName: t.holder_name,
        holderEmail: t.holder_email,
        status: t.status,
        issuedAt: t.issued_at,
      }));

      const activities = card
        ? [
            {
              id: `act_card_${card.id}`,
              title: 'LUMARÉEL Black Card activée',
              description: `Référence membre ${card.cardNumber} active pour 3 ans.`,
              timestamp: card.issuedAt,
            },
          ]
        : [];

      return res.status(200).json({
        success: true,
        overview: {
          user: {
            id: auth.user.id,
            name: card?.cardholderName || auth.user.user_metadata?.name || email.split('@')[0],
            email,
          },
          card,
          tickets,
          benefits: [],
          invitations: [],
          orders: ordersRows || [],
          payments: [],
          activities,
          metrics: {
            activeTicketsCount: tickets.filter((t: any) => t.status === 'valid').length,
            availableBenefitsCount: 0,
            activeInvitationsCount: 0,
          },
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Erreur wallet.' });
    }
  }

  // ==========================================================================
  // 7. Initiate JekoPay Payment (Live or Awaiting Keys)
  // ==========================================================================
  if (route === 'initiate') {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });
    }
    try {
      const { parsed: body } = parseJsonBody(req);
      const {
        kind = 'membership_card',
        orderId,
        planId = 'plan_founders_annual',
        channel = 'wave',
        customerName,
        customerEmail,
        customerPhone = '',
        shippingAddress,
        userId,
      } = body;

      if (kind === 'membership_card') {
        const auth = await getAuthenticatedUser(req);
        if (!auth?.user?.email || !auth.user.email_confirmed_at) {
          return res.status(401).json({ success: false, error: 'Compte authentifié avec e-mail vérifié requis pour commander une carte.' });
        }
        if (userId && userId !== auth.user.id) {
          return res.status(403).json({ success: false, error: 'Le compte de commande ne correspond pas à la session authentifiée.' });
        }
      }

      const cleanName = String(customerName || '').trim();
      const cleanEmail = String(customerEmail || '').trim().toLowerCase();
      const cleanPhone = String(customerPhone || '').trim();
      const safeChannel = VALID_CHANNELS.has(String(channel)) ? String(channel) : 'wave';

      if (kind === 'membership_card' && (!cleanName || !EMAIL_REGEX.test(cleanEmail))) {
        return res.status(400).json({ success: false, error: 'Nom complet et e-mail valide requis.' });
      }

      const amount = kind === 'membership_card' ? 50000 : Number(body.amount || 0);
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Montant de paiement invalide.' });
      }

      const reference =
        kind === 'membership_card'
          ? `JEKO-CARD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
          : `JEKO-${String(orderId || crypto.randomBytes(4).toString('hex')).toUpperCase()}`;

      let jekoPaymentRequestId = reference;
      let paymentUrl: string | undefined;

      if (isLiveConfigured) {
        const baseUrl = resolvePublicBaseUrl(req);
        const storeId = await resolveJekoStoreId(apiBase, apiKeyId, apiKeySecret);
        const jekoMethod = JEKOPAY_METHOD_MAP[safeChannel] || 'wave';

        // JekoPay expects amountCents in centimes (for XOF: 1 FCFA = 100 centimes)
        const amountCents = Math.round(amount) * 100;

        const initRes = await fetch(`${apiBase}/partner_api/payment_requests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-API-KEY-ID': apiKeyId,
            'X-API-KEY': apiKeySecret,
          },
          body: JSON.stringify({
            storeId,
            amountCents,
            currency: 'XOF',
            reference,
            paymentDetails: {
              type: 'redirect',
              data: {
                paymentMethod: jekoMethod,
                successUrl: `${baseUrl}/?payment_status=success&ref=${encodeURIComponent(reference)}`,
                errorUrl: `${baseUrl}/?payment_status=cancelled&ref=${encodeURIComponent(reference)}`,
              },
            },
          }),
        });
        const initText = await initRes.text();
        const initData = initText ? JSON.parse(initText) : {};
        const rawRedirect =
          initData?.redirectUrl ||
          initData?.redirect_url ||
          initData?.paymentUrl ||
          initData?.data?.redirectUrl;

        if (!initRes.ok || typeof rawRedirect !== 'string' || !/^https:\/\//i.test(rawRedirect)) {
          return res.status(502).json({
            success: false,
            error: initData?.message || initData?.error || 'Impossible d’initialiser le paiement JekoPay.',
          });
        }

        paymentUrl = rawRedirect;
        if (initData?.id) {
          jekoPaymentRequestId = String(initData.id);
        }
      }

      // Persister la commande en attente dans Supabase avant redirection JekoPay
      if (db && kind === 'membership_card') {
        try {
          const resolvedUid = await ensureSupabaseUserId(db, cleanEmail, cleanName, userId);
          if (resolvedUid) {
            await db.from('membership_orders').upsert(
              {
                user_id: resolvedUid,
                order_reference: reference,
                amount: Math.round(amount),
                currency: 'XOF',
                payment_provider: safeChannel,
                provider_transaction_id: jekoPaymentRequestId,
                payment_status: 'pending',
                metadata: {
                  planId,
                  customerName: cleanName,
                  customerEmail: cleanEmail,
                  customerPhone: cleanPhone,
                  shippingAddress: shippingAddress || null,
                  jekoPaymentRequestId,
                },
              },
              { onConflict: 'order_reference' }
            );
          }
        } catch (err) {
          console.warn('[initiate] Supabase pending order notice:', err);
        }
      }

      if (isLiveConfigured && paymentUrl) {
        return res.status(200).json({
          success: true,
          transaction: {
            id: `jeko_${crypto.randomBytes(6).toString('hex')}`,
            reference,
            providerTransactionId: jekoPaymentRequestId,
            status: 'PENDING',
            amount: Math.round(amount),
            currency: 'XOF',
            channel: safeChannel,
            paymentUrl,
            mode: 'live',
            environment: envName,
          },
        });
      }

      return res.status(200).json({
        success: true,
        transaction: {
          id: `jeko_${crypto.randomBytes(6).toString('hex')}`,
          reference,
          status: 'INITIATED',
          amount: Math.round(amount),
          currency: 'XOF',
          channel: safeChannel,
          mode: 'awaiting_keys',
          environment: envName,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error?.message || 'Impossible d’initialiser le paiement JekoPay.',
      });
    }
  }

  // ==========================================================================
  // 8. Live JekoPay Webhook (/api/payments/jekopay/webhook — Jeko-Signature HMAC-SHA256)
  // ==========================================================================
  if (route === 'webhook') {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });
    }
    const { raw, parsed: payload } = parseJsonBody(req);
    const sigHeader = String(
      req.headers['jeko-signature'] ||
        req.headers['x-jeko-signature'] ||
        req.headers['x-webhook-signature'] ||
        ''
    );

    if (!verifyJekoPaySignature(raw, sigHeader, envName)) {
      return res.status(401).json({ success: false, error: 'Signature webhook JekoPay invalide.' });
    }

    const reference = String(
      payload?.reference || payload?.merchantReference || payload?.data?.reference || ''
    ).trim();
    if (!PAYMENT_REF_REGEX.test(reference)) {
      return res.status(400).json({ success: false, error: 'Référence de transaction invalide.' });
    }

    const status = normalizeJekoPayStatus(
      payload?.status ?? payload?.transaction?.status ?? payload?.data?.status ?? req.headers['jeko-event']
    );
    const providerTxId = String(payload?.transaction?.id || payload?.id || reference);

    if (!db) {
      return res.status(200).json({
        success: true,
        received: true,
        reference,
        status,
        note: 'SUPABASE_SERVICE_ROLE_KEY non configurée.',
      });
    }

    try {
      // A. Webhook pour LUMARÉEL Black Card
      const isCardRef =
        reference.toUpperCase().startsWith('JEKO-CARD-') ||
        reference.toUpperCase().startsWith('PMT-CARD-');

      if (isCardRef) {
        const { data: orderRow } = await db
          .from('membership_orders')
          .select('*')
          .eq('order_reference', reference)
          .maybeSingle();

        if (status === 'SUCCESS') {
          const meta = (orderRow?.metadata || {}) as Record<string, any>;
          const email = String(meta.customerEmail || payload?.customer?.email || '').trim().toLowerCase();
          const name = String(meta.customerName || payload?.customer?.name || 'MEMBRE LUMARÉEL').trim();

          if (email) {
            const card = await issueOrGetSupabaseBlackCard(db, {
              email,
              name,
              phone: meta.customerPhone || payload?.customer?.phone,
              userId: orderRow?.user_id,
              orderReference: reference,
              providerTxId,
              amount: Number(orderRow?.amount || 50000),
              channel: orderRow?.payment_provider || 'jekopay',
              shippingAddress: meta.shippingAddress,
            });

            if (card) {
              await sendBlackCardActivationEmail({
                to: card.cardholderEmail,
                cardholderName: card.cardholderName,
                cardNumber: card.cardNumber,
                expiresAt: card.expiresAt,
                orderReference: reference,
                db,
              });
            }
          }
        } else if (orderRow && (status === 'FAILED' || status === 'CANCELLED')) {
          await db
            .from('membership_orders')
            .update({ payment_status: 'failed' })
            .eq('order_reference', reference);
        }

        return res.status(200).json({ success: true, reference, status });
      }

      // B. Webhook pour commande de billets de concert
      const strippedRef = reference.replace(/^(JEKO|PMT)-/i, '');
      const { data: orderRow } = await db
        .from('orders')
        .select('*')
        .or(`payment_ref.eq.${reference},reference.eq.${reference},reference.eq.${strippedRef}`)
        .maybeSingle();

      if (orderRow) {
        if (status === 'SUCCESS') {
          await db
            .from('orders')
            .update({
              payment_status: 'completed',
              payment_ref: providerTxId,
              paid_at: new Date().toISOString(),
            })
            .eq('id', orderRow.id);

          const { data: tickets } = await db
            .from('tickets')
            .select('serial_number, holder_name')
            .eq('order_id', orderRow.id);

          await sendTicketConfirmationEmail({
            to: orderRow.customer_email,
            customerName: orderRow.customer_name,
            orderReference: orderRow.reference,
            eventTitle: orderRow.event_title,
            eventDate: orderRow.event_date,
            eventVenue: orderRow.event_venue,
            categoryName: orderRow.category_name,
            totalAmount: Number(orderRow.total_amount),
            currency: orderRow.currency || 'FCFA',
            tickets: (tickets || []).map((t: any) => ({
              serialNumber: t.serial_number,
              holderName: t.holder_name,
            })),
            db,
          });
        } else if (status === 'FAILED' || status === 'CANCELLED') {
          await db.from('orders').update({ payment_status: 'failed' }).eq('id', orderRow.id);
        }
      }

      return res.status(200).json({ success: true, reference, status });
    } catch (err: any) {
      console.error('[webhook] Processing error:', err);
      return res.status(500).json({ success: false, error: 'Erreur traitement webhook JekoPay.' });
    }
  }

  // ==========================================================================
  // 9. Verify Transaction Status on Return from JekoPay
  // ==========================================================================
  if (route === 'verify') {
    const refParam = String(
      Array.isArray(req.query.reference) ? req.query.reference[0] : req.query.reference || ''
    ).trim();

    if (!PAYMENT_REF_REGEX.test(refParam)) {
      return res.status(400).json({ success: false, error: 'Référence invalide.' });
    }

    const isCard =
      refParam.toUpperCase().startsWith('JEKO-CARD-') ||
      refParam.toUpperCase().startsWith('PMT-CARD-');
    let jekoLookupId = refParam;

    if (db) {
      if (isCard) {
        const { data: orderRow } = await db
          .from('membership_orders')
          .select('*')
          .eq('order_reference', refParam)
          .maybeSingle();

        if (orderRow?.provider_transaction_id) {
          jekoLookupId = String(orderRow.provider_transaction_id);
        }

        if (orderRow?.payment_status === 'completed') {
          const { data: cardRow } = await db
            .from('membership_cards')
            .select('*')
            .eq('membership_order_id', orderRow.id)
            .maybeSingle();

          return res.status(200).json({
            success: true,
            transaction: {
              reference: refParam,
              status: 'SUCCESS',
              paidAt: orderRow.paid_at,
            },
            fulfillment: cardRow
              ? { kind: 'membership_card', card: mapCardRowToFrontend(cardRow) }
              : null,
          });
        }
      } else {
        const strippedRef = refParam.replace(/^(JEKO|PMT)-/i, '');
        const { data: orderRow } = await db
          .from('orders')
          .select('*')
          .or(`payment_ref.eq.${refParam},reference.eq.${refParam},reference.eq.${strippedRef}`)
          .maybeSingle();

        if (orderRow?.payment_ref && !orderRow.payment_ref.startsWith('JEKO-')) {
          jekoLookupId = String(orderRow.payment_ref);
        }

        if (orderRow?.payment_status === 'completed') {
          return res.status(200).json({
            success: true,
            transaction: {
              reference: refParam,
              status: 'SUCCESS',
              paidAt: orderRow.paid_at,
            },
            fulfillment: { kind: 'ticket_order', orderId: orderRow.id },
          });
        }
      }
    }

    // Si mode live et encore en attente, interroger JekoPay directement (GET /partner_api/payment_requests/{id})
    if (isLiveConfigured) {
      try {
        const statusRes = await fetch(
          `${apiBase}/partner_api/payment_requests/${encodeURIComponent(jekoLookupId)}`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'X-API-KEY-ID': apiKeyId,
              'X-API-KEY': apiKeySecret,
            },
          }
        );
        const statusData = await statusRes.json().catch(() => ({}));
        const normalized = normalizeJekoPayStatus(
          statusData?.status ?? statusData?.transaction?.status ?? statusData?.data?.status
        );

        if (normalized === 'SUCCESS' && db && isCard) {
          const { data: orderRow } = await db
            .from('membership_orders')
            .select('*')
            .eq('order_reference', refParam)
            .maybeSingle();
          const meta = (orderRow?.metadata || {}) as Record<string, any>;
          const card = meta.customerEmail
            ? await issueOrGetSupabaseBlackCard(db, {
                email: meta.customerEmail,
                name: meta.customerName || 'MEMBRE LUMARÉEL',
                phone: meta.customerPhone,
                userId: orderRow?.user_id,
                orderReference: refParam,
                providerTxId: statusData?.transaction?.id || statusData?.id || refParam,
                amount: Number(orderRow?.amount || 50000),
                channel: orderRow?.payment_provider || 'jekopay',
                shippingAddress: meta.shippingAddress,
              })
            : null;

          return res.status(200).json({
            success: true,
            transaction: { reference: refParam, status: 'SUCCESS', paidAt: new Date().toISOString() },
            fulfillment: card ? { kind: 'membership_card', card } : null,
          });
        }

        return res.status(200).json({
          success: true,
          transaction: { reference: refParam, status: normalized },
        });
      } catch (err) {
        console.warn('[verify] JekoPay lookup failed:', err);
      }
    }

    return res.status(200).json({
      success: true,
      transaction: { reference: refParam, status: 'PENDING' },
    });
  }

  // ==========================================================================
  // 10. Preview Confirmation (disabled automatically in production/live mode)
  // ==========================================================================
  if (route === 'confirm-preview' || route === 'order') {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });
    }
    if (isLiveConfigured || process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Mode live actif : la validation passe uniquement par JekoPay.',
      });
    }
    try {
      const { parsed: body } = parseJsonBody(req);
      const payload = route === 'confirm-preview' ? body.previewPayload || body : body;
      const reference = String(body.reference || `JEKO-CARD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`);

      const cleanEmail = String(payload?.customerEmail || payload?.email || '').trim().toLowerCase();
      const cleanName = String(payload?.customerName || payload?.fullName || 'MEMBRE LUMARÉEL').trim();

      // Persister dans Supabase si SUPABASE_SERVICE_ROLE_KEY est déjà connecté
      let card: any = null;
      if (db && EMAIL_REGEX.test(cleanEmail)) {
        card = await issueOrGetSupabaseBlackCard(db, {
          email: cleanEmail,
          name: cleanName,
          phone: payload?.customerPhone || payload?.phone,
          userId: payload?.userId,
          orderReference: reference,
          amount: 50000,
          channel: payload?.channel || payload?.paymentMethod || 'wave',
          shippingAddress: payload?.shippingAddress,
        });
      }
      if (!card) {
        card = buildPreviewCard(payload);
      }

      // Envoyer l'e-mail de confirmation si RESEND_API_KEY est configurée
      if (EMAIL_REGEX.test(card.cardholderEmail)) {
        await sendBlackCardActivationEmail({
          to: card.cardholderEmail,
          cardholderName: card.cardholderName,
          cardNumber: card.cardNumber,
          expiresAt: card.expiresAt,
          orderReference: reference,
          db,
        });
      }

      if (route === 'order') {
        return res.status(200).json({ success: true, card });
      }

      return res.status(200).json({
        success: true,
        transaction: {
          reference,
          status: 'SUCCESS',
          paidAt: new Date().toISOString(),
        },
        fulfillment: {
          kind: 'membership_card',
          card,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error?.message || 'Impossible de confirmer la commande.',
      });
    }
  }

  // ==========================================================================
  // 11. Concert Orders Persistence + Resend Ticket Email (Vercel Serverless)
  // ==========================================================================
  if (route === 'orders') {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });
    }
    try {
      const { parsed: order } = parseJsonBody(req);
      if (!order?.id || !order?.reference || !EMAIL_REGEX.test(String(order.customerEmail || ''))) {
        return res.status(400).json({ success: false, error: 'Données de commande invalides.' });
      }

      const auth = await getAuthenticatedUser(req);
      if (db && isSupabasePublicConfigured() && !auth?.user?.email) {
        return res.status(401).json({ success: false, error: 'Session utilisateur requise.' });
      }

      const verifiedEmail = (auth?.user?.email || String(order.customerEmail)).trim().toLowerCase();
      // En mode live / production, seul le webhook JekoPay signé peut passer une commande à 'completed'
      const safePaymentStatus =
        isLiveConfigured || process.env.NODE_ENV === 'production'
          ? 'pending'
          : order.paymentStatus === 'completed'
          ? 'completed'
          : 'pending';

      if (db) {
        await db.from('orders').upsert(
          {
            id: order.id,
            reference: order.reference,
            customer_id: auth?.user?.id || order.customerId || 'guest',
            customer_name: order.customerName || 'Client',
            customer_email: verifiedEmail,
            customer_phone: order.customerPhone || null,
            event_id: order.eventId,
            event_title: order.eventTitle || 'Concert LUMARÉEL',
            event_date: order.eventDate || '',
            event_venue: order.eventVenue || '',
            category_id: order.categoryId || 'standard',
            category_name: order.categoryName || 'Standard',
            quantity: Math.max(1, Number(order.quantity || 1)),
            unit_price: Number(order.unitPrice || 0),
            total_amount: Number(order.totalAmount || 0),
            currency: order.currency || 'FCFA',
            payment_status: safePaymentStatus,
            payment_provider: order.paymentProvider || 'jekopay',
            payment_ref: order.paymentRef || order.reference,
            created_at: order.createdAt || new Date().toISOString(),
            paid_at: safePaymentStatus === 'completed' ? order.paidAt || new Date().toISOString() : null,
          },
          { onConflict: 'id' }
        );

        if (Array.isArray(order.tickets) && order.tickets.length > 0) {
          const ticketRows = order.tickets.map((t: any) => ({
            id: t.id,
            order_id: order.id,
            order_ref: order.reference,
            event_id: t.eventId || order.eventId,
            event_title: t.eventTitle || order.eventTitle,
            event_date: t.eventDate || order.eventDate,
            event_time: t.eventTime || '',
            event_venue: t.eventVenue || order.eventVenue,
            category_id: t.categoryId || order.categoryId,
            category_name: t.categoryName || order.categoryName,
            serial_number: t.serialNumber,
            token: t.token,
            holder_name: t.holderName || order.customerName,
            holder_email: verifiedEmail,
            status: t.status || 'valid',
            issued_at: t.issuedAt || new Date().toISOString(),
          }));
          await db.from('tickets').upsert(ticketRows, { onConflict: 'id' });
        }
      }

      let emailResult = { sent: false, provider: 'none' as const } as any;
      if (safePaymentStatus === 'completed') {
        emailResult = await sendTicketConfirmationEmail({
          to: verifiedEmail,
          customerName: order.customerName || 'Client',
          orderReference: order.reference,
          eventTitle: order.eventTitle || 'Concert LUMARÉEL',
          eventDate: order.eventDate || '',
          eventVenue: order.eventVenue || '',
          categoryName: order.categoryName || 'Standard',
          totalAmount: Number(order.totalAmount || 0),
          currency: order.currency || 'FCFA',
          tickets: Array.isArray(order.tickets)
            ? order.tickets.map((t: any) => ({
                serialNumber: t.serialNumber || t.id,
                holderName: t.holderName || order.customerName,
              }))
            : [],
          db,
        });
      }

      return res.status(200).json({ success: true, orderId: order.id, email: emailResult });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error?.message || 'Erreur commande.' });
    }
  }

  // ==========================================================================
  // 12. Customer Orders Lookup (strictly JWT-authenticated)
  // ==========================================================================
  if (route === 'customer-orders') {
    const auth = await getAuthenticatedUser(req);
    if (!auth?.user?.email) {
      return res.status(401).json({ success: false, error: 'Authentification requise.', orders: [] });
    }
    const targetEmail = auth.user.email.trim().toLowerCase();
    if (!db) {
      return res.status(200).json({ success: true, orders: [] });
    }
    try {
      const { data: ordersData } = await db
        .from('orders')
        .select('*')
        .ilike('customer_email', targetEmail)
        .order('created_at', { ascending: false });

      if (!ordersData || ordersData.length === 0) {
        return res.status(200).json({ success: true, orders: [] });
      }
      const orderIds = ordersData.map((o: any) => o.id);
      const { data: ticketsData } = await db.from('tickets').select('*').in('order_id', orderIds);

      const orders = ordersData.map((row: any) => ({
        id: row.id,
        reference: row.reference,
        customerId: row.customer_id,
        customerName: row.customer_name,
        customerEmail: row.customer_email,
        customerPhone: row.customer_phone,
        eventId: row.event_id,
        eventTitle: row.event_title,
        eventDate: row.event_date,
        eventVenue: row.event_venue,
        categoryId: row.category_id,
        categoryName: row.category_name,
        quantity: row.quantity,
        unitPrice: Number(row.unit_price),
        totalAmount: Number(row.total_amount),
        currency: row.currency || 'FCFA',
        paymentStatus: row.payment_status,
        paymentProvider: row.payment_provider,
        paymentRef: row.payment_ref,
        createdAt: row.created_at,
        paidAt: row.paid_at,
        tickets: (ticketsData || [])
          .filter((t: any) => t.order_id === row.id)
          .map((t: any) => ({
            id: t.id,
            orderId: t.order_id,
            orderRef: t.order_ref,
            eventId: t.event_id,
            eventTitle: t.event_title,
            eventDate: t.event_date,
            eventTime: t.event_time,
            eventVenue: t.event_venue,
            categoryId: t.category_id,
            categoryName: t.category_name,
            serialNumber: t.serial_number,
            token: t.token,
            holderName: t.holder_name,
            holderEmail: t.holder_email,
            status: t.status,
            issuedAt: t.issued_at,
          })),
      }));

      return res.status(200).json({ success: true, orders });
    } catch {
      return res.status(200).json({ success: true, orders: [] });
    }
  }

  // ==========================================================================
  // 13. Secure Ticket Transfer (Supabase atomic revocation + fresh QR token + Resend email)
  // ==========================================================================
  if (route === 'transfer-ticket') {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });
    }
    try {
      const { parsed: body } = parseJsonBody(req);
      const { ticketId, senderEmail, recipientName, recipientEmail } = body;

      if (!ticketId || !recipientName || !EMAIL_REGEX.test(String(recipientEmail || '').trim())) {
        return res.status(400).json({
          success: false,
          error: 'Billet, nom et adresse e-mail valide du destinataire requis.',
        });
      }

      const auth = await getAuthenticatedUser(req);
      if (!auth?.user?.email) {
        return res.status(401).json({ success: false, error: 'Session utilisateur authentifiée requise pour transférer un billet.' });
      }
      const resolvedSenderEmail = auth.user.email.trim().toLowerCase();

      if (!db) {
        return res.status(503).json({
          success: false,
          error: 'Base Supabase serveur requise (SUPABASE_SERVICE_ROLE_KEY) pour transférer un billet.',
        });
      }

      const { data: ticket } = await db
        .from('tickets')
        .select('*')
        .eq('id', String(ticketId))
        .maybeSingle();

      if (!ticket) {
        return res.status(404).json({ success: false, error: 'Billet introuvable.' });
      }
      if (String(ticket.holder_email || '').trim().toLowerCase() !== resolvedSenderEmail) {
        return res.status(403).json({ success: false, error: 'Ce billet ne vous appartient pas.' });
      }
      if (ticket.status !== 'valid') {
        return res.status(400).json({ success: false, error: 'Ce billet a déjà été utilisé ou transféré.' });
      }

      const cleanRecipientEmail = String(recipientEmail).trim().toLowerCase();
      const cleanRecipientName = String(recipientName).trim();
      const newTicketId = `tkt_${crypto.randomBytes(6).toString('hex')}`;
      const newToken = `LMR-TKT-${crypto.randomBytes(12).toString('hex').toUpperCase()}`;
      const newSerial = `${ticket.serial_number}-TRF-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

      // Révoquer l'ancien billet
      const { error: revokeErr } = await db
        .from('tickets')
        .update({ status: 'cancelled' })
        .eq('id', ticket.id)
        .eq('status', 'valid');

      if (revokeErr) {
        return res.status(500).json({ success: false, error: 'Impossible de révoquer l’ancien billet.' });
      }

      // Émettre le nouveau billet sécurisé pour le destinataire
      const { data: createdTicket, error: createErr } = await db
        .from('tickets')
        .insert({
          id: newTicketId,
          order_id: ticket.order_id,
          order_ref: ticket.order_ref,
          event_id: ticket.event_id,
          event_title: ticket.event_title,
          event_date: ticket.event_date,
          event_time: ticket.event_time,
          event_venue: ticket.event_venue,
          category_id: ticket.category_id,
          category_name: ticket.category_name,
          serial_number: newSerial,
          token: newToken,
          holder_name: cleanRecipientName,
          holder_email: cleanRecipientEmail,
          status: 'valid',
          issued_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (createErr || !createdTicket) {
        return res.status(500).json({ success: false, error: 'Impossible d’émettre le billet transféré.' });
      }

      await sendTicketTransferEmail({
        to: cleanRecipientEmail,
        recipientName: cleanRecipientName,
        senderName: ticket.holder_name || resolvedSenderEmail,
        eventTitle: ticket.event_title,
        eventDate: ticket.event_date,
        eventVenue: ticket.event_venue,
        categoryName: ticket.category_name,
        serialNumber: newSerial,
        db,
      });

      return res.status(200).json({
        success: true,
        transferToken: newToken,
        revokedTicketId: ticket.id,
        ticket: {
          id: createdTicket.id,
          serialNumber: createdTicket.serial_number,
          token: createdTicket.token,
          holderName: createdTicket.holder_name,
          holderEmail: createdTicket.holder_email,
          status: createdTicket.status,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error?.message || 'Échec du transfert.' });
    }
  }

  return res.status(404).json({ success: false, error: 'Route de paiement introuvable.' });
}
