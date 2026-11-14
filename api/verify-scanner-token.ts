import type { VercelRequest, VercelResponse } from '@vercel/node';
import { publicDb, methodNotAllowed, requireRole } from './_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Cache-Control', 'no-store');
  if (req.query.__route === 'session') {
    if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      let token = String(body.token || '').trim();
      let eventId = String(body.eventId || '').trim() || null;

      if (token === 'SEC_SESSION_AUTHORIZED') {
        return res.status(401).json({ valid: false, error: 'Jeton statique interdit.' });
      }

      if (!token) {
        const auth = await requireRole(req, ['super_admin', 'box_office']);
        if (!auth.ok) return res.status(auth.status).json({ valid: false, error: auth.error });

        let eventQuery = auth.db
          .from('events')
          .select('id,title,artist,venue,date,time')
          .limit(1);
        if (eventId) {
          eventQuery = auth.db
            .from('events')
            .select('id,title,artist,venue,date,time')
            .eq('id', eventId)
            .limit(1);
        } else {
          eventQuery = eventQuery
            .eq('status', 'published')
            .gte('date', new Date().toISOString().slice(0, 10))
            .order('date', { ascending: true });
        }

        const { data: eventRows, error: eventError } = await eventQuery;
        if (eventError) {
          console.error('[scanner-session] event lookup failed:', eventError.message);
          return res.status(503).json({ valid: false, error: 'Liste des événements indisponible.' });
        }
        const event = eventRows?.[0];
        if (!event?.id || !event.title) {
          return res.status(404).json({ valid: false, error: 'Aucun événement à contrôler. Sélectionnez un événement publié à venir.' });
        }
        eventId = event.id;

        const { data: existingTokens, error: listError } = await auth.db.rpc('list_lumareel_scanner_tokens', {
          p_event_id: eventId,
        });
        if (listError) {
          console.error('[scanner-session] scanner token list failed:', listError.message);
          return res.status(503).json({ valid: false, error: 'Registre des liens vigiles indisponible.' });
        }
        const activeToken = (Array.isArray(existingTokens) ? existingTokens : []).find((item: any) =>
          item && item.revoked !== true && item.token &&
          Number.isFinite(Date.parse(String(item.expiresAt || ''))) &&
          Date.parse(String(item.expiresAt)) > Date.now()
        );

        if (activeToken?.token) {
          token = String(activeToken.token);
        } else {
          const { data: created, error: createError } = await auth.db.rpc('create_lumareel_scanner_token', {
            p_event_id: event.id,
            p_event_title: event.title,
            p_artist: event.artist || '',
            p_venue: event.venue || '',
            p_event_date: event.date || '',
            p_event_time: event.time || '',
            p_duration_hours: 12,
          });
          if (createError || !created?.token) {
            console.error('[scanner-session] scanner token creation failed:', createError?.message);
            return res.status(503).json({ valid: false, error: 'Création du lien vigile impossible.' });
          }
          token = String(created.token);
        }
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
