import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';

export const SESSION_COOKIE_NAME = 'lumareel_sid';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days sliding
export const MIN_PASSWORD_LENGTH = 10;

export function assertBootSecurityConfig(): void {
  let secret = process.env.SESSION_SECRET || '';

  // AI Studio and local preview may not inject server-side secrets. Generate a
  // cryptographically random, process-local secret for non-production runtimes.
  // Production remains fail-closed and requires an explicitly configured secret.
  if ((!secret || secret.length < 32) && process.env.NODE_ENV !== 'production') {
    secret = crypto.randomBytes(48).toString('hex');
    process.env.SESSION_SECRET = secret;
    console.warn(
      '[SECURITY CONFIG] SESSION_SECRET absent: generated ephemeral development secret. Sessions will reset on restart.'
    );
  }

  if (!secret || secret.length < 32) {
    console.error(
      '[FATAL SECURITY CONFIG] SESSION_SECRET doit être défini et contenir au moins 32 caractères en production. Arrêt du serveur.'
    );
    process.exit(1);
  }

  if (process.env.ALLOW_DEV_AUTH !== undefined) {
    if (!process.env.NODE_ENV || process.env.NODE_ENV === 'production') {
      console.error(
        '[FATAL SECURITY CONFIG] ALLOW_DEV_AUTH ne peut pas être utilisé en production ou sans NODE_ENV défini.'
      );
      process.exit(1);
    }
  }

  if (process.env.NODE_ENV === 'production' && process.env.PAYMENT_MODE === 'sandbox') {
    console.error(
      '[FATAL SECURITY CONFIG] PAYMENT_MODE=sandbox est strictement interdit en production.'
    );
    process.exit(1);
  }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  if (supabaseUrl) {
    try {
      const parsed = new URL(supabaseUrl);
      if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co')) {
        throw new Error('Invalid Supabase domain');
      }
    } catch {
      console.error(
        '[FATAL SECURITY CONFIG] SUPABASE_URL invalide : doit utiliser https:// et un domaine *.supabase.co.'
      );
      process.exit(1);
    }
  }
}

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || '';
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET absent ou inférieur à 32 caractères.');
  }
  return secret;
}

export function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

export function generateOpaqueToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function timingSafeEqualStr(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

// Scrypt format: scrypt$N$r$p$saltHex$hashHex
export function hashPasswordScrypt(password: string): string {
  const N = 16384;
  const r = 8;
  const p = 1;
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64, { N, r, p }).toString('hex');
  return `scrypt$${N}$${r}$${p}$${salt}$${derived}`;
}

export function verifyPasswordWithUpgrade(
  password: string,
  storedHash: string
): { valid: boolean; needsUpgrade: boolean } {
  if (!password || !storedHash) {
    return { valid: false, needsUpgrade: false };
  }

  if (storedHash.startsWith('scrypt$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 6) {
      return { valid: false, needsUpgrade: false };
    }
    const N = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    const salt = parts[4];
    const expectedHex = parts[5];
    if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p) || !salt || !expectedHex) {
      return { valid: false, needsUpgrade: false };
    }
    try {
      const expectedBuf = Buffer.from(expectedHex, 'hex');
      const derivedBuf = crypto.scryptSync(password, salt, expectedBuf.length, { N, r, p });
      if (derivedBuf.length !== expectedBuf.length) {
        return { valid: false, needsUpgrade: false };
      }
      const valid = crypto.timingSafeEqual(derivedBuf, expectedBuf);
      return { valid, needsUpgrade: false };
    } catch {
      return { valid: false, needsUpgrade: false };
    }
  }

  // Legacy PBKDF2 SHA-256 format (64 hex chars) -> constant-time check & upgrade
  if (/^[a-f0-9]{64}$/i.test(storedHash)) {
    try {
      const legacyBuf = crypto.pbkdf2Sync(password, 'lumareel_salt_2026', 1000, 32, 'sha256');
      const expectedBuf = Buffer.from(storedHash, 'hex');
      if (legacyBuf.length === expectedBuf.length && crypto.timingSafeEqual(legacyBuf, expectedBuf)) {
        return { valid: true, needsUpgrade: true };
      }
    } catch {
      return { valid: false, needsUpgrade: false };
    }
  }

  return { valid: false, needsUpgrade: false };
}

