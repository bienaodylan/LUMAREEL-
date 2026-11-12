import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireRole, methodNotAllowed } from '../../_lib/supabase.js';

const CHIP_TYPES = new Set(['MIFARE_DESFIRE_EV2', 'MIFARE_DESFIRE_EV3', 'OTHER']);
const VALID_STATUSES = new Set(['verified', 'ready', 'shipped', 'delivered', 'blocked', 'returned']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NFC_REFERENCE = /^[A-Za-z0-9_-]{16,160}$/;

class InputError extends Error {}

function readText(value: unknown, max: number, label: string): string {
  if (value == null) return '';
  if (typeof value !== 'string') throw new InputError(`${label} doit être une chaîne de caractères.`);
  const result = value.trim();
  if (result.length > max) throw new InputError(`${label} dépasse ${max} caractères.`);
  return result;
}

function parseBody(req: VercelRequest): Record<string, unknown> {
  let value: unknown = req.body ?? {};
  if (typeof value === 'string') {
    try { value = JSON.parse(value || '{}'); }
    catch { throw new InputError('Corps JSON invalide.'); }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new InputError('Le corps de la requête doit être un objet JSON.');
  }
  return value as Record<string, unknown>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!['GET', 'POST', 'PATCH'].includes(req.method || '')) return methodNotAllowed(res, ['GET', 'POST', 'PATCH']);
  const auth = await requireRole(req, ['super_admin']);
  if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    if (req.method === 'GET') {
      const { data, error } = await auth.db.from('membership_physical_card_stock')
        .select('id,manufacturer_serial,chip_reference,batch_reference,chip_type,stock_status,membership_card_id,received_at,verified_at,shipped_at,delivered_at,carrier,tracking_reference')
        .order('received_at', { ascending: false }).limit(1000);
      if (error) throw error;
      return res.status(200).json({ success: true, stock: data || [] });
    }

    const body = parseBody(req);
    if (req.method === 'PATCH') {
      const stockId = readText(body.stockId, 36, 'Identifiant de carte');
      const status = readText(body.status, 30, 'Statut');
      const carrier = readText(body.carrier, 100, 'Transporteur');
      const trackingReference = readText(body.trackingReference, 160, 'Référence de suivi');
      if (!UUID.test(stockId) || !VALID_STATUSES.has(status)) {
        return res.status(400).json({ success: false, error: 'Identifiant UUID et statut logistique valides requis.' });
      }
      const { data, error } = await auth.db.rpc('lumareel_update_received_card_status', {
        p_stock_id: stockId, p_status: status, p_carrier: carrier || null,
        p_tracking_reference: trackingReference || null,
      });
      if (error) {
        const code = error.code || '';
        const statusCode = code === '42501' ? 403 : code === 'P0002' ? 404
          : code === '22023' ? 400 : ['23514', '23505'].includes(code) ? 409 : 500;
        console.error('[physical-card-stock] status RPC:', error.message);
        return res.status(statusCode).json({ success: false, error: statusCode === 500 ? 'Transition logistique indisponible.' : error.message });
      }
      return res.status(200).json({ success: true, stock: data });
    }

    if (body.action === 'associate') {
      const stockId = readText(body.stockId, 36, 'Identifiant de carte reçue');
      const membershipCardId = readText(body.membershipCardId, 36, 'Identifiant de carte membre');
      if (!UUID.test(stockId) || !UUID.test(membershipCardId)) {
        return res.status(400).json({ success: false, error: 'Deux identifiants UUID valides sont requis.' });
      }
      const { data, error } = await auth.db.rpc('lumareel_assign_received_card', {
        p_stock_id: stockId, p_membership_card_id: membershipCardId,
      });
      if (error) {
        const code = error.code || '';
        const statusCode = code === '42501' ? 403 : code === 'P0002' ? 404
          : ['23505', '23514', '22023'].includes(code) ? 409 : 500;
        return res.status(statusCode).json({ success: false, error: statusCode === 500 ? 'Association physique indisponible.' : error.message });
      }
      return res.status(200).json({ success: true, association: data });
    }

    const items = Array.isArray(body.items) ? body.items : [body];
    if (!items.length || items.length > 500) {
      return res.status(400).json({ success: false, error: 'Import limité à 1–500 cartes par lot.' });
    }
    const rows: Array<Record<string, unknown>> = [];
    const seenSerial = new Set<string>();
    const seenChip = new Set<string>();

    for (const [index, rawItem] of items.entries()) {
      if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) {
        return res.status(400).json({ success: false, error: `Ligne ${index + 1}: objet invalide.` });
      }
      const item = rawItem as Record<string, unknown>;
      const serial = readText(item.manufacturerSerial ?? item.manufacturer_serial, 120, `Ligne ${index + 1} — numéro de série`);
      const chip = readText(item.chipReference ?? item.chip_reference, 160, `Ligne ${index + 1} — référence NFC`);
      const batch = readText(item.batchReference ?? item.batch_reference, 120, `Ligne ${index + 1} — lot`);
      const type = readText(item.chipType ?? item.chip_type, 40, `Ligne ${index + 1} — type de puce`) || 'MIFARE_DESFIRE_EV3';

      if (!serial) return res.status(400).json({ success: false, error: `Ligne ${index + 1}: numéro de série fabricant obligatoire.` });
      if (chip && !NFC_REFERENCE.test(chip)) {
        return res.status(400).json({ success: false, error: `Ligne ${index + 1}: référence NFC opaque invalide (16–160 caractères alphanumériques, _ ou -).` });
      }
      if (!CHIP_TYPES.has(type)) {
        return res.status(400).json({ success: false, error: `Ligne ${index + 1}: type de puce non pris en charge.` });
      }
      if (seenSerial.has(serial) || (chip && seenChip.has(chip))) {
        return res.status(400).json({ success: false, error: `Doublon détecté dans le fichier (ligne ${index + 1}).` });
      }
      seenSerial.add(serial);
      if (chip) seenChip.add(chip);
      rows.push({
        manufacturer_serial: serial, chip_reference: chip || null, batch_reference: batch || null,
        chip_type: type, received_by: auth.user.id,
      });
    }

    const { data, error } = await auth.db.from('membership_physical_card_stock')
      .insert(rows).select('id,manufacturer_serial,chip_reference,batch_reference,stock_status,received_at');
    if (error) {
      const duplicate = error.code === '23505';
      const invalid = ['23514', '22023'].includes(error.code || '');
      return res.status(duplicate ? 409 : invalid ? 400 : 500).json({
        success: false,
        error: duplicate ? 'Une carte ou référence NFC existe déjà dans le stock. Import annulé.'
          : invalid ? 'Données de stock invalides.' : 'Enregistrement du stock impossible.',
      });
    }
    return res.status(201).json({ success: true, inserted: data?.length || 0, stock: data || [] });
  } catch (error: unknown) {
    if (error instanceof InputError) return res.status(400).json({ success: false, error: error.message });
    console.error('[physical-card-stock]', error instanceof Error ? error.message : error);
    return res.status(500).json({ success: false, error: 'Registre de réception indisponible.' });
  }
}
