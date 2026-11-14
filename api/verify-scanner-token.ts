import type { VercelRequest, VercelResponse } from '@vercel/node';
import { publicDb, methodNotAllowed } from './_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.query.__route === 'session') {
    if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const token = String(body.token || '').trim();
      const eventId = String(body.eventId || '').trim() || null;
      if (!token || token === 'SEC_SESSION_AUTHORIZED') {
        return res.status(401).json({ valid: false, error: 'Un lien vigile personnel est obligatoire.' });
      }
      const { data, error } = await publicDb().rpc('verify_lumareel_scanner_token', {
        p_token: token,
        p_event_id: eventId,
      });
      if (error) {
        console.error('[scanner-session] Supabase RPC:', error.message);
        return res.status(503).json({ valid: false, error: 'Vérification du lien vigile indisponible.' });
      }
      if (!data?.valid) {
        return res.status(403).json({ valid: false, error: data?.error || 'Lien vigile invalide, révoqué ou expiré.' });
      }
      const event = data.event ? {
        id: data.event.id,
        title: data.event.title,
        artist: data.event.artist,
        venue: data.event.venue,
        date: data.event.date,
        time: data.event.time,
      } : undefined;
      return res.status(200).json({ valid: true, eventId: event?.id || eventId, event, scannerToken: token });
    } catch (error) {
      console.error('[scanner-session] Unexpected error:', error);
      return res.status(400).json({ valid: false, error: 'Demande de session vigile invalide.' });
    }
  }

  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const token = String(req.query.token || '').trim();
    const eventId = String(req.query.eventId || '').trim() || null;
    if (!token) return res.status(401).json({ valid: false, error: 'Jeton d’accès manquant.' });
    const { data, error } = await publicDb().rpc('verify_lumareel_scanner_token', {
      p_token: token,
      p_event_id: eventId,
    });
    if (error) {
      console.error('[verify-scanner-token] Supabase RPC:', error.message);
      return res.status(500).json({ valid: false, error: 'Vérification du lien indisponible.' });
    }
    if (!data?.valid) return res.status(403).json({ valid: false, error: data?.error || 'Jeton invalide ou expiré.' });
    return res.status(200).json(data);
  } catch (error) {
    console.error('[verify-scanner-token] Unexpected error:', error);
    return res.status(500).json({ valid: false, error: 'Erreur de vérification.' });
  }
}
