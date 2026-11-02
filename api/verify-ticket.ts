import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminDb, methodNotAllowed } from './_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const ticketCode = String(body.ticketId || body.token || body.id || body.qrData || '').trim();
    const scannerToken = String(body.scannerToken || '').trim();
    const eventId = String(body.eventId || '').trim() || null;
    const agentName = String(body.gateAgentId || body.gateAgentName || 'Agent de contrôle').slice(0, 100);
    if (!ticketCode) return res.status(400).json({ valid: false, status: 'INVALID', error: 'Jeton ou numéro de série requis.' });
    if (!scannerToken) return res.status(403).json({ valid: false, status: 'INVALID', error: 'Lien vigile requis.' });

    const { data, error } = await adminDb().rpc('verify_and_check_in_physical_ticket', {
      p_token: ticketCode,
      p_event_id: eventId,
      p_agent_name: agentName,
      p_scanner_token: scannerToken,
    });
    if (error) {
      console.error('[verify-ticket] Supabase RPC:', error.message);
      return res.status(500).json({ valid: false, status: 'INVALID', error: 'Registre de billetterie indisponible.' });
    }
    const status = String(data?.status || 'INVALID');
    const httpStatus = status === 'SUCCESS' ? 200 : status === 'ALREADY_USED' || status === 'CANCELLED' || status === 'WRONG_EVENT' ? 403 : 404;
    return res.status(httpStatus).json(data);
  } catch (error) {
    console.error('[verify-ticket] Unexpected error:', error);
    return res.status(500).json({ valid: false, status: 'INVALID', error: 'Erreur inattendue du serveur.' });
  }
}
