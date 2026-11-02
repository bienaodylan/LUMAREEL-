import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireRole, methodNotAllowed } from '../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  try {
    const auth = await requireRole(req, ['super_admin', 'box_office']);
    if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const requestId = String(body.requestId || '').trim();
    const eventId = String(body.eventId || '').trim();
    const categoryId = String(body.categoryId || '').trim();
    const quantity = Number(body.quantity);

    if (requestId.length < 8 || requestId.length > 100 || !eventId || !categoryId ||
        !Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
      return res.status(400).json({ success: false, error: 'Identifiant, événement, catégorie ou quantité invalide.' });
    }

    const { data, error } = await auth.db.rpc('create_physical_ticket_batch', {
      p_request_id: requestId,
      p_event_id: eventId,
      p_event_title: String(body.eventTitle || '').slice(0, 250),
      p_event_artist: String(body.artist || '').slice(0, 160),
      p_event_date: String(body.eventDate || '').slice(0, 40),
      p_event_time: String(body.eventTime || '').slice(0, 40),
      p_event_venue: String(body.eventVenue || '').slice(0, 250),
      p_category_id: categoryId,
      p_category_name: String(body.categoryName || '').slice(0, 160),
      p_quantity: quantity,
      p_actor_email: auth.user.email || '',
      p_created_by: auth.user.email || 'LUMARÉEL CO.',
    });
    if (error) {
      console.error('[print-batch] Supabase RPC:', error.message);
      const denied = error.code === '42501';
      return res.status(denied ? 403 : 500).json({ success: false, error: denied ? 'Accès non autorisé.' : 'Le registre Supabase n’a pas pu créer ce lot.' });
    }
    if (!data?.success || !Array.isArray(data.tickets) || data.tickets.length !== quantity) {
      return res.status(500).json({ success: false, error: 'Réponse incomplète du registre de billetterie.' });
    }
    return res.status(201).json(data);
  } catch (error: any) {
    console.error('[print-batch] Unexpected error:', error);
    return res.status(500).json({ success: false, error: 'Erreur interne pendant la création du lot.' });
  }
}
