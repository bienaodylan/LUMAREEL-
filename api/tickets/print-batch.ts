/**
 * POST /api/tickets/print-batch
 * Crée et enregistre un lot de billets physiques AVANT l'impression des QR codes.
 * - protégé par la clé d'administration (en-tête x-admin-key) ;
 * - idempotent : renvoyer la même demande (requestId) ne crée jamais un 2e lot ;
 * - tout ou rien : si l'enregistrement échoue, aucun billet n'existe.
 */
import { randomBytes, timingSafeEqual } from 'node:crypto';

class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function env() {
  return {
    url: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, ''),
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    adminKey: process.env.ADMIN_API_KEY || '',
  };
}

async function sb(
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
): Promise<any> {
  const { url, serviceKey } = env();
  let response: Response;
  try {
    response = await fetch(`${url}/rest/v1/${path}`, {
      method: init.method || 'GET',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(502, 'Base de données injoignable. Réessayez dans un instant.', 'DB_UNREACHABLE');
  }
  if (response.status === 416) return [];
  const text = await response.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!response.ok) {
    const code = data && typeof data === 'object' ? data.code : undefined;
    if (code === 'PGRST205' || code === '42P01' || code === 'PGRST202') {
      throw new ApiError(500, 'Tables absentes dans Supabase : exécutez le fichier supabase-tickets.sql.', 'TABLES_MISSING');
    }
    if (response.status === 401 || response.status === 403) {
      throw new ApiError(500, 'Clé Supabase refusée : vérifiez SUPABASE_SERVICE_ROLE_KEY dans Vercel.', 'KEY_REJECTED');
    }
    const message = data && typeof data === 'object' && data.message ? data.message : `Erreur base de données (${response.status}).`;
    throw new ApiError(response.status === 409 ? 409 : 500, message, code);
  }
  return data;
}

/** Lit toutes les lignes, par pages de 1000 (limite par défaut de Supabase). */
async function readAll(path: string): Promise<any[]> {
  const rows: any[] = [];
  const PAGE = 1000;
  for (let from = 0; from < 20000; from += PAGE) {
    const page = await sb(path, { headers: { 'Range-Unit': 'items', Range: `${from}-${from + PAGE - 1}` } });
    if (!Array.isArray(page)) break;
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

const text = (value: unknown, max = 200): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

async function listTickets(batchRef: string) {
  const rows = await readAll(
    `print_tickets?batch_ref=eq.${encodeURIComponent(batchRef)}&select=id,serial_number,token&order=serial_number.asc`
  );
  return rows.map((row) => ({ id: row.id, serialNumber: row.serial_number, token: row.token }));
}

async function replayBatch(requestId: string) {
  const found = await sb(`print_batches?request_id=eq.${encodeURIComponent(requestId)}&select=ref,quantity`);
  const batch = Array.isArray(found) ? found[0] : null;
  if (!batch) return null;
  const tickets = await listTickets(batch.ref);
  if (tickets.length === batch.quantity) {
    return { success: true, reused: true, batchRef: batch.ref, tickets };
  }
  if (tickets.length === 0) {
    // Lot vide laissé par une interruption : on le supprime et on recommence proprement.
    await sb(`print_batches?ref=eq.${encodeURIComponent(batch.ref)}`, { method: 'DELETE' });
    return null;
  }
  throw new ApiError(409, 'Un lot incomplet existe pour cette demande. Relancez la préparation.', 'BATCH_INCOMPLETE');
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });
    }

    const { url, serviceKey, adminKey } = env();
    const missing = [
      !url && 'SUPABASE_URL',
      !serviceKey && 'SUPABASE_SERVICE_ROLE_KEY',
      !adminKey && 'ADMIN_API_KEY',
    ].filter(Boolean);
    if (missing.length) {
      return res.status(500).json({
        success: false,
        code: 'SERVER_NOT_CONFIGURED',
        error: `Serveur non configuré : variable(s) manquante(s) dans Vercel : ${missing.join(', ')}.`,
      });
    }

    const provided = String(req.headers['x-admin-key'] || '');
    if (!provided || !safeEqual(provided, adminKey)) {
      return res.status(401).json({ success: false, code: 'UNAUTHORIZED', error: 'Clé d’administration absente ou incorrecte.' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const requestId = text(body.requestId, 100);
    const eventId = text(body.eventId);
    const categoryId = text(body.categoryId);
    const quantity = Number(body.quantity);

    if (requestId.length < 8) return res.status(400).json({ success: false, error: 'Identifiant de demande manquant.' });
    if (!eventId || !categoryId) return res.status(400).json({ success: false, error: 'Concert et catégorie requis.' });
    if (!text(body.eventTitle) || !text(body.artist) || !text(body.eventDate) || !text(body.categoryName)) {
      return res.status(400).json({ success: false, error: 'Informations du concert incomplètes.' });
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
      return res.status(400).json({ success: false, error: 'La quantité doit être comprise entre 1 et 10 000 billets.' });
    }

    // 1. Même demande déjà traitée ? On renvoie le même lot, sans rien recréer.
    const replay = await replayBatch(requestId);
    if (replay) return res.status(200).json(replay);

    // 2. Réserve les numéros de série (atomique côté base : jamais de doublon).
    const start = Number(await sb('rpc/reserve_print_serials', { method: 'POST', body: { p_event: eventId, p_qty: quantity } }));
    if (!Number.isInteger(start) || start < 1) {
      throw new ApiError(500, 'Réservation des numéros de série impossible.', 'SERIAL_RESERVATION');
    }

    // 3. Enregistre le lot puis tous ses billets en une seule requête (tout ou rien).
    const batchRef = `LMR-LOT-${randomBytes(5).toString('hex').toUpperCase()}`;
    const artistCode = text(body.artist).replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'LMR';
    const year = new Date().getFullYear();

    try {
      await sb('print_batches', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: {
          ref: batchRef,
          request_id: requestId,
          event_id: eventId,
          event_title: text(body.eventTitle),
          event_artist: text(body.artist),
          event_date: text(body.eventDate, 40),
          event_time: text(body.eventTime, 40) || null,
          event_venue: text(body.eventVenue) || null,
          category_id: categoryId,
          category_name: text(body.categoryName),
          quantity,
        },
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === '23505') {
        const again = await replayBatch(requestId); // deux clics simultanés : on renvoie le premier lot
        if (again) return res.status(200).json(again);
      }
      throw error;
    }

    const rows = Array.from({ length: quantity }, (_, index) => ({
      batch_ref: batchRef,
      serial_number: `LMR-${year}-${artistCode}-P${String(start + index).padStart(5, '0')}`,
      token: `TKT_SEC_${randomBytes(12).toString('hex').toUpperCase()}`,
    }));

    try {
      await sb('print_tickets', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: rows });
    } catch (error) {
      await sb(`print_batches?ref=eq.${encodeURIComponent(batchRef)}`, { method: 'DELETE' }).catch(() => undefined);
      throw error;
    }

    return res.status(201).json({ success: true, reused: false, batchRef, tickets: await listTickets(batchRef) });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ success: false, code: error.code, error: error.message });
    }
    console.error('print-batch error', error);
    return res.status(500).json({ success: false, error: 'Erreur inattendue du serveur. Aucun billet n’a été créé.' });
  }
}
