import type { VercelRequest, VercelResponse } from '@vercel/node';
import { methodNotAllowed, requireRole, serviceDb } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Pragma', 'no-cache');
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const auth = await requireRole(req, ['super_admin', 'box_office']);
  if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const { data, error } = await serviceDb().from('transactional_emails')
      .select('id,recipient,subject,type,status,order_id,sent_at,metadata')
      .order('sent_at', { ascending: false })
      .limit(300);
    if (error) {
      console.error('[admin/emails] query:', error.message);
      return res.status(503).json({ success: false, error: 'Historique des emails indisponible.' });
    }
    const emails = (data || []).map((row: any) => {
      const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
      return {
        id: row.id, recipient: row.recipient, subject: row.subject,
        type: row.type, status: row.status, orderRef: meta.orderRef || row.order_id || undefined,
        timestamp: row.sent_at, contentPreview: String(meta.contentPreview || meta.preview || '').slice(0, 500),
        customerName: meta.customerName, eventTitle: meta.eventTitle, artistName: meta.artistName,
        totalAmount: Number.isFinite(Number(meta.totalAmount)) ? Number(meta.totalAmount) : undefined,
        currency: meta.currency, ticketsCount: Number.isFinite(Number(meta.ticketsCount)) ? Number(meta.ticketsCount) : undefined,
      };
    });
    return res.status(200).json({ success: true, emails });
  } catch (error) {
    console.error('[admin/emails] unexpected:', error);
    return res.status(500).json({ success: false, error: 'Impossible de charger les emails.' });
  }
}
