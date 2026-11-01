/**
 * POST /api/verify-ticket
 * Contrôle d'entrée des billets physiques. Un billet ne peut être validé qu'UNE fois :
 * la mise à jour est faite en une seule opération côté base (aucun double passage possible).
 */
import { timingSafeEqual } from 'node:crypto';

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
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
    throw new ApiError(502, 'Base de données injoignable.');
  }
  const raw = await response.text();
  let data: any = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }
  if (!response.ok) {
    throw new ApiError(500, (data && data.message) || `Erreur base de données (${response.status}).`);
  }
  return data;
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

const enc = encodeURIComponent;

async function batchOf(ref: string) {
  const rows = await sb(`print_batches?ref=eq.${enc(ref)}&select=*`);
  return Array.isArray(rows) ? rows[0] : undefined;
}

function publicTicket(row: any, batch: any, scannedAt?: string) {
  return {
    id: row.id,
    holderName: 'Billet physique',
    categoryName: batch?.category_name || '',
    eventTitle: batch?.event_title || '',
    eventVenue: batch?.event_venue || '',
    eventDate: batch?.event_date || '',
    eventTime: batch?.event_time || '',
    serialNumber: row.serial_number,
    scannedAt: scannedAt || row.checked_in_at || undefined,
    status: row.status,
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ valid: false, error: 'Méthode non autorisée.' });
    }
    const { url, serviceKey, adminKey } = env();
    if (!url || !serviceKey) {
      return res.status(500).json({ valid: false, error: 'Serveur non configuré (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const input = String(body.ticketId || body.token || body.id || body.qrData || '').trim();
    if (!input) return res.status(400).json({ valid: false, error: 'ID ou jeton du billet requis.' });

    // Le jeton secret suffit. Le numéro de série (devinable) n'est accepté qu'avec la clé d'administration.
    const isToken = /^TKT_SEC_[A-Za-z0-9]+$/i.test(input);
    const provided = String(req.headers['x-admin-key'] || '');
    const isAdmin = !!adminKey && !!provided && safeEqual(provided, adminKey);
    if (!isToken && !isAdmin) {
      return res.status(404).json({
        valid: false,
        error: 'Billet introuvable ou signature invalide',
        message: 'Le billet scanné ne figure pas dans le registre LUMARÉEL.',
      });
    }

    const column = isToken ? 'token' : 'serial_number';
    const value = input.toUpperCase();
    const scanTimestamp = new Date().toISOString();
    const agent = String(body.gateAgentId || 'Vigile LUMARÉEL CO.').slice(0, 100);

    // Validation atomique : réussit uniquement si le billet est encore "valid".
    const updated = await sb(`print_tickets?${column}=eq.${enc(value)}&status=eq.valid`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: { status: 'used', checked_in_at: scanTimestamp, checked_in_by: agent },
    });

    if (Array.isArray(updated) && updated.length === 1) {
      const row = updated[0];
      const batch = await batchOf(row.batch_ref);
      const ticket = publicTicket(row, batch, scanTimestamp);
      return res.status(200).json({
        valid: true,
        message: 'ACCÈS AUTORISÉ',
        scannedAt: scanTimestamp,
        holderName: ticket.holderName,
        categoryName: ticket.categoryName,
        ticket,
      });
    }

    // Pas validé : introuvable, déjà utilisé ou annulé.
    const found = await sb(`print_tickets?${column}=eq.${enc(value)}&select=*`);
    const row = Array.isArray(found) ? found[0] : undefined;
    if (!row) {
      return res.status(404).json({
        valid: false,
        error: 'Billet introuvable ou signature invalide',
        message: 'Le billet scanné ne figure pas dans le registre LUMARÉEL.',
      });
    }
    const batch = await batchOf(row.batch_ref);
    const ticket = publicTicket(row, batch);
    if (row.status === 'cancelled') {
      return res.status(403).json({ valid: false, error: 'Billet annulé', message: 'Ce billet a été annulé. Entrée refusée.', ...ticket, ticket });
    }
    return res.status(403).json({
      valid: false,
      error: 'Billet déjà utilisé',
      message: 'Ce billet a déjà été validé à l’entrée. Risque de contrefaçon ou de double utilisation.',
      holderName: ticket.holderName,
      categoryName: ticket.categoryName,
      eventTitle: ticket.eventTitle,
      serialNumber: ticket.serialNumber,
      scannedAt: ticket.scannedAt,
      ticket,
    });
  } catch (error) {
    if (error instanceof ApiError) return res.status(error.status).json({ valid: false, error: error.message });
    console.error('verify-ticket error', error);
    return res.status(500).json({ valid: false, error: 'Erreur inattendue du serveur.' });
  }
}
