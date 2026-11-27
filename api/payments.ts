import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { applyCors, getAuthenticatedUser, isSupabasePublicConfigured, isSupabaseServiceConfigured, requireRole, serviceDb } from './_lib/supabase';
import { getResendFromAddress, isResendConfigured, sendBlackCardActivationEmail, sendResendEmail, sendTicketConfirmationEmail, sendTicketTransferEmail } from './_lib/emailService';

const VALID_CHANNELS = new Set(['wave','orange_money','mtn_momo','moov_money','djamo','card']);

export default function handler(req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ success: true, message: 'Top-level Set constant loaded.' });
}
