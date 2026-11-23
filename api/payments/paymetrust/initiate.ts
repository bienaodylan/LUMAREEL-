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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });
  }

  try {
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
    } = req.body || {};

    const cleanName = String(customerName || '').trim();
    const cleanEmail = String(customerEmail || '').trim().toLowerCase();
    const cleanPhone = String(customerPhone || '').trim();
    const safeChannel = VALID_CHANNELS.has(String(channel)) ? String(channel) : 'wave';

    if (kind === 'membership_card' && (!cleanName || !cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Nom complet et e-mail requis.' });
    }

    const amount = kind === 'membership_card' ? 50000 : Number(req.body?.amount || 0);
    const reference =
      kind === 'membership_card'
        ? `PMT-CARD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
        : `PMT-${String(orderId || crypto.randomBytes(4).toString('hex')).toUpperCase()}`;

    const envName = (process.env.PAYMETRUST_ENV || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox';
    const apiKey = (process.env.PAYMETRUST_API_KEY || '').trim();
    const secretKey = (process.env.PAYMETRUST_SECRET_KEY || '').trim();
    const merchantId = (process.env.PAYMETRUST_MERCHANT_ID || '').trim();
    const baseUrl = resolvePublicBaseUrl(req);

    if (apiKey && secretKey) {
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
          customer: {
            name: cleanName || 'Client LUMARÉEL',
            email: cleanEmail,
            phone: cleanPhone,
          },
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
