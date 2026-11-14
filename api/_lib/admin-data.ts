import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticatedUserDb, methodNotAllowed, requireRole, serviceDb } from './supabase.js';

function setPrivateNoStore(res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Pragma', 'no-cache');
}

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

function mapOrder(row: any, tickets: any[] = []) {
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

export async function handleAdminDataRoute(req: VercelRequest, res: VercelResponse, route: string) {
  setPrivateNoStore(res);

  if (route === 'customer-orders') {
    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
    const auth = await authenticatedUserDb(req);
    if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });
    try {
      const { data: rows, error } = await auth.db.from('orders')
        .select('id,reference,customer_id,customer_name,customer_email,customer_phone,event_id,event_title,event_date,event_venue,category_id,category_name,quantity,unit_price,total_amount,currency,payment_status,payment_provider,payment_ref,created_at,paid_at')
        .order('created_at', { ascending: false }).limit(100);
      if (error) {
        console.error('[customer/orders] order history:', error.message);
        return res.status(503).json({ success: false, error: 'Historique des commandes temporairement indisponible.' });
      }
      const orderRows = rows || [];
      if (!orderRows.length) return res.status(200).json({ success: true, orders: [] });
      const ids = orderRows.map((row: any) => row.id);
      const { data: ticketRows, error: ticketError } = await auth.db.from('tickets')
        .select('id,order_id,order_ref,event_id,event_title,event_date,event_time,event_venue,category_id,category_name,serial_number,token,holder_name,holder_email,status,issued_at,checked_in_at,checked_in_by')
        .in('order_id', ids).order('issued_at', { ascending: true });
      if (ticketError) {
        console.error('[customer/orders] ticket history:', ticketError.message);
        return res.status(503).json({ success: false, error: 'Historique des billets temporairement indisponible.' });
      }
      const byOrder = new Map<string, any[]>();
      for (const ticket of ticketRows || []) {
        const list = byOrder.get(ticket.order_id) || [];
        list.push(ticket);
        byOrder.set(ticket.order_id, list);
      }
      return res.status(200).json({ success: true, orders: orderRows.map((row: any) => mapOrder(row, byOrder.get(row.id) || [])) });
    } catch (error) {
      console.error('[customer/orders] unexpected:', error);
      return res.status(500).json({ success: false, error: 'Impossible de charger votre historique.' });
    }
  }

  const roles = ['super_admin', 'box_office'];
  const auth = await requireRole(req, roles);
  if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });
  const db = serviceDb();

  if (route === 'admin-orders') {
    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
    try {
      const { data, error } = await db.from('orders')
        .select('id,reference,customer_id,customer_name,customer_email,customer_phone,event_id,event_title,event_date,event_venue,category_id,category_name,quantity,unit_price,total_amount,currency,payment_status,payment_provider,payment_ref,created_at,paid_at')
        .order('created_at', { ascending: false }).limit(1000);
      if (error) {
        console.error('[admin/orders] query:', error.message);
        return res.status(503).json({ success: false, error: 'Registre des commandes indisponible.' });
      }
      return res.status(200).json({ success: true, orders: (data || []).map((row: any) => mapOrder(row)), truncated: (data || []).length === 1000 });
    } catch (error) {
      console.error('[admin/orders] unexpected:', error);
      return res.status(500).json({ success: false, error: 'Impossible de charger les commandes.' });
    }
  }

  if (route === 'admin-overview') {
    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
    try {
      const [eventsResult, ordersResult, ticketsResult] = await Promise.all([
        db.from('events').select('id,status,categories'),
        db.from('orders').select('id,payment_status,total_amount,quantity'),
        db.from('tickets').select('id,status'),
      ]);
      const failed = [eventsResult, ordersResult, ticketsResult].find((r) => r.error);
      if (failed?.error) {
        console.error('[admin/overview] metrics query:', failed.error.message);
        return res.status(503).json({ success: false, error: 'Indicateurs du tableau de bord indisponibles.' });
      }
      const events = eventsResult.data || [];
      const orders = ordersResult.data || [];
      const tickets = ticketsResult.data || [];
      const completed = orders.filter((o: any) => o.payment_status === 'completed');
      const totalQuota = events.reduce((sum: number, e: any) =>
        sum + (Array.isArray(e.categories) ? e.categories.reduce((n: number, c: any) => n + Math.max(0, Number(c.quota) || 0), 0) : 0), 0);
      const categorySold = events.reduce((sum: number, e: any) =>
        sum + (Array.isArray(e.categories) ? e.categories.reduce((n: number, c: any) => n + Math.max(0, Number(c.sold) || 0), 0) : 0), 0);
      return res.status(200).json({
        success: true,
        stats: {
          publishedEvents: events.filter((e: any) => e.status === 'published').length,
          ticketsSold: tickets.length || categorySold,
          totalQuota,
          confirmedRevenueXof: completed.reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0),
          pendingOrdersCount: orders.filter((o: any) => o.payment_status === 'pending').length,
          paidOrdersCount: completed.length,
          checkedInTickets: tickets.filter((t: any) => t.status === 'used').length,
        },
        generatedAt: new Date().toISOString(),
        source: 'supabase',
      });
    } catch (error) {
      console.error('[admin/overview] unexpected:', error);
      return res.status(500).json({ success: false, error: 'Impossible de calculer les indicateurs.' });
    }
  }

  if (route === 'admin-emails') {
    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
    try {
      const { data, error } = await db.from('transactional_emails')
        .select('id,recipient,subject,type,status,order_id,sent_at,metadata')
        .order('sent_at', { ascending: false }).limit(300);
      if (error) {
        console.error('[admin/emails] query:', error.message);
        return res.status(503).json({ success: false, error: 'Historique des emails indisponible.' });
      }
      const emails = (data || []).map((row: any) => {
        const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
        return {
          id: row.id, recipient: row.recipient, subject: row.subject, type: row.type,
          status: row.status, orderRef: meta.orderRef || row.order_id || undefined,
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

  return res.status(404).json({ success: false, error: 'Route administrative inconnue.' });
}
