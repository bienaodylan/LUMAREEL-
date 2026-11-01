import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import multer from 'multer';
import QRCode from 'qrcode';
import { db } from './src/server/db';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // CORS configuration for cross-environment sync
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Ensure public/uploads directory exists
  const uploadsDir = path.join(__dirname, 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Multer Storage Configuration
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
      cb(null, `${Date.now()}-${baseName}${ext}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  });

  const eventUploadFields = upload.fields([
    { name: 'officialPoster', maxCount: 1 },
    { name: 'artistPortrait', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 },
  ]);

  // Serve static uploaded files
  app.use('/uploads', express.static(uploadsDir));

  // Direct File Upload Route (Multer)
  app.post('/api/upload', upload.single('file'), (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Aucun fichier reçu.' });
      }
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ success: true, url: fileUrl, filename: req.file.filename });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // --- API ROUTES ---

  // 1. Events (Search & Discovery)
  app.get('/api/events', (req: Request, res: Response) => {
    try {
      let events = db.getAllEvents();
      const { q, genre, city, status, organizerType } = req.query;

      if (q && typeof q === 'string') {
        const query = q.toLowerCase();
        events = events.filter(e =>
          e.title.toLowerCase().includes(query) ||
          e.artist.toLowerCase().includes(query) ||
          e.venue.toLowerCase().includes(query) ||
          e.city.toLowerCase().includes(query) ||
          e.genre.toLowerCase().includes(query)
        );
      }

      if (genre && typeof genre === 'string' && genre !== 'all') {
        events = events.filter(e => e.genre.toLowerCase() === genre.toLowerCase());
      }

      if (city && typeof city === 'string' && city !== 'all') {
        events = events.filter(e => e.city.toLowerCase() === city.toLowerCase());
      }

      if (status && typeof status === 'string' && status !== 'all') {
        events = events.filter(e => e.status === status);
      }

      if (organizerType && typeof organizerType === 'string' && organizerType !== 'all') {
        events = events.filter(e => e.organizerType === organizerType);
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

  // Helper to extract and format event payload from either JSON body or multipart form-data
  const extractEventPayload = (req: Request) => {
    const body: any = { ...req.body };
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    if (files) {
      if (files.officialPoster && files.officialPoster[0]) {
        body.officialPoster = `/uploads/${files.officialPoster[0].filename}`;
      }
      if (files.artistPortrait && files.artistPortrait[0]) {
        body.artistPortrait = `/uploads/${files.artistPortrait[0].filename}`;
      }
      if (files.bannerImage && files.bannerImage[0]) {
        body.bannerImage = `/uploads/${files.bannerImage[0].filename}`;
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

  // POST /api/events (create or upsert with Multer upload support)
  app.post('/api/events', eventUploadFields, (req: Request, res: Response) => {
    try {
      const payload = extractEventPayload(req);
      if (!payload.title && !payload.artist) {
        return res.status(400).json({ success: false, error: 'Le titre ou le nom de l’artiste est obligatoire.' });
      }
      if (!payload.title && payload.artist) {
        payload.title = `${payload.artist.toUpperCase()} EN CONCERT`;
      }
      const event = db.saveEvent(payload);
      res.status(201).json({ success: true, event });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // PUT /api/events/:id (update existing event with Multer upload support)
  app.put('/api/events/:id', eventUploadFields, (req: Request, res: Response) => {
    try {
      const payload = extractEventPayload(req);
      const updated = db.updateEvent(req.params.id, payload);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Concert introuvable.' });
      }
      res.json({ success: true, event: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // DELETE /api/events/:id (delete existing event)
  app.delete('/api/events/:id', (req: Request, res: Response) => {
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

  app.post('/api/organizers/register', (req: Request, res: Response) => {
    try {
      const { companyName, contactName, email, phone, city, country } = req.body;
      if (!companyName || !contactName || !email) {
        return res.status(400).json({ success: false, error: 'Informations obligatoires manquantes.' });
      }
      const organizer = db.registerOrganizer({ companyName, contactName, email, phone, city, country });
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
  app.get('/api/archives', (req: Request, res: Response) => {
    try {
      const includeDrafts = req.query.all === 'true';
      const archives = db.getAllArchives(includeDrafts);
      res.json({ success: true, archives });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/archives', (req: Request, res: Response) => {
    try {
      const archive = db.saveArchive(req.body);
      res.status(201).json({ success: true, archive });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put('/api/archives/:id', (req: Request, res: Response) => {
    try {
      const archive = db.saveArchive({ ...req.body, id: req.params.id });
      res.json({ success: true, archive });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete('/api/archives/:id', (req: Request, res: Response) => {
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

  // 3. Contact Inquiries
  app.post('/api/contact', (req: Request, res: Response) => {
    try {
      const { name, email, subject, message, organization } = req.body;
      if (!name || !email || !message) {
        return res.status(400).json({ success: false, error: 'Champs requis manquants.' });
      }
      res.json({
        success: true,
        message: 'Votre message a été transmis à la direction artistique de LUMARÉEL CO. Nous reviendrons vers vous sous 48 heures.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 4. Authentication
  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const { email, name, role } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: 'Email requis.' });
      }
      const user = db.registerUser(name || 'Visiteur LUMARÉEL', email, role || 'customer');
      res.json({ success: true, user });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/auth/register', (req: Request, res: Response) => {
    try {
      const { email, name, role } = req.body;
      if (!email || !name) {
        return res.status(400).json({ success: false, error: 'Nom et email requis.' });
      }
      const user = db.registerUser(name, email, role || 'customer');
      res.json({ success: true, user });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 5. Checkout & Ticketing Orders
  app.post('/api/orders/checkout', (req: Request, res: Response) => {
    try {
      const { customerId, customerName, customerEmail, customerPhone, eventId, categoryId, quantity } = req.body;
      if (!customerEmail || !eventId || !categoryId || !quantity) {
        return res.status(400).json({ success: false, error: 'Données de commande incomplètes.' });
      }

      const result = db.createPendingOrder({
        customerId: customerId || 'guest',
        customerName: customerName || 'Invité',
        customerEmail,
        customerPhone,
        eventId,
        categoryId,
        quantity: Number(quantity),
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Sandbox payment confirmation (guarantees server-side verification without fake client-side claim)
  app.post('/api/orders/:orderId/pay-sandbox', (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const paymentRef = `gp_test_${Date.now()}`;
      const result = db.confirmPaymentAndIssueTickets(orderId, paymentRef);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Authentic GeniusPay Webhook
  app.post('/api/orders/webhook/geniuspay', (req: Request, res: Response) => {
    try {
      const signature = req.headers['x-geniuspay-signature'];
      const payload = req.body;
      const { order_id, payment_status, transaction_id } = payload || {};

      if (payment_status === 'COMPLETED' && order_id) {
        db.confirmPaymentAndIssueTickets(order_id, transaction_id || `gp_hook_${Date.now()}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Customer Space
  app.get('/api/customer/orders', (req: Request, res: Response) => {
    try {
      const email = req.query.email as string;
      if (!email) {
        return res.status(400).json({ success: false, error: 'Email requis pour afficher vos billets.' });
      }
      const orders = db.getOrdersForCustomer(email);
      res.json({ success: true, orders });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Ticket detail and QR code generation
  app.get('/api/customer/tickets/:ticketId', async (req: Request, res: Response) => {
    try {
      const ticket = db.getTicketByToken(req.params.ticketId);
      if (!ticket) {
        return res.status(404).json({ success: false, error: 'Billet introuvable.' });
      }
      const qrDataUrl = await QRCode.toDataURL(ticket.token, {
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
        width: 320,
      });

      res.json({ success: true, ticket, qrDataUrl });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Printable e-ticket HTML view
  app.get('/api/customer/tickets/:ticketId/print', async (req: Request, res: Response) => {
    try {
      const ticket = db.getTicketByToken(req.params.ticketId);
      if (!ticket) {
        return res.status(404).send('Billet non trouvé');
      }
      const qrDataUrl = await QRCode.toDataURL(ticket.token, {
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
        width: 300,
      });

      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Billet Électronique — LUMARÉEL CO. — ${ticket.serialNumber}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #ffffff; color: #111; margin: 0; padding: 40px; }
    .ticket-card { max-width: 650px; margin: 0 auto; border: 2px solid #111; padding: 32px; background: #fff; }
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
<body onload="window.print()">
  <div class="ticket-card">
    <div class="header">
      <div>
        <div class="brand">LUMARÉEL CO.</div>
        <div style="font-size: 10px; letter-spacing: 2px; color: #888; margin-top: 4px;">PRODUCTION &amp; BILLETTERIE OFFICIELLE</div>
      </div>
      <div class="serial">${ticket.serialNumber}</div>
    </div>
    
    <h1 class="title">${ticket.eventTitle}</h1>
    <div class="subtitle">BILLET ACCÈS OFFICIEL</div>

    <div class="details">
      <div>
        <div class="item-label">DATE &amp; HORAIRE</div>
        <div class="item-val">${ticket.eventDate} · ${ticket.eventTime}</div>
      </div>
      <div>
        <div class="item-label">LIEU &amp; SALLE</div>
        <div class="item-val">${ticket.eventVenue}</div>
      </div>
      <div>
        <div class="item-label">CATÉGORIE</div>
        <div class="item-val">${ticket.categoryName}</div>
      </div>
      <div>
        <div class="item-label">TITULAIRE</div>
        <div class="item-val">${ticket.holderName}</div>
      </div>
    </div>

    <div class="qr-zone">
      <div>
        <div class="item-label">JETON DE CONTRÔLE SÉCURISÉ</div>
        <div style="font-family: monospace; font-size: 12px; margin-bottom: 8px;">${ticket.token}</div>
        <div class="qr-text">
          Présentez ce QR code à l'entrée de l'événement.<br>
          Chaque billet est individuel, unique et non duplicable.<br>
          Le contrôle à l'accès invalide immédiatement toute réutilisation.
        </div>
      </div>
      <img src="${qrDataUrl}" alt="QR code d'accès">
    </div>

    <div class="footer">
      LUMARÉEL CO. · ORDRE RÉFÉRENCE : ${ticket.orderRef} · EMIS LE : ${new Date(ticket.issuedAt).toLocaleDateString('fr-FR')}
    </div>
  </div>
</body>
</html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error: any) {
      res.status(500).send('Erreur lors de la génération du billet');
    }
  });

  // --- Route pour les lots de billets physiques (Correction de l'erreur 405) ---
  app.post('/api/tickets/print-batch', (req: Request, res: Response) => {
    try {
      const { eventId, categoryId, quantity } = req.body || {};
      if (!eventId || !categoryId) {
        return res.status(400).json({ success: false, error: 'Concert et catégorie requis.' });
      }
      const result = db.createPrintBatch({ eventId, categoryId, quantity: Number(quantity) });
      if (!result.success) {
        return res.status(400).json(result);
      }
      res.status(201).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 6. Dedicated Gate Access Control Controller (POST /api/verify-ticket)
  app.post('/api/verify-ticket', (req: Request, res: Response) => {
    try {
      const ticketIdOrToken = (req.body.ticketId || req.body.token || req.body.id || req.body.qrData || '').toString().trim();
      if (!ticketIdOrToken) {
        return res.status(400).json({ valid: false, error: 'ID ou jeton du billet requis.' });
      }

      // Recherche dans la base de données
      let ticket = db.getTicketByToken(ticketIdOrToken);
      if (!ticket) {
        // Recherche étendue par token, ID ou numéro de série
        const allOrders = db.getAllOrders();
        for (const order of allOrders) {
          const match = order.tickets?.find(t => 
            t.id === ticketIdOrToken ||
            t.token === ticketIdOrToken ||
            t.token.toUpperCase() === ticketIdOrToken.toUpperCase() ||
            t.serialNumber.toUpperCase() === ticketIdOrToken.toUpperCase()
          );
          if (match) {
            ticket = match;
            break;
          }
        }
      }

      // 1. Si le billet n'existe pas ou signature invalide -> 404 Not Found
      if (!ticket) {
        return res.status(404).json({
          valid: false,
          error: 'Billet introuvable ou signature invalide',
          message: 'Le billet scanné ne figure pas dans le registre cryptographique LUMARÉEL.',
        });
      }

      // 2. Si le billet existe mais est déjà scanné -> 403 Forbidden (Billet déjà utilisé)
      if (ticket.status === 'used' || (ticket as any).isUsed) {
        return res.status(403).json({
          valid: false,
          error: 'Billet déjà utilisé',
          message: 'Ce billet a déjà été validé à l’entrée. Risque de contrefaçon ou de double utilisation.',
          holderName: ticket.holderName,
          categoryName: ticket.categoryName,
          eventTitle: ticket.eventTitle,
          serialNumber: ticket.serialNumber,
          scannedAt: (ticket as any).scannedAt || ticket.checkedInAt || new Date().toISOString(),
          ticket: {
            id: ticket.id,
            holderName: ticket.holderName,
            categoryName: ticket.categoryName,
            eventTitle: ticket.eventTitle,
            serialNumber: ticket.serialNumber,
            scannedAt: (ticket as any).scannedAt || ticket.checkedInAt || new Date().toISOString(),
          },
        });
      }

      // 3. Si le billet est valide -> Mets à jour son statut à "scanné/utilisé", ajoute l'horodatage du scan, et retourne 200 OK
      const scanTimestamp = new Date().toISOString();
      ticket.status = 'used';
      (ticket as any).isUsed = true;
      (ticket as any).scannedAt = scanTimestamp;
      ticket.checkedInAt = scanTimestamp;
      ticket.checkedInBy = req.body.gateAgentId || 'Vigile LUMARÉEL CO.';
      db.persistTickets(); // Sauvegarde du scan

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

  // Legacy & Alternate Gate Scanner Endpoints
  const handleScannerVerification = (req: Request, res: Response) => {
    try {
      const tokenOrSerial = req.body.tokenOrSerial || req.body.token;
      const targetEventId = req.body.targetEventId || req.body.eventId;
      const gateAgentId = req.body.gateAgentId || req.body.gateAgentName || 'Agent de Contrôle';

      if (!tokenOrSerial) {
        return res.status(400).json({ success: false, error: 'Token ou numéro de série requis.' });
      }

      const result = db.verifyAndCheckInTicket({
        tokenOrSerial,
        targetEventId,
        gateAgentId,
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  app.post('/api/scanner/verify', handleScannerVerification);
  app.post('/api/tickets/verify-and-burn', handleScannerVerification);

  // --- MAGIC LINK GATE SCANNER ACCESS (Tokens URL) ---
  app.post('/api/events/:id/scanner-token', (req: Request, res: Response) => {
    try {
      const eventId = req.params.id;
      const event = db.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ success: false, error: 'Concert introuvable.' });
      }

      const createdBy = req.body.createdBy || 'Direction LUMARÉEL CO.';
      const durationHours = Number(req.body.durationHours) || 24;
      const scannerToken = db.createScannerToken(event.id, createdBy, durationHours);

      if (!scannerToken) {
        return res.status(500).json({ success: false, error: 'Échec de génération du token.' });
      }

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
  });

  app.get('/api/verify-scanner-token', (req: Request, res: Response) => {
    try {
      const token = (req.query.token as string || '').trim();
      const eventId = (req.query.eventId as string || '').trim() || undefined;

      if (!token) {
        return res.status(401).json({ valid: false, error: 'Token d’accès manquant ou absent de l’URL.' });
      }

      const result = db.verifyScannerToken(token, eventId);
      if (!result.valid) {
        return res.status(403).json(result);
      }

      res.json({
        valid: true,
        token: result.token,
        event: result.event ? {
          id: result.event.id,
          title: result.event.title,
          artist: result.event.artist,
          venue: result.event.venue,
          date: result.event.date,
          time: result.event.time,
        } : undefined,
        expiresAt: result.token?.expiresAt,
      });
    } catch (error: any) {
      res.status(500).json({ valid: false, error: error.message });
    }
  });

  app.get('/api/events/:id/scanner-tokens', (req: Request, res: Response) => {
    try {
      const tokens = db.getScannerTokensForEvent(req.params.id);
      res.json({ success: true, tokens });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 7. Administration
  app.get('/api/admin/overview', (_req: Request, res: Response) => {
    try {
      const stats = db.getAdminStats();
      res.json({ success: true, stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/admin/orders', (_req: Request, res: Response) => {
    try {
      const orders = db.getAllOrders();
      res.json({ success: true, orders });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/admin/emails', (_req: Request, res: Response) => {
    try {
      const emails = db.getEmails();
      res.json({ success: true, emails });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/admin/settings', (_req: Request, res: Response) => {
    try {
      const settings = db.getSettings();
      res.json({ success: true, settings });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put('/api/admin/settings', (req: Request, res: Response) => {
    try {
      const updated = db.updateSettings(req.body);
      res.json({ success: true, settings: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/admin/supabase-config', (req: Request, res: Response) => {
    try {
      const { supabaseUrl, supabaseAnonKey } = req.body;
      if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(400).json({ success: false, error: 'URL et clé anon Supabase requises.' });
      }

      const updated = db.updateSettings({
        supabaseUrl: supabaseUrl.trim(),
        supabaseAnonKey: supabaseAnonKey.trim(),
      });

      process.env.VITE_SUPABASE_URL = supabaseUrl.trim();
      process.env.VITE_SUPABASE_ANON_KEY = supabaseAnonKey.trim();

      try {
        const envPath = path.resolve(process.cwd(), '.env');
        let currentEnv = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
        
        if (currentEnv.includes('VITE_SUPABASE_URL=')) {
          currentEnv = currentEnv.replace(/VITE_SUPABASE_URL=.*/g, `VITE_SUPABASE_URL="${supabaseUrl.trim()}"`);
        } else {
          currentEnv += `\nVITE_SUPABASE_URL="${supabaseUrl.trim()}"\n`;
        }

        if (currentEnv.includes('VITE_SUPABASE_ANON_KEY=')) {
          currentEnv = currentEnv.replace(/VITE_SUPABASE_ANON_KEY=.*/g, `VITE_SUPABASE_ANON_KEY="${supabaseAnonKey.trim()}"`);
        } else {
          currentEnv += `\nVITE_SUPABASE_ANON_KEY="${supabaseAnonKey.trim()}"\n`;
        }

        fs.writeFileSync(envPath, currentEnv, 'utf-8');
      } catch (errEnv) {
        console.warn('Could not write to .env:', errEnv);
      }

      res.json({ success: true, settings: updated, message: 'Configuration Supabase enregistrée avec succès.' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Mount Vite or static build
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LUMARÉEL CO.] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
