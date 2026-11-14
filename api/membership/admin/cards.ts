import type { VercelRequest, VercelResponse } from '@vercel/node';
import { methodNotAllowed } from '../../_lib/supabase.js';
import { mapMembershipCard, requireMembershipAdmin, setPrivateNoStore } from '../_lib.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setPrivateNoStore(res);
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const admin = await requireMembershipAdmin(req, res);
  if (!admin) return;
  try {
    const { data, error } = await admin.db.from('membership_cards').select('*')
      .order('created_at', { ascending: false }).limit(1000);
    if (error) {
      console.error('[membership/admin/cards]', error.message);
      return res.status(503).json({ success: false, error: 'Registre des membres indisponible.' });
    }
    return res.status(200).json({ success: true, cards: (data || []).map(mapMembershipCard) });
  } catch (error) {
    console.error('[membership/admin/cards] unexpected:', error);
    return res.status(500).json({ success: false, error: 'Impossible de charger les cartes.' });
  }
}