export function runDummyPasswordCheck(password: string): void {
  try {
    crypto.scryptSync(password || 'dummy_password_for_timing', '00112233445566778899aabbccddeeff', 64, {
      N: 16384,
      r: 8,
      p: 1,
    });
  } catch {}
}

export function isSecureRequest(req: Request): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  if (req.secure) return true;
  const proto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
  return proto === 'https';
}

export function setSessionCookie(res: Response, req: Request, rawToken: string): void {
  res.cookie(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: isSecureRequest(req),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS,
  });
}

export const SCANNER_COOKIE_NAME = 'lumareel_scanner_sid';
export const SCANNER_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours max

export function setScannerSessionCookie(res: Response, req: Request, rawToken: string, maxAgeMs = SCANNER_SESSION_TTL_MS): void {
  res.cookie(SCANNER_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: isSecureRequest(req),
    sameSite: 'lax',
    path: '/',
    maxAge: Math.min(SCANNER_SESSION_TTL_MS, Math.max(60_000, maxAgeMs)),
  });
}

export function clearScannerSessionCookie(res: Response, req: Request): void {
  res.clearCookie(SCANNER_COOKIE_NAME, {
    httpOnly: true,
    secure: isSecureRequest(req),
    sameSite: 'lax',
    path: '/',
  });
}

export function clearSessionCookie(res: Response, req: Request): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: isSecureRequest(req),
    sameSite: 'lax',
    path: '/',
  });
}

export function escapeHtml(input: unknown): string {
  const s = String(input ?? '');
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}

