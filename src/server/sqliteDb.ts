import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'crypto';
import {
  User,
  ConcertEvent,
  Order,
  Ticket,
  ArchiveProduction,
  WorkProduction,
  ExternalOrganizer,
  ScannerToken,
  TransactionalEmail,
  PlatformSettings,
  WalletTransaction,
} from '../types';

export interface CheckInLogRecord {
  id: string;
  ticketId: string;
  eventId: string;
  gateAgentId: string;
  result: string;
  timestamp: string;
}

export interface ContactInquiryRecord {
  id: string;
  name: string;
  email: string;
  subject?: string;
  organization?: string;
  message: string;
  createdAt: string;
}

export interface TicketDesignRecord {
  eventId: string;
  categoryId: string;
  imageUrl: string;
  updatedAt: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface AuditLogRecord {
  id: string;
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  ip?: string;
  details?: string;
  createdAt: string;
}

const DATA_DIR = path.resolve(process.env.LUMAREEL_DATA_DIR || path.join(process.cwd(), 'data'));
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
}

const DB_FILE = path.join(DATA_DIR, 'lumareel.sqlite');

class LumareelSqliteStore {
  private db: DatabaseSync;
  private txDepth = 0;

  constructor() {
    this.db = new DatabaseSync(DB_FILE);
    try {
      fs.chmodSync(DB_FILE, 0o600);
    } catch {}
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA busy_timeout = 5000;
      PRAGMA foreign_keys = ON;
    `);
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL,
        date TEXT NOT NULL,
        is_featured INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ticket_designs (
        event_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        image_url TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (event_id, category_id)
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        reference TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        event_id TEXT NOT NULL,
        payment_status TEXT NOT NULL,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        token TEXT UNIQUE NOT NULL,
        serial_number TEXT UNIQUE NOT NULL,
        order_id TEXT NOT NULL,
        event_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        status TEXT NOT NULL,
        is_print_batch INTEGER NOT NULL DEFAULT 0,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS archives (
        id TEXT PRIMARY KEY,
        order_index INTEGER NOT NULL DEFAULT 1,
        is_published INTEGER NOT NULL DEFAULT 1,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS works (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS organizers (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS scanner_tokens (
        id TEXT PRIMARY KEY,
        token TEXT UNIQUE NOT NULL,
        event_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS check_in_logs (
        id TEXT PRIMARY KEY,
        ticket_id TEXT NOT NULL,
        event_id TEXT NOT NULL,
        gate_agent_id TEXT NOT NULL,
        result TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS emails (
        id TEXT PRIMARY KEY,
        recipient_email TEXT NOT NULL,
        sent_at TEXT NOT NULL,
        payload TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS platform_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS contact_inquiries (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT,
        organization TEXT,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS membership_store (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        revoked_at TEXT,
        ip TEXT,
        user_agent TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

      CREATE TABLE IF NOT EXISTS payment_events (
        provider_event_id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        processed_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS wallet_accounts (
        card_id TEXT PRIMARY KEY,
        balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
        currency TEXT NOT NULL DEFAULT 'FCFA',
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS wallet_ledger (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        idempotency_key TEXT UNIQUE,
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL,
        balance_before INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        location TEXT NOT NULL,
        terminal_id TEXT,
        operator_name TEXT,
        reference TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_wallet_ledger_card_id ON wallet_ledger(card_id);

      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        actor_id TEXT,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        ip TEXT,
        details TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        used_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS qr_replay_guard (
        nonce TEXT PRIMARY KEY,
        expires_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS scanner_sessions (
        id TEXT PRIMARY KEY,
        scanner_token_id TEXT NOT NULL,
        event_id TEXT NOT NULL,
        token_hash TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        revoked_at TEXT
      );

      CREATE TABLE IF NOT EXISTS admin_totp (
        user_id TEXT PRIMARY KEY,
        secret_base32 TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        verified_at TEXT
      );
    `);

