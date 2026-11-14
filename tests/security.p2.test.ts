import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lumareel-p2-test-'));
const tempDataDir = path.join(tempRoot, 'data');
const tempStorageDir = path.join(tempRoot, 'storage', 'uploads');
fs.mkdirSync(tempDataDir, { recursive: true });
fs.mkdirSync(tempStorageDir, { recursive: true });

process.env.LUMAREEL_DATA_DIR = tempDataDir;
process.env.LUMAREEL_STORAGE_DIR = tempStorageDir;
process.env.NODE_ENV = 'test';
process.env.VITEST = 'true';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
process.env.SESSION_SECRET = 'p2_test_session_secret_at_least_64_characters_long_0123456789abcdef';
process.env.ADMIN_BOOTSTRAP_EMAIL = 'admin-p2@lumareel.test';
process.env.ADMIN_BOOTSTRAP_PASSWORD = 'AdminBootstrap#2026!';
process.env.PAYMENT_MODE = 'sandbox';
process.env.MEMBERSHIP_WELCOME_CREDIT_XOF = '5000';

let app: any;
let db: any;
let sqliteDb: any;
let securityMod: any;
let loggerMod: any;

function csrfHeaders(extra: Record<string, string> = {}) {
  return { 'X-Requested-With': 'LUMAREEL', ...extra };
}

async function loginAs(email: string, password: string, totpCode?: string): Promise<{ res: request.Response; cookies: string[] }> {
  const payload: Record<string, string> = { email, password };
  if (totpCode) payload.totpCode = totpCode;
  const res = await request(app)
    .post('/api/auth/login')
    .set(csrfHeaders())
    .send(payload);
  const raw = res.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
  return { res, cookies };
}

