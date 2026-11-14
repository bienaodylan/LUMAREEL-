import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireRole, serviceDb } from '../_lib/supabase.js';

export async function requireMembershipAdmin(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, ['super_admin']);
  if (!auth.ok) {
    res.status(auth.status).json({ success: false, error: auth.error });
    return null;
  }
  return { db: serviceDb(), user: auth.user };
}

export function mapMembershipCard(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    editionId: row.edition_id,
    membershipOrderId: row.membership_order_id,
    cardNumber: row.card_number,
    cardSequence: Number(row.card_sequence || 0),
    cardholderName: row.cardholder_name,
    cardholderEmail: row.cardholder_email,
    cardStatus: row.card_status,
    issuedAt: row.issued_at,
    validFrom: row.valid_from,
    expiresAt: row.expires_at,
    renewedAt: row.renewed_at,
    revokedAt: row.revoked_at,
    revocationReason: row.revocation_reason,
    physicalCardStatus: row.physical_card_status,
    physicalCardTrackingNumber: row.physical_card_tracking_number,
    chipUid: row.chip_uid,
    chipType: row.chip_type,
    chipEncodedAt: row.chip_encoded_at,
    chipEncodedBy: row.chip_encoded_by,
    chipLockStatus: row.chip_lock_status,
    walletBalance: Number(row.wallet_balance || 0),
    walletCurrency: row.wallet_currency || 'FCFA',
    clubVipLevel: row.club_vip_level,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapMembershipPlan(row: any) {
  return {
    id: row.id, editionId: row.edition_id, name: row.name, description: row.description,
    price: Number(row.price || 0), currency: row.currency, durationMonths: Number(row.duration_months || 12),
    physicalCardIncluded: Boolean(row.physical_card_included), renewalEnabled: Boolean(row.renewal_enabled),
    status: row.status, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export function mapMembershipBenefit(row: any) {
  return {
    id: row.id, name: row.name, description: row.description, benefitType: row.benefit_type,
    editionId: row.edition_id, eventId: row.event_id, eventTitle: row.event_title,
    startsAt: row.starts_at, endsAt: row.ends_at, maxRedemptions: row.max_redemptions,
    currentRedemptions: Number(row.current_redemptions || 0), perMemberLimit: Number(row.per_member_limit || 1),
    conditions: row.conditions || {}, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export function setPrivateNoStore(res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Pragma', 'no-cache');
}
