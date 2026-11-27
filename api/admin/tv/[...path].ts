import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, requireRole, serviceDb } from '../../_lib/supabase';

const mapPlan = (p: any) => ({
  id: p.id, name: p.name, nameEn: p.name_en || undefined,
  description: p.description || '', descriptionEn: p.description_en || undefined,
  price: Number(p.price || 0), currency: p.currency || 'FCFA', durationDays: 30,
  billingCycleLabel: 'Par mois', billingCycleLabelEn: 'Per month', autoRenew: false,
  renewalPolicy: p.renewal_policy || 'Renouvellement manuel à chaque échéance.',
  conditions: p.conditions || '', status: p.status,
});
const mapSubscription = (s: any) => ({
  id: s.id, userId: s.user_id, userEmail: s.user_email, userName: s.user_name,
  planId: s.plan_id, planName: s.plan_name, status: s.status, source: s.source,
  paymentReference: s.payment_reference, providerTransactionId: s.provider_transaction_id,
  amountPaid: Number(s.amount_paid || 0), currency: s.currency || 'FCFA',
  autoRenew: false, startsAt: s.starts_at, expiresAt: s.expires_at,
  revocationReason: s.revocation_reason, createdAt: s.created_at,
});
const mapEligibility = (r: any) => ({
  enabledPlanIds: Array.isArray(r?.enabled_plan_ids) ? r.enabled_plan_ids : [],
  blackCardIncludesVipTier: r?.black_card_includes_vip_tier !== false,
  cardAccessEnabled: r?.card_access_enabled !== false,
  updatedAt: r?.updated_at,
});
const getBody = (req: VercelRequest) => typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
async function listSubscriptions(db: any) {
  const { data, error } = await db.from('tv_subscriptions').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) throw error;
  return (data || []).map(mapSubscription);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res, 'GET, POST, PUT, PATCH, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const auth = await requireRole(req, ['super_admin']);
  if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });
  const db = serviceDb();
  if (!db) return res.status(503).json({ success: false, error: 'Service Supabase indisponible.' });
  const parts = Array.isArray(req.query.path) ? req.query.path.map(String) : String(req.query.path || '').split('/').filter(Boolean);
  const resource = parts[0] || '';

  try {
    if (resource === 'overview' && req.method === 'GET') {
      const [{ data: plans, error: planError }, { data: eligibility }, { data: membershipPlans }, subscriptions] = await Promise.all([
        db.from('tv_pass_plans').select('*').order('price', { ascending: true }),
        db.from('tv_card_eligibility').select('*').eq('id', 1).maybeSingle(),
        db.from('membership_plans').select('id,name,price,currency').eq('status', 'active').order('created_at', { ascending: true }),
        listSubscriptions(db),
      ]);
      if (planError) throw planError;
      return res.status(200).json({
        success: true, plans: (plans || []).map(mapPlan), subscriptions,
        cardEligibility: mapEligibility(eligibility),
        membershipPlans: (membershipPlans || []).map((p: any) => ({ id: p.id, name: p.name, price: Number(p.price || 0), currency: p.currency || 'XOF' })),
        paymentReady: Boolean(process.env.PAYMETRUST_API_KEY && process.env.PAYMETRUST_SECRET_KEY),
      });
    }

    if (resource === 'plans' && req.method === 'POST') {
      const body = getBody(req);
      const name = String(body.name || '').trim();
      const price = Math.round(Number(body.price));
      if (!name || !Number.isFinite(price) || price <= 0) return res.status(400).json({ success: false, error: 'Nom et prix mensuel valides requis.' });
      if (Number(body.durationDays || 30) !== 30) return res.status(400).json({ success: false, error: 'Le LUMARÉEL TV Pass est exclusivement mensuel (30 jours).' });
      const id = String(body.id || 'tv_pass_monthly').trim();
      const row = {
        id, name, name_en: body.nameEn || null, description: String(body.description || ''),
        description_en: body.descriptionEn || null, price, currency: 'FCFA',
        duration_days: 30, billing_cycle_label: 'Par mois', billing_cycle_label_en: 'Per month',
        auto_renew: false, renewal_policy: String(body.renewalPolicy || 'Renouvellement manuel à chaque échéance.'),
        conditions: String(body.conditions || 'Accès personnel pendant 30 jours après confirmation du paiement.'),
        status: ['active','inactive','archived'].includes(body.status) ? body.status : 'active',
        updated_at: new Date().toISOString(),
      };
      const { error } = await db.from('tv_pass_plans').upsert(row, { onConflict: 'id' });
      if (error) throw error;
      const { data: plans, error: readError } = await db.from('tv_pass_plans').select('*').order('price', { ascending: true });
      if (readError) throw readError;
      return res.status(200).json({ success: true, plans: (plans || []).map(mapPlan) });
    }

    if (resource === 'card-eligibility' && req.method === 'PUT') {
      const body = getBody(req);
      const row = {
        id: 1,
        enabled_plan_ids: Array.isArray(body.enabledPlanIds) ? body.enabledPlanIds.map(String) : [],
        black_card_includes_vip_tier: body.blackCardIncludesVipTier !== false,
        card_access_enabled: body.cardAccessEnabled !== false,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await db.from('tv_card_eligibility').upsert(row, { onConflict: 'id' }).select('*').single();
      if (error) throw error;
      return res.status(200).json({ success: true, cardEligibility: mapEligibility(data) });
    }

    if (resource === 'subscriptions' && parts[1] === 'grant' && req.method === 'POST') {
      const body = getBody(req);
      const email = String(body.userEmail || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, error: 'Adresse e-mail invalide.' });
      const planId = String(body.planId || 'tv_pass_monthly');
      const { data: plan } = await db.from('tv_pass_plans').select('*').eq('id', planId).eq('status', 'active').maybeSingle();
      if (!plan) return res.status(400).json({ success: false, error: 'Formule mensuelle introuvable ou inactive.' });
      const now = new Date();
      const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const { error } = await db.from('tv_subscriptions').insert({
        user_id: null, user_email: email,
        user_name: String(body.userName || email.split('@')[0]).trim(),
        plan_id: plan.id, plan_name: plan.name, status: 'active', source: 'admin_grant',
        amount_paid: 0, currency: plan.currency || 'FCFA', auto_renew: false,
        starts_at: now.toISOString(), expires_at: expires.toISOString(),
      });
      if (error) throw error;
      return res.status(200).json({ success: true, subscriptions: await listSubscriptions(db) });
    }

    if (resource === 'subscriptions' && parts[1] && parts[2] === 'status' && (req.method === 'PATCH' || req.method === 'PUT')) {
      const id = parts[1];
      const body = getBody(req);
      const status = String(body.status || '');
      if (!['active','revoked','cancelled','expired'].includes(status)) return res.status(400).json({ success: false, error: 'Statut invalide.' });
      const { data: current, error: readError } = await db.from('tv_subscriptions').select('*').eq('id', id).maybeSingle();
      if (readError) throw readError;
      if (!current) return res.status(404).json({ success: false, error: 'Abonnement introuvable.' });
      const now = new Date();
      const patch: any = { status, auto_renew: false, updated_at: now.toISOString() };
      if (status === 'active' && (!current.expires_at || Date.parse(current.expires_at) <= now.getTime())) {
        patch.starts_at = now.toISOString();
        patch.expires_at = new Date(now.getTime() + 30 * 86400000).toISOString();
        patch.revoked_at = null; patch.revocation_reason = null;
      }
      if (status === 'revoked' || status === 'cancelled') {
        patch.revoked_at = now.toISOString();
        patch.revocation_reason = String(body.reason || 'Révoqué par l’administration LUMARÉEL.');
      }
      const { error } = await db.from('tv_subscriptions').update(patch).eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true, subscriptions: await listSubscriptions(db) });
    }

    return res.status(404).json({ success: false, error: 'Ressource TV administration introuvable.' });
  } catch (error: any) {
    console.error('[admin-tv]', error?.message || error);
    return res.status(500).json({ success: false, error: 'Erreur lors de la gestion LUMARÉEL TV.' });
  }
}