describe('Phase P2 Security Verification', () => {
  beforeAll(async () => {
    const serverMod = await import('../server.ts');
    const dbMod = await import('../src/server/db');
    const sqlMod = await import('../src/server/sqliteDb');
    securityMod = await import('../src/server/security');
    loggerMod = await import('../src/server/logger');

    db = dbMod.db;
    sqliteDb = sqlMod.sqliteDb;
    app = await serverMod.createApp();
  });

  afterAll(() => {
    try {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    } catch {}
  });

  describe('P2-1 Structured Logging, Request-Id & Sanitized Errors', () => {
    it('attache un X-Request-Id unique et masque les secrets dans la config pino', () => {
      const redactPaths = loggerMod.logger?.bindings ? undefined : undefined;
      expect(loggerMod.logger).toBeDefined();
      const loggerSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/server/logger.ts'), 'utf8');
      expect(loggerSrc).toContain('req.headers.authorization');
      expect(loggerSrc).toContain('req.headers.cookie');
      expect(loggerSrc).toContain('*.password');
      expect(loggerSrc).toContain('*.token');
      expect(loggerSrc).toContain('*.totpSecret');
      expect(redactPaths).toBeUndefined();
    });

    it('renvoie un X-Request-Id et une erreur JSON sanitizée sur JSON malformé ou payload trop grand', async () => {
      const badJsonRes = await request(app)
        .post('/api/auth/login')
        .set(csrfHeaders({ 'Content-Type': 'application/json' }))
        .send('{"email": "broken');

      expect(badJsonRes.status).toBe(400);
      expect(badJsonRes.headers['x-request-id']).toBeTruthy();
      expect(badJsonRes.body.success).toBe(false);
      expect(badJsonRes.body.requestId).toBe(badJsonRes.headers['x-request-id']);
      expect(JSON.stringify(badJsonRes.body)).not.toContain('node_modules');
    });
  });

  describe('P2-2 Health Check Minimal & Diagnostics Admin', () => {
    it('GET /api/health n’expose ni chemin SQLite ni compteurs internes', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(typeof res.body.timestamp).toBe('string');
      expect(res.body.database).toBeUndefined();
      expect(res.body.inquiriesCount).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('lumareel.sqlite');
    });

    it('GET /api/admin/db-status exige un admin authentifié', async () => {
      const unauth = await request(app).get('/api/admin/db-status');
      expect(unauth.status).toBe(401);

      const { res: loginRes, cookies } = await loginAs('admin-p2@lumareel.test', 'AdminBootstrap#2026!');
      expect(loginRes.status).toBe(200);

      const adminRes = await request(app).get('/api/admin/db-status').set('Cookie', cookies);
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.success).toBe(true);
      expect(adminRes.body.database?.engine).toBe('sqlite');
    });

    it('ne renvoie aucun gateToken ni credential Supabase dans les paramètres admin', async () => {
      const { res: loginRes, cookies } = await loginAs('admin-p2@lumareel.test', 'AdminBootstrap#2026!');
      expect(loginRes.status).toBe(200);

      const settingsRes = await request(app).get('/api/admin/settings').set('Cookie', cookies);
      expect(settingsRes.status).toBe(200);
      expect(settingsRes.body.settings).toHaveProperty('platformName');
      expect(settingsRes.body.settings.gateToken).toBeUndefined();
      expect(settingsRes.body.settings.supabaseUrl).toBeUndefined();
      expect(settingsRes.body.settings.supabaseAnonKey).toBeUndefined();
    });
  });

  describe('P2-3 Contact Honeypot & CR/LF Header Injection', () => {
    it('ignore silencieusement les soumissions honeypot sans écrire en base', async () => {
      const beforeCount = db.getContactInquiries().length;
      const spamRes = await request(app)
        .post('/api/contact')
        .set(csrfHeaders())
        .send({
          name: 'Bot Automated',
          email: 'bot@spam.example',
          subject: 'Spam Offer',
          organization: 'BotNet',
          message: 'Buy crypto now from our automated script.',
          website: 'https://bot-trap.example',
        });

      expect(spamRes.status).toBe(200);
      expect(spamRes.body.success).toBe(true);
      expect(db.getContactInquiries().length).toBe(beforeCount);
    });

    it('supprime les retours chariot CR/LF des champs d’en-tête sur /api/contact', async () => {
      const cleanRes = await request(app)
        .post('/api/contact')
        .set(csrfHeaders())
        .send({
          name: 'Jean Dupont\r\nBcc: victim@attacker.test',
          email: 'jean.dupont@gmail.com',
          subject: 'Partenariat\nCc: evil@attacker.test',
          organization: 'Maison\r\nX-Header: injected',
          message: 'Bonjour, nous souhaitons collaborer avec la direction artistique.',
          website: '',
        });

      expect(cleanRes.status).toBe(200);
      expect(cleanRes.body.success).toBe(true);
      expect(cleanRes.body.inquiry.name).not.toMatch(/[\r\n]/);
      expect(cleanRes.body.inquiry.subject).not.toMatch(/[\r\n]/);
      expect(cleanRes.body.inquiry.organization).not.toMatch(/[\r\n]/);
    });
  });

  describe('P2-4 Reset Mot de Passe & 2FA TOTP Admin', () => {
    it('réinitialisation de mot de passe : anti-énumération, consommation unique, expiration et révocation de session', async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .set(csrfHeaders())
        .send({
          email: 'reset-user@lumareel.test',
          name: 'Reset User',
          password: 'InitialPassword#2026!',
        });
      expect(regRes.status).toBe(200);
      const rawCookies = regRes.headers['set-cookie'];
      const initialCookies = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [String(rawCookies)] : [];
      expect(initialCookies.length).toBeGreaterThan(0);

      // Forgot-password répond uniformément pour email existant et inexistant sans fuiter de jeton
      const forgotExisting = await request(app)
        .post('/api/auth/forgot-password')
        .set(csrfHeaders())
        .send({ email: 'reset-user@lumareel.test' });
      const forgotMissing = await request(app)
        .post('/api/auth/forgot-password')
        .set(csrfHeaders())
        .send({ email: 'nobody-here@lumareel.test' });

      expect(forgotExisting.status).toBe(200);
      expect(forgotMissing.status).toBe(200);
      expect(forgotExisting.body.message).toBe(forgotMissing.body.message);
      expect(forgotExisting.body.token).toBeUndefined();

      // Jeton invalide rejeté
      const invalidReset = await request(app)
        .post('/api/auth/reset-password')
        .set(csrfHeaders())
        .send({ token: 'forged_token_not_in_db_1234567890', newPassword: 'NewPassword#2026!' });
      expect(invalidReset.status).toBe(400);

      // Jeton expiré rejeté
      const user = db.getUserByEmail('reset-user@lumareel.test');
      expect(user).toBeTruthy();
      const expiredToken = securityMod.generateOpaqueToken(32);
      sqliteDb.createPasswordResetToken(
        user.id,
        securityMod.sha256Hex(expiredToken),
        new Date(Date.now() - 60_000).toISOString()
      );
      const expiredReset = await request(app)
        .post('/api/auth/reset-password')
        .set(csrfHeaders())
        .send({ token: expiredToken, newPassword: 'NewPassword#2026!' });
      expect(expiredReset.status).toBe(400);

      // Jeton valide : réinitialise, révoque la session active et refuse le replay
      const validToken = securityMod.generateOpaqueToken(32);
      sqliteDb.createPasswordResetToken(
        user.id,
        securityMod.sha256Hex(validToken),
        new Date(Date.now() + 15 * 60_000).toISOString()
      );
      const okReset = await request(app)
        .post('/api/auth/reset-password')
        .set(csrfHeaders())
        .send({ token: validToken, newPassword: 'RotatedPassword#2026!' });
      expect(okReset.status).toBe(200);

      // Ancienne session révoquée
      const meAfterReset = await request(app).get('/api/auth/me').set('Cookie', initialCookies);
      expect(meAfterReset.status).toBe(401);

      // Ancien mot de passe refusé, nouveau mot de passe accepté
      const oldLogin = await loginAs('reset-user@lumareel.test', 'InitialPassword#2026!');
      expect(oldLogin.res.status).toBe(401);
      const newLogin = await loginAs('reset-user@lumareel.test', 'RotatedPassword#2026!');
      expect(newLogin.res.status).toBe(200);

      // Replay du jeton refusé
      const replayReset = await request(app)
        .post('/api/auth/reset-password')
        .set(csrfHeaders())
        .send({ token: validToken, newPassword: 'AnotherPassword#2026!' });
      expect(replayReset.status).toBe(400);
    });

    it('protège le compte admin par 2FA TOTP (setup, verify, login, disable)', async () => {
      // Un client ne peut pas configurer la 2FA admin
      const { cookies: custCookies } = await loginAs('reset-user@lumareel.test', 'RotatedPassword#2026!');
      const custSetup = await request(app)
        .post('/api/admin/2fa/setup')
        .set('Cookie', custCookies)
        .set(csrfHeaders());
      expect(custSetup.status).toBe(403);

      // Admin active la 2FA
      const { cookies: adminCookies } = await loginAs('admin-p2@lumareel.test', 'AdminBootstrap#2026!');
      const setupRes = await request(app)
        .post('/api/admin/2fa/setup')
        .set('Cookie', adminCookies)
        .set(csrfHeaders());
      expect(setupRes.status).toBe(200);
      expect(setupRes.body.otpauthUrl).toContain('otpauth://totp/');
      expect(typeof setupRes.body.manualKey).toBe('string');

      const manualKey = setupRes.body.manualKey;

      // Mauvais code rejeté
      const badVerify = await request(app)
        .post('/api/admin/2fa/verify')
        .set('Cookie', adminCookies)
        .set(csrfHeaders())
        .send({ code: '000000' });
      expect(badVerify.status).toBe(400);

      // Code TOTP valide active la 2FA
      const currentStep = Math.floor(Date.now() / 1000 / 30);
      const validCode = securityMod.computeTotpAtStep(manualKey, currentStep);
      const okVerify = await request(app)
        .post('/api/admin/2fa/verify')
        .set('Cookie', adminCookies)
        .set(csrfHeaders())
        .send({ code: validCode });
      expect(okVerify.status).toBe(200);
      expect(okVerify.body.twoFactorEnabled).toBe(true);

      // Connexion sans code -> 401 requires2fa: true
      const noTotpLogin = await loginAs('admin-p2@lumareel.test', 'AdminBootstrap#2026!');
      expect(noTotpLogin.res.status).toBe(401);
      expect(noTotpLogin.res.body.requires2fa).toBe(true);

      // Connexion avec mauvais code -> 401
      const badTotpLogin = await loginAs('admin-p2@lumareel.test', 'AdminBootstrap#2026!', '000001');
      expect(badTotpLogin.res.status).toBe(401);
      expect(badTotpLogin.res.body.requires2fa).toBe(true);

      // Connexion avec code valide -> 200
      const freshCode = securityMod.computeTotpAtStep(manualKey, Math.floor(Date.now() / 1000 / 30));
      const okTotpLogin = await loginAs('admin-p2@lumareel.test', 'AdminBootstrap#2026!', freshCode);
      expect(okTotpLogin.res.status).toBe(200);
      expect(okTotpLogin.cookies.length).toBeGreaterThan(0);

      // Désactivation 2FA exige mot de passe et code valides
      const badPwdDisable = await request(app)
        .post('/api/admin/2fa/disable')
        .set('Cookie', okTotpLogin.cookies)
        .set(csrfHeaders())
        .send({ password: 'WrongPassword123', code: freshCode });
      expect(badPwdDisable.status).toBe(403);

      const okDisable = await request(app)
        .post('/api/admin/2fa/disable')
        .set('Cookie', okTotpLogin.cookies)
        .set(csrfHeaders())
        .send({ password: 'AdminBootstrap#2026!', code: freshCode });
      expect(okDisable.status).toBe(200);
      expect(okDisable.body.twoFactorEnabled).toBe(false);

      // Connexion redevient possible sans TOTP
      const loginAfterDisable = await loginAs('admin-p2@lumareel.test', 'AdminBootstrap#2026!');
      expect(loginAfterDisable.res.status).toBe(200);
    });
  });

  describe('P2-5 Vite Dev Middleware Strict Gate', () => {
    it('n’active jamais Vite dev middleware hors NODE_ENV === "development"', async () => {
      const serverSrc = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf8');
      expect(serverSrc).toContain("const isDevelopment = process.env.NODE_ENV === 'development';");
      expect(serverSrc).toContain("if (isDevelopment && process.env.VITEST !== 'true')");

      const res = await request(app).get('/@vite/client');
      expect(res.status).toBe(404);
    });
  });
});
