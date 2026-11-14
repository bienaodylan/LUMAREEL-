import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireRole, methodNotAllowed } from '../../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Pragma', 'no-cache');
  try {
    const auth = await requireRole(req, ['super_admin', 'box_office']);
    if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });
    const eventId = String(req.query.id || '').trim();

    if (req.method === 'GET') {
      const { data, error } = await auth.db.rpc('list_lumareel_scanner_tokens', { p_event_id: eventId });
      if (error) {
        console.error('[scanner-tokens] Supabase RPC:', error.message);
        return res.status(500).json({ success: false, error: 'Impossible de charger les liens vigiles.' });
      }
      return res.status(200).json({ success: true, tokens: Array.isArray(data) ? data : [] });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const eventTitle = String(body.eventTitle || '').trim();
      if (!eventId || !eventTitle) return res.status(400).json({ success: false, error: 'Informations du concert manquantes.' });
      const durationHours = Math.min(72, Math.max(1, Number(body.durationHours) || 24));
      const { data, error } = await auth.db.rpc('create_lumareel_scanner_token', {
        p_event_id: eventId, p_event_title: eventTitle.slice(0, 250),
        p_artist: String(body.artistName || '').slice(0, 160),
        p_venue: String(body.venue || '').slice(0, 250),
        p_event_date: String(body.date || '').slice(0, 40),
        p_event_time: String(body.time || '').slice(0, 40),
        p_duration_hours: durationHours,
      });
      if (error || !data?.token) {
        console.error('[scanner-token] Supabase RPC:', error?.message);
        return res.status(error?.code === '42501' ? 403 : 500).json({ success: false, error: error?.code === '42501' ? 'Accès non autorisé.' : 'Impossible de créer le lien vigile.' });
      }
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const fullUrl = `https://${host}/?page=gate_scanner&eventId=${encodeURIComponent(eventId)}&token=${encodeURIComponent(data.token)}`;
      return res.status(201).json({ success: true, ...data, fullUrl, scannerToken: { ...data, id: data.token, eventId, revoked: false } });
    }
    return methodNotAllowed(res, ['GET', 'POST']);
  } catch (error) {
    console.error('[scanner-tokens] Unexpected error:', error);
    return res.status(500).json({ success: false, error: 'Erreur serveur sur les liens vigiles.' });
  }
}
