import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminDb, methodNotAllowed } from './_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const { token, ticketId, eventId, gateAgentId, scannerToken } = req.body || {};
    const code = String(ticketId || token || '').trim();
    if (!code) return res.status(400).json({ valid: false, error: 'Code billet requis.' });
    if (!scannerToken) return res.status(401).json({ valid: false, error: 'Jeton de contrôle requis.' });
    const db = adminDb();
    const { data: gate, error: gateError } = await db.from('scanner_tokens').select('token,event_id,created_by,expires_at,is_revoked').eq('token', scannerToken).eq('is_revoked', false).gt('expires_at', new Date().toISOString()).maybeSingle();
    if (gateError || !gate) return res.status(403).json({ valid: false, error: 'Accès contrôleur invalide ou expiré.' });
    const effectiveEventId = eventId || gate.event_id;
    if (gate.event_id !== effectiveEventId) return res.status(403).json({ valid: false, error: 'Ce contrôleur n’est pas autorisé pour cet événement.' });
    const { data, error } = await db.rpc('verify_and_check_in_ticket', {
      p_token: code, p_event_id: effectiveEventId, p_agent_name: String(gateAgentId || gate.created_by || 'Agent de contrôle')
    });
    if (error) throw error;
    const status = data?.status === 'SUCCESS' ? 200 : data?.status === 'ALREADY_USED' || data?.status === 'CANCELLED' || data?.status === 'WRONG_EVENT' ? 403 : 404;
    return res.status(status).json(data);
  } catch (error: any) {
    console.error('verify-ticket:', error);
    return res.status(500).json({ valid: false, error: error.message || 'Erreur de contrôle.' });
  }
}
