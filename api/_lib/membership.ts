import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticatedUserDb, methodNotAllowed, requireRole, serviceDb } from './supabase.js';

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


function noStore(res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Pragma', 'no-cache');
}

async function handleMembershipAccess(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const identifier = typeof body.cardIdentifier === 'string' ? body.cardIdentifier.trim() : '';
  const scannerToken = typeof body.scannerToken === 'string' ? body.scannerToken.trim() : '';
  const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';
  const zone = typeof body.accessPointType === 'string' ? body.accessPointType : 'main_entrance';
  const scanMethod = body.scanMethod === 'manual_override' ? 'manual_override' : 'qr_code';
  const operatorId = typeof body.operatorId === 'string' ? body.operatorId.trim().slice(0, 120) : 'Agent de contrôle';
  const requiredBenefit: Record<string, string | null> = {
    main_entrance: null, priority_lane: 'priority_access', vip_lounge: 'vip_lounge',
    backstage_artists: 'artist_experience', member_desk: null, invitations_booth: 'exclusive_invitation',
  };
  const benefitType = requiredBenefit[zone];
  if (!identifier || identifier.length > 512 || !scannerToken || scannerToken.length > 512 ||
      !eventId || !Object.prototype.hasOwnProperty.call(requiredBenefit, zone)) {
    return res.status(400).json({ authorized: false, reason: 'Données de contrôle invalides.', zone });
  }

  let actorId: string | null = null;
  if (scanMethod === 'manual_override') {
    const auth = await requireRole(req, ['super_admin', 'box_office']);
    if (!auth.ok) return res.status(auth.status).json({ authorized: false, reason: 'La saisie manuelle est réservée à la billetterie et à la direction.', zone });
    actorId = auth.user.id;
  } else {
    const auth = await authenticatedUserDb(req);
    if (auth.ok) actorId = auth.user.id;
  }

  const db = serviceDb();
  const now = new Date();
  const nowIso = now.toISOString();
  let card: any = null;
  let editionName = '';
  let entitlementInfo: any = undefined;
  let rejectionReason = '';
  let tokenRow: any = null;

  try {
    const { data: gate, error: gateError } = await db.from('scanner_tokens')
      .select('token,event_id,event_title,expires_at,is_revoked')
      .eq('token', scannerToken).eq('is_revoked', false).gt('expires_at', nowIso).maybeSingle();
    if (gateError || !gate || gate.event_id !== eventId) {
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
        await db.from('membership_qr_tokens').update({ last_verified_at: nowIso }).eq('id', tokenRow.id);
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
        if (!match) rejectionReason = 'Aucun privilège actif ne donne accès à cette zone.';
        else {
          const benefit: any = benefitMap.get(match.benefit_id);
          const nextUsed = Number(match.used_quantity) + 1;
          const { data: consumed, error: consumeError } = await db.from('membership_entitlements')
            .update({ used_quantity: nextUsed, status: nextUsed >= Number(match.quantity) ? 'used' : match.status })
            .eq('id', match.id).eq('used_quantity', match.used_quantity).select('id').maybeSingle();
          if (consumeError) throw consumeError;
          if (!consumed) rejectionReason = 'Ce privilège vient d’être utilisé par un autre contrôle. Présentez à nouveau la carte.';
          else {
            const redemptionReference = `LMR-RED-${randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
            const { error: redemptionError } = await db.from('membership_redemptions').insert({
              card_id: card.id, benefit_id: benefit.id, event_id: eventId,
              redeemed_by: operatorId, redemption_reference: redemptionReference, status: 'confirmed', redeemed_at: nowIso,
            });
            if (redemptionError) console.error('[membership/check-access] redemption log:', redemptionError.message);
            entitlementInfo = { id: match.id, benefitName: benefit.name, remaining: Math.max(0, Number(match.quantity) - nextUsed) };
          }
        }
      }
    }

    const authorized = Boolean(card && !rejectionReason);
    const { error: logError } = await db.from('membership_scan_logs').insert({
      card_id: card?.id || null, card_number: card?.card_number || null,
      cardholder_name: card?.cardholder_name || null, event_id: gate.event_id,
      event_title: gate.event_title || '', access_point_id: null, access_point_name: zone,
      scan_method: scanMethod, verification_result: authorized ? 'AUTHORIZED' : 'DENIED',
      rejection_reason: authorized ? null : rejectionReason || 'Accès refusé.',
      operator_id: actorId || operatorId, scanned_at: nowIso,
      metadata: { zone, tokenVersion: tokenRow?.token_version || null, scannerEventId: gate.event_id },
    });
    if (logError) console.error('[membership/check-access] scan log:', logError.message);

    return res.status(200).json({
      authorized, cardStatus: card?.card_status || 'not_found',
      cardNumber: card?.card_number || '', cardholderName: card?.cardholder_name || '',
      editionName, zone, reason: authorized ? undefined : (rejectionReason || 'Accès refusé.'),
      entitlement: entitlementInfo,
    });
  } catch (error: any) {
    console.error('[membership/check-access] unexpected:', error?.message || error);
    return res.status(503).json({ authorized: false, reason: 'Registre Membership indisponible. Contrôle refusé par sécurité.', zone });
  }
}

async function handleMembershipAdmin(req: VercelRequest, res: VercelResponse, route: string) {
  const admin = await requireMembershipAdmin(req, res);
  if (!admin) return;
  const db = admin.db;

  if (route === 'admin-overview') {
    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
    const [cardsResult, editionsResult, redemptionsResult] = await Promise.all([
      db.from('membership_cards').select('*').order('created_at', { ascending: false }).limit(500),
      db.from('membership_editions').select('*').order('created_at', { ascending: false }).limit(100),
      db.from('membership_redemptions').select('id,card_id,benefit_id,event_id,redeemed_by,redemption_reference,status,redeemed_at,created_at').order('redeemed_at', { ascending: false }).limit(10),
    ]);
    const failed = [cardsResult, editionsResult, redemptionsResult].find((r) => r.error);
    if (failed?.error) return res.status(503).json({ success: false, error: 'Vue d’ensemble Membership indisponible.' });
    const cards = cardsResult.data || [];
    const editions = editionsResult.data || [];
    const activeEdition = editions.find((e: any) => e.status === 'active') || editions[0] || null;
    const recent = redemptionsResult.data || [];
    const cardIds = [...new Set(recent.map((r: any) => r.card_id))];
    const benefitIds = [...new Set(recent.map((r: any) => r.benefit_id))];
    const [recentCards, recentBenefits] = await Promise.all([
      cardIds.length ? db.from('membership_cards').select('id,card_number,cardholder_name').in('id', cardIds) : Promise.resolve({ data: [], error: null }),
      benefitIds.length ? db.from('membership_benefits').select('id,name').in('id', benefitIds) : Promise.resolve({ data: [], error: null }),
    ]);
    const cardMap = new Map((recentCards.data || []).map((x: any) => [x.id, x]));
    const benefitMap = new Map((recentBenefits.data || []).map((x: any) => [x.id, x]));
    const allocated = activeEdition ? cards.filter((card: any) => card.edition_id === activeEdition.id).length : 0;
    const quota = Number(activeEdition?.quota || 0);
    const stats = {
      allocated, quota, remainingQuota: Math.max(0, quota - allocated),
      activeCards: cards.filter((x: any) => x.card_status === 'active').length,
      suspendedCards: cards.filter((x: any) => x.card_status === 'suspended').length,
      revokedCards: cards.filter((x: any) => x.card_status === 'revoked').length,
      totalRevenue: 0, completedOrders: 0,
    };
    const recentRedemptions = recent.map((row: any) => {
      const card: any = cardMap.get(row.card_id);
      const benefit: any = benefitMap.get(row.benefit_id);
      return {
        id: row.id, cardId: row.card_id, cardNumber: card?.card_number || '',
        cardholderName: card?.cardholder_name || '', benefitId: row.benefit_id,
        benefitName: benefit?.name || 'Avantage', eventId: row.event_id,
        redeemedBy: row.redeemed_by, redemptionReference: row.redemption_reference,
        status: row.status, redeemedAt: row.redeemed_at, createdAt: row.created_at,
      };
    });
    return res.status(200).json({
      success: true, stats,
      activeEdition: activeEdition ? {
        id: activeEdition.id, name: activeEdition.name, editionCode: activeEdition.edition_code,
        description: activeEdition.description, quota: activeEdition.quota, allocatedCount: allocated,
        startsAt: activeEdition.starts_at, endsAt: activeEdition.ends_at, status: activeEdition.status,
        createdAt: activeEdition.created_at, updatedAt: activeEdition.updated_at,
      } : null,
      recentRedemptions, recentCards: cards.slice(0, 5).map(mapMembershipCard),
    });
  }

  if (route === 'admin-cards') {
    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
    const { data, error } = await db.from('membership_cards').select('*').order('created_at', { ascending: false }).limit(1000);
    if (error) return res.status(503).json({ success: false, error: 'Registre des membres indisponible.' });
    return res.status(200).json({ success: true, cards: (data || []).map(mapMembershipCard) });
  }

  if (route === 'plans' || route === 'benefits') {
    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
    if (route === 'plans') {
      const { data, error } = await db.from('membership_plans').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) return res.status(503).json({ success: false, error: 'Formules Membership indisponibles.' });
      return res.status(200).json({ success: true, plans: (data || []).map(mapMembershipPlan) });
    }
    const { data, error } = await db.from('membership_benefits').select('*').order('created_at', { ascending: false }).limit(500);
    if (error) return res.status(503).json({ success: false, error: 'Catalogue des avantages indisponible.' });
    return res.status(200).json({ success: true, benefits: (data || []).map(mapMembershipBenefit) });
  }

  const cardId = String(req.query.cardId || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(cardId)) return res.status(400).json({ success: false, error: 'Identifiant de carte invalide.' });

  if (route === 'card-status') {
    if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
    const allowed = new Set(['pending','active','suspended','revoked','expired']);
    const status = String(req.body?.status || '').trim();
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';
    if (!allowed.has(status)) return res.status(400).json({ success: false, error: 'Statut de carte invalide.' });
    const now = new Date().toISOString();
    const { data, error } = await db.from('membership_cards').update({
      card_status: status, revoked_at: status === 'revoked' ? now : null,
      revocation_reason: status === 'revoked' ? (reason || 'Révocation administrative') : null, updated_at: now,
    }).eq('id', cardId).select('*').maybeSingle();
    if (error) return res.status(500).json({ success: false, error: 'Mise à jour du statut impossible.' });
    if (!data) return res.status(404).json({ success: false, error: 'Carte introuvable.' });
    if (['suspended','revoked','expired'].includes(status)) {
      const { error: tokenError } = await db.from('membership_qr_tokens').update({
        is_current: false, status: 'revoked', revoked_at: now, revocation_reason: reason || `Carte ${status}`,
      }).eq('card_id', cardId).eq('is_current', true).is('revoked_at', null);
      if (tokenError) return res.status(503).json({ success: false, error: 'Carte mise à jour, mais la révocation du QR doit être vérifiée.' });
    }
    const { error: logError } = await db.from('membership_event_logs').insert({
      actor_id: admin.user.id, action_type: 'card_status_changed', entity_type: 'membership_card', entity_id: cardId, details: { status, reason },
    });
    if (logError) console.error('[membership/card-status] audit:', logError.message);
    return res.status(200).json({ success: true, card: mapMembershipCard(data) });
  }

  if (route === 'physical-status') {
    if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
    const allowed = new Set(['requested','payment_pending','approved','in_production','printed','quality_checked','ready_for_dispatch','shipped','delivered','cancelled','blocked','lost','returned','replacement_requested','defective','replaced']);
    const physicalStatus = String(req.body?.physicalStatus || '').trim();
    const trackingNumber = typeof req.body?.trackingNumber === 'string' ? req.body.trackingNumber.trim().slice(0, 100) : '';
    if (!allowed.has(physicalStatus)) return res.status(400).json({ success: false, error: 'Statut physique invalide.' });
    const { data, error } = await db.from('membership_cards').update({
      physical_card_status: physicalStatus, physical_card_tracking_number: trackingNumber || null, updated_at: new Date().toISOString(),
    }).eq('id', cardId).select('*').maybeSingle();
    if (error) return res.status(500).json({ success: false, error: 'Mise à jour de la fabrication impossible.' });
    if (!data) return res.status(404).json({ success: false, error: 'Carte introuvable.' });
    const { error: logError } = await db.from('membership_event_logs').insert({
      actor_id: admin.user.id, action_type: 'physical_card_status_changed', entity_type: 'membership_card',
      entity_id: cardId, details: { physicalStatus, trackingNumber: trackingNumber || null },
    });
    if (logError) console.error('[membership/physical-status] audit:', logError.message);
    return res.status(200).json({ success: true, card: mapMembershipCard(data) });
  }

  if (route === 'rotate-token') {
    if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
    const { data: card, error: cardError } = await db.from('membership_cards').select('id,card_number,card_status').eq('id', cardId).maybeSingle();
    if (cardError) return res.status(503).json({ success: false, error: 'Registre des cartes indisponible.' });
    if (!card) return res.status(404).json({ success: false, error: 'Carte introuvable.' });
    if (card.card_status !== 'active') return res.status(409).json({ success: false, error: 'Seules les cartes actives peuvent recevoir un nouveau QR.' });
    const now = new Date().toISOString();
    const { error: revokeError } = await db.from('membership_qr_tokens').update({
      is_current: false, status: 'rotated', revoked_at: now, revocation_reason: 'Rotation administrative',
    }).eq('card_id', cardId).eq('is_current', true).is('revoked_at', null);
    if (revokeError) return res.status(503).json({ success: false, error: 'Révocation de l’ancien QR impossible.' });
    const token = `LMR_CARD_${randomBytes(32).toString('base64url')}`;
    const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex');
    const { data: previous } = await db.from('membership_qr_tokens').select('token_version')
      .eq('card_id', cardId).order('token_version', { ascending: false }).limit(1).maybeSingle();
    const tokenVersion = Number(previous?.token_version || 0) + 1;
    const { data: inserted, error: insertError } = await db.from('membership_qr_tokens').insert({
      card_id: cardId, token_hash: tokenHash, token_prefix: token.slice(0, 16),
      token_version: tokenVersion, is_current: true, status: 'active', issued_at: now,
    }).select('id,token_prefix,token_version,issued_at').single();
    if (insertError || !inserted) return res.status(503).json({ success: false, error: 'Nouveau QR non créé. La carte reste sans jeton actif, relancez la rotation.' });
    const { error: logError } = await db.from('membership_event_logs').insert({
      actor_id: admin.user.id, action_type: 'membership_qr_rotated', entity_type: 'membership_card',
      entity_id: cardId, details: { tokenVersion, tokenPrefix: inserted.token_prefix },
    });
    if (logError) console.error('[membership/rotate-token] audit:', logError.message);
    return res.status(200).json({ success: true, token, tokenVersion, issuedAt: inserted.issued_at, cardNumber: card.card_number, oneTimeDisplay: true });
  }

  return res.status(404).json({ success: false, error: 'Opération Membership inconnue.' });
}

export async function handleMembershipRoute(req: VercelRequest, res: VercelResponse, route: string) {
  noStore(res);
  if (route === 'check-access') return handleMembershipAccess(req, res);
  if (['admin-overview','admin-cards','plans','benefits','card-status','physical-status','rotate-token'].includes(route)) {
    return handleMembershipAdmin(req, res, route);
  }
  return res.status(404).json({ success: false, error: 'Route Membership inconnue.' });
}
