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

export default function handler(req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ success: true, message: 'First helper group loaded.' });
}
