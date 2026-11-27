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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res, 'GET, POST, PUT, PATCH, OPTIONS');
  const db = serviceDb();
  return res.status(200).json({
    success: true,
    publicConfigured: isSupabasePublicConfigured(),
    serviceConfigured: isSupabaseServiceConfigured(),
    databaseAvailable: Boolean(db),
    resendConfigured: isResendConfigured(),
  });
}
