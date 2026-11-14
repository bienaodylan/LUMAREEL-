import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lumareel-p0-test-'));
const tempDataDir = path.join(tempRoot, 'data');
const tempStorageDir = path.join(tempRoot, 'storage', 'uploads');
fs.mkdirSync(tempDataDir, { recursive: true });
fs.mkdirSync(tempStorageDir, { recursive: true });

process.env.LUMAREEL_DATA_DIR = tempDataDir;
process.env.LUMAREEL_STORAGE_DIR = tempStorageDir;
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'p0_test_session_secret_at_least_64_characters_long_0123456789abcdef';
process.env.ADMIN_BOOTSTRAP_EMAIL = 'admin-sec@lumareel.test';
process.env.ADMIN_BOOTSTRAP_PASSWORD = 'AdminBootstrap#2026!';
process.env.PAYMENT_MODE = 'sandbox';
process.env.MEMBERSHIP_WELCOME_CREDIT_XOF = '5000';
process.env.GENIUSPAY_WEBHOOK_SECRET = 'gp_whsec_test_secret_0123456789abcdef';
process.env.GENIUSPAY_API_URL = 'https://api.geniuspay.test/v1';
process.env.GENIUSPAY_SECRET_KEY = 'gp_sk_test_0123456789';

let app: any;
let createAppFn: () => Promise<any>;
let db: any;
let membershipService: any;
let sqliteDb: any;
let securityMod: any;

function csrfHeaders(extra: Record<string, string> = {}) {
  return { 'X-Requested-With': 'LUMAREEL', ...extra };
}

