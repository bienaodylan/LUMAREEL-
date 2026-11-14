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
    const [eventsResult, ordersResult, ticketsResult] = await Promise.all([
      db.from('events').select('id,status,categories'),
      db.from('orders').select('id,payment_status,total_amount,quantity'),
      db.from('tickets').select('id,status'),
    ]);
    const failed = [eventsResult, ordersResult, ticketsResult].find((result) => result.error);
    if (failed?.error) {
      console.error('[admin/overview] metrics query:', failed.error.message);
      return res.status(503).json({ success: false, error: 'Indicateurs du tableau de bord indisponibles.' });
    }

    const events = eventsResult.data || [];
    const orders = ordersResult.data || [];
    const tickets = ticketsResult.data || [];
    const publishedEvents = events.filter((event: any) => event.status === 'published').length;
    const totalQuota = events.reduce((sum: number, event: any) =>
      sum + (Array.isArray(event.categories) ? event.categories.reduce((n: number, category: any) => n + Math.max(0, Number(category.quota) || 0), 0) : 0), 0);
    const categoryTicketsSold = events.reduce((sum: number, event: any) =>
      sum + (Array.isArray(event.categories) ? event.categories.reduce((n: number, category: any) => n + Math.max(0, Number(category.sold) || 0), 0) : 0), 0);
    const completedOrders = orders.filter((order: any) => order.payment_status === 'completed');
    const confirmedRevenueXof = completedOrders.reduce((sum: number, order: any) => sum + (Number(order.total_amount) || 0), 0);
    const ticketsSold = tickets.length ? tickets.length : categoryTicketsSold;
    const checkedInTickets = tickets.filter((ticket: any) => ticket.status === 'used').length;

    return res.status(200).json({
      success: true,
      stats: {
        publishedEvents, ticketsSold, totalQuota, confirmedRevenueXof,
        pendingOrdersCount: orders.filter((order: any) => order.payment_status === 'pending').length,
        paidOrdersCount: completedOrders.length,
        checkedInTickets,
      },
      generatedAt: new Date().toISOString(),
      source: 'supabase',
    });
  } catch (error) {
    console.error('[admin/overview] unexpected:', error);
    return res.status(500).json({ success: false, error: 'Impossible de calculer les indicateurs.' });
  }
}
