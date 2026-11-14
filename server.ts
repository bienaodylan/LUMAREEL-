import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import multer from 'multer';
import crypto from 'crypto';
import QRCode from 'qrcode';
import cookieParser from 'cookie-parser';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import helmet from 'helmet';
import { z } from 'zod';
import { db } from './src/server/db';
import { sqliteDb } from './src/server/sqliteDb';
import { membershipService } from './src/server/membershipService';
import { logger } from './src/server/logger';
import {
  assertBootSecurityConfig,
  buildOtpAuthUri,
  clearScannerSessionCookie,
  clearSessionCookie,
  confirmTransactionWithGeniusPay,
  csrfProtectionMiddleware,
  escapeHtml,
  generateOpaqueToken,
  generateTotpSecretBase32,
  isSafeAssetUrl,
  MIN_PASSWORD_LENGTH,
  prototypePollutionGuard,
  SCANNER_COOKIE_NAME,
  SCANNER_SESSION_TTL_MS,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  setScannerSessionCookie,
  setSessionCookie,
  sha256Hex,
  stripHeaderNewlines,
  validateAndSanitizeImage,
  verifyGeniusPayWebhookSignature,
  verifyTotpCode,
} from './src/server/security';
import {
  accessScanSchema,
  archiveSchema,
  cardStatusSchema,
  changePasswordSchema,
  checkAccessSchema,
  chipBatchImportSchema,
  chipInventorySchema,
  contactSchema,
  deleteAccountSchema,
  encodeChipSchema,
  forgotPasswordSchema,
  invitationCreateSchema,
  invitationRespondSchema,
  loginSchema,
  membershipOrderSchema,
  membershipPlanUpdateSchema,
  organizerRegisterSchema,
  parseWithSchema,
  physicalStatusSchema,
  posChargeSchema,
  printBatchSchema,
  redeemBenefitSchema,
  replaceChipSchema,
  resetPasswordSchema,
  revokeChipSchema,
  rotateTokenSchema,
  scannerSessionCreateSchema,
  scannerTokenCreateSchema,
  settingsUpdateSchema,
  ticketDesignSchema,
  totpDisableSchema,
  totpVerifySchema,
  verifyTicketSchema,
  walletRechargeSchema,
} from './src/server/schemas';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AuthenticatedSession {
  user: {
    id: string;
    email: string;
    role: string;
    name?: string;
  };
  sessionId: string;
  tokenHash: string;
}

function createAndAttachSession(
  req: Request,
  res: Response,
  user: { id: string; email: string; role: string; name?: string }
): void {
  const rawToken = generateOpaqueToken(32);
  const tokenHash = sha256Hex(rawToken);
  const now = Date.now();
  sqliteDb.createSession({
    id: `ses_${crypto.randomBytes(8).toString('hex')}`,
    userId: user.id,
    tokenHash,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
    ip: req.ip || null,
    userAgent: String(req.headers['user-agent'] || '').slice(0, 300) || null,
  });
  setSessionCookie(res, req, rawToken);
}

async function resolveSessionUser(req: Request): Promise<AuthenticatedSession | null> {
  const rawToken = typeof req.cookies?.[SESSION_COOKIE_NAME] === 'string'
    ? req.cookies[SESSION_COOKIE_NAME].trim()
    : '';
  if (!rawToken) return null;

  const tokenHash = sha256Hex(rawToken);
  const session = sqliteDb.getActiveSessionByTokenHash(tokenHash);
  if (!session) return null;

  const dbUser = db.getUserById(session.userId);
  if (!dbUser) return null;

  const expiresMs = new Date(session.expiresAt).getTime();
  if (expiresMs - Date.now() < SESSION_TTL_MS - 3600 * 1000) {
    sqliteDb.touchSessionExpiry(session.id, new Date(Date.now() + SESSION_TTL_MS).toISOString());
  }

  return {
    user: {
      id: dbUser.id,
      email: dbUser.email.toLowerCase(),
      role: dbUser.role,
      name: dbUser.name,
    },
    sessionId: session.id,
    tokenHash,
  };
}

async function requireMemberSession(req: Request, res: Response): Promise<AuthenticatedSession | null> {
  const resolved = await resolveSessionUser(req);
  if (resolved) return resolved;
  res.status(401).json({ success: false, error: 'Authentification requise. Veuillez vous connecter.' });
  return null;
}

async function requireMemberAdmin(
  req: Request,
  res: Response,
  roles: string[] = ['super_admin']
): Promise<AuthenticatedSession | null> {
  const resolved = await resolveSessionUser(req);
  if (!resolved) {
    res.status(401).json({ success: false, error: 'Session administrateur requise.' });
    return null;
  }
  if (!roles.includes(resolved.user.role)) {
    res.status(403).json({ success: false, error: 'Accès administrateur non autorisé.' });
    return null;
  }
  return resolved;
}

function getStorageUploadsDir(): string {
  const dir = path.resolve(process.env.LUMAREEL_STORAGE_DIR || path.join(process.cwd(), 'storage', 'uploads'));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  if (process.env.LUMAREEL_STORAGE_DIR) {
    return dir;
  }
  const legacyDir = path.resolve(process.cwd(), 'public', 'uploads');
  if (fs.existsSync(legacyDir)) {
    try {
      for (const file of fs.readdirSync(legacyDir)) {
        const src = path.join(legacyDir, file);
        const dest = path.join(dir, file);
        if (fs.statSync(src).isFile() && !fs.existsSync(dest)) {
          fs.renameSync(src, dest);
        }
      }
    } catch (err) {
      console.warn('[Uploads Migration]', err);
    }
  }
  return dir;
}

