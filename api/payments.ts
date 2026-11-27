import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { applyCors, getAuthenticatedUser, isSupabasePublicConfigured, isSupabaseServiceConfigured, requireRole, serviceDb } from './_lib/supabase';
import { getResendFromAddress, isResendConfigured, sendBlackCardActivationEmail, sendResendEmail, sendTicketConfirmationEmail, sendTicketTransferEmail } from './_lib/emailService';

const VALID_CHANNELS = new Set(['wave','orange_money','mtn_momo','moov_money','djamo','card']);
const PAYMETRUST_CHANNEL_MAP: Record<string, string> = { wave:'WAVE_CI', orange_money:'OM_CI', mtn_momo:'MOMO_CI', moov_money:'FLOOZ_CI', djamo:'CARD', card:'CARD' };
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PMT_REF_REGEX = /^PMT-[A-Z0-9_-]{4,64}$/i;
const mapTvPlan = (p: any) => ({ id:p.id, price:Number(p.price||0), status:p.status });
const mapTvEligibility = (row: any) => ({ enabledPlanIds: Array.isArray(row?.enabled_plan_ids) ? row.enabled_plan_ids : [] });
const mapTvSubscription = (s: any) => ({ id:s.id, status:s.status, autoRenew:false });

export default function handler(req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ success: true, message: 'Top-level constants loaded.' });
}