export function isSafeAssetUrl(rawUrl: string): boolean {
  const u = (rawUrl || '').trim();
  if (!u) return false;
  if (/^\/uploads\/[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/i.test(u)) return true;
  if (/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i.test(u)) return true;
  if (/^https:\/\/[^\s"'<>`]+$/i.test(u)) {
    try {
      const parsed = new URL(u);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
  return false;
}

const FORBIDDEN_PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function hasPrototypePollutionKeys(value: unknown, depth = 0): boolean {
  if (depth > 15 || value === null || typeof value !== 'object') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((item) => hasPrototypePollutionKeys(item, depth + 1));
  }
  for (const key of Object.getOwnPropertyNames(value)) {
    if (FORBIDDEN_PROTO_KEYS.has(key)) {
      return true;
    }
    const child = (value as Record<string, unknown>)[key];
    if (hasPrototypePollutionKeys(child, depth + 1)) {
      return true;
    }
  }
  return false;
}

export function prototypePollutionGuard(req: Request, res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object' && hasPrototypePollutionKeys(req.body)) {
    res.status(400).json({
      success: false,
      error: 'Requête rejetée : clé d’objet interdite détectée.',
    });
    return;
  }
  next();
}

export function signSerialIntegrity(serialNumber: string): string {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(`serial:${serialNumber}`, 'utf8')
    .digest('hex')
    .slice(0, 16)
    .toUpperCase();
}

export function verifySerialIntegrity(serialNumber: string, sig: string): boolean {
  if (!serialNumber || !sig) return false;
  const expected = signSerialIntegrity(serialNumber);
  return timingSafeEqualStr(expected, sig.trim().toUpperCase());
}

const CARD_QR_STEP_SECONDS = 30;

export function generateDynamicCardQrToken(cardId: string, cardSecret: string, nowMs = Date.now()): string {
  const step = Math.floor(nowMs / 1000 / CARD_QR_STEP_SECONDS);
  const mac = crypto
    .createHmac('sha256', `${getSessionSecret()}:${cardSecret}`)
    .update(`LMR-BC1:${cardId}:${step}`, 'utf8')
    .digest('hex')
    .slice(0, 20);
  return `LMR-BC1.${cardId}.${step}.${mac}`;
}

export function verifyDynamicCardQrToken(
  token: string,
  lookupSecret: (cardId: string) => string | undefined,
  nowMs = Date.now()
): { valid: boolean; cardId?: string; step?: number; error?: string } {
  const parts = String(token || '').trim().split('.');
  if (parts.length !== 4 || parts[0] !== 'LMR-BC1') {
    return { valid: false, error: 'Format QR dynamique invalide.' };
  }
  const [, cardId, stepRaw, providedMac] = parts;
  const step = Number(stepRaw);
  if (!cardId || !Number.isInteger(step) || !providedMac) {
    return { valid: false, error: 'Paramètres QR dynamiques invalides.' };
  }
  const currentStep = Math.floor(nowMs / 1000 / CARD_QR_STEP_SECONDS);
  if (Math.abs(currentStep - step) > 1) {
    return { valid: false, error: 'QR code dynamique expiré. Veuillez actualiser votre pass.' };
  }
  const cardSecret = lookupSecret(cardId);
  if (!cardSecret) {
    return { valid: false, error: 'Carte introuvable.' };
  }
  const expectedMac = crypto
    .createHmac('sha256', `${getSessionSecret()}:${cardSecret}`)
    .update(`LMR-BC1:${cardId}:${step}`, 'utf8')
    .digest('hex')
    .slice(0, 20);
  if (!timingSafeEqualStr(expectedMac, providedMac)) {
    return { valid: false, error: 'Signature QR dynamique invalide.' };
  }
  return { valid: true, cardId, step };
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_EXEMPT_PATHS = new Set(['/api/orders/webhook/geniuspay']);

export function csrfProtectionMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.path.startsWith('/api/')) {
    return next();
  }
  if (!MUTATING_METHODS.has(req.method.toUpperCase())) {
    return next();
  }
  if (CSRF_EXEMPT_PATHS.has(req.path)) {
    return next();
  }
  const requestedWith = String(req.headers['x-requested-with'] || '').trim();
  if (!requestedWith) {
    res.status(403).json({
      success: false,
      error: 'Protection CSRF : en-tête X-Requested-With requis.',
    });
    return;
  }
  next();
}

export async function validateAndSanitizeImage(
  buffer: Buffer
): Promise<{ ok: true; buffer: Buffer; mime: 'image/png' | 'image/jpeg' | 'image/webp'; ext: '.png' | '.jpg' | '.webp' } | { ok: false; error: string }> {
  if (!buffer || buffer.length === 0) {
    return { ok: false, error: 'Fichier vide.' };
  }

  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !['image/png', 'image/jpeg', 'image/webp'].includes(detected.mime)) {
    return { ok: false, error: 'Type de fichier invalide. Seules les images PNG, JPEG et WEBP valides sont acceptées.' };
  }

  try {
    const image = sharp(buffer, { failOn: 'error' });
    const meta = await image.metadata();
    if (!meta.width || !meta.height || meta.width > 12000 || meta.height > 12000) {
      return { ok: false, error: 'Dimensions d’image invalides.' };
    }

    let outBuffer: Buffer;
    let ext: '.png' | '.jpg' | '.webp';
    let mime: 'image/png' | 'image/jpeg' | 'image/webp';

    if (detected.mime === 'image/png') {
      outBuffer = await image.rotate().png({ compressionLevel: 9 }).toBuffer();
      ext = '.png';
      mime = 'image/png';
    } else if (detected.mime === 'image/webp') {
      outBuffer = await image.rotate().webp({ quality: 90 }).toBuffer();
      ext = '.webp';
      mime = 'image/webp';
    } else {
      outBuffer = await image.rotate().jpeg({ quality: 90, mozjpeg: true }).toBuffer();
      ext = '.jpg';
      mime = 'image/jpeg';
    }

    return { ok: true, buffer: outBuffer, mime, ext };
  } catch {
    return { ok: false, error: 'Contenu image corrompu ou non conforme.' };
  }
}