    try {
      this.db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_reference_unique ON orders(reference);`);
    } catch {}

    // Idempotent migration: tickets.token_hash (hash SHA-256 du jeton QR en SQLite)
    try {
      const cols = this.db.prepare(`PRAGMA table_info(tickets)`).all() as Array<{ name: string }>;
      if (!cols.some((c) => c.name === 'token_hash')) {
        this.db.exec(`ALTER TABLE tickets ADD COLUMN token_hash TEXT;`);
      }
      const unhashed = this.db
        .prepare(`SELECT id, token, payload FROM tickets WHERE token_hash IS NULL OR token_hash = ''`)
        .all() as Array<{ id: string; token: string; payload: string }>;
      for (const row of unhashed) {
        let rawToken = row.token;
        try {
          const parsed = JSON.parse(row.payload);
          if (parsed?.token) rawToken = parsed.token;
        } catch {}
        const hash = crypto.createHash('sha256').update(String(rawToken), 'utf8').digest('hex');
        this.db.prepare(`UPDATE tickets SET token_hash = ?, token = ? WHERE id = ?`).run(hash, hash, row.id);
      }
      this.db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_token_hash ON tickets(token_hash);`);
    } catch {}
  }

  public runImmediateTransaction<T>(fn: () => T): T {
    if (this.txDepth > 0) {
      return fn();
    }
    this.db.exec('BEGIN IMMEDIATE');
    this.txDepth++;
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (err) {
      try {
        this.db.exec('ROLLBACK');
      } catch {}
      throw err;
    } finally {
      this.txDepth--;
    }
  }

  public getDbPath(): string {
    return DB_FILE;
  }

  public countRows(table: string): number {
    const allowed = new Set([
      'users',
      'events',
      'ticket_designs',
      'orders',
      'tickets',
      'archives',
      'works',
      'organizers',
      'scanner_tokens',
      'check_in_logs',
      'emails',
      'platform_settings',
      'contact_inquiries',
      'membership_store',
    ]);
    if (!allowed.has(table)) throw new Error(`Invalid table name: ${table}`);
    const row = this.db.prepare(`SELECT COUNT(*) AS cnt FROM ${table}`).get() as { cnt: number } | undefined;
    return Number(row?.cnt || 0);
  }

  public hasRows(table: string): boolean {
    return this.countRows(table) > 0;
  }

  public getStatsSummary(): Record<string, number> {
    return {
      users: this.countRows('users'),
      events: this.countRows('events'),
      ticketDesigns: this.countRows('ticket_designs'),
      orders: this.countRows('orders'),
      tickets: this.countRows('tickets'),
      archives: this.countRows('archives'),
      works: this.countRows('works'),
      organizers: this.countRows('organizers'),
      scannerTokens: this.countRows('scanner_tokens'),
      checkInLogs: this.countRows('check_in_logs'),
      emails: this.countRows('emails'),
      platformSettings: this.countRows('platform_settings'),
      contactInquiries: this.countRows('contact_inquiries'),
      membershipStore: this.countRows('membership_store'),
    };
  }

  // --- USERS ---
  public upsertUser(user: User): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO users (id, email, name, role, payload, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           email = excluded.email,
           name = excluded.name,
           role = excluded.role,
           payload = excluded.payload,
           updated_at = excluded.updated_at`
      )
      .run(user.id, user.email.toLowerCase(), user.name, user.role, JSON.stringify(user), now);
  }

  public getAllUsers(): User[] {
    const rows = this.db.prepare(`SELECT payload FROM users ORDER BY updated_at ASC`).all() as Array<{ payload: string }>;
    return rows.map((r) => JSON.parse(r.payload) as User);
  }

  public deleteUserById(id: string): void {
    this.db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
  }

  // --- TICKET DESIGNS (PER CONCERT & CATEGORY) ---
  public upsertTicketDesign(eventId: string, categoryId: string, imageUrl: string): TicketDesignRecord {
    const now = new Date().toISOString();
    const cleanUrl = imageUrl.trim();
    this.db
      .prepare(
        `INSERT INTO ticket_designs (event_id, category_id, image_url, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(event_id, category_id) DO UPDATE SET
           image_url = excluded.image_url,
           updated_at = excluded.updated_at`
      )
      .run(eventId, categoryId, cleanUrl, now);

    // Reconcile into stored event JSON payload if event exists
    const eventRow = this.db.prepare(`SELECT payload FROM events WHERE id = ?`).get(eventId) as { payload: string } | undefined;
    if (eventRow) {
      const evt = JSON.parse(eventRow.payload) as ConcertEvent;
      evt.categories = (evt.categories || []).map((c) =>
        c.id === categoryId ? { ...c, ticketImageUrl: cleanUrl } : c
      );
      this.db
        .prepare(`UPDATE events SET payload = ?, updated_at = ? WHERE id = ?`)
        .run(JSON.stringify(evt), now, eventId);
    }

    return { eventId, categoryId, imageUrl: cleanUrl, updatedAt: now };
  }

  public deleteTicketDesign(eventId: string, categoryId: string): boolean {
    const now = new Date().toISOString();
    const res = this.db
      .prepare(`DELETE FROM ticket_designs WHERE event_id = ? AND category_id = ?`)
      .run(eventId, categoryId);

    const eventRow = this.db.prepare(`SELECT payload FROM events WHERE id = ?`).get(eventId) as { payload: string } | undefined;
    if (eventRow) {
      const evt = JSON.parse(eventRow.payload) as ConcertEvent;
      evt.categories = (evt.categories || []).map((c) => {
        if (c.id !== categoryId) return c;
        const copy = { ...c };
        delete copy.ticketImageUrl;
        return copy;
      });
      this.db
        .prepare(`UPDATE events SET payload = ?, updated_at = ? WHERE id = ?`)
        .run(JSON.stringify(evt), now, eventId);
    }

    return Number(res.changes || 0) > 0;
  }

  public getTicketDesignsForEvent(eventId: string): TicketDesignRecord[] {
    const rows = this.db
      .prepare(`SELECT event_id, category_id, image_url, updated_at FROM ticket_designs WHERE event_id = ?`)
      .all(eventId) as Array<{ event_id: string; category_id: string; image_url: string; updated_at: string }>;
    return rows.map((r) => ({
      eventId: r.event_id,
      categoryId: r.category_id,
      imageUrl: r.image_url,
      updatedAt: r.updated_at,
    }));
  }

  public getTicketDesignMapForEvent(eventId: string): Record<string, string> {
    const map: Record<string, string> = {};
    for (const d of this.getTicketDesignsForEvent(eventId)) {
      map[d.categoryId] = d.imageUrl;
    }
    return map;
  }

  // --- EVENTS ---
  public upsertEvent(event: ConcertEvent): ConcertEvent {
    const now = new Date().toISOString();
    const existingDesigns = this.getTicketDesignMapForEvent(event.id);
    const mergedCategories = (event.categories || []).map((cat) => {
      const provided = typeof cat.ticketImageUrl === 'string' ? cat.ticketImageUrl.trim() : '';
      if (provided) {
        this.db
          .prepare(
            `INSERT INTO ticket_designs (event_id, category_id, image_url, updated_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(event_id, category_id) DO UPDATE SET
               image_url = excluded.image_url,
               updated_at = excluded.updated_at`
          )
          .run(event.id, cat.id, provided, now);
        return { ...cat, ticketImageUrl: provided };
      }
      if (existingDesigns[cat.id]) {
        return { ...cat, ticketImageUrl: existingDesigns[cat.id] };
      }
      return cat;
    });

    const sanitizedEvent: ConcertEvent = {
      ...event,
      categories: mergedCategories,
    };

    this.db
      .prepare(
        `INSERT INTO events (id, slug, date, is_featured, status, payload, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           slug = excluded.slug,
           date = excluded.date,
           is_featured = excluded.is_featured,
           status = excluded.status,
           payload = excluded.payload,
           updated_at = excluded.updated_at`
      )
      .run(
        sanitizedEvent.id,
        sanitizedEvent.slug,
        sanitizedEvent.date,
        sanitizedEvent.isFeatured ? 1 : 0,
        sanitizedEvent.status,
        JSON.stringify(sanitizedEvent),
        now
      );

    return sanitizedEvent;
  }

  public getAllEvents(): ConcertEvent[] {
    const rows = this.db.prepare(`SELECT payload FROM events ORDER BY date ASC`).all() as Array<{ payload: string }>;
    return rows.map((r) => {
      const evt = JSON.parse(r.payload) as ConcertEvent;
      const designs = this.getTicketDesignMapForEvent(evt.id);
      if (Object.keys(designs).length > 0 && Array.isArray(evt.categories)) {
        evt.categories = evt.categories.map((c) =>
          designs[c.id] && !c.ticketImageUrl ? { ...c, ticketImageUrl: designs[c.id] } : c
        );
      }
      return evt;
    });
  }

  public deleteEventById(id: string): void {
    this.db.prepare(`DELETE FROM ticket_designs WHERE event_id = ?`).run(id);
    this.db.prepare(`DELETE FROM events WHERE id = ?`).run(id);
  }

  // --- ORDERS & TICKETS ---
  public upsertOrder(order: Order): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO orders (id, reference, customer_email, event_id, payment_status, payload, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           reference = excluded.reference,
           customer_email = excluded.customer_email,
           event_id = excluded.event_id,
           payment_status = excluded.payment_status,
           payload = excluded.payload,
           updated_at = excluded.updated_at`
      )
      .run(
        order.id,
        order.reference,
        order.customerEmail.toLowerCase(),
        order.eventId,
        order.paymentStatus,
        JSON.stringify(order),
        now
      );

    if (Array.isArray(order.tickets)) {
      for (const ticket of order.tickets) {
        this.upsertTicket(ticket, false);
      }
    }
  }

  public getAllOrders(): Order[] {
    const rows = this.db.prepare(`SELECT payload FROM orders ORDER BY updated_at DESC`).all() as Array<{ payload: string }>;
    return rows.map((r) => JSON.parse(r.payload) as Order);
  }

  public upsertTicket(ticket: Ticket, isPrintBatch: boolean): void {
    const now = new Date().toISOString();
    const tokenHash = crypto.createHash('sha256').update(String(ticket.token), 'utf8').digest('hex');
    this.db
      .prepare(
        `INSERT INTO tickets (id, token, token_hash, serial_number, order_id, event_id, category_id, status, is_print_batch, payload, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           token = excluded.token,
           token_hash = excluded.token_hash,
           serial_number = excluded.serial_number,
           order_id = excluded.order_id,
           event_id = excluded.event_id,
           category_id = excluded.category_id,
           status = excluded.status,
           is_print_batch = excluded.is_print_batch,
           payload = excluded.payload,
           updated_at = excluded.updated_at`
      )
      .run(
        ticket.id,
        tokenHash,
        tokenHash,
        ticket.serialNumber,
        ticket.orderId,
        ticket.eventId,
        ticket.categoryId,
        ticket.status,
        isPrintBatch ? 1 : 0,
        JSON.stringify(ticket),
        now
      );
  }

  public getTicketByTokenOrSerial(tokenOrId: string): Ticket | null {
    const clean = (tokenOrId || '').trim();
    if (!clean) return null;
    const tokenHash = crypto.createHash('sha256').update(clean, 'utf8').digest('hex');
    const upperHash = crypto.createHash('sha256').update(clean.toUpperCase(), 'utf8').digest('hex');
    const row = this.db
      .prepare(
        `SELECT payload FROM tickets
         WHERE id = ? OR token_hash = ? OR token_hash = ? OR UPPER(serial_number) = UPPER(?)
         LIMIT 1`
      )
      .get(clean, tokenHash, upperHash, clean) as { payload: string } | undefined;
    return row ? (JSON.parse(row.payload) as Ticket) : null;
  }

  public atomicBurnTicket(params: {
    tokenOrSerial: string;
    targetEventId?: string;
    gateAgentId: string;
  }): {
    outcome: 'VALID' | 'ALREADY_USED' | 'WRONG_EVENT' | 'INACTIVE' | 'CANCELLED' | 'INVALID_OR_NOT_FOUND';
    ticket?: Ticket;
    scannedAt?: string;
  } {
    const clean = (params.tokenOrSerial || '').trim();
    if (!clean) return { outcome: 'INVALID_OR_NOT_FOUND' };

    return this.runImmediateTransaction(() => {
      const tokenHash = crypto.createHash('sha256').update(clean, 'utf8').digest('hex');
      const upperHash = crypto.createHash('sha256').update(clean.toUpperCase(), 'utf8').digest('hex');
      const row = this.db
        .prepare(
          `SELECT id, event_id AS eventId, status, payload
           FROM tickets
           WHERE id = ? OR token_hash = ? OR token_hash = ? OR UPPER(serial_number) = UPPER(?)
           LIMIT 1`
        )
        .get(clean, tokenHash, upperHash, clean) as
        | { id: string; eventId: string; status: string; payload: string }
        | undefined;

      if (!row) {
        return { outcome: 'INVALID_OR_NOT_FOUND' };
      }

      const ticket = JSON.parse(row.payload) as Ticket;

      if (params.targetEventId && row.eventId !== params.targetEventId) {
        return { outcome: 'WRONG_EVENT', ticket };
      }
      if (row.status === 'inactive' || ticket.status === 'inactive') {
        return { outcome: 'INACTIVE', ticket };
      }
      if (row.status === 'cancelled' || ticket.status === 'cancelled') {
        return { outcome: 'CANCELLED', ticket };
      }
      if (row.status === 'used' || ticket.status === 'used') {
        return { outcome: 'ALREADY_USED', ticket };
      }

      const scannedAt = new Date().toISOString();
      ticket.status = 'used';
      ticket.checkedInAt = scannedAt;
      ticket.checkedInBy = params.gateAgentId;
      (ticket as any).isUsed = true;
      (ticket as any).scannedAt = scannedAt;

      const updateRes = this.db
        .prepare(
          `UPDATE tickets
           SET status = 'used', payload = ?, updated_at = ?
           WHERE id = ? AND status = 'valid'`
        )
        .run(JSON.stringify(ticket), scannedAt, row.id);

      if (Number(updateRes.changes || 0) !== 1) {
        return { outcome: 'ALREADY_USED', ticket };
      }

      return { outcome: 'VALID', ticket, scannedAt };
    });
  }

  public activatePrintBatch(batchRefOrId: string): { activatedCount: number; ticketIds: string[] } {
    const ref = (batchRefOrId || '').trim();
    if (!ref) return { activatedCount: 0, ticketIds: [] };

    return this.runImmediateTransaction(() => {
      const rows = this.db
        .prepare(`SELECT id, payload FROM tickets WHERE is_print_batch = 1 AND status = 'inactive'`)
        .all() as Array<{ id: string; payload: string }>;

      const now = new Date().toISOString();
      const ticketIds: string[] = [];

      for (const r of rows) {
        const ticket = JSON.parse(r.payload) as Ticket;
        if (ticket.orderRef === ref || ticket.orderId === ref) {
          ticket.status = 'valid';
          const upd = this.db
            .prepare(`UPDATE tickets SET status = 'valid', payload = ?, updated_at = ? WHERE id = ? AND status = 'inactive'`)
            .run(JSON.stringify(ticket), now, r.id);
          if (Number(upd.changes || 0) === 1) {
            ticketIds.push(r.id);
          }
        }
      }

      return { activatedCount: ticketIds.length, ticketIds };
    });
  }

  public getAllTickets(printBatchOnly?: boolean): Ticket[] {
    const sql =
      printBatchOnly === undefined
        ? `SELECT payload FROM tickets`
        : `SELECT payload FROM tickets WHERE is_print_batch = ?`;
    const rows = (
      printBatchOnly === undefined
        ? this.db.prepare(sql).all()
        : this.db.prepare(sql).all(printBatchOnly ? 1 : 0)
    ) as Array<{ payload: string }>;
    return rows.map((r) => JSON.parse(r.payload) as Ticket);
  }

  // --- ARCHIVES ---
  public upsertArchive(archive: ArchiveProduction): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO archives (id, order_index, is_published, payload, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           order_index = excluded.order_index,
           is_published = excluded.is_published,
           payload = excluded.payload,
           updated_at = excluded.updated_at`
      )
      .run(
        archive.id,
        archive.orderIndex || 1,
        archive.isPublished !== false ? 1 : 0,
        JSON.stringify(archive),
        now
      );
  }

  public getAllArchives(): ArchiveProduction[] {
    const rows = this.db
      .prepare(`SELECT payload FROM archives ORDER BY order_index ASC`)
      .all() as Array<{ payload: string }>;
    return rows.map((r) => JSON.parse(r.payload) as ArchiveProduction);
  }

  public deleteArchiveById(id: string): void {
    this.db.prepare(`DELETE FROM archives WHERE id = ?`).run(id);
  }

  // --- WORKS ---
  public upsertWork(work: WorkProduction): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO works (id, payload, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           payload = excluded.payload,
           updated_at = excluded.updated_at`
      )
      .run(work.id, JSON.stringify(work), now);
  }

  public getAllWorks(): WorkProduction[] {
    const rows = this.db.prepare(`SELECT payload FROM works`).all() as Array<{ payload: string }>;
    return rows.map((r) => JSON.parse(r.payload) as WorkProduction);
  }

  // --- ORGANIZERS ---
  public upsertOrganizer(org: ExternalOrganizer): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO organizers (id, email, payload, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           email = excluded.email,
           payload = excluded.payload,
           updated_at = excluded.updated_at`
      )
      .run(org.id, org.email.toLowerCase(), JSON.stringify(org), now);
  }

  public getAllOrganizers(): ExternalOrganizer[] {
    const rows = this.db.prepare(`SELECT payload FROM organizers`).all() as Array<{ payload: string }>;
    return rows.map((r) => JSON.parse(r.payload) as ExternalOrganizer);
  }

  // --- SCANNER TOKENS ---
  public upsertScannerToken(token: ScannerToken): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO scanner_tokens (id, token, event_id, payload, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           token = excluded.token,
           event_id = excluded.event_id,
           payload = excluded.payload,
           updated_at = excluded.updated_at`
      )
      .run(token.id, token.token, token.eventId, JSON.stringify(token), now);
  }

  public getAllScannerTokens(): ScannerToken[] {
    const rows = this.db.prepare(`SELECT payload FROM scanner_tokens`).all() as Array<{ payload: string }>;
    return rows.map((r) => JSON.parse(r.payload) as ScannerToken);
  }

  // --- CHECK-IN LOGS ---
  public insertCheckInLog(entry: CheckInLogRecord): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO check_in_logs (id, ticket_id, event_id, gate_agent_id, result, timestamp)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(entry.id, entry.ticketId, entry.eventId, entry.gateAgentId, entry.result, entry.timestamp);
  }

  public getCheckInLogs(limit = 500): CheckInLogRecord[] {
    return this.db
      .prepare(
        `SELECT id, ticket_id AS ticketId, event_id AS eventId, gate_agent_id AS gateAgentId, result, timestamp
         FROM check_in_logs ORDER BY timestamp DESC LIMIT ?`
      )
      .all(limit) as unknown as CheckInLogRecord[];
  }

  // --- EMAILS ---
  public insertEmail(email: TransactionalEmail): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO emails (id, recipient_email, sent_at, payload)
         VALUES (?, ?, ?, ?)`
      )
      .run(email.id, email.recipient.toLowerCase(), email.timestamp, JSON.stringify(email));
  }

  public getAllEmails(): TransactionalEmail[] {
    const rows = this.db
      .prepare(`SELECT payload FROM emails ORDER BY sent_at DESC LIMIT 500`)
      .all() as Array<{ payload: string }>;
    return rows.map((r) => JSON.parse(r.payload) as TransactionalEmail);
  }

  // --- PLATFORM SETTINGS ---
  public savePlatformSettings(settings: PlatformSettings): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO platform_settings (id, payload, updated_at)
         VALUES (1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           payload = excluded.payload,
           updated_at = excluded.updated_at`
      )
      .run(JSON.stringify(settings), now);
  }

  public getPlatformSettings(): PlatformSettings | null {
    const row = this.db
      .prepare(`SELECT payload FROM platform_settings WHERE id = 1`)
      .get() as { payload: string } | undefined;
    return row ? (JSON.parse(row.payload) as PlatformSettings) : null;
  }

  // --- CONTACT INQUIRIES ---
  public insertContactInquiry(record: ContactInquiryRecord): void {
    this.db
      .prepare(
        `INSERT INTO contact_inquiries (id, name, email, subject, organization, message, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        record.id,
        record.name,
        record.email.toLowerCase(),
        record.subject || '',
        record.organization || '',
        record.message,
        record.createdAt
      );
  }

  public getContactInquiries(): ContactInquiryRecord[] {
    return this.db
      .prepare(
        `SELECT id, name, email, subject, organization, message, created_at AS createdAt
         FROM contact_inquiries ORDER BY created_at DESC LIMIT 200`
      )
      .all() as unknown as ContactInquiryRecord[];
  }

  // --- MEMBERSHIP STORE ---
  public saveMembershipStore(data: unknown): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO membership_store (id, payload, updated_at)
         VALUES (1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           payload = excluded.payload,
           updated_at = excluded.updated_at`
      )
      .run(JSON.stringify(data), now);
  }

  public getMembershipStore<T = unknown>(): T | null {
    const row = this.db
      .prepare(`SELECT payload FROM membership_store WHERE id = 1`)
      .get() as { payload: string } | undefined;
    return row ? (JSON.parse(row.payload) as T) : null;
  }

  // --- SESSIONS ---
  public createSession(session: SessionRecord): void {
    this.db
      .prepare(
        `INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, revoked_at, ip, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        session.id,
        session.userId,
        session.tokenHash,
        session.createdAt,
        session.expiresAt,
        session.revokedAt || null,
        session.ip || null,
        session.userAgent || null
      );
  }

  public getActiveSessionByTokenHash(tokenHash: string): SessionRecord | null {
    const row = this.db
      .prepare(
        `SELECT id, user_id AS userId, token_hash AS tokenHash, created_at AS createdAt,
                expires_at AS expiresAt, revoked_at AS revokedAt, ip, user_agent AS userAgent
         FROM sessions
         WHERE token_hash = ? AND revoked_at IS NULL`
      )
      .get(tokenHash) as unknown as SessionRecord | undefined;
    if (!row) return null;
    if (new Date(row.expiresAt).getTime() <= Date.now()) {
      return null;
    }
    return row;
  }

  public touchSessionExpiry(sessionId: string, newExpiresAt: string): void {
    this.db.prepare(`UPDATE sessions SET expires_at = ? WHERE id = ? AND revoked_at IS NULL`).run(newExpiresAt, sessionId);
  }

  public revokeSessionByTokenHash(tokenHash: string): void {
    const now = new Date().toISOString();
    this.db.prepare(`UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL`).run(now, tokenHash);
  }

  public revokeAllSessionsForUser(userId: string): void {
    const now = new Date().toISOString();
    this.db.prepare(`UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`).run(now, userId);
  }

  // --- PAYMENT IDEMPOTENCY ---
  public tryInsertPaymentEvent(providerEventId: string, orderId: string, provider: string): boolean {
    const res = this.db
      .prepare(
        `INSERT OR IGNORE INTO payment_events (provider_event_id, order_id, provider, processed_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(providerEventId, orderId, provider, new Date().toISOString());
    return Number(res.changes || 0) === 1;
  }

  public hasPaymentEvent(providerEventId: string): boolean {
    const row = this.db
      .prepare(`SELECT provider_event_id FROM payment_events WHERE provider_event_id = ?`)
      .get(providerEventId);
    return Boolean(row);
  }

  // --- ATOMIC WALLET ACCOUNTS & LEDGER ---
  public ensureWalletAccount(cardId: string, initialBalance: number, currency = 'FCFA'): void {
    const now = new Date().toISOString();
    const safeBalance = Math.max(0, Math.floor(Number(initialBalance) || 0));
    this.db
      .prepare(
        `INSERT OR IGNORE INTO wallet_accounts (card_id, balance, currency, updated_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(cardId, safeBalance, currency || 'FCFA', now);
  }

  public getWalletAccount(cardId: string): { cardId: string; balance: number; currency: string; updatedAt: string } | null {
    const row = this.db
      .prepare(`SELECT card_id AS cardId, balance, currency, updated_at AS updatedAt FROM wallet_accounts WHERE card_id = ?`)
      .get(cardId) as { cardId: string; balance: number; currency: string; updatedAt: string } | undefined;
    return row ? { ...row, balance: Number(row.balance) } : null;
  }

  public atomicWalletCredit(params: {
    cardId: string;
    cardNumber: string;
    userId: string;
    chipUid?: string;
    amount: number;
    currency: string;
    location: string;
    terminalId: string;
    operatorName: string;
    idempotencyKey?: string;
  }): { balanceBefore: number; balanceAfter: number; transaction: WalletTransaction; deduplicated: boolean } {
    const amount = Math.floor(Number(params.amount));
    const idempotencyKey = String(params.idempotencyKey || '').trim();
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Le montant de recharge doit être un entier positif.');
    }
    if (!idempotencyKey || idempotencyKey.length > 128) {
      throw new Error('Une clé d’idempotence unique (1 à 128 caractères) est obligatoire.');
    }

    return this.runImmediateTransaction(() => {
      const existing = this.db
        .prepare(`SELECT * FROM wallet_ledger WHERE idempotency_key = ?`)
        .get(idempotencyKey) as any;
      if (existing) {
        if (existing.card_id !== params.cardId || Number(existing.amount) !== amount ||
            existing.type !== 'credit_recharge' || existing.currency !== (params.currency || 'FCFA')) {
          throw new Error('Conflit : cette clé d’idempotence a déjà été utilisée pour une autre opération.');
        }
        return {
            balanceBefore: Number(existing.balance_before),
            balanceAfter: Number(existing.balance_after),
            deduplicated: true,
            transaction: {
              id: existing.id,
              cardId: existing.card_id,
              cardNumber: params.cardNumber,
              userId: params.userId,
              chipUid: params.chipUid,
              type: existing.type,
              amount: Number(existing.amount),
              currency: existing.currency,
              balanceBefore: Number(existing.balance_before),
              balanceAfter: Number(existing.balance_after),
              locationOrService: existing.location,
              terminalId: existing.terminal_id,
              operatorName: existing.operator_name,
              status: 'completed',
              reference: existing.reference,
              createdAt: existing.created_at,
            },
          };
      }

      this.ensureWalletAccount(params.cardId, 0, params.currency);
      const acct = this.getWalletAccount(params.cardId)!;
      const balanceBefore = acct.balance;
      const now = new Date().toISOString();

      this.db
        .prepare(`UPDATE wallet_accounts SET balance = balance + ?, updated_at = ? WHERE card_id = ?`)
        .run(amount, now, params.cardId);

      const updatedAcct = this.getWalletAccount(params.cardId)!;
      const txId = `wtx_${crypto.randomBytes(6).toString('hex')}`;
      const ref = `RCH-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

      this.db
        .prepare(
          `INSERT INTO wallet_ledger (id, card_id, idempotency_key, type, amount, currency, balance_before, balance_after, location, terminal_id, operator_name, reference, created_at)
           VALUES (?, ?, ?, 'credit_recharge', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          txId,
          params.cardId,
          idempotencyKey,
          amount,
          params.currency || 'FCFA',
          balanceBefore,
          updatedAcct.balance,
          params.location,
          params.terminalId,
          params.operatorName,
          ref,
          now
        );

      const transaction: WalletTransaction = {
        id: txId,
        cardId: params.cardId,
        cardNumber: params.cardNumber,
        userId: params.userId,
        chipUid: params.chipUid,
        type: 'credit_recharge',
        amount,
        currency: params.currency || 'FCFA',
        balanceBefore,
        balanceAfter: updatedAcct.balance,
        locationOrService: params.location,
        terminalId: params.terminalId,
        operatorName: params.operatorName,
        status: 'completed',
        reference: ref,
        createdAt: now,
      };

      return { balanceBefore, balanceAfter: updatedAcct.balance, transaction, deduplicated: false };
    });
  }

  public atomicWalletDebit(params: {
    cardId: string;
    cardNumber: string;
    userId: string;
    chipUid?: string;
    amount: number;
    currency: string;
    location: string;
    terminalId: string;
    operatorName: string;
    idempotencyKey?: string;
  }): { balanceBefore: number; balanceAfter: number; transaction: WalletTransaction; deduplicated: boolean } {
    const amount = Math.floor(Number(params.amount));
    const idempotencyKey = String(params.idempotencyKey || '').trim();
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Le montant de débit doit être un entier positif.');
    }
    if (!idempotencyKey || idempotencyKey.length > 128) {
      throw new Error('Une clé d’idempotence unique (1 à 128 caractères) est obligatoire.');
    }

    return this.runImmediateTransaction(() => {
      const existing = this.db
        .prepare(`SELECT * FROM wallet_ledger WHERE idempotency_key = ?`)
        .get(idempotencyKey) as any;
      if (existing) {
        if (existing.card_id !== params.cardId || Number(existing.amount) !== amount ||
            existing.type !== 'debit_purchase' || existing.currency !== (params.currency || 'FCFA')) {
          throw new Error('Conflit : cette clé d’idempotence a déjà été utilisée pour une autre opération.');
        }
        return {
            balanceBefore: Number(existing.balance_before),
            balanceAfter: Number(existing.balance_after),
            deduplicated: true,
            transaction: {
              id: existing.id,
              cardId: existing.card_id,
              cardNumber: params.cardNumber,
              userId: params.userId,
              chipUid: params.chipUid,
              type: existing.type,
              amount: Number(existing.amount),
              currency: existing.currency,
              balanceBefore: Number(existing.balance_before),
              balanceAfter: Number(existing.balance_after),
              locationOrService: existing.location,
              terminalId: existing.terminal_id,
              operatorName: existing.operator_name,
              status: 'completed',
              reference: existing.reference,
              createdAt: existing.created_at,
            },
          };
      }

      this.ensureWalletAccount(params.cardId, 0, params.currency);
      const acct = this.getWalletAccount(params.cardId)!;
      const balanceBefore = acct.balance;
      const now = new Date().toISOString();

      const res = this.db
        .prepare(
          `UPDATE wallet_accounts
           SET balance = balance - ?, updated_at = ?
           WHERE card_id = ? AND balance >= ?`
        )
        .run(amount, now, params.cardId, amount);

      if (Number(res.changes || 0) !== 1) {
        throw new Error(
          `Solde insuffisant : Solde actuel ${balanceBefore.toLocaleString()} ${params.currency}, montant demandé ${amount.toLocaleString()} ${params.currency}.`
        );
      }

      const updatedAcct = this.getWalletAccount(params.cardId)!;
      const txId = `wtx_${crypto.randomBytes(6).toString('hex')}`;
      const ref = `DEBIT-POS-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

      this.db
        .prepare(
          `INSERT INTO wallet_ledger (id, card_id, idempotency_key, type, amount, currency, balance_before, balance_after, location, terminal_id, operator_name, reference, created_at)
           VALUES (?, ?, ?, 'debit_purchase', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          txId,
          params.cardId,
          idempotencyKey,
          amount,
          params.currency || 'FCFA',
          balanceBefore,
          updatedAcct.balance,
          params.location,
          params.terminalId,
          params.operatorName,
          ref,
          now
        );

      const transaction: WalletTransaction = {
        id: txId,
        cardId: params.cardId,
        cardNumber: params.cardNumber,
        userId: params.userId,
        chipUid: params.chipUid,
        type: 'debit_purchase',
        amount,
        currency: params.currency || 'FCFA',
        balanceBefore,
        balanceAfter: updatedAcct.balance,
        locationOrService: params.location,
        terminalId: params.terminalId,
        operatorName: params.operatorName,
        status: 'completed',
        reference: ref,
        createdAt: now,
      };

      return { balanceBefore, balanceAfter: updatedAcct.balance, transaction, deduplicated: false };
    });
  }

  public getWalletLedger(cardId?: string): Array<{
    id: string;
    cardId: string;
    type: WalletTransaction['type'];
    amount: number;
    currency: string;
    balanceBefore: number;
    balanceAfter: number;
    locationOrService: string;
    terminalId?: string;
    operatorName?: string;
    reference: string;
    createdAt: string;
  }> {
    const sql = cardId
      ? `SELECT id, card_id AS cardId, type, amount, currency, balance_before AS balanceBefore, balance_after AS balanceAfter,
                location AS locationOrService, terminal_id AS terminalId, operator_name AS operatorName, reference, created_at AS createdAt
         FROM wallet_ledger WHERE card_id = ? ORDER BY created_at DESC LIMIT 500`
      : `SELECT id, card_id AS cardId, type, amount, currency, balance_before AS balanceBefore, balance_after AS balanceAfter,
                location AS locationOrService, terminal_id AS terminalId, operator_name AS operatorName, reference, created_at AS createdAt
         FROM wallet_ledger ORDER BY created_at DESC LIMIT 500`;
    const rows = (cardId ? this.db.prepare(sql).all(cardId) : this.db.prepare(sql).all()) as any[];
    return rows.map((r) => ({
      ...r,
      amount: Number(r.amount),
      balanceBefore: Number(r.balanceBefore),
      balanceAfter: Number(r.balanceAfter),
    }));
  }

  // --- AUDIT LOG & RESET TOKENS & REPLAY GUARD ---
  public insertAuditLog(entry: Omit<AuditLogRecord, 'id' | 'createdAt'>): AuditLogRecord {
    const record: AuditLogRecord = {
      id: `aud_${crypto.randomBytes(8).toString('hex')}`,
      actorId: entry.actorId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      ip: entry.ip,
      details: entry.details,
      createdAt: new Date().toISOString(),
    };
    this.db
      .prepare(
        `INSERT INTO audit_log (id, actor_id, action, target_type, target_id, ip, details, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        record.id,
        record.actorId,
        record.action,
        record.targetType || null,
        record.targetId || null,
        record.ip || null,
        record.details || null,
        record.createdAt
      );
    return record;
  }

  public getAuditLogs(limit = 200): AuditLogRecord[] {
    return this.db
      .prepare(
        `SELECT id, actor_id AS actorId, action, target_type AS targetType, target_id AS targetId, ip, details, created_at AS createdAt
         FROM audit_log ORDER BY created_at DESC LIMIT ?`
      )
      .all(limit) as unknown as AuditLogRecord[];
  }

  public createPasswordResetToken(userId: string, tokenHash: string, expiresAt: string): void {
    const id = `prt_${crypto.randomBytes(6).toString('hex')}`;
    this.db
      .prepare(
        `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used_at, created_at)
         VALUES (?, ?, ?, ?, NULL, ?)`
      )
      .run(id, userId, tokenHash, expiresAt, new Date().toISOString());
  }

  public consumePasswordResetToken(tokenHash: string): { userId: string } | null {
    return this.runImmediateTransaction(() => {
      const row = this.db
        .prepare(
          `SELECT id, user_id AS userId, expires_at AS expiresAt, used_at AS usedAt
           FROM password_reset_tokens WHERE token_hash = ?`
        )
        .get(tokenHash) as { id: string; userId: string; expiresAt: string; usedAt: string | null } | undefined;
      if (!row || row.usedAt) return null;
      if (new Date(row.expiresAt).getTime() <= Date.now()) return null;
      this.db
        .prepare(`UPDATE password_reset_tokens SET used_at = ? WHERE id = ? AND used_at IS NULL`)
        .run(new Date().toISOString(), row.id);
      return { userId: row.userId };
    });
  }

  public checkAndRecordReplayNonce(nonce: string, ttlSeconds = 90): boolean {
    const nowSec = Math.floor(Date.now() / 1000);
    this.db.prepare(`DELETE FROM qr_replay_guard WHERE expires_at < ?`).run(nowSec);
    const res = this.db
      .prepare(`INSERT OR IGNORE INTO qr_replay_guard (nonce, expires_at) VALUES (?, ?)`)
      .run(nonce, nowSec + ttlSeconds);
    return Number(res.changes || 0) === 1;
  }

  // --- SCANNER SESSIONS ---
  public createScannerSession(params: {
    id: string;
    scannerTokenId: string;
    eventId: string;
    tokenHash: string;
    expiresAt: string;
  }): void {
    this.db
      .prepare(
        `INSERT INTO scanner_sessions (id, scanner_token_id, event_id, token_hash, created_at, expires_at, revoked_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL)`
      )
      .run(
        params.id,
        params.scannerTokenId,
        params.eventId,
        params.tokenHash,
        new Date().toISOString(),
        params.expiresAt
      );
  }

  public getActiveScannerSessionByTokenHash(tokenHash: string): {
    id: string;
    scannerTokenId: string;
    eventId: string;
    expiresAt: string;
  } | null {
    const row = this.db
      .prepare(
        `SELECT id, scanner_token_id AS scannerTokenId, event_id AS eventId, expires_at AS expiresAt, revoked_at AS revokedAt
         FROM scanner_sessions WHERE token_hash = ? AND revoked_at IS NULL`
      )
      .get(tokenHash) as
      | { id: string; scannerTokenId: string; eventId: string; expiresAt: string; revokedAt: string | null }
      | undefined;
    if (!row || row.revokedAt) return null;
    if (new Date(row.expiresAt).getTime() <= Date.now()) return null;
    return {
      id: row.id,
      scannerTokenId: row.scannerTokenId,
      eventId: row.eventId,
      expiresAt: row.expiresAt,
    };
  }

  public revokeScannerSessionByTokenHash(tokenHash: string): void {
    this.db
      .prepare(`UPDATE scanner_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL`)
      .run(new Date().toISOString(), tokenHash);
  }

  // --- ADMIN 2FA TOTP ---
  public upsertAdminTotpPending(userId: string, secretBase32: string): void {
    this.db
      .prepare(
        `INSERT INTO admin_totp (user_id, secret_base32, enabled, created_at, verified_at)
         VALUES (?, ?, 0, ?, NULL)
         ON CONFLICT(user_id) DO UPDATE SET
           secret_base32 = excluded.secret_base32,
           enabled = 0,
           created_at = excluded.created_at,
           verified_at = NULL`
      )
      .run(userId, secretBase32, new Date().toISOString());
  }

  public enableAdminTotp(userId: string): void {
    this.db
      .prepare(`UPDATE admin_totp SET enabled = 1, verified_at = ? WHERE user_id = ?`)
      .run(new Date().toISOString(), userId);
  }

  public getAdminTotp(userId: string): { userId: string; secretBase32: string; enabled: boolean } | null {
    const row = this.db
      .prepare(`SELECT user_id AS userId, secret_base32 AS secretBase32, enabled FROM admin_totp WHERE user_id = ?`)
      .get(userId) as { userId: string; secretBase32: string; enabled: number } | undefined;
    if (!row) return null;
    return {
      userId: row.userId,
      secretBase32: row.secretBase32,
      enabled: Number(row.enabled) === 1,
    };
  }

  public disableAdminTotp(userId: string): void {
    this.db.prepare(`DELETE FROM admin_totp WHERE user_id = ?`).run(userId);
  }
}

export const sqliteDb = new LumareelSqliteStore();
