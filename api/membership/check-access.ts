import { createHash, randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticatedUserDb, methodNotAllowed, requireRole, serviceDb } from '../_lib/supabase.js';

const requiredBenefit: Record<string, string | null> = {
  main_entrance: null,
  priority_lane: 'priority_access',
  vip_lounge: 'vip_lounge',
  backstage_artists: 'artist_experience',
  member_desk: null,
  invitations_booth: 'exclusive_invitation',
};

function result(authorized: boolean, card: any, zone: string, reason?: string, entitlement?: any) {
  return {
    authorized,
    cardStatus: card?.card_status || 'not_found',
    cardNumber: card?.card_number || '',
    cardholderName: card?.cardholder_name || '',
    editionName: card?.editionName || '',
    zone,
    reason,
    entitlement: entitlement ? {
      id: entitlement.id,
      benefitName: entitlement.benefitName,
      remaining: entitlement.remaining,
    } : undefined,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Pragma', 'no-cache');
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const identifier = typeof body.cardIdentifier === 'string' ? body.cardIdentifier.trim() : '';
  const scannerToken = typeof body.scannerToken === 'string' ? body.scannerToken.trim() : '';
  const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';
  const zone = typeof body.accessPointType === 'string' ? body.accessPointType : 'main_entrance';
  const scanMethod = body.scanMethod === 'manual_override' ? 'manual_override' : 'qr_code';
  const operatorId = typeof body.operatorId === 'string' ? body.operatorId.trim().slice(0, 120) : 'Agent de contrôle';
  const benefitType = requiredBenefit[zone];

  if (!identifier || identifier.length > 512 || !scannerToken || scannerToken.length > 512 || !eventId || !Object.prototype.hasOwnProperty.call(requiredBenefit, zone)) {
    return res.status(400).json({ authorized: false, reason: 'Données de contrôle invalides.', zone });
  }

  let adminUserId: string | null = null;
  if (scanMethod === 'manual_override') {
    const auth = await requireRole(req, ['super_admin', 'box_office']);
    if (!auth.ok) return res.status(auth.status).json({ authorized: false, reason: 'La saisie manuelle est réservée à la billetterie et à la direction.', zone });
    adminUserId = auth.user.id;
  } else {
    const auth = await authenticatedUserDb(req);
    if (auth.ok) adminUserId = auth.user.id;
  }

  const db = serviceDb();
  const now = new Date();
  const nowIso = now.toISOString();
  let card: any = null;
  let editionName = '';
  let entitlementInfo: any = null;
  let rejectionReason = '';
  let tokenRow: any = null;

  try {
    const { data: gate, error: gateError } = await db.from('scanner_tokens')
      .select('token,event_id,expires_at,is_revoked')
      .eq('token', scannerToken).eq('is_revoked', false).gt('expires_at', nowIso).maybeSingle();
    if (gateError || !gate || (eventId !== 'all_events' && gate.event_id !== eventId)) {
      return res.status(403).json({ authorized: false, reason: 'Session de contrôle invalide, expirée ou non autorisée pour cet événement.', zone });
    }

    if (scanMethod === 'manual_override') {
      const { data, error } = await db.from('membership_cards').select('*').eq('card_number', identifier).maybeSingle();
      if (error) throw error;
      card = data;
    } else {
      if (identifier.length < 16 || /\\s/u.test(identifier)) {
        return res.status(200).json({ authorized: false, cardStatus: 'not_found', cardNumber: '', cardholderName: '', zone, reason: 'QR Membership invalide.' });
      }
      const tokenHash = createHash('sha256').update(identifier, 'utf8').digest('hex');
      const { data, error } = await db.from('membership_qr_tokens')
        .select('id,card_id,token_version')
        .eq('token_hash', tokenHash).eq('is_current', true).eq('status', 'active')
        .is('revoked_at', null).maybeSingle();
      if (error) throw error;
      tokenRow = data;
      if (tokenRow) {
        const { data: cardData, error: cardError } = await db.from('membership_cards').select('*').eq('id', tokenRow.card_id).maybeSingle();
        if (cardError) throw cardError;
        card = cardData;
        await db.from('membership_qr_tokens').update({
          last_verified_at: nowIso,
          verification_count: (await db.from('membership_qr_tokens').select('verification_count').eq('id', tokenRow.id).maybeSingle()).data?.verification_count + 1 || 1,
        }).eq('id', tokenRow.id);
      }
    }

    if (!card) rejectionReason = 'Carte membre introuvable ou QR révoqué.';
    else if (card.card_status !== 'active') rejectionReason = card.card_status === 'suspended' ? 'Carte suspendue.' : card.card_status === 'revoked' ? 'Carte révoquée.' : card.card_status === 'expired' ? 'Adhésion expirée.' : 'Carte non activée.';
    else if (Date.parse(card.valid_from) > now.getTime()) rejectionReason = 'La période de validité de cette carte n’a pas encore commencé.';
    else if (Date.parse(card.expires_at) <= now.getTime()) rejectionReason = 'La période de validité de cette carte est terminée.';

    if (card && !rejectionReason) {
      const { data: edition, error: editionError } = await db.from('membership_editions').select('name').eq('id', card.edition_id).maybeSingle();
      if (editionError) throw editionError;
      editionName = edition?.name || '';

      if (benefitType) {
        const { data: entitlements, error: entitlementError } = await db.from('membership_entitlements')
          .select('id,benefit_id,quantity,used_quantity,valid_from,valid_until,status')
          .eq('card_id', card.id).in('status', ['available','confirmed']).order('created_at', { ascending: true });
        if (entitlementError) throw entitlementError;
        const benefitIds = (entitlements || []).map((item: any) => item.benefit_id);
        const { data: benefits, error: benefitsError } = benefitIds.length
          ? await db.from('membership_benefits').select('id,name,benefit_type,status,event_id,starts_at,ends_at').in('id', benefitIds)
          : { data: [], error: null };
        if (benefitsError) throw benefitsError;
        const benefitMap = new Map((benefits || []).map((item: any) => [item.id, item]));
        const match = (entitlements || []).find((ent: any) => {
          const benefit: any = benefitMap.get(ent.benefit_id);
          return benefit && benefit.benefit_type === benefitType && benefit.status === 'active'
            && (benefit.event_id == null || benefit.event_id === eventId)
            && Date.parse(ent.valid_from) <= now.getTime()
            && (!ent.valid_until || Date.parse(ent.valid_until) > now.getTime())
            && (!benefit.starts_at || Date.parse(benefit.starts_at) <= now.getTime())
            && (!benefit.ends_at || Date.parse(benefit.ends_at) > now.getTime())
            && Number(ent.used_quantity) < Number(ent.quantity);
        });
        if (!match) {
          rejectionReason = 'Aucun privilège actif ne donne accès à cette zone.';
        } else {
          const benefit: any = benefitMap.get(match.benefit_id);
          const nextUsed = Number(match.used_quantity) + 1;
          const { data: consumed, error: consumeError } = await db.from('membership_entitlements')
            .update({ used_quantity: nextUsed, status: nextUsed >= Number(match.quantity) ? 'used' : match.status })
            .eq('id', match.id).eq('used_quantity', match.used_quantity).select('id').maybeSingle();
          if (consumeError) throw consumeError;
          if (!consumed) {
            rejectionReason = 'Ce privilège vient d’être utilisé par un autre contrôle. Présentez à nouveau la carte.';
          } else {
            const redemptionReference = `LMR-RED-${randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
            const { error: redemptionError } = await db.from('membership_redemptions').insert({
              card_id: card.id, benefit_id: benefit.id, event_id: eventId,
              redeemed_by: operatorId, redemption_reference: redemptionReference, status: 'confirmed', redeemed_at: nowIso,
            });
            if (redemptionError) console.error('[membership/check-access] redemption log:', redemptionError.message);
            entitlementInfo = { id: match.id, benefitName: benefit.name, remaining: Math.max(0, Number(match.quantity) - nextUsed) };
            await db.from('membership_benefits').update({ current_redemptions: db.rpc ? undefined : undefined }).eq('id', benefit.id);
          }
        }
      }
    }

    const authorized = Boolean(card && !rejectionReason);
    const { error: logError } = await db.from('membership_scan_logs').insert({
      card_id: card?.id || null, card_number: card?.card_number || null,
      cardholder_name: card?.cardholder_name || null, event_id: gate.event_id,
      event_title: '', access_point_id: null, access_point_name: zone,
      scan_method: scanMethod, verification_result: authorized ? 'AUTHORIZED' : 'DENIED',
      rejection_reason: authorized ? null : rejectionReason || 'Accès refusé.',
      operator_id: adminUserId || operatorId, scanned_at: nowIso,
      metadata: { zone, tokenVersion: tokenRow?.token_version || null, scannerEventId: gate.event_id },
    });
    if (logError) console.error('[membership/check-access] scan log:', logError.message);

    return res.status(200).json(result(authorized, card ? { ...card, editionName } : null, zone, authorized ? undefined : (rejectionReason || 'Accès refusé.'), entitlementInfo));
  } catch (error: any) {
    console.error('[membership/check-access] unexpected:', error?.message || error);
    return res.status(503).json({ authorized: false, reason: 'Registre Membership indisponible. Contrôle refusé par sécurité.', zone });
  }
}
