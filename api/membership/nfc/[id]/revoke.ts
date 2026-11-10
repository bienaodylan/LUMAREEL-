import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireRole, methodNotAllowed } from '../../../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const auth = await requireRole(req, ['super_admin']);
    if (!auth.ok) return res.status(auth.status).json({ success:false,error:auth.error });
    const credentialId = String(req.query.id || '').trim();
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const reason = String(body.reason || '').trim();
    if (!credentialId || !reason) return res.status(400).json({ success:false,error:'Credential et motif requis.' });
    const { data, error } = await auth.db.rpc('lumareel_nfc_revoke', {
      p_credential_id:credentialId,p_reason:reason,
    });
    if (error) {
      const status = error.code==='42501'?403:['22023','23514','P0002'].includes(error.code||'')?400:500;
      console.error('[nfc-revoke] RPC:',error.message);
      return res.status(status).json({success:false,error:status===500?'Révocation NFC indisponible.':error.message});
    }
    return res.status(200).json({success:true,credential:data});
  } catch(error) {
    console.error('[nfc-revoke] Unexpected:',error);
    return res.status(500).json({success:false,error:'Erreur inattendue de révocation NFC.'});
  }
}
