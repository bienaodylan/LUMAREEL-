import { createHash } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireRole, methodNotAllowed, serviceDb } from '../../_lib/supabase.js';

const publicVerificationLimits = new Map<string, { windowStart: number; count: number }>();

function allowPublicVerification(ipAddress: string): boolean {
  const key = createHash('sha256').update(ipAddress || 'unknown').digest('hex').slice(0, 20);
  const now = Date.now();
  const current = publicVerificationLimits.get(key);
  if (!current || now - current.windowStart >= 60_000) {
    publicVerificationLimits.set(key, { windowStart: now, count: 1 });
  } else {
    current.count += 1;
    if (current.count > 40) return false;
  }
  if (publicVerificationLimits.size > 5000) {
    for (const [entryKey, entry] of publicVerificationLimits) {
      if (now - entry.windowStart >= 60_000) publicVerificationLimits.delete(entryKey);
    }
  }
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Pragma', 'no-cache');

  if (req.query.__route === 'public-verify') {
    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
    const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';
    if (!token || token.length < 16 || token.length > 512 || /\s/u.test(token)) {
      return res.status(200).json({
        valid: false, outcome: 'INVALID', status: 'NOT_FOUND',
        message: 'Jeton QR invalide.',
      });
    }

    const forwardedFor = req.headers['x-forwarded-for'];
    const clientIp = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor || '').split(',')[0].trim()
      || req.socket.remoteAddress
      || 'unknown';
    if (!allowPublicVerification(clientIp)) {
      return res.status(429).json({
        valid: false, outcome: 'SYSTEM_UNAVAILABLE', status: 'NOT_FOUND',
        message: 'Trop de tentatives de vérification. Veuillez patienter une minute.',
      });
    }

    try {
      const db = serviceDb();
      const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex');
      const { data: qrToken, error: tokenError } = await db
        .from('membership_qr_tokens')
        .select('id,card_id')
        .eq('token_hash', tokenHash)
        .is('revoked_at', null)
        .maybeSingle();

      if (tokenError) {
        console.error('[card-verify] QR token lookup failed:', tokenError.message);
        return res.status(503).json({
          valid: false, outcome: 'SYSTEM_UNAVAILABLE', status: 'NOT_FOUND',
          message: 'Registre de vérification temporairement indisponible.',
        });
      }
      if (!qrToken?.card_id) {
        return res.status(200).json({
          valid: false, outcome: 'INVALID', status: 'NOT_FOUND',
          message: 'QR invalide, révoqué ou inconnu.',
        });
      }

      const { data: card, error: cardError } = await db
        .from('membership_cards')
        .select('card_number,cardholder_name,card_status,valid_from,expires_at,physical_card_status,edition_id')
        .eq('id', qrToken.card_id)
        .maybeSingle();

      if (cardError) {
        console.error('[card-verify] card lookup failed:', cardError.message);
        return res.status(503).json({
          valid: false, outcome: 'SYSTEM_UNAVAILABLE', status: 'NOT_FOUND',
          message: 'Registre de vérification temporairement indisponible.',
        });
      }
      if (!card) {
        return res.status(200).json({
          valid: false, outcome: 'INVALID', status: 'NOT_FOUND',
          message: 'Carte introuvable ou supprimée.',
        });
      }

      const { data: edition, error: editionError } = await db
        .from('membership_editions')
        .select('name,edition_code')
        .eq('id', card.edition_id)
        .maybeSingle();

      if (editionError) {
        console.error('[card-verify] edition lookup failed:', editionError.message);
      }

      const now = Date.now();
      const validFrom = Date.parse(String(card.valid_from || ''));
      const expiresAt = Date.parse(String(card.expires_at || ''));
      let outcome: 'VALID' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED' | 'INVALID' = 'INVALID';
      let message = 'Carte non valide.';

      if (card.card_status === 'revoked') {
        outcome = 'REVOKED';
        message = 'Cette carte a été révoquée.';
      } else if (card.card_status === 'suspended') {
        outcome = 'SUSPENDED';
        message = 'Cette carte est temporairement suspendue.';
      } else if (card.card_status === 'expired' || (Number.isFinite(expiresAt) && expiresAt <= now)) {
        outcome = 'EXPIRED';
        message = 'La période de validité de cette carte est terminée.';
      } else if (card.card_status === 'active' && Number.isFinite(validFrom) && validFrom <= now && Number.isFinite(expiresAt) && expiresAt > now) {
        outcome = 'VALID';
        message = 'Carte authentique et adhésion en cours de validité.';
      } else if (Number.isFinite(validFrom) && validFrom > now) {
        message = 'La période de validité de cette carte n’a pas encore commencé.';
      }

      const nameParts = String(card.cardholder_name || '').trim().split(/\s+/u).filter(Boolean);
      const cardholderDisplayName = nameParts.length > 1
        ? `${nameParts[0]} ${nameParts.slice(1).map((part: string) => `${part[0] || ''}.`).join(' ')}`
        : (nameParts[0] || 'Titulaire non renseigné');
      const cardNumber = String(card.card_number || '');
      const maskedCardNumber = cardNumber.length > 7
        ? `${cardNumber.slice(0, 3)}••••••${cardNumber.slice(-4)}`
        : '••••';

      await db.from('membership_qr_tokens')
        .update({ last_verified_at: new Date().toISOString() })
        .eq('id', qrToken.id);

      return res.status(200).json({
        valid: outcome === 'VALID',
        outcome,
        status: outcome === 'EXPIRED' ? 'expired' : card.card_status,
        maskedCardNumber,
        editionName: edition?.name || undefined,
        editionCode: edition?.edition_code || undefined,
        cardholderDisplayName,
        cardholderInitials: nameParts.map((part: string) => part[0] || '').join('').slice(0, 3).toUpperCase(),
        validFrom: card.valid_from,
        expiresAt: card.expires_at,
        physicalCardStatus: ['requested', 'payment_pending', 'approved', 'in_production', 'printed', 'quality_checked', 'ready_for_dispatch', 'shipped', 'delivered', 'cancelled', 'blocked', 'lost', 'returned', 'replacement_requested', 'defective'].includes(card.physical_card_status) ? card.physical_card_status : undefined,
        message,
      });
    } catch (error) {
      console.error('[card-verify] unexpected error:', error);
      return res.status(503).json({
        valid: false, outcome: 'SYSTEM_UNAVAILABLE', status: 'NOT_FOUND',
        message: 'Impossible de joindre le registre officiel de vérification.',
      });
    }
  }

  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const auth = await requireRole(req, ['super_admin']);
    if (!auth.ok) return res.status(auth.status).json({success:false,error:auth.error});
    const cardId = String(req.query.cardId || '').trim();
    let query = auth.db.from('membership_chip_credentials')
      .select('id,card_id,chip_reference,chip_type,application_reference,key_version,credential_status,enrolled_at,revoked_at,created_at')
      .order('created_at',{ascending:false}).limit(200);
    if(cardId) query=query.eq('card_id',cardId);
    const {data,error}=await query;
    if(error){console.error('[nfc-list] query:',error.message);return res.status(500).json({success:false,error:'Registre NFC indisponible.'});}
    return res.status(200).json({success:true,credentials:data||[]});
  }catch(error){console.error('[nfc-list] Unexpected:',error);return res.status(500).json({success:false,error:'Erreur de lecture du registre NFC.'});}
}
