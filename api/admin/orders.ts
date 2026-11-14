import type { VercelRequest, VercelResponse } from '@vercel/node';
import { methodNotAllowed, requireRole, serviceDb } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Pragma', 'no-cache');
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const auth = await requireRole(req, ['super_admin', 'box_office']);
  if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const db = serviceDb();
    const { data, error } = await db.from('orders')
      .select('id,reference,customer_id,customer_name,customer_email,customer_phone,event_id,event_title,event_date,event_venue,category_id,category_name,quantity,unit_price,total_amount,currency,payment_status,payment_provider,payment_ref,created_at,paid_at')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) {
      console.error('[admin/orders] query:', error.message);
      return res.status(503).json({ success: false, error: 'Registre des commandes indisponible.' });
    }
    const orders = (data || []).map((row: any) => ({
      id: row.id, reference: row.reference, customerId: row.customer_id,
      customerName: row.customer_name, customerEmail: row.customer_email,
      customerPhone: row.customer_phone, eventId: row.event_id, eventTitle: row.event_title,
      eventDate: row.event_date, eventVenue: row.event_venue, categoryId: row.category_id,
      categoryName: row.category_name, quantity: Number(row.quantity || 0),
      unitPrice: Number(row.unit_price || 0), totalAmount: Number(row.total_amount || 0),
      currency: row.currency || 'FCFA', paymentStatus: row.payment_status || 'pending',
      paymentProvider: row.payment_provider || '', paymentRef: row.payment_ref || '',
      createdAt: row.created_at, paidAt: row.paid_at,
    }));
    return res.status(200).json({ success: true, orders, truncated: orders.length === 1000 });
  } catch (error) {
    console.error('[admin/orders] unexpected:', error);
    return res.status(500).json({ success: false, error: 'Impossible de charger les commandes.' });
  }
}
