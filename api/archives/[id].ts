import type { VercelRequest, VercelResponse } from '@vercel/node';
import { methodNotAllowed, requireRole } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') return methodNotAllowed(res, ['DELETE']);

  const value = req.query.id;
  const id = typeof value === 'string' ? value.trim() : '';
  if (!id || id.length > 128) {
    return res.status(400).json({ success: false, error: 'Identifiant d’archive invalide.' });
  }

  const auth = await requireRole(req, ['super_admin']);
  if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const { error } = await auth.db.from('archives').delete().eq('id', id);
    if (error) {
      console.error('[api/archives/:id] delete failed:', error.message);
      return res.status(500).json({ success: false, error: 'Suppression de l’archive impossible.' });
    }
    return res.status(200).json({ success: true, id });
  } catch (error) {
    console.error('[api/archives/:id] unexpected error:', error);
    return res.status(500).json({ success: false, error: 'Service archives temporairement indisponible.' });
  }
}
