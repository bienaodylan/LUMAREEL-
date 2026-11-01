import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireRole, methodNotAllowed } from '../../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const auth = await requireRole(req, ['super_admin', 'box_office']);
    if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });
    const eventId = String(req.query.id || '').trim();
    const { data, error } = await auth.db.from('scanner_tokens').select('*').eq('event_id', eventId).order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    const tokens = (data || []).map((row: any) => ({
      id: row.token, token: row.token, eventId: row.event_id,
      createdBy: row.created_by, createdAt: row.created_at,
      expiresAt: row.expires_at, revoked: row.is_revoked,
    }));
    return res.status(200).json({ success: true, tokens });
  } catch (error: any) {
    console.error('scanner-tokens:', error);
    return res.status(500).json({ success: false, error: error.message || 'Erreur de lecture des liens vigiles.' });
  }
}
