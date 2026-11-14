import type { VercelRequest, VercelResponse } from '@vercel/node';
import { methodNotAllowed } from '../../_lib/supabase.js';
import { mapMembershipCard, requireMembershipAdmin, setPrivateNoStore } from '../_lib.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setPrivateNoStore(res);
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const admin = await requireMembershipAdmin(req, res);
  if (!admin) return;
  try {
    const db = admin.db;
    const [cardsResult, editionsResult, redemptionsResult] = await Promise.all([
      db.from('membership_cards').select('*').order('created_at', { ascending: false }).limit(500),
      db.from('membership_editions').select('*').order('created_at', { ascending: false }).limit(100),
      db.from('membership_redemptions').select('id,card_id,benefit_id,event_id,redeemed_by,redemption_reference,status,redeemed_at,created_at').order('redeemed_at', { ascending: false }).limit(10),
    ]);
    const failed = [cardsResult, editionsResult, redemptionsResult].find((r) => r.error);
    if (failed?.error) {
      console.error('[membership/admin/overview]', failed.error.message);
      return res.status(503).json({ success: false, error: 'Vue d’ensemble Membership indisponible.' });
    }
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
    const cardMap = new Map((recentCards.data || []).map((c: any) => [c.id, c]));
    const benefitMap = new Map((recentBenefits.data || []).map((b: any) => [b.id, b]));
    const allocated = cards.length;
    const quota = Number(activeEdition?.quota || 100);
    const activeCards = cards.filter((c: any) => c.card_status === 'active').length;
    const stats = {
      allocated, quota, remainingQuota: Math.max(0, quota - allocated),
      activeCards,
      suspendedCards: cards.filter((c: any) => c.card_status === 'suspended').length,
      revokedCards: cards.filter((c: any) => c.card_status === 'revoked').length,
      totalRevenue: 0,
      completedOrders: 0,
    };
    const recentRedemptions = recent.map((r: any) => {
      const card: any = cardMap.get(r.card_id);
      const benefit: any = benefitMap.get(r.benefit_id);
      return {
        id: r.id, cardId: r.card_id, cardNumber: card?.card_number || '',
        cardholderName: card?.cardholder_name || '', benefitId: r.benefit_id,
        benefitName: benefit?.name || 'Avantage', eventId: r.event_id,
        redeemedBy: r.redeemed_by, redemptionReference: r.redemption_reference,
        status: r.status, redeemedAt: r.redeemed_at, createdAt: r.created_at,
      };
    });
    return res.status(200).json({
      success: true, stats,
      activeEdition: activeEdition ? {
        id: activeEdition.id, name: activeEdition.name, editionCode: activeEdition.edition_code,
        description: activeEdition.description, quota: activeEdition.quota,
        allocatedCount: allocated, startsAt: activeEdition.starts_at, endsAt: activeEdition.ends_at,
        status: activeEdition.status, createdAt: activeEdition.created_at, updatedAt: activeEdition.updated_at,
      } : null,
      recentRedemptions,
      recentCards: cards.slice(0, 5).map(mapMembershipCard),
    });
  } catch (error) {
    console.error('[membership/admin/overview] unexpected:', error);
    return res.status(500).json({ success: false, error: 'Erreur de chargement Membership.' });
  }
}
