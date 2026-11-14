import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lumareel-p1-test-'));
const tempDataDir = path.join(tempRoot, 'data');
const tempStorageDir = path.join(tempRoot, 'storage', 'uploads');
fs.mkdirSync(tempDataDir, { recursive: true });
fs.mkdirSync(tempStorageDir, { recursive: true });

process.env.LUMAREEL_DATA_DIR = tempDataDir;
process.env.LUMAREEL_STORAGE_DIR = tempStorageDir;
process.env.NODE_ENV = 'test';
process.env.VITEST = 'true';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
process.env.SESSION_SECRET = 'p1_test_session_secret_at_least_64_characters_long_0123456789abcdef';
process.env.ADMIN_BOOTSTRAP_EMAIL = 'admin-p1@lumareel.test';
process.env.ADMIN_BOOTSTRAP_PASSWORD = 'AdminBootstrap#2026!';
process.env.PAYMENT_MODE = 'sandbox';
process.env.MEMBERSHIP_WELCOME_CREDIT_XOF = '5000';

let app: any;
let db: any;
let sqliteDb: any;
let membershipService: any;
let csvSanitizer: any;

function csrfHeaders(extra: Record<string, string> = {}) {
  return { 'X-Requested-With': 'LUMAREEL', ...extra };
}

async function loginAs(email: string, password: string): Promise<string[]> {
  const res = await request(app)
    .post('/api/auth/login')
    .set(csrfHeaders())
    .send({ email, password });
  expect(res.status).toBe(200);
  const raw = res.headers['set-cookie'];
  return Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
}

