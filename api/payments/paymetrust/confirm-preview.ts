import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

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

  const isLiveConfigured = Boolean(
    (process.env.PAYMETRUST_API_KEY || '').trim() && (process.env.PAYMETRUST_SECRET_KEY || '').trim()
  );
  if (isLiveConfigured || (process.env.PAYMETRUST_ENV || 'sandbox').toLowerCase() === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Mode live actif : la validation passe uniquement par PayMeTrust.',
    });
  }

  try {
    const { reference, previewPayload } = req.body || {};
    if (!reference) {
      return res.status(400).json({ success: false, error: 'Référence de transaction requise.' });
    }

    const now = new Date();
    const expires = new Date(now);
    expires.setFullYear(expires.getFullYear() + 3);

    const seq = Math.floor(15 + Math.random() * 80);
    const cardNumber = `LMR-BC-${String(seq).padStart(4, '0')}`;
    const cardholderName = String(previewPayload?.customerName || 'MEMBRE LUMARÉEL').trim().toUpperCase();
    const cardholderEmail = String(previewPayload?.customerEmail || '').trim().toLowerCase();
    const cardholderPhone = String(previewPayload?.customerPhone || '').trim();

    const card = {
      id: `card_${crypto.randomBytes(6).toString('hex')}`,
      userId: previewPayload?.userId || `usr_${crypto.randomBytes(6).toString('hex')}`,
      editionId: 'ed_founders_2026',
      planId: previewPayload?.planId || 'plan_founders_annual',
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

    return res.status(200).json({
      success: true,
      transaction: {
        reference: String(reference),
        status: 'SUCCESS',
        paidAt: now.toISOString(),
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
