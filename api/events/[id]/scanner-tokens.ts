import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireRole, methodNotAllowed } from '../../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const auth = await requireRole(req, ['super_admin', 'box_office']);
    if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });
    const eventId = String(req.query.id || '').trim();
    const { data, error } = await auth.db.rpc('list_lumareel_scanner_tokens', { p_event_id: eventId });
    if (error) {
      console.error('[scanner-tokens] Supabase RPC:', error.message);
      return res.status(500).json({ success: false, error: 'Impossible de charger les liens vigiles.' });
    }
    return res.status(200).json({ success: true, tokens: Array.isArray(data) ? data : [] });
  } catch (error) {
    console.error('[scanner-tokens] Unexpected error:', error);
    return res.status(500).json({ success: false, error: 'Erreur de lecture des liens vigiles.' });
  }
}
