import type { VercelRequest, VercelResponse } from '@vercel/node';
import { methodNotAllowed } from '../../../../_lib/supabase.js';
import { mapMembershipCard, requireMembershipAdmin, setPrivateNoStore } from '../../../_lib.js';

const allowed = new Set(['requested','payment_pending','approved','in_production','printed','quality_checked','ready_for_dispatch','shipped','delivered','cancelled','blocked','lost','returned','replacement_requested','defective','replaced']);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setPrivateNoStore(res);
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const admin = await requireMembershipAdmin(req, res);
  if (!admin) return;
  const cardId = String(req.query.cardId || '').trim();
  const physicalStatus = String(req.body?.physicalStatus || '').trim();
  const trackingNumber = typeof req.body?.trackingNumber === 'string' ? req.body.trackingNumber.trim().slice(0, 100) : '';
  if (!/^[0-9a-f-]{36}$/i.test(cardId) || !allowed.has(physicalStatus)) {
    return res.status(400).json({ success: false, error: 'Carte ou statut physique invalide.' });
  }
  try {
    const now = new Date().toISOString();
    const { data, error } = await admin.db.from('membership_cards').update({
      physical_card_status: physicalStatus,
      physical_card_tracking_number: trackingNumber || null,
      updated_at: now,
    }).eq('id', cardId).select('*').maybeSingle();
    if (error) {
      console.error('[membership/physical-status]', error.message);
      return res.status(500).json({ success: false, error: 'Mise à jour de la fabrication impossible.' });
    }
    if (!data) return res.status(404).json({ success: false, error: 'Carte introuvable.' });
    const { error: logError } = await admin.db.from('membership_event_logs').insert({
      actor_id: admin.user.id, action_type: 'physical_card_status_changed', entity_type: 'membership_card',
      entity_id: cardId, details: { physicalStatus, trackingNumber: trackingNumber || null },
    });
    if (logError) console.error('[membership/physical-status] audit log:', logError.message);
    return res.status(200).json({ success: true, card: mapMembershipCard(data) });
  } catch (error) {
    console.error('[membership/physical-status] unexpected:', error);
    return res.status(500).json({ success: false, error: 'Erreur de mise à jour physique.' });
  }
}
