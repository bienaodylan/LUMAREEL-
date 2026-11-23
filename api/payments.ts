import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

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

function resolvePublicBaseUrl(req: VercelRequest): string {
  const explicit = (process.env.APP_URL || process.env.PUBLIC_URL || '').trim().replace(/\/+$/, '');
  if (explicit) return explicit;
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return host ? `${proto}://${host}` : 'https://lumareel-theta.vercel.app';
}

function buildIssuedCard(payload: any) {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const route = String(Array.isArray(req.query.route) ? req.query.route[0] : req.query.route || '').trim();
  const envName = (process.env.PAYMETRUST_ENV || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox';
  const apiKey = (process.env.PAYMETRUST_API_KEY || '').trim();
  const secretKey = (process.env.PAYMETRUST_SECRET_KEY || '').trim();
  const merchantId = (process.env.PAYMETRUST_MERCHANT_ID || '').trim();
  const isLiveConfigured = Boolean(apiKey && secretKey);

  // 1. Public Membership Editions & Plans
  if (route === 'editions') {
    const activeEdition = {
      id: 'ed_founders_2026',
      name: 'LUMARÉEL Black Card',
      editionCode: 'BLACK_2026',
      description:
        'LUMARÉEL Black Card valable 3 ans avec accès prioritaire, parking réservé, premiers rangs VIP, rafraîchissement offert, préventes, Meet & Greet et réductions partenaires.',
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

  // 2. Public PayMeTrust config
  if (route === 'config') {
    return res.status(200).json({
      success: true,
      provider: 'paymetrust',
      configured: isLiveConfigured,
      environment: envName,
      currency: 'XOF',
      channels: [
        { id: 'wave', label: 'Wave', type: 'mobile_money' },
        { id: 'orange_money', label: 'Orange Money', type: 'mobile_money' },
        { id: 'mtn_momo', label: 'MTN MoMo', type: 'mobile_money' },
        { id: 'moov_money', label: 'Moov Money', type: 'mobile_money' },
        { id: 'card', label: 'Visa / Mastercard', type: 'card' },
      ],
    });
  }

  // 3. Check user's card (fallback JSON when queried directly on Vercel)
  if (route === 'my-card') {
    return res.status(200).json({ success: true, hasCard: false, card: null });
  }

  // 4. Initiate PayMeTrust payment
  if (route === 'initiate') {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });
    }
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
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

      const cleanName = String(customerName || '').trim();
      const cleanEmail = String(customerEmail || '').trim().toLowerCase();
      const cleanPhone = String(customerPhone || '').trim();
      const safeChannel = VALID_CHANNELS.has(String(channel)) ? String(channel) : 'wave';

      if (kind === 'membership_card' && (!cleanName || !cleanEmail)) {
        return res.status(400).json({ success: false, error: 'Nom complet et e-mail requis.' });
      }

      const amount = kind === 'membership_card' ? 50000 : Number(body.amount || 0);
      const reference =
        kind === 'membership_card'
          ? `PMT-CARD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
          : `PMT-${String(orderId || crypto.randomBytes(4).toString('hex')).toUpperCase()}`;

      if (isLiveConfigured) {
        const baseUrl = resolvePublicBaseUrl(req);
        const apiBase =
          (process.env.PAYMETRUST_BASE_URL || '').trim().replace(/\/+$/, '') ||
          (envName === 'production' ? 'https://api.paymetrust.net/v1' : 'https://api.sandbox.paymetrust.net/v1');

        const authRes = await fetch(`${apiBase}/auth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            api_key: apiKey,
            secret_key: secretKey,
            ...(merchantId ? { merchant_id: merchantId } : {}),
          }),
        });
        const authText = await authRes.text();
        const authData = authText ? JSON.parse(authText) : {};
        const token = authData?.access_token || authData?.token || authData?.data?.access_token;

        if (!authRes.ok || !token) {
          return res.status(502).json({
            success: false,
            error: authData?.message || 'Authentification PayMeTrust indisponible.',
          });
        }

        const initRes = await fetch(`${apiBase}/payment/initiate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: Math.round(amount),
            currency: 'XOF',
            reference,
            description: 'LUMARÉEL Black Card — 3 Ans',
            channel: PAYMETRUST_CHANNEL_MAP[safeChannel] || 'WAVE_CI',
            customer: { name: cleanName || 'Client LUMARÉEL', email: cleanEmail, phone: cleanPhone },
            notify_url: `${baseUrl}/api/payments/paymetrust/webhook`,
            return_url: `${baseUrl}/?payment_status=success&ref=${encodeURIComponent(reference)}`,
            cancel_url: `${baseUrl}/?payment_status=cancelled&ref=${encodeURIComponent(reference)}`,
            metadata: { planId, userId, shippingAddress },
          }),
        });
        const initText = await initRes.text();
        const initData = initText ? JSON.parse(initText) : {};
        const paymentUrl = initData?.payment_url || initData?.checkout_url || initData?.data?.payment_url;

        if (!initRes.ok || !paymentUrl) {
          return res.status(502).json({
            success: false,
            error: initData?.message || 'Impossible d’initialiser le paiement PayMeTrust.',
          });
        }

        return res.status(200).json({
          success: true,
          transaction: {
            id: `pmt_${crypto.randomBytes(6).toString('hex')}`,
            reference,
            status: 'PENDING',
            amount,
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
          id: `pmt_${crypto.randomBytes(6).toString('hex')}`,
          reference,
          status: 'INITIATED',
          amount,
          currency: 'XOF',
          channel: safeChannel,
          mode: 'awaiting_keys',
          environment: envName,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error?.message || 'Impossible d’initialiser le paiement.',
      });
    }
  }

  // 5. Preview confirmation (disabled automatically when live keys or production mode are active)
  if (route === 'confirm-preview' || route === 'order') {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });
    }
    if (isLiveConfigured || envName === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Mode live actif : la validation passe uniquement par PayMeTrust.',
      });
    }
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const payload = route === 'confirm-preview' ? body.previewPayload || body : body;
      const card = buildIssuedCard(payload);

      if (route === 'order') {
        return res.status(200).json({ success: true, card });
      }

      return res.status(200).json({
        success: true,
        transaction: {
          reference: String(body.reference || `PMT-CARD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`),
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

  return res.status(404).json({ success: false, error: 'Route de paiement introuvable.' });
}