describe('Phase P0 Security Verification', () => {
  beforeAll(async () => {
    const serverMod = await import('../server.ts');
    const dbMod = await import('../src/server/db');
    const mbrMod = await import('../src/server/membershipService');
    const sqlMod = await import('../src/server/sqliteDb');
    securityMod = await import('../src/server/security');

    createAppFn = serverMod.createApp;
    db = dbMod.db;
    membershipService = mbrMod.membershipService;
    sqliteDb = sqlMod.sqliteDb;
    app = await createAppFn();
  });

  afterAll(() => {
    try {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    } catch {}
  });

  describe('P0-1 Secrets & Bootstrap Validation', () => {
    it('refuse de démarrer sans SESSION_SECRET ou avec un secret < 32 caractères', () => {
      const origSecret = process.env.SESSION_SECRET;
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('PROCESS_EXIT');
      }) as any);
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        process.env.SESSION_SECRET = 'short';
        expect(() => securityMod.assertBootSecurityConfig()).toThrow('PROCESS_EXIT');
        expect(exitSpy).toHaveBeenCalledWith(1);

        delete process.env.SESSION_SECRET;
        expect(() => securityMod.assertBootSecurityConfig()).toThrow('PROCESS_EXIT');
      } finally {
        process.env.SESSION_SECRET = origSecret;
        exitSpy.mockRestore();
        errSpy.mockRestore();
      }
    });

    it('refuse PAYMENT_MODE=sandbox en production et ALLOW_DEV_AUTH mal configuré', () => {
      const origEnv = process.env.NODE_ENV;
      const origMode = process.env.PAYMENT_MODE;
      const origDevAuth = process.env.ALLOW_DEV_AUTH;
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('PROCESS_EXIT');
      }) as any);
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        process.env.NODE_ENV = 'production';
        process.env.PAYMENT_MODE = 'sandbox';
        expect(() => securityMod.assertBootSecurityConfig()).toThrow('PROCESS_EXIT');

        process.env.PAYMENT_MODE = 'live';
        process.env.ALLOW_DEV_AUTH = 'true';
        expect(() => securityMod.assertBootSecurityConfig()).toThrow('PROCESS_EXIT');

        delete process.env.NODE_ENV;
        expect(() => securityMod.assertBootSecurityConfig()).toThrow('PROCESS_EXIT');
      } finally {
        process.env.NODE_ENV = origEnv;
        process.env.PAYMENT_MODE = origMode;
        if (origDevAuth === undefined) delete process.env.ALLOW_DEV_AUTH;
        else process.env.ALLOW_DEV_AUTH = origDevAuth;
        exitSpy.mockRestore();
        errSpy.mockRestore();
      }
    });

    it('rejette un SUPABASE_URL non HTTPS ou hors domaine *.supabase.co', () => {
      const origUrl = process.env.SUPABASE_URL;
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('PROCESS_EXIT');
      }) as any);
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        process.env.SUPABASE_URL = 'http://evil.example.com';
        expect(() => securityMod.assertBootSecurityConfig()).toThrow('PROCESS_EXIT');
      } finally {
        if (origUrl === undefined) delete process.env.SUPABASE_URL;
        else process.env.SUPABASE_URL = origUrl;
        exitSpy.mockRestore();
        errSpy.mockRestore();
      }
    });

    it('n’accepte pas le mot de passe admin par défaut historique ni l’élévation via email codé en dur', async () => {
      const loginLegacy = await request(app)
        .post('/api/auth/login')
        .set(csrfHeaders())
        .send({ email: 'admin@lumareel.com', password: 'DylanAdmin2026!' });
      expect(loginLegacy.status).toBe(401);

      const regFounderEmail = await request(app)
        .post('/api/auth/register')
        .set(csrfHeaders())
        .send({
          email: 'bienaodylan428@gmail.com',
          name: 'Spoofed Founder',
          password: 'ValidLongPassword#2026',
        });
      expect(regFounderEmail.status).toBe(200);
      const cookies = regFounderEmail.headers['set-cookie'];
      const me = await request(app).get('/api/auth/me').set('Cookie', cookies);
      expect(me.status).toBe(200);
      expect(me.body.user.role).toBe('customer');
    });
  });

  describe('P0-2 Suppression du bypass de dev & RBAC strict', () => {
    it('renvoie 401 sans session sur toutes les routes /api/admin/* et /api/membership/admin/*', async () => {
      const adminPaths = [
        '/api/admin/overview',
        '/api/admin/orders',
        '/api/admin/users',
        '/api/admin/settings',
        '/api/membership/admin/overview',
        '/api/membership/admin/cards',
      ];
      for (const p of adminPaths) {
        const res = await request(app).get(p);
        expect(res.status).toBe(401);
      }

      const postRes = await request(app)
        .post('/api/membership/admin/cards/card_1/rotate-token')
        .set(csrfHeaders())
        .send({});
      expect(postRes.status).toBe(401);
    });

    it('renvoie 403 pour un client authentifié sur les routes admin, et 200 pour le super_admin', async () => {
      const custAgent = request.agent(app);
      await custAgent
        .post('/api/auth/register')
        .set(csrfHeaders())
        .send({
          email: 'cust-rbac@lumareel.test',
          name: 'Customer RBAC',
          password: 'CustomerPass#2026',
        });

      const custAdminRes = await custAgent.get('/api/admin/overview');
      expect(custAdminRes.status).toBe(403);

      const custMbrAdminRes = await custAgent.get('/api/membership/admin/overview');
      expect(custMbrAdminRes.status).toBe(403);

      const adminAgent = request.agent(app);
      const adminLogin = await adminAgent
        .post('/api/auth/login')
        .set(csrfHeaders())
        .send({
          email: process.env.ADMIN_BOOTSTRAP_EMAIL,
          password: process.env.ADMIN_BOOTSTRAP_PASSWORD,
        });
      expect(adminLogin.status).toBe(200);
      expect(adminLogin.body.user.role).toBe('super_admin');

      const okRes = await adminAgent.get('/api/admin/overview');
      expect(okRes.status).toBe(200);
      expect(okRes.body.success).toBe(true);
    });
  });

  describe('P0-3 Suppression des vecteurs RCE', () => {
    it('retourne 404 pour /api/admin/git-sync et /api/admin/supabase-config même authentifié super_admin', async () => {
      const adminAgent = request.agent(app);
      await adminAgent.post('/api/auth/login').set(csrfHeaders()).send({
        email: process.env.ADMIN_BOOTSTRAP_EMAIL,
        password: process.env.ADMIN_BOOTSTRAP_PASSWORD,
      });

      const gitSyncRes = await adminAgent
        .post('/api/admin/git-sync')
        .set(csrfHeaders())
        .send({ remoteUrl: 'https://github.com/org/repo.git', commitMessage: 'test' });
      expect(gitSyncRes.status).toBe(404);

      const supaRes = await adminAgent
        .post('/api/admin/supabase-config')
        .set(csrfHeaders())
        .send({ url: 'https://evil.supabase.co', serviceRoleKey: 'leak' });
      expect(supaRes.status).toBe(404);
    });
  });

  describe('P0-4 Authentification, Scrypt, Sessions, CSRF & Anti-IDOR', () => {
    it('bloque toute requête mutante /api/* sans header CSRF X-Requested-With', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'a@b.com', password: 'SomePassword123' });
      expect(res.status).toBe(403);
    });

    it('rejette role sur /api/auth/register, empêche l’énumération, et crée une session HttpOnly valide', async () => {
      const escalationAttempt = await request(app)
        .post('/api/auth/register')
        .set(csrfHeaders())
        .send({
          email: 'hacker@lumareel.test',
          name: 'Hacker',
          password: 'ValidLongPassword#2026',
          role: 'super_admin',
        });
      expect(escalationAttempt.status).toBe(400);

      const weakPass = await request(app)
        .post('/api/auth/register')
        .set(csrfHeaders())
        .send({ email: 'short@lumareel.test', name: 'Short', password: '123' });
      expect(weakPass.status).toBe(400);

      const email = 'legit-user@lumareel.test';
      const firstReg = await request(app)
        .post('/api/auth/register')
        .set(csrfHeaders())
        .send({ email, name: 'Legit User', password: 'LegitUser#2026!' });
      expect(firstReg.status).toBe(200);
      const rawSetCookie = firstReg.headers['set-cookie'];
      const setCookies: string[] = Array.isArray(rawSetCookie) ? rawSetCookie : rawSetCookie ? [rawSetCookie] : [];
      expect(setCookies.some((c) => c.startsWith('lumareel_sid=') && c.includes('HttpOnly'))).toBe(true);

      // Re-register same email -> generic 200 without issuing cookie
      const dupReg = await request(app)
        .post('/api/auth/register')
        .set(csrfHeaders())
        .send({ email, name: 'Attacker Enum', password: 'AnotherPassword#2026' });
      expect(dupReg.status).toBe(200);
      expect(dupReg.body.message).toBe(firstReg.body.message);
      expect(dupReg.headers['set-cookie']).toBeUndefined();

      // Stored hash is scrypt$
      const savedUser = db.getUserByEmail(email);
      expect(savedUser?.passwordHash?.startsWith('scrypt$')).toBe(true);
    });

    it('migre un ancien hash PBKDF2 vers scrypt$ lors du login et applique le rate limit après 5 échecs', async () => {
      const legacyEmail = 'legacy-pbkdf2@lumareel.test';
      const legacyPass = 'LegacyPass#2026!';
      const legacyHash = crypto.pbkdf2Sync(legacyPass, 'lumareel_salt_2026', 1000, 32, 'sha256').toString('hex');
      const legacyUser = {
        id: 'usr_legacy_test',
        email: legacyEmail,
        name: 'Legacy User',
        role: 'customer' as const,
        emailVerified: true,
        createdAt: new Date().toISOString(),
        passwordHash: legacyHash,
      };
      sqliteDb.upsertUser(legacyUser);
      // Hydrate memory map via authenticateUser reading DB or set via register/reset
      (db as any).users.set(legacyUser.id, legacyUser);
      (db as any).users.set(legacyEmail, legacyUser);

      const loginOk = await request(app)
        .post('/api/auth/login')
        .set(csrfHeaders())
        .send({ email: legacyEmail, password: legacyPass });
      expect(loginOk.status).toBe(200);
      const upgraded = db.getUserByEmail(legacyEmail);
      expect(upgraded?.passwordHash?.startsWith('scrypt$')).toBe(true);

      // Rate limit check (5 failed attempts -> 6th returns 429)
      for (let i = 0; i < 5; i++) {
        const fail = await request(app)
          .post('/api/auth/login')
          .set(csrfHeaders())
          .send({ email: 'ratelimit-target@lumareel.test', password: 'WrongPassword123!' });
        expect(fail.status).toBe(401);
      }
      const blocked = await request(app)
        .post('/api/auth/login')
        .set(csrfHeaders())
        .send({ email: 'ratelimit-target@lumareel.test', password: 'WrongPassword123!' });
      expect(blocked.status).toBe(429);
    });

    it('ignore ?email= sur /api/auth/me, exige le mot de passe sur DELETE /api/auth/account, et révoque les sessions au changement de mot de passe', async () => {
      const agent = request.agent(app);
      const email = 'session-life@lumareel.test';
      const pass = 'SessionPass#2026!';
      await agent.post('/api/auth/register').set(csrfHeaders()).send({ email, name: 'Session User', password: pass });

      const meSpoof = await agent.get(`/api/auth/me?email=${encodeURIComponent(process.env.ADMIN_BOOTSTRAP_EMAIL!)}`);
      expect(meSpoof.status).toBe(200);
      expect(meSpoof.body.user.email).toBe(email);

      const changePass = await agent
        .post('/api/auth/change-password')
        .set(csrfHeaders())
        .send({ currentPassword: pass, newPassword: 'NewSessionPass#2026!' });
      expect(changePass.status).toBe(200);

      // Old session revoked
      const afterChange = await agent.get('/api/auth/me');
      expect(afterChange.status).toBe(401);

      // Re-login with new password and test DELETE /api/auth/account
      await agent.post('/api/auth/login').set(csrfHeaders()).send({ email, password: 'NewSessionPass#2026!' });
      const wrongDel = await agent
        .delete('/api/auth/account')
        .set(csrfHeaders())
        .send({ password: 'WrongPassword!', email: process.env.ADMIN_BOOTSTRAP_EMAIL });
      expect(wrongDel.status).toBe(403);

      const okDel = await agent
        .delete(`/api/auth/account?email=${encodeURIComponent(process.env.ADMIN_BOOTSTRAP_EMAIL!)}`)
        .set(csrfHeaders())
        .send({ password: 'NewSessionPass#2026!', email: process.env.ADMIN_BOOTSTRAP_EMAIL });
      expect(okDel.status).toBe(200);

      // Admin MUST still exist while session user is deleted
      expect(db.getUserByEmail(process.env.ADMIN_BOOTSTRAP_EMAIL!)).toBeTruthy();
      expect(db.getUserByEmail(email)).toBeUndefined();
    });
  });

  describe('P0-5 Paiements, Commandes & Webhook GeniusPay', () => {
    it('calcule les prix côté serveur, rejette les champs client interdits et limite les quantités', async () => {
      const events = db.getAllEvents();
      const targetEvent = events[0];
      const targetCat = targetEvent.categories[0];

      const forgedPrice = await request(app)
        .post('/api/orders')
        .set(csrfHeaders())
        .send({
          eventId: targetEvent.id,
          items: [{ categoryId: targetCat.id, qty: 1 }],
          buyer: { name: 'Attacker', email: 'atk@lumareel.test' },
          totalAmount: 1,
        });
      expect(forgedPrice.status).toBe(400);

      const overQty = await request(app)
        .post('/api/orders/checkout')
        .set(csrfHeaders())
        .send({
          eventId: targetEvent.id,
          items: [{ categoryId: targetCat.id, qty: 11 }],
          buyer: { name: 'Bulk Buyer', email: 'bulk@lumareel.test' },
        });
      expect(overQty.status).toBe(400);

      const validOrder = await request(app)
        .post('/api/orders/checkout')
        .set(csrfHeaders())
        .send({
          eventId: targetEvent.id,
          items: [{ categoryId: targetCat.id, qty: 2 }],
          buyer: { name: 'Honest Buyer', email: 'buyer@lumareel.test' },
        });
      expect(validOrder.status).toBe(201);
      expect(validOrder.body.order.totalAmount).toBe(targetCat.price * 2);
      expect(validOrder.body.order.paymentStatus).toBe('pending');
      expect(validOrder.body.orderAccessToken).toBeTruthy();

      const orderId = validOrder.body.order.id;
      const orderToken = validOrder.body.orderAccessToken;

      // Status access check without token fails
      const statusDenied = await request(app).get(`/api/orders/${orderId}/status`);
      expect(statusDenied.status).toBe(403);

      // Sandbox pay fails without token
      const payDenied = await request(app)
        .post(`/api/orders/${orderId}/pay-sandbox`)
        .set(csrfHeaders())
        .send({});
      expect(payDenied.status).toBe(403);

      // Legitimate sandbox pay with token succeeds and issues exact qty tickets
      const payOk = await request(app)
        .post(`/api/orders/${orderId}/pay-sandbox`)
        .set(csrfHeaders({ 'X-Order-Token': orderToken }))
        .send({});
      expect(payOk.status).toBe(200);
      expect(payOk.body.tickets).toHaveLength(2);
    });

    it('valide la signature HMAC, l’horodatage, la confirmation S2S GeniusPay et l’idempotence du webhook', async () => {
      const targetEvent = db.getAllEvents()[0];
      const targetCat = targetEvent.categories[0];

      const orderRes = await request(app)
        .post('/api/orders/checkout')
        .set(csrfHeaders())
        .send({
          eventId: targetEvent.id,
          items: [{ categoryId: targetCat.id, qty: 2 }],
          buyer: { name: 'Webhook Buyer', email: 'whbuyer@lumareel.test' },
        });
      expect(orderRes.status).toBe(201);
      const orderId = orderRes.body.order.id;
      const expectedAmount = orderRes.body.order.totalAmount;

      const payloadObj = {
        event_id: `evt_gp_${crypto.randomBytes(6).toString('hex')}`,
        order_id: orderId,
        transaction_id: `tx_gp_${crypto.randomBytes(6).toString('hex')}`,
        payment_status: 'COMPLETED',
      };
      const rawBody = JSON.stringify(payloadObj);
      const nowTs = Math.floor(Date.now() / 1000).toString();
      const staleTs = (Math.floor(Date.now() / 1000) - 600).toString();

      // Bad signature
      const badSigRes = await request(app)
        .post('/api/orders/webhook/geniuspay')
        .set('Content-Type', 'application/json')
        .set('x-geniuspay-timestamp', nowTs)
        .set('x-geniuspay-signature', 'deadbeef')
        .send(rawBody);
      expect(badSigRes.status).toBe(401);

      // Stale timestamp (> 5 min)
      const staleSig = crypto
        .createHmac('sha256', process.env.GENIUSPAY_WEBHOOK_SECRET!)
        .update(`${staleTs}.${rawBody}`)
        .digest('hex');
      const staleRes = await request(app)
        .post('/api/orders/webhook/geniuspay')
        .set('Content-Type', 'application/json')
        .set('x-geniuspay-timestamp', staleTs)
        .set('x-geniuspay-signature', staleSig)
        .send(rawBody);
      expect(staleRes.status).toBe(401);

      // Valid signature + mismatched GeniusPay API response
      const validSig = crypto
        .createHmac('sha256', process.env.GENIUSPAY_WEBHOOK_SECRET!)
        .update(`${nowTs}.${rawBody}`)
        .digest('hex');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'COMPLETED', amount: 1, currency: 'XOF' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const mismatchRes = await request(app)
        .post('/api/orders/webhook/geniuspay')
        .set('Content-Type', 'application/json')
        .set('x-geniuspay-timestamp', nowTs)
        .set('x-geniuspay-signature', validSig)
        .send(rawBody);
      expect(mismatchRes.status).toBe(400);

      // Valid signature + matching GeniusPay API response (delivered twice -> idempotent)
      fetchSpy.mockImplementation(async () =>
        new Response(JSON.stringify({ status: 'COMPLETED', amount: expectedAmount, currency: 'XOF' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const whOk1 = await request(app)
        .post('/api/orders/webhook/geniuspay')
        .set('Content-Type', 'application/json')
        .set('x-geniuspay-timestamp', nowTs)
        .set('x-geniuspay-signature', validSig)
        .send(rawBody);
      expect(whOk1.status).toBe(200);
      expect(whOk1.body.received).toBe(true);

      const whOk2 = await request(app)
        .post('/api/orders/webhook/geniuspay')
        .set('Content-Type', 'application/json')
        .set('x-geniuspay-timestamp', nowTs)
        .set('x-geniuspay-signature', validSig)
        .send(rawBody);
      expect(whOk2.status).toBe(200);
      expect(whOk2.body.deduplicated).toBe(true);

      const finalOrder = db.getOrderById(orderId);
      expect(finalOrder?.paymentStatus).toBe('completed');
      expect(finalOrder?.tickets).toHaveLength(2);
      fetchSpy.mockRestore();
    });

    it('désactive /pay-sandbox lorsque NODE_ENV=production ou PAYMENT_MODE!=sandbox', async () => {
      const origMode = process.env.PAYMENT_MODE;
      process.env.PAYMENT_MODE = 'live';
      const liveApp = await createAppFn();
      const res = await request(liveApp)
        .post('/api/orders/ord_missing/pay-sandbox')
        .set(csrfHeaders())
        .send({});
      expect(res.status).toBe(404);
      process.env.PAYMENT_MODE = origMode;
    });
  });

  describe('P0-6 Black Card & Wallet Atomique', () => {
    it('crée une commande d’adhésion pending sans activer la carte, puis valide l’activation + idempotence wallet & anti-découvert', async () => {
      const mbrAgent = request.agent(app);
      const email = 'blackcard-owner@lumareel.test';
      await mbrAgent.post('/api/auth/register').set(csrfHeaders()).send({
        email,
        name: 'Black Card Member',
        password: 'BlackCardPass#2026!',
      });

      const forgedOrderRes = await mbrAgent
        .post('/api/membership/order')
        .set(csrfHeaders())
        .send({
          userId: 'usr_forged_victim',
          customerName: 'Black Card Member',
          customerEmail: email,
          paymentMethod: 'geniuspay',
        });
      expect(forgedOrderRes.status).toBe(400);

      const orderRes = await mbrAgent
        .post('/api/membership/order')
        .set(csrfHeaders())
        .send({
          customerName: 'Black Card Member',
          customerEmail: email,
          paymentMethod: 'geniuspay',
        });
      expect(orderRes.status).toBe(201);
      expect(orderRes.body.order.paymentStatus).toBe('pending');
      expect(orderRes.body.order.userId).not.toBe('usr_forged_victim');

      // Card is NOT yet issued before payment confirmation
      const beforePayCard = await mbrAgent.get('/api/membership/my-card');
      expect(beforePayCard.status).toBe(200);
      expect(beforePayCard.body.hasCard).toBe(false);

      // Sandbox confirmation fails without token / wrong user
      const strangerAgent = request.agent(app);
      await strangerAgent.post('/api/auth/register').set(csrfHeaders()).send({
        email: 'stranger-mbr@lumareel.test',
        name: 'Stranger',
        password: 'StrangerPass#2026!',
      });
      const strangerPay = await strangerAgent
        .post(`/api/membership/orders/${orderRes.body.order.id}/pay-sandbox`)
        .set(csrfHeaders())
        .send({});
      expect(strangerPay.status).toBe(403);

      // Legitimate owner confirms sandbox payment
      const confirmRes = await mbrAgent
        .post(`/api/membership/orders/${orderRes.body.order.id}/pay-sandbox`)
        .set(csrfHeaders({ 'X-Order-Token': orderRes.body.orderAccessToken }))
        .send({});
      expect(confirmRes.status).toBe(200);
      const cardId = confirmRes.body.card.id;
      expect(confirmRes.body.card.cardStatus).toBe('active');

      // Unauthorized user cannot read card wallet
      const strangerWallet = await strangerAgent.get(`/api/membership/cards/${cardId}/wallet`);
      expect(strangerWallet.status).toBe(403);

      // Admin login to test idempotent recharge + overdraft prevention
      const adminAgent = request.agent(app);
      await adminAgent.post('/api/auth/login').set(csrfHeaders()).send({
        email: process.env.ADMIN_BOOTSTRAP_EMAIL,
        password: process.env.ADMIN_BOOTSTRAP_PASSWORD,
      });

      const idemRechargeKey = 'idem_recharge_test_1';
      const r1 = await adminAgent
        .post(`/api/membership/admin/cards/${cardId}/wallet/recharge`)
        .set(csrfHeaders({ 'Idempotency-Key': idemRechargeKey }))
        .send({ amount: 10000 });
      expect(r1.status).toBe(200);
      const r2 = await adminAgent
        .post(`/api/membership/admin/cards/${cardId}/wallet/recharge`)
        .set(csrfHeaders({ 'Idempotency-Key': idemRechargeKey }))
        .send({ amount: 10000 });
      expect(r2.status).toBe(200);

      // Welcome 5000 + single recharge 10000 = 15000
      const wAfterRecharge = await mbrAgent.get(`/api/membership/cards/${cardId}/wallet`);
      expect(wAfterRecharge.status).toBe(200);
      expect(wAfterRecharge.body.balance).toBe(15000);

      // Overdraft fails cleanly
      const overdraft = await adminAgent
        .post('/api/membership/pos/charge')
        .set(csrfHeaders({ 'Idempotency-Key': 'idem_overdraft_1' }))
        .send({ cardId, amount: 999999 });
      expect(overdraft.status).toBe(400);

      // Legitimate idempotent POS debit
      const idemChargeKey = 'idem_pos_test_1';
      const c1 = await adminAgent
        .post('/api/membership/pos/charge')
        .set(csrfHeaders({ 'Idempotency-Key': idemChargeKey }))
        .send({ cardId, amount: 4000 });
      expect(c1.status).toBe(200);
      const c2 = await adminAgent
        .post('/api/membership/pos/charge')
        .set(csrfHeaders({ 'Idempotency-Key': idemChargeKey }))
        .send({ cardId, amount: 4000 });
      expect(c2.status).toBe(200);

      const wAfterCharge = await mbrAgent.get(`/api/membership/cards/${cardId}/wallet`);
      expect(wAfterCharge.body.balance).toBe(11000);
    });
  });

  describe('P0-7 Commandes Clients & Billets Anti-IDOR', () => {
    it('protège /api/customer/orders et /api/customer/tickets/:id contre l’accès par email ou tiers', async () => {
      const targetEvent = db.getAllEvents()[0];
      const ownerAgent = request.agent(app);
      const ownerEmail = 'ticket-owner@lumareel.test';
      await ownerAgent.post('/api/auth/register').set(csrfHeaders()).send({
        email: ownerEmail,
        name: 'Ticket Owner',
        password: 'TicketOwner#2026!',
      });

      const orderRes = await ownerAgent
        .post('/api/orders/checkout')
        .set(csrfHeaders())
        .send({
          eventId: targetEvent.id,
          items: [{ categoryId: targetEvent.categories[0].id, qty: 1 }],
          buyer: { name: 'Ticket Owner', email: ownerEmail },
        });
      const orderId = orderRes.body.order.id;
      const payRes = await ownerAgent
        .post(`/api/orders/${orderId}/pay-sandbox`)
        .set(csrfHeaders())
        .send({});
      const ticketId = payRes.body.tickets[0].id;

      // Unauthenticated -> 401
      const unauthOrders = await request(app).get(`/api/customer/orders?email=${encodeURIComponent(ownerEmail)}`);
      expect(unauthOrders.status).toBe(401);
      const unauthTicket = await request(app).get(`/api/customer/tickets/${ticketId}`);
      expect(unauthTicket.status).toBe(401);

      // Another customer passing ?email= -> gets ONLY their own orders (empty), and 403 on victim ticket
      const otherAgent = request.agent(app);
      await otherAgent.post('/api/auth/register').set(csrfHeaders()).send({
        email: 'other-customer@lumareel.test',
        name: 'Other Customer',
        password: 'OtherCustomer#2026!',
      });
      const otherOrders = await otherAgent.get(`/api/customer/orders?email=${encodeURIComponent(ownerEmail)}`);
      expect(otherOrders.status).toBe(200);
      expect(otherOrders.body.orders).toHaveLength(0);

      const otherTicket = await otherAgent.get(`/api/customer/tickets/${ticketId}`);
      expect(otherTicket.status).toBe(403);
      const otherPrint = await otherAgent.get(`/api/customer/tickets/${ticketId}/print`);
      expect(otherPrint.status).toBe(403);

      // Owner accesses ticket & print cleanly
      const ownerTicket = await ownerAgent.get(`/api/customer/tickets/${ticketId}`);
      expect(ownerTicket.status).toBe(200);
      const ownerPrint = await ownerAgent.get(`/api/customer/tickets/${ticketId}/print`);
      expect(ownerPrint.status).toBe(200);
    });
  });

  describe('P0-8 Sécurisation des Uploads', () => {
    it('exige admin, rejette un faux fichier PNG HTML, et sert une image PNG ré-encodée avec nosniff', async () => {
      const unauthUpload = await request(app)
        .post('/api/upload')
        .set(csrfHeaders())
        .attach('file', Buffer.from('<html><script>alert(1)</script></html>'), 'evil.png');
      expect(unauthUpload.status).toBe(401);

      const adminAgent = request.agent(app);
      await adminAgent.post('/api/auth/login').set(csrfHeaders()).send({
        email: process.env.ADMIN_BOOTSTRAP_EMAIL,
        password: process.env.ADMIN_BOOTSTRAP_PASSWORD,
      });

      const fakeImage = await adminAgent
        .post('/api/upload')
        .set(csrfHeaders())
        .attach('file', Buffer.from('<html><script>alert(1)</script></html>'), 'polyglot.png');
      expect(fakeImage.status).toBe(400);

      const validPng = await sharp({
        create: { width: 12, height: 12, channels: 4, background: { r: 212, g: 175, b: 55, alpha: 1 } },
      })
        .png()
        .toBuffer();

      const validUpload = await adminAgent
        .post('/api/upload')
        .set(csrfHeaders())
        .attach('file', validPng, 'poster.png');
      expect(validUpload.status).toBe(200);
      expect(validUpload.body.url).toMatch(/^\/uploads\/[a-f0-9-]+\.png$/);

      const fetchedFile = await request(app).get(validUpload.body.url);
      expect(fetchedFile.status).toBe(200);
      expect(fetchedFile.headers['x-content-type-options']).toBe('nosniff');
    });
  });
});
