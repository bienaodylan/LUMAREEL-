import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticatedUserDb, methodNotAllowed } from '../_lib/supabase.js';

function mapTicket(row: any) {
  return {
    id: row.id, orderId: row.order_id, orderRef: row.order_ref,
    eventId: row.event_id, eventTitle: row.event_title, eventDate: row.event_date,
    eventTime: row.event_time, eventVenue: row.event_venue, categoryId: row.category_id,
    categoryName: row.category_name, serialNumber: row.serial_number, token: row.token,
    holderName: row.holder_name, holderEmail: row.holder_email, status: row.status,
    issuedAt: row.issued_at, checkedInAt: row.checked_in_at, checkedInBy: row.checked_in_by,
  };
}

function mapOrder(row: any, tickets: any[]) {
  return {
    id: row.id, reference: row.reference, customerId: row.customer_id,
    customerName: row.customer_name, customerEmail: row.customer_email,
    customerPhone: row.customer_phone, eventId: row.event_id, eventTitle: row.event_title,
    eventDate: row.event_date, eventVenue: row.event_venue, categoryId: row.category_id,
    categoryName: row.category_name, quantity: Number(row.quantity || 0),
    unitPrice: Number(row.unit_price || 0), totalAmount: Number(row.total_amount || 0),
    currency: row.currency || 'FCFA', paymentStatus: row.payment_status || 'pending',
    paymentProvider: row.payment_provider || '', paymentRef: row.payment_ref || '',
    createdAt: row.created_at, paidAt: row.paid_at,
    tickets: tickets.map(mapTicket),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Pragma', 'no-cache');
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const auth = await authenticatedUserDb(req);
  if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const { data: rows, error } = await auth.db
      .from('orders')
      .select('id,reference,customer_id,customer_name,customer_email,customer_phone,event_id,event_title,event_date,event_venue,category_id,category_name,quantity,unit_price,total_amount,currency,payment_status,payment_provider,payment_ref,created_at,paid_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      console.error('[customer/orders] order history:', error.message);
      return res.status(503).json({ success: false, error: 'Historique des commandes temporairement indisponible.' });
    }

    const orderRows = rows || [];
    if (!orderRows.length) return res.status(200).json({ success: true, orders: [] });

    const ids = orderRows.map((row: any) => row.id);
    const { data: ticketRows, error: ticketError } = await auth.db
      .from('tickets')
      .select('id,order_id,order_ref,event_id,event_title,event_date,event_time,event_venue,category_id,category_name,serial_number,token,holder_name,holder_email,status,issued_at,checked_in_at,checked_in_by')
      .in('order_id', ids)
      .order('issued_at', { ascending: true });
    if (ticketError) {
      console.error('[customer/orders] ticket history:', ticketError.message);
      return res.status(503).json({ success: false, error: 'Historique des billets temporairement indisponible.' });
    }

    const ticketsByOrder = new Map<string, any[]>();
    for (const ticket of ticketRows || []) {
      const list = ticketsByOrder.get(ticket.order_id) || [];
      list.push(ticket);
      ticketsByOrder.set(ticket.order_id, list);
    }
    return res.status(200).json({
      success: true,
      orders: orderRows.map((row: any) => mapOrder(row, ticketsByOrder.get(row.id) || [])),
    });
  } catch (error) {
    console.error('[customer/orders] unexpected:', error);
    return res.status(500).json({ success: false, error: 'Impossible de charger votre historique.' });
  }
}