describe('Phase P1 Security Verification', () => {
  beforeAll(async () => {
    const serverMod = await import('../server.ts');
    const dbMod = await import('../src/server/db');
    const sqlMod = await import('../src/server/sqliteDb');
    const mbrMod = await import('../src/server/membershipService');
    csvSanitizer = await import('../src/utils/csvSanitizer');

    db = dbMod.db;
    sqliteDb = sqlMod.sqliteDb;
    membershipService = mbrMod.membershipService;
    app = await serverMod.createApp();
  });

  afterAll(() => {
    try {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    } catch {}
  });

  describe('P1-1 Print Ticket XSS & Strict CSP', () => {
    it('échappe les payloads XSS dans la vue impression et interdit onload inline', async () => {
      const event = db.getAllEvents()[0];
      const category = event.categories[0];

      const xssBuyer = '<script>alert("xss")</script>" onerror="alert(1)';
      const orderRes = await request(app)
        .post('/api/orders/checkout')
        .set(csrfHeaders())
        .send({
          eventId: event.id,
          items: [{ categoryId: category.id, qty: 1 }],
          buyer: { name: xssBuyer, email: 'xss-p1@lumareel.test' },
        });
      expect(orderRes.status).toBe(201);
      const { order, orderAccessToken } = orderRes.body;

      const payRes = await request(app)
        .post(`/api/orders/${order.id}/pay-sandbox`)
        .set(csrfHeaders({ 'x-order-token': orderAccessToken }))
        .send({ orderAccessToken });
      expect(payRes.status).toBe(200);
      const ticket = payRes.body.tickets[0];

      // Tentative d'URL dangereuse sur ticket-design -> rejetée (400)
      const adminCookies = await loginAs('admin-p1@lumareel.test', 'AdminBootstrap#2026!');
      const badDesign = await request(app)
        .put(`/api/events/${event.id}/categories/${category.id}/ticket-design`)
        .set('Cookie', adminCookies)
        .set(csrfHeaders())
        .send({ ticketImageUrl: 'javascript:alert(1)' });
      expect(badDesign.status).toBe(400);

      // HTML imprimable autorisé échappe le XSS et utilise un script CSP nonce
      const printRes = await request(app)
        .get(`/api/customer/tickets/${ticket.id}/print?orderToken=${encodeURIComponent(orderAccessToken)}`);
      expect(printRes.status).toBe(200);
      expect(printRes.text).not.toContain('<script>alert("xss")</script>');
      expect(printRes.text).not.toContain('onload="window.print()"');
      expect(printRes.text).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      const csp = String(printRes.headers['content-security-policy'] || '');
      expect(csp).toContain("default-src 'none'");
      expect(csp).toMatch(/script-src 'nonce-[A-Za-z0-9+/=]+'/);
    });
  });

  describe('P1-2 Helmet, Strict CORS, Body Limits & Rate Limiting', () => {
    it('applique les en-têtes Helmet, bloque les origines non autorisées et limite la taille JSON > 100kb', async () => {
      const okRes = await request(app).get('/api/events').set('Origin', 'http://localhost:3000');
      expect(okRes.status).toBe(200);
      expect(okRes.headers['x-content-type-options']).toBe('nosniff');
      expect(okRes.headers['referrer-policy']).toBe('no-referrer');
      expect(okRes.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(String(okRes.headers['content-security-policy'] || '')).toContain("frame-ancestors 'none'");

      const evilRes = await request(app).get('/api/events').set('Origin', 'https://evil-attacker.example');
      expect(evilRes.status).toBe(200);
      expect(evilRes.headers['access-control-allow-origin']).toBeUndefined();

      const oversized = 'A'.repeat(120 * 1024);
      const largeRes = await request(app)
        .post('/api/contact')
        .set(csrfHeaders())
        .send({ name: 'Test', email: 'test@lumareel.test', message: oversized });
      expect(largeRes.status).toBe(413);
    });
  });

  describe('P1-3 Zod Strict Validation & Prototype Pollution Guard', () => {
    it('rejette les champs inconnus et les clés __proto__ / constructor', async () => {
      const protoPayload = JSON.parse('{"name":"A","email":"a@lumareel.test","message":"Hello","__proto__":{"polluted":true}}');
      const protoRes = await request(app)
        .post('/api/contact')
        .set(csrfHeaders())
        .send(protoPayload);
      expect(protoRes.status).toBe(400);

      const unknownFieldRes = await request(app)
        .post('/api/contact')
        .set(csrfHeaders())
        .send({
          name: 'Valid User',
          email: 'valid@lumareel.test',
          message: 'Demande de renseignements légitime',
          unexpectedRole: 'super_admin',
        });
      expect(unknownFieldRes.status).toBe(400);

      const validRes = await request(app)
        .post('/api/contact')
        .set(csrfHeaders())
        .send({
          name: 'Valid User',
          email: 'valid@lumareel.test',
          message: 'Demande de renseignements légitime',
        });
      expect(validRes.status).toBe(200);
      expect(validRes.body.success).toBe(true);
    });
  });

  describe('P1-4 HttpOnly Scanner Session, Atomic Double-Scan & Dynamic Black Card QR', () => {
    it('interdit SEC_SESSION_AUTHORIZED, utilise cookie HttpOnly scanner, garantit atomicité 1 seul scan valide et anti-rejeu QR dynamique', async () => {
      const adminCookies = await loginAs('admin-p1@lumareel.test', 'AdminBootstrap#2026!');
      const events = db.getAllEvents();
      const event1 = events[0];
      const event2 = events[1] || events[0];

      // 1. Rejet du bypass historique SEC_SESSION_AUTHORIZED
      const staticBypass1 = await request(app)
        .post('/api/scanner/session')
        .set(csrfHeaders())
        .send({ token: 'SEC_SESSION_AUTHORIZED', eventId: event1.id });
      expect(staticBypass1.status).toBe(403);

      const staticBypass2 = await request(app)
        .post('/api/verify-ticket')
        .set(csrfHeaders())
        .send({ token: 'ANY', scannerToken: 'SEC_SESSION_AUTHORIZED', eventId: event1.id });
      expect(staticBypass2.status).toBe(403);

      // 2. Génération d'un lien magique événement 1 et échange contre cookie HttpOnly
      const genRes = await request(app)
        .post(`/api/events/${event1.id}/scanner-token`)
        .set('Cookie', adminCookies)
        .set(csrfHeaders())
        .send({ durationHours: 4 });
      expect(genRes.status).toBe(201);
      const magicToken = genRes.body.token;

      const sessionRes = await request(app)
        .post('/api/scanner/session')
        .set(csrfHeaders())
        .send({ token: magicToken, eventId: event1.id });
      expect(sessionRes.status).toBe(200);
      expect(sessionRes.body.valid).toBe(true);

      const scannerCookiesRaw = sessionRes.headers['set-cookie'];
      const scannerCookies = Array.isArray(scannerCookiesRaw)
        ? scannerCookiesRaw
        : [String(scannerCookiesRaw)];
      expect(scannerCookies.some((c) => c.includes('lumareel_scanner_sid=') && c.includes('HttpOnly'))).toBe(true);

      // 3. Création d'un billet payé pour event1 et test de double scan concurrent
      const orderRes = await request(app)
        .post('/api/orders/checkout')
        .set(csrfHeaders())
        .send({
          eventId: event1.id,
          items: [{ categoryId: event1.categories[0].id, qty: 1 }],
          buyer: { name: 'Concours Scan', email: 'scan@lumareel.test' },
        });
      const payRes = await request(app)
        .post(`/api/orders/${orderRes.body.order.id}/pay-sandbox`)
        .set(csrfHeaders({ 'x-order-token': orderRes.body.orderAccessToken }))
        .send({ orderAccessToken: orderRes.body.orderAccessToken });
      const ticket = payRes.body.tickets[0];

      const [scanA, scanB] = await Promise.all([
        request(app)
          .post('/api/verify-ticket')
          .set('Cookie', scannerCookies)
          .set(csrfHeaders())
          .send({ ticketId: ticket.token, eventId: event1.id }),
        request(app)
          .post('/api/verify-ticket')
          .set('Cookie', scannerCookies)
          .set(csrfHeaders())
          .send({ ticketId: ticket.token, eventId: event1.id }),
      ]);

      const statuses = [scanA.status, scanB.status].sort((a, b) => a - b);
      expect(statuses).toEqual([200, 403]);
      const deniedScan = scanA.status === 403 ? scanA : scanB;
      expect(deniedScan.body.error).toContain('déjà utilisé');

      // 4. Contrôle d'événement croisé refusé si session scopée à event1
      if (event2.id !== event1.id) {
        const order2Res = await request(app)
          .post('/api/orders/checkout')
          .set(csrfHeaders())
          .send({
            eventId: event2.id,
            items: [{ categoryId: event2.categories[0].id, qty: 1 }],
            buyer: { name: 'Autre Concert', email: 'other@lumareel.test' },
          });
        const pay2Res = await request(app)
          .post(`/api/orders/${order2Res.body.order.id}/pay-sandbox`)
          .set(csrfHeaders({ 'x-order-token': order2Res.body.orderAccessToken }))
          .send({ orderAccessToken: order2Res.body.orderAccessToken });
        const ticket2 = pay2Res.body.tickets[0];

        const crossScan = await request(app)
          .post('/api/verify-ticket')
          .set('Cookie', scannerCookies)
          .set(csrfHeaders())
          .send({ ticketId: ticket2.token });
        expect(crossScan.status).toBe(403);
      }

      // 5. Black Card QR dynamique : émission réelle puis premier passage valide, rejeu strictement refusé
      const mbrOrder = await request(app)
        .post('/api/membership/order')
        .set(csrfHeaders())
        .send({
          customerName: 'Membre QR Dynamique',
          customerEmail: 'dynqr-p1@lumareel.test',
          paymentMethod: 'geniuspay',
        });
      expect(mbrOrder.status).toBe(201);
      const mbrPay = await request(app)
        .post(`/api/membership/orders/${mbrOrder.body.order.id}/pay-sandbox`)
        .set(csrfHeaders({ 'x-order-token': mbrOrder.body.orderAccessToken }))
        .send({ orderAccessToken: mbrOrder.body.orderAccessToken });
      expect(mbrPay.status).toBe(200);
      const card = mbrPay.body.card;
      expect(card).toBeDefined();
      const dynamicQr = mbrPay.body.dynamicQrToken || membershipService.getDynamicQrToken(card);
      expect(dynamicQr.startsWith('LMR-BC1.')).toBe(true);

      const firstGate = await request(app)
        .post('/api/membership/check-access')
        .set('Cookie', scannerCookies)
        .set(csrfHeaders())
        .send({
          cardIdentifier: dynamicQr,
          eventId: event1.id,
          accessPointType: 'priority_lane',
          hasConcertTicket: true,
        });
      expect(firstGate.status).toBe(200);
      expect(firstGate.body.authorized).toBe(true);

      const replayGate = await request(app)
        .post('/api/membership/check-access')
        .set('Cookie', scannerCookies)
        .set(csrfHeaders())
        .send({
          cardIdentifier: dynamicQr,
          eventId: event1.id,
          accessPointType: 'priority_lane',
          hasConcertTicket: true,
        });
      expect(replayGate.status).toBe(403);
      expect(replayGate.body.authorized).toBe(false);
    });
  });

  describe('P1-5 Token Hashing, Print Batch Inactive->Active & CSV Injection Neutralization', () => {
    it('stocke token_hash haché en SQLite, bloque les billets physiques inactifs puis autorise après activation', async () => {
      const adminCookies = await loginAs('admin-p1@lumareel.test', 'AdminBootstrap#2026!');
      const event = db.getAllEvents()[0];

      // Ouvrir session scanner staff admin
      const scRes = await request(app)
        .post('/api/scanner/session')
        .set('Cookie', adminCookies)
        .set(csrfHeaders())
        .send({ eventId: event.id });
      expect(scRes.status).toBe(200);
      const scannerCookiesRaw = scRes.headers['set-cookie'];
      const scannerCookies = Array.isArray(scannerCookiesRaw)
        ? scannerCookiesRaw
        : [String(scannerCookiesRaw)];

      // Générer un lot physique (statut initial inactive)
      const batchRes = await request(app)
        .post('/api/tickets/print-batch')
        .set('Cookie', adminCookies)
        .set(csrfHeaders())
        .send({
          eventId: event.id,
          categoryId: event.categories[0].id,
          quantity: 2,
        });
      expect(batchRes.status).toBe(201);
      const { batchRef, tickets } = batchRes.body;
      expect(tickets[0].status).toBe('inactive');

      // Vérifier que SQLite stocke le hash SHA-256 (et pas le secret brut en colonne token_hash)
      const row = sqliteDb.db
        .prepare('SELECT token, token_hash FROM tickets WHERE id = ?')
        .get(tickets[0].id) as { token: string; token_hash: string };
      expect(row.token_hash).toMatch(/^[a-f0-9]{64}$/);
      expect(row.token).toBe(row.token_hash);
      expect(row.token).not.toBe(tickets[0].token);

      // Scan d'un billet inactif -> 403 Lot physique non activé
      const inactiveScan = await request(app)
        .post('/api/verify-ticket')
        .set('Cookie', [...adminCookies, ...scannerCookies])
        .set(csrfHeaders())
        .send({ ticketId: tickets[0].token, eventId: event.id });
      expect(inactiveScan.status).toBe(403);
      expect(inactiveScan.body.error).toContain('non activé');

      // Activation du lot -> 200 puis scan légitime -> 200
      const actRes = await request(app)
        .post(`/api/tickets/print-batch/${encodeURIComponent(batchRef)}/activate`)
        .set('Cookie', adminCookies)
        .set(csrfHeaders());
      expect(actRes.status).toBe(200);
      expect(actRes.body.activatedCount).toBe(2);

      const activeScan = await request(app)
        .post('/api/verify-ticket')
        .set('Cookie', [...adminCookies, ...scannerCookies])
        .set(csrfHeaders())
        .send({ ticketId: tickets[0].token, eventId: event.id });
      expect(activeScan.status).toBe(200);
      expect(activeScan.body.valid).toBe(true);
    });

    it('neutralise les formules CSV/Excel (=, +, -, @, tab, cr)', () => {
      expect(csvSanitizer.sanitizeSpreadsheetCell('=CMD("calc")')).toBe("'=CMD(\"calc\")");
      expect(csvSanitizer.sanitizeSpreadsheetCell('+1+1')).toBe("'+1+1");
      expect(csvSanitizer.sanitizeSpreadsheetCell('-2+3')).toBe("'-2+3");
      expect(csvSanitizer.sanitizeSpreadsheetCell('@SUM(A1:A2)')).toBe("'@SUM(A1:A2)");
      expect(csvSanitizer.sanitizeSpreadsheetCell('\t=1')).toBe("'\t=1");
      expect(csvSanitizer.sanitizeSpreadsheetCell('Jean Dupont')).toBe('Jean Dupont');
      expect(csvSanitizer.formatCsvCell('=1+1')).toBe('"\'=1+1"');
    });
  });

  describe('P1-6 Audit Logs & Restricted Chip Verification', () => {
    it('protège /api/admin/audit-logs et /api/membership/verify-chip et journalise les actions admin', async () => {
      const unauthAudit = await request(app).get('/api/admin/audit-logs');
      expect(unauthAudit.status).toBe(401);

      const unauthChip = await request(app).get('/api/membership/verify-chip/04:AA:BB:CC');
      expect(unauthChip.status).toBe(401);

      const adminCookies = await loginAs('admin-p1@lumareel.test', 'AdminBootstrap#2026!');
      const auditRes = await request(app).get('/api/admin/audit-logs').set('Cookie', adminCookies);
      expect(auditRes.status).toBe(200);
      expect(Array.isArray(auditRes.body.logs)).toBe(true);
      const actions = auditRes.body.logs.map((l: any) => l.action);
      expect(actions).toContain('TICKET_BATCH_CREATED');
      expect(actions).toContain('TICKET_BATCH_ACTIVATED');
    });
  });
});
