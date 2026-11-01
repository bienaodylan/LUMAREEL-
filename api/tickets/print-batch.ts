import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireRole, methodNotAllowed } from '../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const auth = await requireRole(req, ['super_admin', 'box_office']);
    if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });
    const { eventId, categoryId, quantity } = req.body || {};
    if (!eventId || !categoryId || !Number.isInteger(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > 10000) {
      return res.status(400).json({ success: false, error: 'Événement, catégorie et quantité (1 à 10 000) requis.' });
    }
    const { data, error } = await auth.db.rpc('create_physical_ticket_batch', {
      p_event_id: String(eventId), p_category_id: String(categoryId),
      p_quantity: Number(quantity), p_created_by: auth.user.email || 'LUMARÉEL CO.'
    });
    if (error) throw error;
    return res.status(201).json(data);
  } catch (error: any) {
    console.error('print-batch:', error);
    return res.status(500).json({ success: false, error: error.message || 'Erreur de création du lot.' });
  }
}
