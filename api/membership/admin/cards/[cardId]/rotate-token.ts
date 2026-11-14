import { createHash, randomBytes } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { methodNotAllowed } from '../../../../_lib/supabase.js';
import { requireMembershipAdmin, setPrivateNoStore } from '../../../_lib.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setPrivateNoStore(res);
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const admin = await requireMembershipAdmin(req, res);
  if (!admin) return;
  const cardId = String(req.query.cardId || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(cardId)) return res.status(400).json({ success: false, error: 'Identifiant de carte invalide.' });

  try {
    const { data: card, error: cardError } = await admin.db.from('membership_cards')
      .select('id,card_number,card_status').eq('id', cardId).maybeSingle();
    if (cardError) {
      console.error('[membership/rotate-token] card lookup:', cardError.message);
      return res.status(503).json({ success: false, error: 'Registre des cartes indisponible.' });
    }
    if (!card) return res.status(404).json({ success: false, error: 'Carte introuvable.' });
    if (card.card_status !== 'active') return res.status(409).json({ success: false, error: 'Seules les cartes actives peuvent recevoir un nouveau QR.' });

    const now = new Date().toISOString();
    const { error: revokeError } = await admin.db.from('membership_qr_tokens')
      .update({ is_current: false, status: 'rotated', revoked_at: now, revocation_reason: 'Rotation administrative' })
      .eq('card_id', cardId).eq('is_current', true).is('revoked_at', null);
    if (revokeError) {
      console.error('[membership/rotate-token] revoke:', revokeError.message);
      return res.status(503).json({ success: false, error: 'Révocation de l’ancien QR impossible.' });
    }

    const token = `LMR_CARD_${randomBytes(32).toString('base64url')}`;
    const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex');
    const { data: previous } = await admin.db.from('membership_qr_tokens')
      .select('token_version').eq('card_id', cardId).order('token_version', { ascending: false }).limit(1).maybeSingle();
    const tokenVersion = Number(previous?.token_version || 0) + 1;
    const { data: inserted, error: insertError } = await admin.db.from('membership_qr_tokens').insert({
      card_id: cardId, token_hash: tokenHash, token_prefix: token.slice(0, 16),
      token_version: tokenVersion, is_current: true, status: 'active', issued_at: now,
    }).select('id,token_prefix,token_version,issued_at').single();
    if (insertError || !inserted) {
      console.error('[membership/rotate-token] insert:', insertError?.message || 'no row');
      return res.status(503).json({ success: false, error: 'Nouveau QR non créé. La carte reste sans jeton actif, relancez la rotation.' });
    }
    const { error: logError } = await admin.db.from('membership_event_logs').insert({
      actor_id: admin.user.id, action_type: 'membership_qr_rotated', entity_type: 'membership_card',
      entity_id: cardId, details: { tokenVersion, tokenPrefix: inserted.token_prefix },
    });
    if (logError) console.error('[membership/rotate-token] audit log:', logError.message);
    return res.status(200).json({ success: true, token, tokenVersion, issuedAt: inserted.issued_at, cardNumber: card.card_number, oneTimeDisplay: true });
  } catch (error) {
    console.error('[membership/rotate-token] unexpected:', error);
    return res.status(500).json({ success: false, error: 'Erreur de rotation du QR.' });
  }
}
