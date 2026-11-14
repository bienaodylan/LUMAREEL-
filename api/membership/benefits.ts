import type { VercelRequest, VercelResponse } from '@vercel/node';
import { methodNotAllowed } from '../_lib/supabase.js';
import { mapMembershipBenefit, requireMembershipAdmin, setPrivateNoStore } from './_lib.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setPrivateNoStore(res);
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const admin = await requireMembershipAdmin(req, res);
  if (!admin) return;
  const { data, error } = await admin.db.from('membership_benefits').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) {
    console.error('[membership/benefits]', error.message);
    return res.status(503).json({ success: false, error: 'Catalogue des avantages indisponible.' });
  }
  return res.status(200).json({ success: true, benefits: (data || []).map(mapMembershipBenefit) });
}