export async function createApp() {
  assertBootSecurityConfig();

  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isSandboxPayment = process.env.PAYMENT_MODE === 'sandbox' && !isProduction;

  app.set('trust proxy', 1);

  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = crypto.randomUUID();
    (req as any).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    res.on('finish', () => {
      logger.info({
        requestId,
        method: req.method,
        path: req.originalUrl.split('?')[0],
        statusCode: res.statusCode,
      });
    });
    next();
  });

  const storageUploadsDir = getStorageUploadsDir();

  // Raw body route MUST be registered BEFORE express.json() for HMAC signature validation
  app.post(
    '/api/orders/webhook/geniuspay',
    express.raw({ type: 'application/json', limit: '256kb' }),
    async (req: Request, res: Response) => {
      try {
        const rawBody = Buffer.isBuffer(req.body)
          ? req.body
          : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}), 'utf8');

        const signatureHeader = String(
          req.headers['x-geniuspay-signature'] || req.headers['x-webhook-signature'] || ''
        );
        const timestampHeader = String(
          req.headers['x-geniuspay-timestamp'] || req.headers['x-webhook-timestamp'] || ''
        );

        const webhookSecret = (process.env.GENIUSPAY_WEBHOOK_SECRET || '').trim();
        const sigCheck = verifyGeniusPayWebhookSignature({
          rawBody,
          signatureHeader,
          timestampHeader,
          secret: webhookSecret,
          maxAgeSeconds: 300,
        });

        if (!sigCheck.valid) {
          return res.status(401).json({ success: false, error: sigCheck.error || 'Signature webhook invalide.' });
        }

        let payload: any;
        try {
          payload = JSON.parse(rawBody.toString('utf8'));
        } catch {
          return res.status(400).json({ success: false, error: 'Payload JSON webhook invalide.' });
        }

        const orderId = String(payload?.order_id || '').trim();
        const paymentStatus = String(payload?.payment_status || payload?.status || '').toUpperCase();
        const transactionId = String(payload?.transaction_id || '').trim();
        const providerEventId = String(payload?.event_id || payload?.id || `${orderId}:${transactionId}`).trim();

        if (!orderId || !transactionId) {
          return res.status(400).json({ success: false, error: 'order_id et transaction_id requis.' });
        }

        if (paymentStatus !== 'COMPLETED' && paymentStatus !== 'PAID') {
          return res.status(200).json({ received: true, ignored: true });
        }

        const isMembershipOrder = orderId.startsWith('mord_');
        const ticketOrder = !isMembershipOrder ? db.getOrderById(orderId) : undefined;
        const membershipOrder = isMembershipOrder ? membershipService.getMembershipOrderById(orderId) : undefined;

        if (!ticketOrder && !membershipOrder) {
          return res.status(404).json({ success: false, error: 'Commande introuvable.' });
        }

        const expectedAmount = ticketOrder ? ticketOrder.totalAmount : membershipOrder!.amount;
        const expectedCurrency = (ticketOrder ? ticketOrder.currency : membershipOrder!.currency) || 'FCFA';

        if (sqliteDb.hasPaymentEvent(providerEventId)) {
          return res.json({ received: true, deduplicated: true });
        }

        const apiConfirm = await confirmTransactionWithGeniusPay({
          transactionId,
          expectedAmount,
          expectedCurrency,
        });

        if (!apiConfirm.verified) {
          return res.status(400).json({
            success: false,
            error: apiConfirm.error || 'Vérification serveur à serveur GeniusPay échouée.',
          });
        }

        if (isMembershipOrder) {
          const result = membershipService.confirmMembershipPaymentAndIssueCard(orderId, transactionId);
          sqliteDb.tryInsertPaymentEvent(providerEventId, orderId, 'geniuspay');
          return res.json({ received: true, alreadyIssued: Boolean(result.alreadyIssued) });
        }

        const result = db.confirmPaymentAndIssueTickets(orderId, transactionId);
        if (!result.success) {
          return res.status(400).json({ success: false, error: result.error });
        }
        sqliteDb.tryInsertPaymentEvent(providerEventId, orderId, 'geniuspay');
        return res.json({ received: true });
      } catch (error: any) {
        return res.status(500).json({ success: false, error: error?.message || 'Erreur traitement webhook.' });
      }
    }
  );

  app.use(
    helmet({
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
              imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
              connectSrc: ["'self'", 'https:'],
              frameSrc: ["'self'", 'https://www.youtube.com', 'https://www.youtube-nocookie.com'],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
            },
          }
        : {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
              imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
              connectSrc: ["'self'", 'https:', 'ws:', 'wss:'],
              frameSrc: ["'self'", 'https://www.youtube.com', 'https://www.youtube-nocookie.com'],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
              baseUri: ["'self'"],
            },
          },
      hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
      referrerPolicy: { policy: 'no-referrer' },
      frameguard: { action: 'deny' },
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ limit: '100kb', extended: true }));
  app.use(prototypePollutionGuard);

  // CORS strict (toujours bloqué si origin absente de ALLOWED_ORIGINS en prod ou Vitest)
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      if (allowedOrigins.includes(origin) || (!isProduction && process.env.VITEST !== 'true')) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Vary', 'Origin');
        res.header('Access-Control-Allow-Credentials', 'true');
      }
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Idempotency-Key, X-Order-Token, X-Lumareel-Scanner-Token');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(csrfProtectionMiddleware);

  // Specific rate limiters (P1-2)
  const makeLimiter = (max: number, windowMs: number, message: string) =>
    rateLimit({
      windowMs,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req: Request, res: Response) => {
        res.status(429).json({ success: false, error: message });
      },
    });

  const ordersLimiter = makeLimiter(20, 10 * 60 * 1000, 'Trop de commandes soumises. Veuillez patienter quelques minutes.');
  const contactLimiter = makeLimiter(10, 15 * 60 * 1000, 'Trop de messages envoyés. Veuillez patienter.');
  const publicCardVerifyLimiter = makeLimiter(40, 60 * 1000, 'Trop de vérifications effectuées. Patientez une minute.');
  const adminMutateLimiter = makeLimiter(120, 60 * 1000, 'Limite de débit administration atteinte.');
  const scannerLimiter = makeLimiter(180, 60 * 1000, 'Limite de débit du scanner atteinte.');
  app.use('/api/admin/', adminMutateLimiter);
  app.use('/api/membership/admin/', adminMutateLimiter);

  // Serve static uploaded files securely from /storage/uploads (outside public/)
  app.use(
    '/uploads',
    express.static(storageUploadsDir, {
      index: false,
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Disposition', 'inline');
      },
    })
  );

  // Multer memory storage with image sanitization (sharp + file-type)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  });

  const eventUploadFields = upload.fields([
    { name: 'officialPoster', maxCount: 1 },
    { name: 'artistPortrait', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 },
  ]);

  async function saveSanitizedImageFile(file: Express.Multer.File): Promise<{ url: string; filename: string }> {
    const validated = await validateAndSanitizeImage(file.buffer);
    if (validated.ok === false) {
      throw new Error(validated.error);
    }
    const filename = `${crypto.randomUUID()}${validated.ext}`;
    const targetPath = path.join(storageUploadsDir, filename);
    fs.writeFileSync(targetPath, validated.buffer, { mode: 0o600 });
    return { url: `/uploads/${filename}`, filename };
  }

  // Direct File Upload Route (Admin only + magic bytes + sharp re-encode)
  app.post('/api/upload', upload.single('file'), async (req: Request, res: Response) => {
    const admin = await requireMemberAdmin(req, res, ['super_admin', 'box_office']);
    if (!admin) return;
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Aucun fichier reçu.' });
      }
      const saved = await saveSanitizedImageFile(req.file);
      return res.json({ success: true, url: saved.url, filename: saved.filename });
    } catch (error: any) {
      return res.status(400).json({ success: false, error: error.message || 'Fichier image invalide.' });
    }
  });

  // --- API ROUTES ---

  // Health Check Public Minimal (sans chemins locaux ni compteurs internes)
  app.get('/api/health', (_req: Request, res: Response) => {
    try {
      db.getDbStatus();
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.status(500).json({ status: 'degraded', timestamp: new Date().toISOString() });
    }
  });

  app.get('/api/admin/db-status', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin', 'box_office'])) return;
    try {
      res.json({
        success: true,
        database: db.getDbStatus(),
        inquiriesCount: db.getContactInquiries().length,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 1. Events (Search & Discovery)
  app.get('/api/events', (req: Request, res: Response) => {
    try {
      let events = db.getAllEvents();
      const { q, genre, city, status, organizerType } = req.query;

      if (q && typeof q === 'string') {
        const query = q.toLowerCase();
        events = events.filter(
          (e) =>
            e.title.toLowerCase().includes(query) ||
            e.artist.toLowerCase().includes(query) ||
            e.venue.toLowerCase().includes(query) ||
            e.city.toLowerCase().includes(query) ||
            e.genre.toLowerCase().includes(query)
        );
      }

      if (genre && typeof genre === 'string' && genre !== 'all') {
        events = events.filter((e) => e.genre.toLowerCase() === genre.toLowerCase());
      }

      if (city && typeof city === 'string' && city !== 'all') {
        events = events.filter((e) => e.city.toLowerCase() === city.toLowerCase());
      }

      if (status && typeof status === 'string' && status !== 'all') {
        events = events.filter((e) => e.status === status);
      }

      if (organizerType && typeof organizerType === 'string' && organizerType !== 'all') {
        events = events.filter((e) => e.organizerType === organizerType);
      }

      res.json({ success: true, events });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/events/featured', (_req: Request, res: Response) => {
    try {
      const event = db.getFeaturedEvent();
      res.json({ success: true, event });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/events/:idOrSlug', (req: Request, res: Response) => {
    try {
      const event = db.getEvent(req.params.idOrSlug);
      if (!event) {
        return res.status(404).json({ success: false, error: 'Concert introuvable.' });
      }
      res.json({ success: true, event });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  const extractEventPayload = async (req: Request) => {
    const body: any = { ...req.body };
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    if (files) {
      if (files.officialPoster && files.officialPoster[0]) {
        const saved = await saveSanitizedImageFile(files.officialPoster[0]);
        body.officialPoster = saved.url;
      }
      if (files.artistPortrait && files.artistPortrait[0]) {
        const saved = await saveSanitizedImageFile(files.artistPortrait[0]);
        body.artistPortrait = saved.url;
      }
      if (files.bannerImage && files.bannerImage[0]) {
        const saved = await saveSanitizedImageFile(files.bannerImage[0]);
        body.bannerImage = saved.url;
      }
    }

    if (typeof body.categories === 'string') {
      try {
        body.categories = JSON.parse(body.categories);
      } catch {
        // keep as is
      }
    }

    if (typeof body.isFeatured === 'string') {
      body.isFeatured = body.isFeatured === 'true';
    }

    if (body.platformFeePercent !== undefined && typeof body.platformFeePercent === 'string') {
      const fee = Number(body.platformFeePercent);
      if (!isNaN(fee)) body.platformFeePercent = fee;
    }

    return body;
  };

  app.post('/api/events', eventUploadFields, async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin'])) return;
    try {
      const payload = await extractEventPayload(req);
      if (!payload.title && !payload.artist) {
        return res.status(400).json({ success: false, error: 'Le titre ou le nom de l’artiste est obligatoire.' });
      }
      if (!payload.title && payload.artist) {
        payload.title = `${payload.artist.toUpperCase()} EN CONCERT`;
      }
      const event = db.saveEvent(payload);
      res.status(201).json({ success: true, event });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.put('/api/events/:id', eventUploadFields, async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin'])) return;
    try {
      const payload = await extractEventPayload(req);
      const updated = db.updateEvent(req.params.id, payload);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Concert introuvable.' });
      }
      res.json({ success: true, event: updated });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.delete('/api/events/:id', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin'])) return;
    try {
      const deleted = db.deleteEvent(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Concert introuvable.' });
      }
      res.json({ success: true, message: 'Concert supprimé avec succès.' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/events/:id/ticket-designs', (req: Request, res: Response) => {
    try {
      const designs = db.getTicketDesignsForEvent(req.params.id);
      res.json({ success: true, designs });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put('/api/events/:id/categories/:categoryId/ticket-design', async (req: Request, res: Response) => {
    const admin = await requireMemberAdmin(req, res, ['super_admin', 'box_office']);
    if (!admin) return;
    try {
      const parsed = parseWithSchema(ticketDesignSchema, req.body, res);
      if (!parsed) return;
      const imageUrl = String(parsed.ticketImageUrl || parsed.imageUrl || '').trim();
      if (!isSafeAssetUrl(imageUrl)) {
        return res.status(400).json({ success: false, error: 'Format de design billet non autorisé.' });
      }
      const result = db.saveTicketDesign(req.params.id, req.params.categoryId, imageUrl);
      if (!result.success) {
        return res.status(404).json(result);
      }
      sqliteDb.insertAuditLog({
        actorId: admin.user.id,
        action: 'EVENT_TICKET_DESIGN_SAVED',
        targetType: 'event_category',
        targetId: `${req.params.id}:${req.params.categoryId}`,
        ip: req.ip,
      });
      res.json({
        success: true,
        event: result.event,
        design: result.design,
        message: 'Design du billet enregistré en base de données.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete('/api/events/:id/categories/:categoryId/ticket-design', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin', 'box_office'])) return;
    try {
      const result = db.deleteTicketDesign(req.params.id, req.params.categoryId);
      if (!result.success) {
        return res.status(404).json(result);
      }
      res.json({
        success: true,
        event: result.event,
        message: 'Design du billet supprimé de la base de données.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // News & Communiqués
  app.get('/api/news', (_req: Request, res: Response) => {
    try {
      const news = db.getAllNews();
      res.json({ success: true, news });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/news/:slug', (req: Request, res: Response) => {
    try {
      const article = db.getNewsBySlug(req.params.slug);
      if (!article) return res.status(404).json({ success: false, error: 'Article introuvable.' });
      res.json({ success: true, article });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // External Organizers Marketplace
  app.get('/api/organizers', (_req: Request, res: Response) => {
    try {
      const organizers = db.getAllOrganizers();
      res.json({ success: true, organizers });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/organizers/register', contactLimiter, (req: Request, res: Response) => {
    try {
      const parsed = parseWithSchema(organizerRegisterSchema, req.body, res);
      if (!parsed) return;
      const organizer = db.registerOrganizer(parsed);
      res.json({
        success: true,
        message: 'Dossier d’organisateur reçu. Votre compte est en attente de vérification par l’équipe LUMARÉEL.',
        organizer,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/organizers/:id/events', (req: Request, res: Response) => {
    try {
      const events = db.getOrganizerEvents(req.params.id);
      res.json({ success: true, events });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 2. Archives & Works
  app.get('/api/archives', async (req: Request, res: Response) => {
    try {
      const session = req.query.all === 'true' ? await resolveSessionUser(req) : null;
      const includeDrafts = req.query.all === 'true' && session?.user?.role === 'super_admin';
      const archives = db.getAllArchives(includeDrafts);
      res.json({ success: true, archives });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/archives', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin'])) return;
    try {
      const parsed = parseWithSchema(archiveSchema, req.body, res);
      if (!parsed) return;
      const archive = db.saveArchive(parsed);
      res.status(201).json({ success: true, archive });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put('/api/archives/:id', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin'])) return;
    try {
      const parsed = parseWithSchema(archiveSchema, req.body, res);
      if (!parsed) return;
      const archive = db.saveArchive({ ...parsed, id: req.params.id });
      res.json({ success: true, archive });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete('/api/archives/:id', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin'])) return;
    try {
      const deleted = db.deleteArchive(req.params.id);
      res.json({ success: true, deleted });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/works', (_req: Request, res: Response) => {
    try {
      const works = db.getAllWorks();
      res.json({ success: true, works });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 3. Contact Inquiries (honeypot + CR/LF header injection prevention)
  app.post('/api/contact', contactLimiter, (req: Request, res: Response) => {
    try {
      const parsed = parseWithSchema(contactSchema, req.body, res);
      if (!parsed) return;
      if (parsed.website && parsed.website.trim().length > 0) {
        return res.json({ success: true, message: 'Message transmis.' });
      }
      const inquiry = db.saveContactInquiry({
        name: stripHeaderNewlines(parsed.name),
        email: stripHeaderNewlines(parsed.email),
        subject: parsed.subject ? stripHeaderNewlines(parsed.subject) : '',
        organization: parsed.organization ? stripHeaderNewlines(parsed.organization) : '',
        message: parsed.message,
      });
      res.json({
        success: true,
        inquiry,
        message: 'Votre message a été transmis à la direction artistique de LUMARÉEL CO. Nous reviendrons vers vous sous 48 heures.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/admin/inquiries', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin', 'box_office'])) return;
    try {
      const inquiries = db.getContactInquiries();
      res.json({ success: true, inquiries });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 4. Authentication (Cookie HttpOnly + SQLite Sessions + Scrypt + Rate Limit)
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: (req: Request) => {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const normalizedIp = ipKeyGenerator(req.ip || '127.0.0.1');
      return `${normalizedIp}:${email}`;
    },
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Trop de tentatives de connexion. Veuillez patienter 15 minutes.',
      });
    },
  });

  const registerSchema = z
    .object({
      email: z.string().trim().email('Adresse e-mail invalide.').max(200),
      name: z.string().trim().min(1, 'Nom complet requis.').max(120),
      password: z
        .string()
        .min(MIN_PASSWORD_LENGTH, `Le mot de passe doit comporter au moins ${MIN_PASSWORD_LENGTH} caractères.`)
        .max(200),
    })
    .strict();

  app.post('/api/auth/login', loginLimiter, (req: Request, res: Response) => {
    try {
      const parsed = parseWithSchema(loginSchema, req.body, res);
      if (!parsed) return;
      const { email, password, totpCode } = parsed;

      const result = db.authenticateUser(email, password);
      if (!result.success || !result.user) {
        sqliteDb.insertAuditLog({
          actorId: email.trim().toLowerCase() || 'anonymous',
          action: 'AUTH_LOGIN_FAILED',
          ip: req.ip,
        });
        return res.status(401).json({ success: false, error: 'Identifiants invalides.' });
      }

      const totpRecord = sqliteDb.getAdminTotp(result.user.id);
      if (totpRecord?.enabled) {
        if (!totpCode) {
          return res.status(401).json({
            success: false,
            requires2fa: true,
            error: 'Code d’authentification à deux facteurs (2FA) requis.',
          });
        }
        if (!verifyTotpCode(totpRecord.secretBase32, totpCode)) {
          sqliteDb.insertAuditLog({
            actorId: result.user.id,
            action: 'AUTH_LOGIN_2FA_FAILED',
            ip: req.ip,
          });
          return res.status(401).json({
            success: false,
            requires2fa: true,
            error: 'Code d’authentification à deux facteurs invalide.',
          });
        }
      }

      createAndAttachSession(req, res, result.user);
      sqliteDb.insertAuditLog({
        actorId: result.user.id,
        action: 'AUTH_LOGIN_SUCCESS',
        ip: req.ip,
      });
      return res.json({ success: true, user: result.user });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/auth/register', (req: Request, res: Response) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: parsed.error.issues[0]?.message || 'Données d’inscription invalides.',
        });
      }

      const { email, name, password } = parsed.data;
      const result = db.registerCustomerAccount(name, email, password);

      if (result.created && result.user) {
        const safeUser = db.sanitizeUser(result.user);
        createAndAttachSession(req, res, safeUser);
        sqliteDb.insertAuditLog({
          actorId: safeUser.id,
          action: 'AUTH_REGISTER',
          ip: req.ip,
        });
      }

      // Uniform non-enumerating message regardless of whether email already existed
      return res.status(200).json({
        success: true,
        message: 'Si ce compte peut être créé, votre inscription a bien été enregistrée.',
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/auth/logout', async (req: Request, res: Response) => {
    try {
      const rawToken = typeof req.cookies?.[SESSION_COOKIE_NAME] === 'string'
        ? req.cookies[SESSION_COOKIE_NAME].trim()
        : '';
      if (rawToken) {
        sqliteDb.revokeSessionByTokenHash(sha256Hex(rawToken));
      }
      clearSessionCookie(res, req);
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/auth/forgot-password', contactLimiter, (req: Request, res: Response) => {
    try {
      const parsed = parseWithSchema(forgotPasswordSchema, req.body, res);
      if (!parsed) return;

      const user = db.getUserByEmail(parsed.email.toLowerCase());
      if (user) {
        const rawResetToken = generateOpaqueToken(32);
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        sqliteDb.createPasswordResetToken(user.id, sha256Hex(rawResetToken), expiresAt);
        sqliteDb.insertAuditLog({
          actorId: user.id,
          action: 'AUTH_PASSWORD_RESET_REQUESTED',
          ip: req.ip,
        });
      }

      // Réponse uniforme anti-énumération (n'expose jamais le token ni l'existence du compte)
      return res.json({
        success: true,
        message: 'Si cette adresse e-mail correspond à un compte, les instructions de réinitialisation ont été envoyées.',
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/auth/reset-password', loginLimiter, (req: Request, res: Response) => {
    try {
      const parsed = parseWithSchema(resetPasswordSchema, req.body, res);
      if (!parsed) return;

      const consumed = sqliteDb.consumePasswordResetToken(sha256Hex(parsed.token));
      if (!consumed) {
        return res.status(400).json({
          success: false,
          error: 'Jeton de réinitialisation invalide, déjà utilisé ou expiré.',
        });
      }

      const updated = db.updateUserPassword(consumed.userId, parsed.newPassword);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Compte associé introuvable.' });
      }
      clearSessionCookie(res, req);
      sqliteDb.insertAuditLog({
        actorId: consumed.userId,
        action: 'AUTH_PASSWORD_RESET_COMPLETED',
        ip: req.ip,
      });

      return res.json({
        success: true,
        message: 'Mot de passe réinitialisé. Toutes vos sessions précédentes ont été révoquées.',
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/admin/2fa/setup', async (req: Request, res: Response) => {
    const admin = await requireMemberAdmin(req, res, ['super_admin', 'box_office']);
    if (!admin) return;
    try {
      const secretBase32 = generateTotpSecretBase32();
      sqliteDb.upsertAdminTotpPending(admin.user.id, secretBase32);
      const otpauthUrl = buildOtpAuthUri(admin.user.email, secretBase32, 'LUMAREEL CO.');
      sqliteDb.insertAuditLog({
        actorId: admin.user.id,
        action: 'ADMIN_2FA_SETUP_INITIATED',
        ip: req.ip,
      });
      return res.json({
        success: true,
        otpauthUrl,
        manualKey: secretBase32,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/admin/2fa/verify', async (req: Request, res: Response) => {
    const admin = await requireMemberAdmin(req, res, ['super_admin', 'box_office']);
    if (!admin) return;
    try {
      const parsed = parseWithSchema(totpVerifySchema, req.body, res);
      if (!parsed) return;
      const record = sqliteDb.getAdminTotp(admin.user.id);
      if (!record) {
        return res.status(400).json({ success: false, error: 'Aucune configuration 2FA en attente.' });
      }
      if (!verifyTotpCode(record.secretBase32, parsed.code)) {
        return res.status(400).json({ success: false, error: 'Code 2FA invalide.' });
      }
      sqliteDb.enableAdminTotp(admin.user.id);
      sqliteDb.insertAuditLog({
        actorId: admin.user.id,
        action: 'ADMIN_2FA_ENABLED',
        ip: req.ip,
      });
      return res.json({ success: true, twoFactorEnabled: true });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/admin/2fa/disable', async (req: Request, res: Response) => {
    const admin = await requireMemberAdmin(req, res, ['super_admin', 'box_office']);
    if (!admin) return;
    try {
      const parsed = parseWithSchema(totpDisableSchema, req.body, res);
      if (!parsed) return;
      if (!db.verifyUserPassword(admin.user.id, parsed.password)) {
        return res.status(403).json({ success: false, error: 'Mot de passe incorrect.' });
      }
      const record = sqliteDb.getAdminTotp(admin.user.id);
      if (!record || !record.enabled || !verifyTotpCode(record.secretBase32, parsed.code)) {
        return res.status(400).json({ success: false, error: 'Code 2FA invalide.' });
      }
      sqliteDb.disableAdminTotp(admin.user.id);
      sqliteDb.insertAuditLog({
        actorId: admin.user.id,
        action: 'ADMIN_2FA_DISABLED',
        ip: req.ip,
      });
      return res.json({ success: true, twoFactorEnabled: false });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/auth/change-password', async (req: Request, res: Response) => {
    const session = await requireMemberSession(req, res);
    if (!session) return;
    try {
      const parsed = parseWithSchema(changePasswordSchema, req.body, res);
      if (!parsed) return;
      const { currentPassword, newPassword } = parsed;
      if (!db.verifyUserPassword(session.user.id, currentPassword)) {
        return res.status(403).json({ success: false, error: 'Mot de passe actuel incorrect.' });
      }
      db.updateUserPassword(session.user.id, newPassword);
      clearSessionCookie(res, req);
      sqliteDb.insertAuditLog({
        actorId: session.user.id,
        action: 'AUTH_PASSWORD_CHANGED',
        ip: req.ip,
      });
      return res.json({ success: true, message: 'Mot de passe modifié. Toutes vos sessions ont été révoquées.' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/auth/me', async (req: Request, res: Response) => {
    const session = await requireMemberSession(req, res);
    if (!session) return;
    try {
      const user = db.getUserById(session.user.id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'Utilisateur introuvable.' });
      }
      return res.json({ success: true, user: db.sanitizeUser(user) });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // Suppression de son propre compte par un utilisateur connecté (mot de passe requis, ignore body.email/query.email)
  app.delete('/api/auth/account', async (req: Request, res: Response) => {
    const session = await requireMemberSession(req, res);
    if (!session) return;
    try {
      const parsed = parseWithSchema(deleteAccountSchema, req.body, res);
      if (!parsed) return;
      const { password } = parsed;
      if (!db.verifyUserPassword(session.user.id, password)) {
        return res.status(403).json({ success: false, error: 'Mot de passe incorrect.' });
      }
      const result = db.deleteUser(session.user.id);
      if (!result.success) {
        return res.status(400).json(result);
      }
      clearSessionCookie(res, req);
      sqliteDb.insertAuditLog({
        actorId: session.user.id,
        action: 'AUTH_ACCOUNT_DELETED',
        ip: req.ip,
      });
      return res.json({ success: true, message: 'Votre compte a été supprimé avec succès.' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // Administration : Création de comptes (admin / organizer / box_office / gate_agent)
  const createManagedUserSchema = z
    .object({
      name: z.string().trim().min(1).max(120),
      email: z.string().trim().email().max(200),
      password: z.string().min(MIN_PASSWORD_LENGTH).max(200),
      role: z.enum(['customer', 'gate_agent', 'box_office', 'super_admin']),
    })
    .strict();

  app.post('/api/admin/users', async (req: Request, res: Response) => {
    const admin = await requireMemberAdmin(req, res, ['super_admin']);
    if (!admin) return;
    try {
      const parsed = createManagedUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: parsed.error.issues[0]?.message || 'Données utilisateur invalides.',
        });
      }
      const result = db.createManagedUser(parsed.data);
      if (!result.success) {
        return res.status(409).json(result);
      }
      sqliteDb.insertAuditLog({
        actorId: admin.user.id,
        action: 'ADMIN_USER_CREATED',
        targetType: 'user',
        targetId: result.user?.id,
        details: JSON.stringify({ role: parsed.data.role }),
        ip: req.ip,
      });
      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/admin/users', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin'])) return;
    try {
      const users = db.getAllUsers().map((u) => db.sanitizeUser(u));
      res.json({ success: true, users });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete('/api/admin/users/:id', async (req: Request, res: Response) => {
    const admin = await requireMemberAdmin(req, res, ['super_admin']);
    if (!admin) return;
    try {
      const result = db.deleteUser(req.params.id, admin.user.id);
      if (!result.success) {
        return res.status(400).json(result);
      }
      sqliteDb.insertAuditLog({
        actorId: admin.user.id,
        action: 'ADMIN_USER_DELETED',
        targetType: 'user',
        targetId: req.params.id,
        ip: req.ip,
      });
      res.json({ success: true, message: 'Utilisateur supprimé.' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 5. Checkout & Ticketing Orders (Route unifiée serveur-autoritaire)
  const handleOrderCheckout = async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      // Rejeter toute tentative de manipulation de prix/statut/billets côté client
      if (
        body.price !== undefined ||
        body.unitPrice !== undefined ||
        body.totalAmount !== undefined ||
        body.paymentStatus !== undefined ||
        body.tickets !== undefined
      ) {
        return res.status(400).json({
          success: false,
          error: 'Champs tarifaires ou de statut non autorisés.',
        });
      }

      const eventId = String(body.eventId || '').trim();
      const buyer = body.buyer || {};
      const customerName = String(buyer.name || body.customerName || '').trim();
      const customerEmail = String(buyer.email || body.customerEmail || '').trim();
      const customerPhone = buyer.phone || body.customerPhone ? String(buyer.phone || body.customerPhone).trim() : undefined;
      const paymentProvider = String(body.paymentMethod || body.paymentProvider || 'geniuspay').trim();

      let items: Array<{ categoryId: string; qty: number }> = [];
      if (Array.isArray(body.items) && body.items.length > 0) {
        items = body.items.map((it: any) => ({
          categoryId: String(it?.categoryId || '').trim(),
          qty: Number(it?.qty ?? it?.quantity ?? 1),
        }));
      } else if (body.categoryId && body.quantity) {
        items = [{ categoryId: String(body.categoryId).trim(), qty: Number(body.quantity) }];
      }

      if (!eventId || !customerEmail || !customerName || items.length === 0) {
        return res.status(400).json({ success: false, error: 'Données de commande incomplètes.' });
      }

      const resolvedSession = await resolveSessionUser(req);
      const result = db.createPendingOrder({
        customerId: resolvedSession?.user?.id || 'guest',
        customerName,
        customerEmail,
        customerPhone,
        eventId,
        items,
        paymentProvider,
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  };

  app.post('/api/orders', ordersLimiter, handleOrderCheckout);
  app.post('/api/orders/checkout', ordersLimiter, handleOrderCheckout);

  app.get('/api/orders/:id/status', async (req: Request, res: Response) => {
    try {
      const order = db.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ success: false, error: 'Commande introuvable.' });
      }
      const session = await resolveSessionUser(req);
      const accessToken = String(req.headers['x-order-token'] || req.query.token || '').trim();
      if (!db.verifyOrderAccess(order, accessToken, session?.user)) {
        return res.status(403).json({ success: false, error: 'Accès non autorisé à cette commande.' });
      }
      return res.json({
        success: true,
        order: db.sanitizeOrderForClient(order),
        paymentStatus: order.paymentStatus,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // Sandbox payment confirmation — monté UNIQUEMENT si PAYMENT_MODE=sandbox ET NODE_ENV !== 'production'
  if (isSandboxPayment) {
    app.post('/api/orders/:orderId/pay-sandbox', async (req: Request, res: Response) => {
      try {
        const { orderId } = req.params;
        const order = db.getOrderById(orderId);
        if (!order) {
          return res.status(404).json({ success: false, error: 'Commande introuvable.' });
        }
        const session = await resolveSessionUser(req);
        const accessToken = String(req.headers['x-order-token'] || req.body?.orderAccessToken || '').trim();
        if (!db.verifyOrderAccess(order, accessToken, session?.user)) {
          return res.status(403).json({ success: false, error: 'Jeton de commande ou session propriétaire requis.' });
        }
        const paymentRef = `gp_test_${crypto.randomBytes(6).toString('hex')}`;
        const result = db.confirmPaymentAndIssueTickets(orderId, paymentRef);
        if (!result.success) {
          return res.status(400).json(result);
        }
        return res.json(result);
      } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message });
      }
    });
  }

  // Customer Space (Session obligatoire, ignore ?email=)
  app.get('/api/customer/orders', async (req: Request, res: Response) => {
    const session = await requireMemberSession(req, res);
    if (!session) return;
    try {
      const orders = db.getOrdersForCustomer(session.user.email).map((o) => db.sanitizeOrderForClient(o));
      return res.json({ success: true, orders });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  async function authorizeTicketAccess(req: Request, res: Response, ticketId: string) {
    const ticket = db.getTicketByToken(ticketId);
    if (!ticket) {
      res.status(404).json({ success: false, error: 'Billet introuvable.' });
      return null;
    }
    const session = await resolveSessionUser(req);
    const accessToken = String(req.headers['x-order-token'] || req.query.orderToken || req.query.token || '').trim();
    const order = db.getOrderById(ticket.orderId);

    if (order) {
      if (!db.verifyOrderAccess(order, accessToken, session?.user)) {
        if (!session && !accessToken) {
          res.status(401).json({ success: false, error: 'Authentification requise pour accéder à ce billet.' });
        } else {
          res.status(403).json({ success: false, error: 'Accès interdit à ce billet.' });
        }
        return null;
      }
    } else {
      // Lot d'impression physique ou billet orphelin -> admin / box_office requis
      if (!session) {
        res.status(401).json({ success: false, error: 'Authentification requise.' });
        return null;
      }
      if (!['super_admin', 'box_office'].includes(session.user.role)) {
        res.status(403).json({ success: false, error: 'Accès interdit à ce billet.' });
        return null;
      }
    }
    return ticket;
  }

  app.get('/api/customer/tickets/:ticketId', async (req: Request, res: Response) => {
    try {
      const ticket = await authorizeTicketAccess(req, res, req.params.ticketId);
      if (!ticket) return;
      const qrDataUrl = await QRCode.toDataURL(ticket.token, {
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
        width: 320,
      });
      return res.json({ success: true, ticket, qrDataUrl });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/customer/tickets/:ticketId/print', async (req: Request, res: Response) => {
    try {
      const ticket = await authorizeTicketAccess(req, res, req.params.ticketId);
      if (!ticket) return;
      const qrDataUrl = await QRCode.toDataURL(ticket.token, {
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
        width: 300,
      });
      const event = db.getEvent(ticket.eventId);
      const category = event?.categories.find((c) => c.id === ticket.categoryId);
      const rawDesignUrl = category?.ticketImageUrl || '';
      const safeDesignUrl = isSafeAssetUrl(rawDesignUrl) ? rawDesignUrl : '';

      const safeSerial = escapeHtml(ticket.serialNumber);
      const safeTitle = escapeHtml(ticket.eventTitle);
      const safeDate = escapeHtml(ticket.eventDate);
      const safeTime = escapeHtml(ticket.eventTime);
      const safeVenue = escapeHtml(ticket.eventVenue);
      const safeCategory = escapeHtml(ticket.categoryName);
      const safeHolder = escapeHtml(ticket.holderName);
      const safeToken = escapeHtml(ticket.token);
      const safeOrderRef = escapeHtml(ticket.orderRef);
      const safeIssuedDate = escapeHtml(new Date(ticket.issuedAt).toLocaleDateString('fr-FR'));
      const nonce = crypto.randomBytes(16).toString('base64');

      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Billet Électronique — LUMARÉEL CO. — ${safeSerial}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #ffffff; color: #111; margin: 0; padding: 40px; }
    .ticket-card { max-width: 650px; margin: 0 auto; border: 2px solid #111; padding: 32px; background: #fff; }
    .artwork { width: 100%; margin-bottom: 24px; border: 1px solid #ddd; overflow: hidden; }
    .artwork img { width: 100%; height: auto; display: block; object-fit: cover; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 20px; margin-bottom: 24px; }
    .brand { font-size: 20px; font-weight: 800; letter-spacing: 4px; text-transform: uppercase; }
    .serial { font-family: monospace; font-size: 13px; color: #666; }
    .title { font-size: 28px; font-weight: 900; letter-spacing: -0.5px; margin: 0 0 8px 0; }
    .subtitle { font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: #555; margin-bottom: 20px; }
    .details { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
    .item-label { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #888; margin-bottom: 4px; }
    .item-val { font-size: 15px; font-weight: 700; color: #111; }
    .qr-zone { display: flex; align-items: center; justify-content: space-between; gap: 24px; background: #fafafa; border: 1px dashed #ccc; padding: 20px; }
    .qr-zone img { width: 140px; height: 140px; }
    .qr-text { font-size: 11px; color: #666; line-height: 1.5; }
    .footer { text-align: center; margin-top: 32px; font-size: 11px; letter-spacing: 1px; color: #888; }
    @media print {
      body { padding: 0; }
      .ticket-card { border: 2px solid #000; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="ticket-card">
    <div class="header">
      <div>
        <div class="brand">LUMARÉEL CO.</div>
        <div style="font-size: 10px; letter-spacing: 2px; color: #888; margin-top: 4px;">PRODUCTION &amp; BILLETTERIE OFFICIELLE</div>
      </div>
      <div class="serial">${safeSerial}</div>
    </div>
    ${safeDesignUrl ? `<div class="artwork"><img src="${escapeHtml(safeDesignUrl)}" alt="Design billet officiel"></div>` : ''}
    <h1 class="title">${safeTitle}</h1>
    <div class="subtitle">BILLET ACCÈS OFFICIEL</div>

    <div class="details">
      <div>
        <div class="item-label">DATE &amp; HORAIRE</div>
        <div class="item-val">${safeDate} · ${safeTime}</div>
      </div>
      <div>
        <div class="item-label">LIEU &amp; SALLE</div>
        <div class="item-val">${safeVenue}</div>
      </div>
      <div>
        <div class="item-label">CATÉGORIE</div>
        <div class="item-val">${safeCategory}</div>
      </div>
      <div>
        <div class="item-label">TITULAIRE</div>
        <div class="item-val">${safeHolder}</div>
      </div>
    </div>

    <div class="qr-zone">
      <div>
        <div class="item-label">JETON DE CONTRÔLE SÉCURISÉ</div>
        <div style="font-family: monospace; font-size: 12px; margin-bottom: 8px;">${safeToken}</div>
        <div class="qr-text">
          Présentez ce QR code à l'entrée de l'événement.<br>
          Chaque billet est individuel, unique et non duplicable.<br>
          Le contrôle à l'accès invalide immédiatement toute réutilisation.
        </div>
      </div>
      <img src="${escapeHtml(qrDataUrl)}" alt="QR code d'accès">
    </div>

    <div class="footer">
      LUMARÉEL CO. · ORDRE RÉFÉRENCE : ${safeOrderRef} · EMIS LE : ${safeIssuedDate}
    </div>
  </div>
  <script nonce="${nonce}">window.addEventListener('load', () => window.print());</script>
</body>
</html>`;
      res.setHeader(
        'Content-Security-Policy',
        `default-src 'none'; img-src 'self' data: https:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'`
      );
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch {
      res.status(500).send('Erreur lors de la génération du billet');
    }
  });

  app.post('/api/tickets/print-batch', async (req: Request, res: Response) => {
    const admin = await requireMemberAdmin(req, res, ['super_admin', 'box_office']);
    if (!admin) return;
    try {
      const parsed = parseWithSchema(printBatchSchema, req.body, res);
      if (!parsed) return;
      const result = db.createPrintBatch({
        eventId: parsed.eventId,
        categoryId: parsed.categoryId,
        quantity: parsed.quantity,
      });
      if (!result.success) {
        return res.status(400).json(result);
      }
      sqliteDb.insertAuditLog({
        actorId: admin.user.id,
        action: 'TICKET_BATCH_CREATED',
        targetType: 'print_batch',
        targetId: result.batchRef,
        details: JSON.stringify({ eventId: parsed.eventId, categoryId: parsed.categoryId, quantity: parsed.quantity }),
        ip: req.ip,
      });
      res.status(201).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/tickets/print-batch/:batchRef/activate', async (req: Request, res: Response) => {
    const admin = await requireMemberAdmin(req, res, ['super_admin', 'box_office']);
    if (!admin) return;
    try {
      const batchRef = String(req.params.batchRef || '').trim();
      if (!batchRef) {
        return res.status(400).json({ success: false, error: 'Référence de lot requise.' });
      }
      const activated = db.activatePrintBatch(batchRef);
      if (!activated.success || activated.activatedCount === 0) {
        return res.status(404).json({ success: false, error: 'Lot introuvable ou déjà activé.' });
      }
      sqliteDb.insertAuditLog({
        actorId: admin.user.id,
        action: 'TICKET_BATCH_ACTIVATED',
        targetType: 'print_batch',
        targetId: batchRef,
        details: JSON.stringify({ activatedCount: activated.activatedCount }),
        ip: req.ip,
      });
      return res.json({
        success: true,
        batchRef,
        activatedCount: activated.activatedCount,
        message: `${activated.activatedCount} billet(s) activé(s) pour le contrôle d’entrée.`,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  const requireGateScanner = (req: Request, res: Response, eventId?: string): { eventId: string } | null => {
    const cleanRequestedEventId = (eventId || '').trim();
    const rawCookie = typeof req.cookies?.[SCANNER_COOKIE_NAME] === 'string'
      ? req.cookies[SCANNER_COOKIE_NAME].trim()
      : '';

    if (rawCookie) {
      const scannerSession = sqliteDb.getActiveScannerSessionByTokenHash(sha256Hex(rawCookie));
      if (scannerSession) {
        if (
          scannerSession.eventId === 'all_events' ||
          !cleanRequestedEventId ||
          cleanRequestedEventId === 'all_events' ||
          scannerSession.eventId === cleanRequestedEventId
        ) {
          return { eventId: scannerSession.eventId };
        }
        res.status(403).json({
          valid: false,
          authorized: false,
          status: 'ACCESS_DENIED',
          error: 'Session scanner restreinte à un autre événement.',
        });
        return null;
      }
    }

    const scannerToken = String(req.headers['x-lumareel-scanner-token'] || req.body?.scannerToken || '').trim();
    if (!scannerToken) {
      res.status(401).json({ valid: false, authorized: false, status: 'ACCESS_DENIED', error: 'Session scanner requise.' });
      return null;
    }
    if (scannerToken === 'SEC_SESSION_AUTHORIZED') {
      res.status(403).json({
        valid: false,
        authorized: false,
        status: 'ACCESS_DENIED',
        error: 'Jeton statique interdit. Veuillez ouvrir une session scanner.',
      });
      return null;
    }
    const verified = db.verifyScannerToken(scannerToken, cleanRequestedEventId || undefined);
    if (!verified?.valid) {
      res.status(403).json({
        valid: false,
        authorized: false,
        status: 'ACCESS_DENIED',
        error: 'Jeton scanner invalide, expiré ou hors événement.',
      });
      return null;
    }
    return { eventId: verified.token?.eventId || cleanRequestedEventId || 'all_events' };
  };

  app.post('/api/scanner/session', scannerLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = parseWithSchema(scannerSessionCreateSchema, req.body, res);
      if (!parsed) return;

      const requestedToken = (parsed.token || '').trim();
      const requestedEventId = (parsed.eventId || '').trim();

      if (requestedToken === 'SEC_SESSION_AUTHORIZED') {
        return res.status(403).json({
          valid: false,
          error: 'Jeton statique interdit. Authentification session ou jeton vigile requis.',
        });
      }

      let resolvedEventId = requestedEventId || 'all_events';
      let scannerTokenId = 'staff_session';
      let expiresAt = new Date(Date.now() + SCANNER_SESSION_TTL_MS).toISOString();
      let eventSummary:
        | { id: string; title: string; artist: string; venue: string; date: string; time: string }
        | undefined;

      if (requestedToken) {
        const verified = db.verifyScannerToken(requestedToken, requestedEventId || undefined);
        if (!verified?.valid || !verified.token) {
          return res.status(403).json({
            valid: false,
            error: verified?.error || 'Jeton scanner invalide, expiré ou hors événement.',
          });
        }
        resolvedEventId = verified.token.eventId || resolvedEventId;
        scannerTokenId = verified.token.id;
        const tokenExpMs = new Date(verified.token.expiresAt).getTime();
        const cappedExpMs = Math.min(tokenExpMs, Date.now() + SCANNER_SESSION_TTL_MS);
        expiresAt = new Date(cappedExpMs).toISOString();
        if (verified.event) {
          eventSummary = {
            id: verified.event.id,
            title: verified.event.title,
            artist: verified.event.artist,
            venue: verified.event.venue,
            date: verified.event.date,
            time: verified.event.time,
          };
        }
      } else {
        const authSession = await resolveSessionUser(req);
        if (!authSession) {
          return res.status(401).json({ valid: false, error: 'Authentification ou jeton vigile requis.' });
        }
        if (!['super_admin', 'gate_agent', 'box_office'].includes(authSession.user.role)) {
          return res.status(403).json({ valid: false, error: 'Rôle non autorisé pour le terminal scanner.' });
        }
        scannerTokenId = `staff_${authSession.user.id}`;
        if (requestedEventId && requestedEventId !== 'all_events') {
          const ev = db.getEvent(requestedEventId);
          if (!ev) {
            return res.status(404).json({ valid: false, error: 'Concert introuvable.' });
          }
          eventSummary = {
            id: ev.id,
            title: ev.title,
            artist: ev.artist,
            venue: ev.venue,
            date: ev.date,
            time: ev.time,
          };
        }
      }

      const rawSessionToken = generateOpaqueToken(32);
      const tokenHash = sha256Hex(rawSessionToken);
      const maxAgeMs = Math.max(60_000, new Date(expiresAt).getTime() - Date.now());
      sqliteDb.createScannerSession({
        id: `scns_${crypto.randomBytes(8).toString('hex')}`,
        scannerTokenId,
        eventId: resolvedEventId,
        tokenHash,
        expiresAt,
      });
      setScannerSessionCookie(res, req, rawSessionToken, maxAgeMs);

      return res.json({
        valid: true,
        eventId: resolvedEventId,
        event: eventSummary,
        expiresAt,
      });
    } catch (error: any) {
      return res.status(500).json({ valid: false, error: error.message });
    }
  });

  app.post('/api/scanner/logout', (req: Request, res: Response) => {
    const rawCookie = typeof req.cookies?.[SCANNER_COOKIE_NAME] === 'string'
      ? req.cookies[SCANNER_COOKIE_NAME].trim()
      : '';
    if (rawCookie) {
      sqliteDb.revokeScannerSessionByTokenHash(sha256Hex(rawCookie));
    }
    clearScannerSessionCookie(res, req);
    return res.json({ success: true });
  });

  app.post('/api/verify-ticket', scannerLimiter, (req: Request, res: Response) => {
    try {
      const parsed = parseWithSchema(verifyTicketSchema, req.body, res);
      if (!parsed) return;

      const requestedEventId = String(parsed.eventId || parsed.targetEventId || '').trim();
      const gate = requireGateScanner(req, res, requestedEventId);
      if (!gate) return;

      const ticketIdOrToken = String(parsed.ticketId || parsed.token || parsed.id || parsed.qrData || '').trim();
      if (!ticketIdOrToken) {
        return res.status(400).json({ valid: false, error: 'ID ou jeton du billet requis.' });
      }

      const effectiveEventId =
        gate.eventId && gate.eventId !== 'all_events'
          ? gate.eventId
          : requestedEventId && requestedEventId !== 'all_events'
          ? requestedEventId
          : undefined;

      const gateAgentId = parsed.gateAgentId || 'Vigile LUMARÉEL CO.';
      const atomic = db.atomicVerifyAndBurnTicket({
        tokenOrSerial: ticketIdOrToken,
        targetEventId: effectiveEventId,
        gateAgentId,
      });

      if (atomic.outcome === 'INVALID_OR_NOT_FOUND' || !atomic.ticket) {
        return res.status(404).json({
          valid: false,
          error: 'Billet introuvable ou signature invalide',
          message: 'Le billet scanné ne figure pas dans le registre cryptographique LUMARÉEL.',
        });
      }

      const ticket = atomic.ticket;

      if (atomic.outcome === 'WRONG_EVENT') {
        return res.status(403).json({
          valid: false,
          error: 'Billet invalide pour cet événement',
          message: `Ce billet est réservé pour "${ticket.eventTitle}".`,
          holderName: ticket.holderName,
          categoryName: ticket.categoryName,
          eventTitle: ticket.eventTitle,
          serialNumber: ticket.serialNumber,
        });
      }

      if (atomic.outcome === 'INACTIVE') {
        return res.status(403).json({
          valid: false,
          error: 'Lot physique non activé',
          message: 'Ce billet appartient à un lot physique non encore activé par la billetterie.',
          holderName: ticket.holderName,
          categoryName: ticket.categoryName,
          eventTitle: ticket.eventTitle,
          serialNumber: ticket.serialNumber,
        });
      }

      if (atomic.outcome === 'CANCELLED') {
        return res.status(403).json({
          valid: false,
          error: 'Billet annulé',
          message: 'Ce billet a été annulé ou remboursé.',
          holderName: ticket.holderName,
          categoryName: ticket.categoryName,
          eventTitle: ticket.eventTitle,
          serialNumber: ticket.serialNumber,
        });
      }

      if (atomic.outcome === 'ALREADY_USED') {
        const scannedAt = (ticket as any).scannedAt || ticket.checkedInAt || new Date().toISOString();
        return res.status(403).json({
          valid: false,
          error: 'Billet déjà utilisé',
          message: 'Ce billet a déjà été validé à l’entrée. Risque de contrefaçon ou de double utilisation.',
          holderName: ticket.holderName,
          categoryName: ticket.categoryName,
          eventTitle: ticket.eventTitle,
          serialNumber: ticket.serialNumber,
          scannedAt,
          ticket: {
            id: ticket.id,
            holderName: ticket.holderName,
            categoryName: ticket.categoryName,
            eventTitle: ticket.eventTitle,
            serialNumber: ticket.serialNumber,
            scannedAt,
          },
        });
      }

      const scanTimestamp = atomic.scannedAt || ticket.checkedInAt || new Date().toISOString();
      return res.status(200).json({
        valid: true,
        message: 'ACCÈS AUTORISÉ',
        scannedAt: scanTimestamp,
        holderName: ticket.holderName,
        categoryName: ticket.categoryName,
        ticket: {
          id: ticket.id,
          holderName: ticket.holderName,
          categoryName: ticket.categoryName,
          eventTitle: ticket.eventTitle,
          eventVenue: ticket.eventVenue,
          eventDate: ticket.eventDate,
          eventTime: ticket.eventTime,
          serialNumber: ticket.serialNumber,
          scannedAt: scanTimestamp,
          status: 'used',
        },
      });
    } catch (error: any) {
      return res.status(500).json({ valid: false, error: error.message });
    }
  });

  app.post('/api/scanner/verify', (_req: Request, res: Response) =>
    res.status(401).json({ success: false, error: 'Endpoint historique désactivé. Utilisez le scanner sécurisé avec jeton événementiel.' })
  );
  app.post('/api/tickets/verify-and-burn', (_req: Request, res: Response) =>
    res.status(401).json({ success: false, error: 'Endpoint historique désactivé. Utilisez le scanner sécurisé avec jeton événementiel.' })
  );

  // --- MAGIC LINK GATE SCANNER ACCESS ---
  const handleCreateScannerToken = async (req: Request, res: Response) => {
    const admin = await requireMemberAdmin(req, res, ['super_admin', 'box_office']);
    if (!admin) return;
    try {
      const parsed = parseWithSchema(scannerTokenCreateSchema, req.body, res);
      if (!parsed) return;
      const eventId = req.params.id;
      const event = db.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ success: false, error: 'Concert introuvable.' });
      }

      const createdBy = admin.user.name || admin.user.email;
      const durationHours = parsed.durationHours || 12;
      const scannerToken = db.createScannerToken(event.id, createdBy, durationHours);

      if (!scannerToken) {
        return res.status(500).json({ success: false, error: 'Échec de génération du token.' });
      }

      sqliteDb.insertAuditLog({
        actorId: admin.user.id,
        action: 'SCANNER_TOKEN_CREATED',
        targetType: 'event',
        targetId: event.id,
        details: JSON.stringify({ durationHours, tokenId: scannerToken.id }),
        ip: req.ip,
      });

      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      const fullUrl = `${protocol}://${host}/?page=gate_scanner&eventId=${event.id}&token=${scannerToken.token}`;

      res.status(201).json({
        success: true,
        token: scannerToken.token,
        scannerToken,
        fullUrl,
        eventId: event.id,
        eventTitle: event.title,
        artistName: event.artist,
        expiresAt: scannerToken.expiresAt,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  app.post('/api/events/:id/scanner-token', handleCreateScannerToken);
  app.post('/api/events/:id/scanner-tokens', handleCreateScannerToken);

  app.get('/api/verify-scanner-token', scannerLimiter, (req: Request, res: Response) => {
    try {
      const token = ((req.query.token as string) || '').trim();
      const eventId = ((req.query.eventId as string) || '').trim() || undefined;

      if (!token) {
        return res.status(401).json({ valid: false, error: 'Token d’accès manquant ou absent de l’URL.' });
      }
      if (token === 'SEC_SESSION_AUTHORIZED') {
        return res.status(403).json({ valid: false, error: 'Jeton statique interdit.' });
      }

      const result = db.verifyScannerToken(token, eventId);
      if (!result.valid) {
        return res.status(403).json(result);
      }

      res.json({
        valid: true,
        event: result.event
          ? {
              id: result.event.id,
              title: result.event.title,
              artist: result.event.artist,
              venue: result.event.venue,
              date: result.event.date,
              time: result.event.time,
            }
          : undefined,
        expiresAt: result.token?.expiresAt,
      });
    } catch (error: any) {
      res.status(500).json({ valid: false, error: error.message });
    }
  });

  app.get('/api/events/:id/scanner-tokens', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin', 'box_office'])) return;
    try {
      const tokens = db.getScannerTokensForEvent(req.params.id);
      res.json({ success: true, tokens });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================================================
  // LUMARÉEL CARD — SYSTÈME DE MEMBERSHIP & CONTRÔLE D'ACCÈS HYBRIDE
  // ============================================================================

  app.get('/api/membership/editions', (_req: Request, res: Response) => {
    try {
      const editions = membershipService.getEditions();
      const activeEdition = membershipService.getActiveFoundersEdition();
      const plans = activeEdition ? membershipService.getPlans(activeEdition.id) : [];
      res.json({ success: true, editions, activeEdition, plans });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/membership/plans', (req: Request, res: Response) => {
    try {
      const editionId = req.query.editionId as string;
      const plans = membershipService.getPlans(editionId);
      res.json({ success: true, plans });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put('/api/membership/plans/:id', async (req: Request, res: Response) => {
    const admin = await requireMemberAdmin(req, res, ['super_admin']);
    if (!admin) return;
    try {
      const parsed = parseWithSchema(membershipPlanUpdateSchema, req.body, res);
      if (!parsed) return;
      const plan = membershipService.updatePlan(req.params.id, parsed);
      sqliteDb.insertAuditLog({
        actorId: admin.user.id,
        action: 'MEMBERSHIP_PLAN_UPDATED',
        targetType: 'membership_plan',
        targetId: req.params.id,
        ip: req.ip,
      });
      res.json({ success: true, plan });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 2. Commande d'adhésion -> crée une commande PENDING (l'émission se fait après paiement confirmé)
  app.post('/api/membership/order', ordersLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = parseWithSchema(membershipOrderSchema, req.body, res);
      if (!parsed) return;
      const customerName = parsed.customerName;
      const customerEmail = parsed.customerEmail.toLowerCase();
      const customerPhone = parsed.customerPhone;
      const paymentMethod = parsed.paymentMethod || 'geniuspay';
      const planId = parsed.planId;
      const shippingAddress = parsed.shippingAddress;

      const activePlans = membershipService.getPlans();
      const plan = planId ? membershipService.getPlanById(planId) : activePlans[0];
      if (!plan) {
        return res.status(404).json({ success: false, error: 'Formule d’adhésion introuvable.' });
      }

      // Ne JAMAIS accepter req.body.userId
      const resolvedSession = await resolveSessionUser(req);
      let resolvedUserId = resolvedSession?.user?.id;
      if (!resolvedUserId) {
        const existingUser = db.getUserByEmail(customerEmail);
        resolvedUserId = existingUser ? existingUser.id : `usr_${crypto.randomBytes(6).toString('hex')}`;
      }

      const created = membershipService.createPendingMembershipOrder({
        userId: resolvedUserId,
        planId: plan.id,
        cardholderName: customerName,
        cardholderEmail: customerEmail,
        customerPhone,
        paymentMethod,
        shippingAddress: shippingAddress
          ? {
              street: String(shippingAddress.street || 'Livraison coffret à domicile'),
              city: String(shippingAddress.city || 'Abidjan'),
              country: String(shippingAddress.country || 'Côte d’Ivoire'),
              recipientName: customerName,
            }
          : undefined,
      });

      return res.status(201).json({
        success: true,
        paymentRequired: true,
        message: 'Demande d’admission enregistrée. Confirmation du paiement requise pour émettre votre carte.',
        order: created.order,
        orderAccessToken: created.orderAccessToken,
      });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message || 'Impossible d’enregistrer la demande.' });
    }
  });

  if (isSandboxPayment) {
    app.post('/api/membership/orders/:orderId/pay-sandbox', async (req: Request, res: Response) => {
      try {
        const order = membershipService.getMembershipOrderById(req.params.orderId);
        if (!order) {
          return res.status(404).json({ success: false, error: 'Commande d’adhésion introuvable.' });
        }
        const session = await resolveSessionUser(req);
        const accessToken = String(req.headers['x-order-token'] || req.body?.orderAccessToken || '').trim();
        if (!membershipService.verifyMembershipOrderAccess(order, accessToken, session?.user)) {
          return res.status(403).json({ success: false, error: 'Jeton de commande ou session propriétaire requis.' });
        }

        const issued = membershipService.confirmMembershipPaymentAndIssueCard(
          order.id,
          `gp_mbr_test_${crypto.randomBytes(6).toString('hex')}`
        );

        const dynamicQrToken = membershipService.getDynamicQrToken(issued.card);
        const qrDataUrl = dynamicQrToken
          ? await QRCode.toDataURL(dynamicQrToken, { margin: 1, color: { dark: '#000000', light: '#ffffff' }, width: 400 })
          : null;

        return res.json({
          success: true,
          message: 'Félicitations ! Votre demande d’admission a été approuvée et votre LUMARÉEL CARD est activée.',
          card: issued.card,
          physicalOrder: issued.physicalOrder,
          order: issued.order,
          dynamicQrToken,
          qrDataUrl,
        });
      } catch (e: any) {
        return res.status(400).json({ success: false, error: e.message || 'Impossible de finaliser l’adhésion.' });
      }
    });
  }

  // 3. Espace Membre : Session obligatoire, ignore ?email=
  app.get('/api/membership/my-card', async (req: Request, res: Response) => {
    const resolvedSession = await requireMemberSession(req, res);
    if (!resolvedSession) return;
    try {
      let card = membershipService.getCardByUserId(resolvedSession.user.id);
      if (!card && resolvedSession.user.email) {
        card = membershipService.getCardByEmail(resolvedSession.user.email);
      }

      if (!card) {
        return res.json({ success: true, hasCard: false, card: null });
      }

      // Refresh authoritative SQLite wallet balance
      const walletState = membershipService.getWalletBalance(card.id);
      card = walletState.card;

      const benefits = membershipService.getBenefitsForCard(card.id);
      const dynamicQrToken = membershipService.getDynamicQrToken(card);
      const qrDataUrl = dynamicQrToken
        ? await QRCode.toDataURL(dynamicQrToken, { margin: 1, color: { dark: '#000000', light: '#ffffff' }, width: 400 })
        : null;
      const customerOrders = db.getOrdersForCustomer(card.cardholderEmail);
      const concertTickets = customerOrders
        .filter((o) => o.paymentStatus === 'completed' && o.tickets)
        .flatMap((o) => o.tickets || []);
      const physicalOrder = membershipService.getPhysicalOrders().find((po) => po.cardId === card!.id);

      return res.json({
        success: true,
        hasCard: true,
        card,
        dynamicQrToken,
        qrDataUrl,
        benefits,
        concertTickets,
        physicalOrder,
      });
    } catch {
      return res.status(500).json({ success: false, error: 'Impossible de charger la carte membre.' });
    }
  });

  app.get('/api/card/verify/:token', publicCardVerifyLimiter, (req: Request, res: Response) => {
    try {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || 'unknown';
      const result = membershipService.verifyCardPublicly(req.params.token, clientIp);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ valid: false, outcome: 'SYSTEM_UNAVAILABLE', error: error.message });
    }
  });

  app.post('/api/membership/check-access', scannerLimiter, (req: Request, res: Response) => {
    try {
      const parsed = parseWithSchema(checkAccessSchema, req.body, res);
      if (!parsed) return;
      const gate = requireGateScanner(req, res, String(parsed.eventId || ''));
      if (!gate) return;

      const cardIdentifier = parsed.cardIdentifier || parsed.identifier;
      if (!cardIdentifier) {
        return res.status(400).json({
          authorized: false,
          error: 'Identifiant de carte ou token QR requis.',
        });
      }

      const result = membershipService.checkEventAccess({
        cardIdentifier,
        eventId: gate.eventId !== 'all_events' ? gate.eventId : parsed.eventId || 'all_events',
        accessPointType: parsed.accessPointType || 'main_entrance',
        operatorId: parsed.operatorId || 'Agent Vigile',
        scanMethod: parsed.scanMethod || 'qr_code',
        hasConcertTicket: Boolean(parsed.hasConcertTicket),
        ticketId: parsed.ticketId,
      });

      const httpStatus = result.authorized ? 200 : 403;
      res.status(httpStatus).json(result);
    } catch (error: any) {
      res.status(500).json({ authorized: false, error: error.message });
    }
  });

  app.get('/api/membership/benefits', (_req: Request, res: Response) => {
    try {
      const benefits = membershipService.getAllBenefits();
      res.json({ success: true, benefits });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/membership/redeem-benefit', async (req: Request, res: Response) => {
    try {
      const session = await requireMemberSession(req, res);
      if (!session) return;
      const parsed = parseWithSchema(redeemBenefitSchema, req.body, res);
      if (!parsed) return;
      const { cardId, benefitId, eventId } = parsed;
      if (!cardId) return res.status(400).json({ success: false, error: 'ID carte requis.' });
      const card = membershipService.getCardById(cardId);
      const isOwner =
        card &&
        (card.userId === session.user.id ||
          card.cardholderEmail.toLowerCase() === (session.user.email || '').toLowerCase());
      if (!card || !isOwner) {
        return res.status(403).json({ success: false, error: 'Cette carte ne vous appartient pas.' });
      }
      const result = membershipService.redeemBenefit({
        cardId,
        benefitId,
        eventId,
        redeemedBy: session.user.email || session.user.id,
      });
      if (!result.success) return res.status(400).json(result);
      return res.json(result);
    } catch {
      return res.status(500).json({ success: false, error: 'Impossible de consommer cet avantage.' });
    }
  });

  app.get('/api/membership/admin/overview', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin', 'box_office'])) return;
    try {
      const stats = membershipService.getAdminOverview();
      const activeEdition = membershipService.getActiveFoundersEdition();
      const recentScans = membershipService.getScanLogs({ limit: 15 });
      const workshop = membershipService.getWorkshopOverview();
      res.json({ success: true, stats, activeEdition, recentScans, workshop });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/membership/admin/cards', async (req: Request, res: Response) => {
    try {
      const session = await requireMemberAdmin(req, res, ['super_admin', 'box_office']);
      if (!session) return;
      let cards = membershipService.getAllCards();
      const { status, q } = req.query;
      if (status && status !== 'all') cards = cards.filter((card) => card.cardStatus === status);
      if (q && typeof q === 'string') {
        const query = q.toLowerCase();
        cards = cards.filter(
          (card) =>
            card.cardNumber.toLowerCase().includes(query) ||
            card.cardholderName.toLowerCase().includes(query) ||
            card.cardholderEmail.toLowerCase().includes(query)
        );
      }
      return res.json({ success: true, cards });
    } catch {
      return res.status(500).json({ success: false, error: 'Liste des cartes indisponible.' });
    }
  });

  app.get('/api/membership/admin/cards/:id', async (req: Request, res: Response) => {
    try {
      const session = await requireMemberAdmin(req, res, ['super_admin', 'box_office']);
      if (!session) return;
      const card = membershipService.getCardById(req.params.id);
      if (!card) return res.status(404).json({ success: false, error: 'Carte introuvable.' });
      return res.json({ success: true, card, benefits: membershipService.getBenefitsForCard(card.id) });
    } catch {
      return res.status(500).json({ success: false, error: 'Carte indisponible.' });
    }
  });

  app.post('/api/membership/admin/cards/:id/status', async (req: Request, res: Response) => {
    try {
      const session = await requireMemberAdmin(req, res, ['super_admin']);
      if (!session) return;
      const parsed = parseWithSchema(cardStatusSchema, req.body, res);
      if (!parsed) return;
      const card = membershipService.getCardById(req.params.id);
      if (!card) return res.status(404).json({ success: false, error: 'Carte introuvable.' });
      const updated = membershipService.updateCardStatus(req.params.id, parsed.status, parsed.reason, session.user.email || session.user.id);
      sqliteDb.insertAuditLog({
        actorId: session.user.id,
        action: 'CARD_STATUS_UPDATED',
        targetType: 'membership_card',
        targetId: req.params.id,
        details: JSON.stringify({ status: parsed.status }),
        ip: req.ip,
      });
      return res.json({ success: true, card: updated });
    } catch {
      return res.status(400).json({ success: false, error: 'Modification du statut refusée.' });
    }
  });

  app.post('/api/membership/admin/cards/:id/physical-status', async (req: Request, res: Response) => {
    try {
      const session = await requireMemberAdmin(req, res, ['super_admin', 'box_office']);
      if (!session) return;
      const parsed = parseWithSchema(physicalStatusSchema, req.body, res);
      if (!parsed) return;
      const card = membershipService.updatePhysicalCardStatus(
        req.params.id,
        parsed.physicalStatus,
        parsed.trackingNumber,
        session.user.email || session.user.id
      );
      return res.json({ success: true, card });
    } catch (error: any) {
      return res.status(400).json({ success: false, error: error.message || 'Mise à jour du statut physique refusée.' });
    }
  });

  // Rotation QR : session obligatoire (propriétaire OU admin/box_office). Aucun bypass.
  app.post('/api/membership/admin/cards/:id/rotate-token', async (req: Request, res: Response) => {
    const resolved = await requireMemberSession(req, res);
    if (!resolved) return;
    try {
      const parsed = parseWithSchema(rotateTokenSchema, req.body, res);
      if (!parsed) return;
      const card = membershipService.getCardById(req.params.id);
      if (!card) return res.status(404).json({ success: false, error: 'Carte introuvable.' });

      const isAdmin = ['super_admin', 'box_office'].includes(resolved.user.role);
      const isOwner =
        card.userId === resolved.user.id ||
        card.cardholderEmail.toLowerCase() === resolved.user.email.toLowerCase();
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ success: false, error: 'Accès non autorisé sur cette carte.' });
      }

      const actor = resolved.user.email || resolved.user.id;
      const result = membershipService.rotateCardQrToken(req.params.id, parsed.reason || 'Rotation cryptographique demandée', actor);
      const dynamicQrToken = membershipService.getDynamicQrToken(result.card);
      const qrDataUrl = await QRCode.toDataURL(dynamicQrToken, {
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
        width: 400,
      });
      sqliteDb.insertAuditLog({
        actorId: resolved.user.id,
        action: 'CARD_QR_ROTATED',
        targetType: 'membership_card',
        targetId: req.params.id,
        ip: req.ip,
      });
      return res.json({ success: true, card: result.card, newQrToken: result.newQrToken, dynamicQrToken, qrDataUrl });
    } catch (error: any) {
      return res.status(400).json({ success: false, error: error.message || 'Rotation du QR refusée.' });
    }
  });

  app.post('/api/membership/cards/:id/encode-chip', async (req: Request, res: Response) => {
    const admin = await requireMemberAdmin(req, res, ['super_admin', 'box_office']);
    if (!admin) return;
    try {
      const parsed = parseWithSchema(encodeChipSchema, req.body, res);
      if (!parsed) return;
      const updatedCard = membershipService.encodeCardChip({
        cardId: req.params.id,
        chipUid: parsed.chipUid,
        chipType: parsed.chipType,
        operatorId: admin.user.email,
      });
      sqliteDb.insertAuditLog({
        actorId: admin.user.id,
        action: 'CHIP_ENCODED',
        targetType: 'membership_card',
        targetId: req.params.id,
        details: JSON.stringify({ chipUid: parsed.chipUid }),
        ip: req.ip,
      });
      return res.json({ success: true, card: updatedCard, message: `Puce (${parsed.chipUid}) associée avec succès.` });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  });

  app.get('/api/membership/verify-chip/:chipUid', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin', 'box_office', 'gate_agent'])) return;
    try {
      const card = membershipService.getCardByChipUid(req.params.chipUid);
      if (!card) {
        return res.json({
          valid: false,
          outcome: 'NOT_FOUND',
          message: 'Puce non reconnue ou non associée à un compte membre.',
        });
      }
      const isExpired = new Date(card.expiresAt).getTime() < Date.now();
      const valid = card.cardStatus === 'active' && !isExpired;
      return res.json({
        valid,
        outcome: valid ? 'VALID' : isExpired ? 'EXPIRED' : card.cardStatus.toUpperCase(),
        card: {
          cardNumber: card.cardNumber,
          cardholderName: card.cardholderName,
          cardholderEmail: card.cardholderEmail,
          status: card.cardStatus,
          validFrom: card.validFrom,
          expiresAt: card.expiresAt,
          chipUid: card.chipUid,
          chipType: card.chipType,
          chipLockStatus: card.chipLockStatus,
        },
      });
    } catch (e: any) {
      return res.status(500).json({ valid: false, error: e.message });
    }
  });

  app.get('/api/membership/admin/chip-logs', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin', 'box_office'])) return;
    try {
      const logs = membershipService.getChipEncodingLogs();
      return res.json({ success: true, logs });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/membership/admin/inventory/chips', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin', 'box_office'])) return;
    try {
      const chips = membershipService.getChipInventory();
      return res.json({ success: true, chips });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/membership/admin/inventory/chips', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin'])) return;
    try {
      const parsed = parseWithSchema(chipInventorySchema, req.body, res);
      if (!parsed) return;
      const item = membershipService.addChipToInventory(parsed);
      return res.json({ success: true, item });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  });

  app.post('/api/membership/admin/inventory/chips/batch-import', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin'])) return;
    try {
      const parsed = parseWithSchema(chipBatchImportSchema, req.body, res);
      if (!parsed) return;
      const result = membershipService.batchImportChips(parsed.items);
      return res.json({ success: true, ...result });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/membership/admin/cards/:id/revoke-chip', async (req: Request, res: Response) => {
    const admin = await requireMemberAdmin(req, res, ['super_admin', 'box_office']);
    if (!admin) return;
    try {
      const parsed = parseWithSchema(revokeChipSchema, req.body, res);
      if (!parsed) return;
      const card = membershipService.revokeCardChip({
        cardId: req.params.id,
        reason: parsed.reason,
        notes: parsed.notes,
        operatorId: admin.user.email,
      });
      sqliteDb.insertAuditLog({
        actorId: admin.user.id,
        action: 'CHIP_REVOKED',
        targetType: 'membership_card',
        targetId: req.params.id,
        details: JSON.stringify({ reason: parsed.reason }),
        ip: req.ip,
      });
      return res.json({ success: true, card, message: 'Carte mise en opposition avec succès.' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  });

  app.post('/api/membership/admin/cards/:id/replace-chip', async (req: Request, res: Response) => {
    const admin = await requireMemberAdmin(req, res, ['super_admin', 'box_office']);
    if (!admin) return;
    try {
      const parsed = parseWithSchema(replaceChipSchema, req.body, res);
      if (!parsed) return;
      const result = membershipService.replaceCardChip({
        cardId: req.params.id,
        newChipUid: parsed.newChipUid,
        reason: parsed.reason || 'Remplacement de carte',
        operatorId: admin.user.email,
      });
      sqliteDb.insertAuditLog({
        actorId: admin.user.id,
        action: 'CHIP_REPLACED',
        targetType: 'membership_card',
        targetId: req.params.id,
        details: JSON.stringify({ newChipUid: parsed.newChipUid }),
        ip: req.ip,
      });
      return res.json({ success: true, ...result, message: 'Nouvelle puce associée et scellée avec succès.' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  });

  // 7g. WALLET CASHLESS (Auth + Ownership + SQLite Atomique + Idempotency)
  async function requireCardOwnerOrAdmin(req: Request, res: Response, cardId: string) {
    const session = await requireMemberSession(req, res);
    if (!session) return null;
    const card = membershipService.getCardById(cardId);
    if (!card) {
      res.status(404).json({ success: false, error: `Carte introuvable pour l'identifiant ${cardId}` });
      return null;
    }
    const isAdmin = ['super_admin', 'box_office'].includes(session.user.role);
    const isOwner =
      card.userId === session.user.id ||
      card.cardholderEmail.toLowerCase() === session.user.email.toLowerCase();
    if (!isAdmin && !isOwner) {
      res.status(403).json({ success: false, error: 'Accès refusé au portefeuille de cette carte.' });
      return null;
    }
    return { session, card };
  }

  app.get('/api/membership/cards/:id/wallet', async (req: Request, res: Response) => {
    const auth = await requireCardOwnerOrAdmin(req, res, req.params.id);
    if (!auth) return;
    try {
      const data = membershipService.getWalletBalance(req.params.id);
      return res.json({ success: true, ...data });
    } catch (e: any) {
      return res.status(404).json({ success: false, error: e.message });
    }
  });

  app.post('/api/membership/admin/cards/:id/wallet/recharge', async (req: Request, res: Response) => {
    const admin = await requireMemberAdmin(req, res, ['super_admin', 'box_office']);
    if (!admin) return;
    try {
      const parsed = parseWithSchema(walletRechargeSchema, req.body, res);
      if (!parsed) return;
      const idempotencyKey = String(req.headers['idempotency-key'] || parsed.idempotencyKey || '').trim() || undefined;
      const result = membershipService.rechargeWallet({
        cardId: req.params.id,
        amount: parsed.amount,
        paymentMethod: parsed.paymentMethod || 'Carte Bancaire / Espèces',
        location: parsed.location || 'Caisse Conciergerie Club Privé',
        operatorName: admin.user.name || admin.user.email,
        idempotencyKey,
      });
      sqliteDb.insertAuditLog({
        actorId: admin.user.id,
        action: 'WALLET_RECHARGED',
        targetType: 'membership_card',
        targetId: req.params.id,
        details: JSON.stringify({ amount: parsed.amount }),
        ip: req.ip,
      });
      return res.json({ success: true, ...result, message: 'Portefeuille rechargé avec succès.' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  });

  app.post('/api/membership/pos/charge', async (req: Request, res: Response) => {
    const admin = await requireMemberAdmin(req, res, ['super_admin', 'box_office']);
    if (!admin) return;
    try {
      const parsed = parseWithSchema(posChargeSchema, req.body, res);
      if (!parsed) return;
      const idempotencyKey = String(req.headers['idempotency-key'] || parsed.idempotencyKey || '').trim() || undefined;
      if (!parsed.chipUid && !parsed.cardId) {
        return res.status(400).json({ success: false, error: 'Puce ou carte non spécifiée.' });
      }
      const result = membershipService.chargeWallet({
        chipUid: parsed.chipUid,
        cardId: parsed.cardId,
        amount: parsed.amount,
        location: parsed.location || 'Bar Privé VIP Lounge',
        terminalId: parsed.terminalId || 'TPE-BAR-VIP-01',
        operatorName: admin.user.name || admin.user.email,
        idempotencyKey,
      });
      sqliteDb.insertAuditLog({
        actorId: admin.user.id,
        action: 'WALLET_POS_CHARGED',
        targetType: 'membership_card',
        targetId: parsed.cardId || parsed.chipUid,
        details: JSON.stringify({ amount: parsed.amount, terminalId: parsed.terminalId }),
        ip: req.ip,
      });
      return res.json({ ...result, message: 'Paiement validé.' });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  });

  app.get('/api/membership/cards/:id/wallet-transactions', async (req: Request, res: Response) => {
    const auth = await requireCardOwnerOrAdmin(req, res, req.params.id);
    if (!auth) return;
    try {
      const transactions = membershipService.getWalletTransactions(req.params.id);
      return res.json({ success: true, transactions });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/membership/admin/wallet-transactions', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin', 'box_office'])) return;
    try {
      const transactions = membershipService.getWalletTransactions();
      return res.json({ success: true, transactions });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // 8. ATELIER D'IMPRESSION & ENCODAGE PHYSIQUE (LUMARÉEL WORKSHOP)
  app.get('/api/membership/workshop/overview', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin', 'box_office'])) return;
    try {
      const overview = membershipService.getWorkshopOverview();
      res.json({ success: true, overview });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/membership/workshop/orders', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin', 'box_office'])) return;
    try {
      const status = req.query.status as any;
      const orders = membershipService.getPhysicalOrders(status);
      res.json({ success: true, orders });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/membership/workshop/orders/:id/status', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin'])) return;
    try {
      const { status, operator, note } = req.body;
      const updated = membershipService.updatePhysicalOrderStatus(req.params.id, status, operator, note);
      res.json({ success: true, order: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/membership/workshop/inventory', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin', 'box_office'])) return;
    try {
      const inventory = membershipService.getInventory();
      res.json({ success: true, inventory });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put('/api/membership/workshop/inventory/:id', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin'])) return;
    try {
      const updated = membershipService.updateInventoryItem(req.params.id, req.body);
      res.json({ success: true, item: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/membership/workshop/jobs', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin', 'box_office'])) return;
    try {
      const jobs = membershipService.getPrintJobs();
      res.json({ success: true, jobs });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/membership/workshop/print', async (req: Request, res: Response) => {
    const admin = await requireMemberAdmin(req, res, ['super_admin']);
    if (!admin) return;
    try {
      const { cardId, operatorId, printerModel, printerType, duplex } = req.body;
      if (!cardId) {
        return res.status(400).json({ success: false, error: 'cardId requis.' });
      }
      const job = membershipService.createPrintJob(cardId, operatorId || admin.user.email, {
        printerModel,
        printerType,
        duplex,
      });
      const execution = membershipService.executePrintJob(job.id);
      res.status(201).json({ success: true, ...execution });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/membership/workshop/print-batch', async (req: Request, res: Response) => {
    const admin = await requireMemberAdmin(req, res, ['super_admin']);
    if (!admin) return;
    try {
      const { cardIds, operatorId } = req.body;
      if (!Array.isArray(cardIds) || cardIds.length === 0) {
        return res.status(400).json({ success: false, error: 'Liste cardIds requise.' });
      }
      const result = membershipService.createBatchPrintJob(cardIds, operatorId || admin.user.email);
      res.status(201).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/membership/workshop/reprint', async (req: Request, res: Response) => {
    const admin = await requireMemberAdmin(req, res, ['super_admin']);
    if (!admin) return;
    try {
      const { cardId, reason, operatorId, rotateQr, notes } = req.body;
      if (!cardId || !reason) {
        return res.status(400).json({
          success: false,
          error: 'cardId et motif de réimpression (reason) obligatoires.',
        });
      }
      const result = membershipService.reprintCard({
        cardId,
        reason,
        operatorId: operatorId || admin.user.email,
        rotateQr: Boolean(rotateQr),
        notes,
      });
      res.status(201).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/membership/workshop/quality-check', async (req: Request, res: Response) => {
    const admin = await requireMemberAdmin(req, res, ['super_admin']);
    if (!admin) return;
    try {
      const {
        cardId,
        scannedQrToken,
        visualCheckPassed,
        centeringPassed,
        contrastPassed,
        noScratchesPassed,
        operatorId,
        operatorNotes,
      } = req.body;

      if (!cardId || !scannedQrToken) {
        return res.status(400).json({
          success: false,
          error: 'cardId et scannedQrToken (scan physique du QR) requis.',
        });
      }

      const result = membershipService.performQualityCheck({
        cardId,
        scannedQrToken,
        visualCheckPassed: Boolean(visualCheckPassed),
        centeringPassed: Boolean(centeringPassed),
        contrastPassed: Boolean(contrastPassed),
        noScratchesPassed: Boolean(noScratchesPassed),
        operatorId: operatorId || admin.user.email,
        operatorNotes,
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/membership/workshop/toggle-simulator', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin'])) return;
    try {
      const { enabled } = req.body;
      membershipService.printerSimulatorMode = Boolean(enabled);
      res.json({
        success: true,
        simulatorModeActive: membershipService.printerSimulatorMode,
        message: membershipService.printerSimulatorMode
          ? 'Mode simulateur atelier activé.'
          : 'Mode pilote physique machine activé.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 9. Scanners 2D & Journaux d'Audit
  app.get('/api/membership/admin/readers', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin', 'box_office'])) return;
    try {
      const readers = membershipService.getReaders();
      res.json({ success: true, readers });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/membership/admin/readers', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin'])) return;
    try {
      const reader = membershipService.registerReader(req.body);
      res.status(201).json({ success: true, reader });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/membership/admin/readers/:id/status', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin'])) return;
    try {
      const { status } = req.body;
      const reader = membershipService.updateReaderStatus(req.params.id, status);
      res.json({ success: true, reader });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/membership/admin/scan-logs', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin', 'box_office'])) return;
    try {
      const limit = Number(req.query.limit) || 100;
      const suspiciousOnly = req.query.suspiciousOnly === 'true';
      const logs = membershipService.getScanLogs({ limit, suspiciousOnly });
      res.json({ success: true, logs });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =========================================================================
  // LUMARÉEL WALLET UNIFIÉ & INVITATIONS PRIVÉES
  // =========================================================================

  app.get('/api/wallet/overview', async (req: Request, res: Response) => {
    try {
      const session = await requireMemberSession(req, res);
      if (!session) return;
      const email = (session.user.email || '').toLowerCase().trim();
      const user = db.getUserByEmail(email);
      const userOrders = db.getOrdersForCustomer(email);
      const overview = membershipService.getWalletOverview({ email, userName: user?.name, userOrders });

      const qrTokenToRender = overview.qrToken || overview.card?.qrToken;
      if (qrTokenToRender) {
        overview.qrDataUrl = await QRCode.toDataURL(qrTokenToRender, {
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
          width: 480,
        });
      }

      res.json({ success: true, overview });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/wallet/invitations', async (req: Request, res: Response) => {
    try {
      const session = await requireMemberSession(req, res);
      if (!session) return;
      const email = (session.user.email || '').toLowerCase().trim();
      const invitations = membershipService.getInvitations(email);
      res.json({ success: true, invitations });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/wallet/invitations/:id/respond', async (req: Request, res: Response) => {
    try {
      const session = await requireMemberSession(req, res);
      if (!session) return;
      const parsed = parseWithSchema(invitationRespondSchema, req.body, res);
      if (!parsed) return;
      const invitation = membershipService.getInvitationById(req.params.id);
      const email = (session.user.email || '').toLowerCase().trim();
      if (!invitation || (invitation.recipientEmail && invitation.recipientEmail.toLowerCase().trim() !== email)) {
        return res.status(403).json({ success: false, error: 'Invitation non attribuée à ce compte.' });
      }
      const result = membershipService.respondToInvitation(req.params.id, parsed.response);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/membership/admin/invitations', async (req: Request, res: Response) => {
    const admin = await requireMemberAdmin(req, res, ['super_admin']);
    if (!admin) return;
    try {
      const parsed = parseWithSchema(invitationCreateSchema, req.body, res);
      if (!parsed) return;
      const invitation = membershipService.createInvitation(parsed);
      sqliteDb.insertAuditLog({
        actorId: admin.user.id,
        action: 'INVITATION_CREATED',
        targetType: 'invitation',
        targetId: invitation.id,
        ip: req.ip,
      });
      res.status(201).json({ success: true, invitation });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/access/scan', scannerLimiter, (req: Request, res: Response) => {
    try {
      const parsed = parseWithSchema(accessScanSchema, req.body, res);
      if (!parsed) return;
      const gate = requireGateScanner(req, res, String(parsed.eventId || ''));
      if (!gate) return;

      const allOrders = db.getAllOrders();
      const result = membershipService.unifiedScan({
        rawToken: parsed.rawToken,
        eventId: gate.eventId !== 'all_events' ? gate.eventId : parsed.eventId,
        zone: parsed.zone,
        operatorId: parsed.operatorId,
        allOrders,
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        status: 'SYSTEM_UNAVAILABLE',
        targetType: 'unknown',
        message: error.message,
        scannedAt: new Date().toISOString(),
        operatorId: req.body?.operatorId || 'Agent Contrôle',
      });
    }
  });

  // 7. Administration
  app.get('/api/admin/overview', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin', 'box_office'])) return;
    try {
      const stats = db.getAdminStats();
      res.json({ success: true, stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/admin/orders', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin', 'box_office'])) return;
    try {
      const orders = db.getAllOrders().map((o) => db.sanitizeOrderForClient(o));
      res.json({ success: true, orders });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/admin/emails', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin'])) return;
    try {
      const emails = db.getEmails();
      res.json({ success: true, emails });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/admin/audit-logs', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin'])) return;
    try {
      const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 200));
      const logs = sqliteDb.getAuditLogs(limit);
      res.json({ success: true, logs });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/settings', (_req: Request, res: Response) => {
    try {
      const settings = db.getSettings();
      res.json({
        success: true,
        settings: {
          platformName: settings.platformName,
          tagline: settings.tagline,
          logoMonogram: settings.logoMonogram,
          logoUrl: settings.logoUrl,
          currency: settings.currency,
          infoline: settings.infoline,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/admin/settings', async (req: Request, res: Response) => {
    if (!await requireMemberAdmin(req, res, ['super_admin'])) return;
    try {
      const settings = db.getSettings();
      res.json({ success: true, settings });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put('/api/admin/settings', async (req: Request, res: Response) => {
    const admin = await requireMemberAdmin(req, res, ['super_admin']);
    if (!admin) return;
    try {
      const parsed = parseWithSchema(settingsUpdateSchema, req.body, res);
      if (!parsed) return;
      const updated = db.updateSettings(parsed);
      sqliteDb.insertAuditLog({
        actorId: admin.user.id,
        action: 'SETTINGS_UPDATED',
        targetType: 'settings',
        ip: req.ip,
      });
      res.json({ success: true, settings: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Global sanitized error middleware (never exposes stack traces or internal errors in production)
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const requestId = (req as any).requestId || 'unknown';
    const status = Number(err?.status || err?.statusCode || (err?.type === 'entity.too.large' ? 413 : 500));
    logger.error({
      requestId,
      path: req.originalUrl.split('?')[0],
      status,
      err: { message: err?.message, name: err?.name },
    });

    if (res.headersSent) return;
    if (status === 413) {
      return res.status(413).json({ success: false, error: 'Charge utile trop volumineuse.', requestId });
    }
    if (status >= 400 && status < 500) {
      return res.status(status).json({ success: false, error: err?.message || 'Requête invalide.', requestId });
    }
    return res.status(500).json({
      success: false,
      error: isProduction ? 'Erreur interne du serveur.' : err?.message || 'Erreur interne du serveur.',
      requestId,
    });
  });

  // Mount Vite STRICTLY in development mode (never in production, staging, or Vitest)
  if (isDevelopment && process.env.VITEST !== 'true') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (process.env.VITEST !== 'true') {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distDir, 'index.html'));
      });
    }
  }

  return app;
}

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  const app = await createApp();
  app.listen(PORT, '0.0.0.0', () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, '[LUMARÉEL CO.] Server listening');
  });
}

if (process.env.VITEST !== 'true') {
  startServer();
}
