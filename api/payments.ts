import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
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
  try {
    applyCors(req, res, 'GET, POST, PUT, PATCH, OPTIONS');
    const db = serviceDb();
    return res.status(200).json({
      success: true,
      databaseAvailable: Boolean(db),
      publicConfigured: isSupabasePublicConfigured(),
      serviceConfigured: isSupabaseServiceConfigured(),
      resendConfigured: isResendConfigured(),
    });
  } catch (error: any) {
    console.error('[debug] handler error', error?.stack || error);
    return res.status(500).json({ success: false, error: error?.message || 'debug error' });
  }
}
