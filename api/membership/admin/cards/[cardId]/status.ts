import type { VercelRequest, VercelResponse } from '@vercel/node';
import { methodNotAllowed } from '../../../../_lib/supabase.js';
import { mapMembershipCard, requireMembershipAdmin, setPrivateNoStore } from '../../../_lib.js';

const allowed = new Set(['pending', 'active', 'suspended', 'revoked', 'expired']);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setPrivateNoStore(res);
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const admin = await requireMembershipAdmin(req, res);
  if (!admin) return;
  const cardId = String(req.query.cardId || '').trim();
  const status = String(req.body?.status || '').trim();
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';
  if (!/^[0-9a-f-]{36}$/i.test(cardId) || !allowed.has(status)) {
    return res.status(400).json({ success: false, error: 'Carte ou statut invalide.' });
  }
  try {
    const now = new Date().toISOString();
    const update = {
      card_status: status,
      revoked_at: status === 'revoked' ? now : null,
      revocation_reason: status === 'revoked' ? (reason || 'Révocation administrative') : null,
      updated_at: now,
    };
    const { data, error } = await admin.db.from('membership_cards').update(update).eq('id', cardId).select('*').maybeSingle();
    if (error) {
      console.error('[membership/card-status]', error.message);
      return res.status(500).json({ success: false, error: 'Mise à jour du statut impossible.' });
    }
    if (!data) return res.status(404).json({ success: false, error: 'Carte introuvable.' });

    if (status === 'suspended' || status === 'revoked' || status === 'expired') {
      const { error: tokenError } = await admin.db.from('membership_qr_tokens')
        .update({ is_current: false, status: 'revoked', revoked_at: now, revocation_reason: reason || `Carte ${status}` })
        .eq('card_id', cardId).eq('is_current', true).is('revoked_at', null);
      if (tokenError) {
        console.error('[membership/card-status] token revocation:', tokenError.message);
        return res.status(503).json({ success: false, error: 'Carte mise à jour, mais la révocation du QR doit être vérifiée.' });
      }
    }
    const { error: logError } = await admin.db.from('membership_event_logs').insert({
      actor_id: admin.user.id, action_type: 'card_status_changed', entity_type: 'membership_card',
      entity_id: cardId, details: { status, reason },
    });
    if (logError) console.error('[membership/card-status] audit log:', logError.message);
    return res.status(200).json({ success: true, card: mapMembershipCard(data) });
  } catch (error) {
    console.error('[membership/card-status] unexpected:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors du changement de statut.' });
  }
}
