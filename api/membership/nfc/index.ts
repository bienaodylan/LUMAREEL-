import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireRole, methodNotAllowed } from '../../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
