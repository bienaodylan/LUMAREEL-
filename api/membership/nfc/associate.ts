import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireRole, methodNotAllowed } from '../../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const auth = await requireRole(req, ['super_admin']);
    if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const cardId = String(body.cardId || '').trim();
    const chipReference = String(body.chipReference || '').trim();
    const chipType = String(body.chipType || 'MIFARE_DESFIRE_EV3');
    if (!cardId || !chipReference) return res.status(400).json({ success:false,error:'Carte et référence NFC requises.' });
    const { data, error } = await auth.db.rpc('lumareel_nfc_associate', {
      p_card_id: cardId, p_chip_reference: chipReference, p_chip_type: chipType,
    });
    if (error) {
      const status = error.code === '42501' ? 403 : ['22023','23514','23505'].includes(error.code || '') ? 400 : 500;
      console.error('[nfc-associate] RPC:', error.message);
      return res.status(status).json({ success:false,error:status===500?'Association NFC indisponible.':error.message });
    }
    return res.status(201).json({ success:true, credential:data });
  } catch (error) {
    console.error('[nfc-associate] Unexpected:', error);
    return res.status(500).json({ success:false,error:'Erreur inattendue d’association NFC.' });
  }
}
