import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminDb, methodNotAllowed } from './_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const token = String(req.query.token || '').trim();
    const eventId = String(req.query.eventId || '').trim();
    if (!token) return res.status(401).json({ valid: false, error: 'Jeton d’accès manquant.' });
    const db = adminDb();
    const { data: gate, error } = await db.from('scanner_tokens').select('token,event_id,created_by,expires_at,is_revoked').eq('token', token).eq('is_revoked', false).gt('expires_at', new Date().toISOString()).maybeSingle();
    if (error || !gate) return res.status(403).json({ valid: false, error: 'Jeton invalide, révoqué ou expiré.' });
    if (eventId && eventId !== gate.event_id) return res.status(403).json({ valid: false, error: 'Jeton non autorisé pour cet événement.' });
    const { data: event } = await db.from('events').select('id,title,artist,venue,date,time').eq('id', gate.event_id).maybeSingle();
    if (!event) return res.status(404).json({ valid: false, error: 'Événement introuvable.' });
    return res.status(200).json({ valid: true, token: gate, event, expiresAt: gate.expires_at });
  } catch (error: any) {
    console.error('verify-scanner-token:', error);
    return res.status(500).json({ valid: false, error: error.message || 'Erreur de vérification.' });
  }
}
