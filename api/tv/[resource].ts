import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, getAuthenticatedUser, serviceDb } from '../_lib/supabase';

const channels = [
  { id: 'wave', label: 'Wave', type: 'mobile_money' },
  { id: 'orange_money', label: 'Orange Money', type: 'mobile_money' },
  { id: 'mtn_momo', label: 'MTN MoMo', type: 'mobile_money' },
  { id: 'moov_money', label: 'Moov Money', type: 'mobile_money' },
  { id: 'card', label: 'Visa / Mastercard', type: 'card' },
];

const mapPlan = (p: any) => ({
  id: p.id, name: p.name, nameEn: p.name_en || undefined,
  description: p.description || '', descriptionEn: p.description_en || undefined,
  price: Number(p.price || 0), currency: p.currency || 'FCFA',
  durationDays: 30, billingCycleLabel: 'Par mois', billingCycleLabelEn: 'Per month',
  autoRenew: false, renewalPolicy: p.renewal_policy || 'Renouvellement manuel à chaque échéance.',
  conditions: p.conditions || '', status: p.status,
});

const mapEligibility = (row: any) => ({
  enabledPlanIds: Array.isArray(row?.enabled_plan_ids) ? row.enabled_plan_ids : [],
  blackCardIncludesVipTier: row?.black_card_includes_vip_tier !== false,
  cardAccessEnabled: row?.card_access_enabled !== false,
  updatedAt: row?.updated_at,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });

  const resource = String(Array.isArray(req.query.resource) ? req.query.resource[0] : req.query.resource || '');
  const db = serviceDb();
  if (!db) return res.status(503).json({ success: false, error: 'Service TV temporairement indisponible.' });

  try {
    if (resource === 'plans') {
      const [{ data: plans, error }, { data: eligibility }] = await Promise.all([
        db.from('tv_pass_plans').select('*').eq('status', 'active').order('price', { ascending: true }),
        db.from('tv_card_eligibility').select('*').eq('id', 1).maybeSingle(),
      ]);
      if (error) throw error;
      return res.status(200).json({
        success: true,
        plans: (plans || []).map(mapPlan),
        cardEligibility: mapEligibility(eligibility),
        paymentReady: Boolean(process.env.PAYMETRUST_API_KEY && process.env.PAYMETRUST_SECRET_KEY),
        paymentProvider: 'paymetrust',
        paymentEnvironment: (process.env.PAYMETRUST_ENV || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox',
        channels,
      });
    }

    if (resource === 'entitlement') {
      const auth = await getAuthenticatedUser(req);
      if (!auth?.user?.id || !auth.user.email) {
        return res.status(401).json({ success: false, error: 'Connexion requise pour vérifier vos droits LUMARÉEL TV.' });
      }
      const email = auth.user.email.trim().toLowerCase();
      const [{ data: eligibility }, { data: byId, error: subError }, { data: cardById }] = await Promise.all([
        db.from('tv_card_eligibility').select('*').eq('id', 1).maybeSingle(),
        db.from('tv_subscriptions').select('*').eq('user_id', auth.user.id).order('created_at', { ascending: false }),
        db.from('membership_cards').select('*').eq('user_id', auth.user.id).eq('card_status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (subError) throw subError;
      let subscriptions = byId || [];
      if (!subscriptions.length) {
        const { data: byEmail, error } = await db.from('tv_subscriptions').select('*').ilike('user_email', email).order('created_at', { ascending: false });
        if (error) throw error;
        subscriptions = byEmail || [];
      }
      let card = cardById;
      if (!card) {
        const { data } = await db.from('membership_cards').select('*').ilike('cardholder_email', email).eq('card_status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle();
        card = data;
      }

      const rules = mapEligibility(eligibility);
      const now = Date.now();
      const activeSub = subscriptions.find((s: any) => s.status === 'active' && (!s.expires_at || Date.parse(s.expires_at) > now));
      const latestSub = activeSub || subscriptions[0];
      const cardExpiry = card?.expires_at ? Date.parse(card.expires_at) : Number.POSITIVE_INFINITY;
      const cardPlanAllowed = rules.enabledPlanIds.length === 0 || rules.enabledPlanIds.includes(String(card?.plan_id || ''));
      const cardEligible = Boolean(rules.cardAccessEnabled && card && card.card_status === 'active' && cardExpiry > now && cardPlanAllowed);
      const hasSub = Boolean(activeSub);
      const source = cardEligible && hasSub ? 'both' : cardEligible ? 'lumareel_card' : hasSub ? 'tv_pass' : 'none';
      const maxTier = cardEligible ? (rules.blackCardIncludesVipTier ? 'vip' : 'card') : hasSub ? 'tv_pass' : 'free';
      const subStatus = latestSub?.status || undefined;
      const subReason = activeSub ? undefined : subStatus === 'expired' ? 'Votre LUMARÉEL TV Pass a expiré.' : subStatus === 'pending_payment' ? 'Paiement en attente de confirmation.' : subStatus === 'revoked' ? (latestSub.revocation_reason || 'Votre accès a été révoqué.') : 'Aucun abonnement LUMARÉEL TV Pass actif.';
      const entitlement = {
        hasAccess: cardEligible || hasSub, source, maxTier,
        cardAccess: { eligible: cardEligible, cardNumber: card?.card_number, cardStatus: card?.card_status, planId: card?.plan_id, expiresAt: card?.expires_at, reason: cardEligible ? undefined : 'Aucune carte active éligible.' },
        subscriptionAccess: { active: hasSub, subscriptionId: latestSub?.id, planId: latestSub?.plan_id, planName: latestSub?.plan_name, status: subStatus, startsAt: latestSub?.starts_at, expiresAt: latestSub?.expires_at, autoRenew: false, reason: subReason },
        checkedAt: new Date().toISOString(),
      };
      return res.status(200).json({ success: true, entitlement, paymentReady: Boolean(process.env.PAYMETRUST_API_KEY && process.env.PAYMETRUST_SECRET_KEY) });
    }

    return res.status(404).json({ success: false, error: 'Ressource TV introuvable.' });
  } catch (error: any) {
    console.error('[tv]', error?.message || error);
    return res.status(500).json({ success: false, error: 'Impossible de charger les informations LUMARÉEL TV.' });
  }
}