export function verifyGeniusPayWebhookSignature(params: {
  rawBody: Buffer;
  signatureHeader: string;
  timestampHeader: string;
  secret: string;
  maxAgeSeconds?: number;
}): { valid: boolean; error?: string } {
  const { rawBody, signatureHeader, timestampHeader, secret, maxAgeSeconds = 300 } = params;
  if (!secret) {
    return { valid: false, error: 'Secret webhook non configuré.' };
  }
  if (!signatureHeader || !timestampHeader) {
    return { valid: false, error: 'Signature ou horodatage webhook manquant.' };
  }

  const tsNum = Number(timestampHeader);
  if (!Number.isFinite(tsNum)) {
    return { valid: false, error: 'Horodatage webhook invalide.' };
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - tsNum) > maxAgeSeconds) {
    return { valid: false, error: 'Horodatage webhook expiré (> 5 min).' };
  }

  const cleanSig = signatureHeader.trim().replace(/^sha256=/i, '');
  const signedPayload = `${timestampHeader}.${rawBody.toString('utf8')}`;
  const expectedHex = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');

  try {
    const providedBuf = Buffer.from(cleanSig, 'hex');
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    if (providedBuf.length !== expectedBuf.length || providedBuf.length === 0) {
      return { valid: false, error: 'Signature webhook invalide.' };
    }
    if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) {
      return { valid: false, error: 'Signature webhook invalide.' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Signature webhook malformée.' };
  }
}

export function normalizeCurrency(currency?: string): string {
  const c = String(currency || 'XOF').trim().toUpperCase();
  if (c === 'FCFA') return 'XOF';
  return c;
}

export async function confirmTransactionWithGeniusPay(params: {
  transactionId: string;
  expectedAmount: number;
  expectedCurrency: string;
}): Promise<{ verified: boolean; providerStatus?: string; error?: string }> {
  const apiUrl = (process.env.GENIUSPAY_API_URL || '').trim().replace(/\/+$/, '');
  const secretKey = (process.env.GENIUSPAY_SECRET_KEY || '').trim();

  if (!apiUrl || !secretKey) {
    if (process.env.NODE_ENV === 'production') {
      return { verified: false, error: 'GENIUSPAY_API_URL / GENIUSPAY_SECRET_KEY requis en production.' };
    }
    return { verified: false, error: 'Configuration API GeniusPay requise pour la vérification serveur à serveur.' };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${apiUrl}/transactions/${encodeURIComponent(params.transactionId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { verified: false, error: `GeniusPay API HTTP ${res.status}` };
    }

    const data: any = await res.json();
    const tx = data?.transaction || data?.data || data;
    const providerStatus = String(tx?.status || tx?.payment_status || '').toUpperCase();
    const amount = Number(tx?.amount);
    const currency = normalizeCurrency(tx?.currency);
    const expectedCurr = normalizeCurrency(params.expectedCurrency);

    if (!['COMPLETED', 'PAID', 'SUCCEEDED'].includes(providerStatus)) {
      return { verified: false, providerStatus, error: `Statut paiement non confirmé: ${providerStatus}` };
    }
    if (!Number.isFinite(amount) || amount !== Number(params.expectedAmount)) {
      return { verified: false, providerStatus, error: 'Montant GeniusPay différent du montant commande.' };
    }
    if (currency !== expectedCurr) {
      return { verified: false, providerStatus, error: 'Devise GeniusPay différente de la commande.' };
    }
    return { verified: true, providerStatus };
  } catch (err: any) {
    return { verified: false, error: err?.message || 'Erreur communication GeniusPay.' };
  }
}

export function stripHeaderNewlines(value: string): string {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
}

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecretBase32(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function buildOtpAuthUri(email: string, secretBase32: string, issuer = 'LUMAREEL'): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const iss = encodeURIComponent(issuer);
  return `otpauth://totp/${label}?secret=${encodeURIComponent(secretBase32)}&issuer=${iss}&algorithm=SHA1&digits=6&period=30`;
}

export function computeTotpAtStep(secretBase32: string, counterStep: number): string {
  const key = base32Decode(secretBase32);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counterStep));
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const codeInt =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(codeInt % 1_000_000).padStart(6, '0');
}

export function verifyTotpCode(secretBase32: string, code: string, nowMs = Date.now()): boolean {
  const cleanCode = String(code || '').trim();
  if (!/^\d{6}$/.test(cleanCode)) return false;
  const currentStep = Math.floor(nowMs / 1000 / 30);
  for (const delta of [-1, 0, 1]) {
    const expected = computeTotpAtStep(secretBase32, currentStep + delta);
    if (timingSafeEqualStr(cleanCode, expected)) {
      return true;
    }
  }
  return false;
}

