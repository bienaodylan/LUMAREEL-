import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminDb, methodNotAllowed } from './_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const token = String(req.query.token || '').trim();
    const eventId = String(req.query.eventId || '').trim() || null;
    if (!token) return res.status(401).json({ valid: false, error: 'Jeton d’accès manquant.' });
    const { data, error } = await adminDb().rpc('verify_lumareel_scanner_token', {
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
