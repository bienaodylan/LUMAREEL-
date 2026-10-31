import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomBytes } from 'node:crypto';
import { requireRole, methodNotAllowed } from '../../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const auth = await requireRole(req, ['super_admin', 'box_office']);
    if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });
    const eventId = String(req.query.id || '').trim();
    const { data: event, error: eventError } = await auth.db.from('events').select('id,title,artist').eq('id', eventId).maybeSingle();
    if (eventError || !event) return res.status(404).json({ success: false, error: 'Concert introuvable.' });
    const durationHours = Math.min(72, Math.max(1, Number(req.body?.durationHours) || 24));
    const token = 'LMR_GATE_' + randomBytes(32).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + durationHours * 3600000).toISOString();
    const { error } = await auth.db.from('scanner_tokens').insert({
      token, event_id: eventId, created_by: auth.user.email,
      created_at: new Date().toISOString(), expires_at: expiresAt, is_revoked: false
    });
    if (error) throw error;
    const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const fullUrl = `${protocol}://${host}/?page=gate_scanner&eventId=${encodeURIComponent(eventId)}&token=${encodeURIComponent(token)}`;
    return res.status(201).json({
      success: true, token, expiresAt, fullUrl, eventId,
      eventTitle: event.title, artistName: event.artist
    });
  } catch (error: any) {
    console.error('scanner-token:', error);
    return res.status(500).json({ success: false, error: error.message || 'Erreur de création du lien de contrôle.' });
  }
}
