import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  User,
  ConcertEvent,
  TicketCategory,
  Order,
  Ticket,
  ScanVerificationResult,
  ArchiveProduction,
  WorkProduction,
  TransactionalEmail,
  AdminStats,
  ExternalOrganizer,
  NewsArticle,
  ScannerToken,
  PlatformSettings,
} from '../types';

// Disk persistence data directory
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.warn('Could not create data directory:', e);
  }
}

// Curated atmospheric imagery fallbacks (high-definition SVG silhouettes and panoramic textures with zero broken links)
export const DEFAULT_IMAGES = {
  jeuneLionBanner: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23050505"/><stop offset="50%" stop-color="%23121212"/><stop offset="100%" stop-color="%23020202"/></linearGradient><radialGradient id="spot" cx="65%" cy="40%" r="50%"><stop offset="0%" stop-color="%23d4af37" stop-opacity="0.25"/><stop offset="60%" stop-color="%23ffffff" stop-opacity="0.05"/><stop offset="100%" stop-color="%23000000" stop-opacity="0"/></radialGradient></defs><rect width="1280" height="720" fill="url(%23bg)"/><circle cx="850" cy="360" r="420" fill="url(%23spot)"/><path d="M720,720 L820,380 L960,340 L1060,720 Z" fill="%23141414" opacity="0.8"/><text x="100" y="240" font-family="sans-serif" font-size="14" letter-spacing="6" fill="%23d4af37">PRODUIT PAR LUMARÉEL CO. · ABIDJAN</text><text x="100" y="340" font-family="sans-serif" font-weight="900" font-size="76" letter-spacing="-3" fill="%23ffffff">JEUNE LION</text><text x="100" y="400" font-family="sans-serif" font-weight="600" font-size="28" letter-spacing="4" fill="%23cccccc">LA GRANDE MESSE SCÉNIQUE</text><text x="100" y="470" font-family="sans-serif" font-size="16" letter-spacing="3" fill="%23888888">19 DÉC. 2026 · PALAIS DES CONGRÈS · SOFITEL IVOIRE</text></svg>',
  jeuneLionPoster: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="850" viewBox="0 0 600 850"><rect width="600" height="850" fill="%23050505"/><rect x="20" y="20" width="560" height="810" fill="none" stroke="%23222" stroke-width="1"/><text x="40" y="80" font-family="sans-serif" font-size="11" letter-spacing="4" fill="%23d4af37">LUMARÉEL CO. PRÉSENTE</text><text x="40" y="160" font-family="sans-serif" font-weight="900" font-size="52" letter-spacing="-2" fill="%23ffffff">JEUNE LION</text><text x="40" y="205" font-family="sans-serif" font-weight="600" font-size="18" letter-spacing="4" fill="%23aaa">EN CONCERT LIVE</text><line x1="40" y1="235" x2="560" y2="235" stroke="%23262626"/><rect x="40" y="270" width="520" height="360" fill="%230f0f0f"/><circle cx="300" cy="450" r="140" fill="%23d4af37" opacity="0.12"/><text x="300" y="460" font-family="sans-serif" font-weight="800" font-size="28" letter-spacing="6" fill="%23fff" text-anchor="middle">SOFITEL ABIDJAN</text><text x="40" y="700" font-family="sans-serif" font-weight="700" font-size="20" fill="%23fff">19 DÉCEMBRE 2026 · 20H30</text><text x="40" y="730" font-family="sans-serif" font-size="12" letter-spacing="2" fill="%23777">BILLETTERIE OFFICIELLE LUMARÉEL · JAUGE LIMITÉE</text></svg>',
  nocturneBanner: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs><linearGradient id="nb" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23020202"/><stop offset="50%" stop-color="%230a0a0a"/><stop offset="100%" stop-color="%23050505"/></linearGradient></defs><rect width="1280" height="720" fill="url(%23nb)"/><path d="M500,0 L780,0 L1100,720 L300,720 Z" fill="%23ffffff" opacity="0.04"/><text x="100" y="240" font-family="sans-serif" font-size="14" letter-spacing="6" fill="%23888888">PRODUIT PAR LUMARÉEL CO. · CRÉATION ORIGINALE</text><text x="100" y="340" font-family="sans-serif" font-weight="900" font-size="72" letter-spacing="-3" fill="%23ffffff">NOCTURNE V</text><text x="100" y="400" font-family="sans-serif" font-weight="600" font-size="26" letter-spacing="4" fill="%23aaaaaa">ANOMALIE ACOUSTIQUE &amp; OMBRES</text><text x="100" y="470" font-family="sans-serif" font-size="16" letter-spacing="3" fill="%23666666">14 NOV. 2026 · PARC DES EXPOSITIONS · ABIDJAN</text></svg>',
  nocturnePoster: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="850" viewBox="0 0 600 850"><rect width="600" height="850" fill="%23080808"/><rect x="20" y="20" width="560" height="810" fill="none" stroke="%23222" stroke-width="1"/><text x="40" y="80" font-family="sans-serif" font-size="11" letter-spacing="4" fill="%23888">LUMARÉEL CO. PRÉSENTE</text><text x="40" y="160" font-family="sans-serif" font-weight="900" font-size="50" letter-spacing="-2" fill="%23ffffff">NOCTURNE V</text><text x="40" y="205" font-family="sans-serif" font-weight="600" font-size="16" letter-spacing="4" fill="%23888">ANOMALIE ACOUSTIQUE</text><line x1="40" y1="235" x2="560" y2="235" stroke="%23222"/><rect x="40" y="270" width="520" height="360" fill="%23111"/><text x="300" y="460" font-family="sans-serif" font-weight="800" font-size="24" letter-spacing="6" fill="%23fff" text-anchor="middle">PARC DES EXPOSITIONS</text><text x="40" y="700" font-family="sans-serif" font-weight="700" font-size="20" fill="%23fff">14 NOVEMBRE 2026 · 20H30</text><text x="40" y="730" font-family="sans-serif" font-size="12" letter-spacing="2" fill="%23666">EXPÉRIENCE SPATIALISÉE 36 CANAUX · ACCÈS CONTRÔLÉ</text></svg>',
  letoBanner: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="%23060606"/><circle cx="950" cy="360" r="380" fill="%23181818"/><text x="100" y="240" font-family="sans-serif" font-size="14" letter-spacing="6" fill="%23777">ORGANISATEUR PARTENAIRE · DOPE MUSIC HUB</text><text x="100" y="340" font-family="sans-serif" font-weight="900" font-size="80" letter-spacing="-3" fill="%23ffffff">LETO &amp; AMIS</text><text x="100" y="400" font-family="sans-serif" font-weight="600" font-size="26" letter-spacing="4" fill="%23bbb">LIVE EXPERIENCE · TRAP &amp; DRILL MONUMENT</text><text x="100" y="470" font-family="sans-serif" font-size="16" letter-spacing="3" fill="%23777">28 DÉC. 2026 · PALAIS DE LA CULTURE · SALLE ANOUMABO</text></svg>',
  letoPoster: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="850" viewBox="0 0 600 850"><rect width="600" height="850" fill="%23080808"/><rect x="20" y="20" width="560" height="810" fill="none" stroke="%23222"/><text x="40" y="80" font-family="sans-serif" font-size="11" letter-spacing="4" fill="%23888">DOPE MUSIC HUB &amp; LUMARÉEL</text><text x="40" y="160" font-family="sans-serif" font-weight="900" font-size="54" letter-spacing="-2" fill="%23fff">LETO</text><text x="40" y="205" font-family="sans-serif" font-size="16" letter-spacing="3" fill="%23888">LIVE EXPERIENCE ABIDJAN</text><rect x="40" y="270" width="520" height="360" fill="%23121212"/><text x="300" y="460" font-family="sans-serif" font-weight="800" font-size="24" letter-spacing="6" fill="%23fff" text-anchor="middle">SALLE ANOUMABO</text><text x="40" y="700" font-family="sans-serif" font-weight="700" font-size="20" fill="%23fff">28 DÉCEMBRE 2026 · 21H00</text></svg>',
  asnaBanner: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="%23040404"/><path d="M400,720 Q700,200 1100,720 Z" fill="%23151515"/><text x="100" y="240" font-family="sans-serif" font-size="14" letter-spacing="6" fill="%23888">ORGANISATEUR PARTENAIRE · COLLECTIF NYOKOBOP</text><text x="100" y="340" font-family="sans-serif" font-weight="900" font-size="76" letter-spacing="-3" fill="%23ffffff">ASNA</text><text x="100" y="400" font-family="sans-serif" font-weight="600" font-size="26" letter-spacing="4" fill="%23aaa">TRANSCENDANCE RYTHMIQUE · ÉLECTRO-AFRO</text><text x="100" y="470" font-family="sans-serif" font-size="16" letter-spacing="3" fill="%23777">05 DÉC. 2026 · INSTITUT FRANÇAIS · THÉÂTRE DE VERDURE</text></svg>',
  asnaPoster: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="850" viewBox="0 0 600 850"><rect width="600" height="850" fill="%23060606"/><rect x="20" y="20" width="560" height="810" fill="none" stroke="%23222"/><text x="40" y="80" font-family="sans-serif" font-size="11" letter-spacing="4" fill="%23888">COLLECTIF NYOKOBOP</text><text x="40" y="160" font-family="sans-serif" font-weight="900" font-size="52" fill="%23fff">ASNA</text><text x="40" y="205" font-family="sans-serif" font-size="16" letter-spacing="3" fill="%23777">CLUB NOIR &amp; RYTHMES BRUTS</text><rect x="40" y="270" width="520" height="360" fill="%23101010"/><text x="300" y="460" font-family="sans-serif" font-weight="800" font-size="22" letter-spacing="4" fill="%23fff" text-anchor="middle">INSTITUT FRANÇAIS ABIDJAN</text><text x="40" y="700" font-family="sans-serif" font-weight="700" font-size="20" fill="%23fff">05 DÉCEMBRE 2026 · 22H00</text></svg>',
  didiBBanner: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="%23050505"/><rect x="800" y="150" width="380" height="450" fill="%23121212"/><text x="100" y="240" font-family="sans-serif" font-size="14" letter-spacing="6" fill="%23888">ORGANISATEUR PARTENAIRE · COASTLINE EVENTS</text><text x="100" y="340" font-family="sans-serif" font-weight="900" font-size="80" letter-spacing="-3" fill="%23ffffff">DIDI B</text><text x="100" y="400" font-family="sans-serif" font-weight="600" font-size="26" letter-spacing="4" fill="%23bbb">MOJO STADIUM LIVE · SCÈNE MONUMENTALE</text><text x="100" y="470" font-family="sans-serif" font-size="16" letter-spacing="3" fill="%23777">30 JANV. 2027 · STADE FÉLIX HOUPHOUËT-BOIGNY · ABIDJAN</text></svg>',
  didiBPoster: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="850" viewBox="0 0 600 850"><rect width="600" height="850" fill="%23070707"/><rect x="20" y="20" width="560" height="810" fill="none" stroke="%23222"/><text x="40" y="80" font-family="sans-serif" font-size="11" letter-spacing="4" fill="%23888">COASTLINE EVENTS</text><text x="40" y="160" font-family="sans-serif" font-weight="900" font-size="54" fill="%23fff">DIDI B</text><text x="40" y="205" font-family="sans-serif" font-size="16" letter-spacing="3" fill="%23777">MOJO STADIUM</text><rect x="40" y="270" width="520" height="360" fill="%23111"/><text x="300" y="460" font-family="sans-serif" font-weight="800" font-size="22" letter-spacing="4" fill="%23fff" text-anchor="middle">STADE FHB ABIDJAN</text><text x="40" y="700" font-family="sans-serif" font-weight="700" font-size="20" fill="%23fff">30 JANVIER 2027 · 19H00</text></svg>',
  archiveCover: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="%23121212"/><rect x="40" y="40" width="720" height="520" fill="none" stroke="%23222" stroke-width="1"/><text x="400" y="300" font-family="sans-serif" font-size="24" letter-spacing="6" fill="%23888" text-anchor="middle">TRK EN CONCERT</text><text x="400" y="340" font-family="sans-serif" font-size="12" letter-spacing="4" fill="%23555" text-anchor="middle">SOFITEL IVOIRE · 18 JUILLET 2026</text></svg>',
  workCover: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600"><rect width="900" height="600" fill="%230f0f0f"/><circle cx="450" cy="300" r="180" fill="none" stroke="%23333" stroke-width="1.5"/><text x="450" y="305" font-family="sans-serif" font-size="13" letter-spacing="5" fill="%23888" text-anchor="middle">SCÉNOGRAPHIE LUMINEUSE 360°</text></svg>',
  newsJeuneLion: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="%230c0c0c"/><circle cx="400" cy="225" r="120" fill="%23d4af37" opacity="0.15"/><text x="400" y="235" font-family="sans-serif" font-size="20" letter-spacing="4" fill="%23ffffff" text-anchor="middle">COMMUNIQUÉ OFFICIEL</text></svg>',
  newsMarketplace: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="%230a0a0a"/><rect x="100" y="100" width="600" height="250" fill="none" stroke="%23222"/><text x="400" y="235" font-family="sans-serif" font-size="18" letter-spacing="4" fill="%23ffffff" text-anchor="middle">BILLETTERIE MARKETPLACE PARTENAIRES</text></svg>',
};

// Initial in-memory database store with disk persistence
class LumareelDatabase {
  private users: Map<string, User> = new Map();
  private events: Map<string, ConcertEvent> = new Map();
  private orders: Map<string, Order> = new Map();
  private tickets: Map<string, Ticket> = new Map();
  private archives: Map<string, ArchiveProduction> = new Map();
  private works: Map<string, WorkProduction> = new Map();
  private organizers: Map<string, ExternalOrganizer> = new Map();
  private scannerTokens: Map<string, ScannerToken> = new Map();
  private newsArticles: NewsArticle[] = [];
  private emails: TransactionalEmail[] = [];
  private settings: PlatformSettings = {
    platformName: 'LUMARÉEL',
    tagline: 'CO.',
    logoMonogram: 'LR',
    logoUrl: '',
    currency: 'FCFA',
    infoline: '+225 01 53 508 210',
    gateToken: 'VIGILE_AUTH_LMR_2026',
    githubRepoUrl: '',
  };
  private checkInLogs: Array<{
    id: string;
    ticketId: string;
    eventId: string;
    gateAgentId: string;
    result: string;
    timestamp: string;
  }> = [];

  constructor() {
    this.seedInitialData();
    this.loadEventsFromDisk();
    this.loadArchivesFromDisk();
    this.loadOrdersFromDisk();
    this.loadScannerTokensFromDisk();
    this.loadSettingsFromDisk();
  }

  // --- DISK PERSISTENCE ENGINE ---
  private saveEventsToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      const list = this.getAllEvents();
      fs.writeFileSync(path.join(DATA_DIR, 'events.json'), JSON.stringify(list, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to save events to disk', e);
    }
  }

  private loadEventsFromDisk() {
    try {
      const file = path.join(DATA_DIR, 'events.json');
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf-8');
        const list: ConcertEvent[] = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) {
          this.events.clear();
          for (const ev of list) {
            this.events.set(ev.id, ev);
            if (ev.slug) this.events.set(ev.slug, ev);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load events from disk', e);
    }
  }

  private saveArchivesToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      const list = this.getAllArchives(true);
      fs.writeFileSync(path.join(DATA_DIR, 'archives.json'), JSON.stringify(list, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to save archives to disk', e);
    }
  }

  private loadArchivesFromDisk() {
    try {
      const file = path.join(DATA_DIR, 'archives.json');
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf-8');
        const list: ArchiveProduction[] = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) {
          this.archives.clear();
          for (const arc of list) {
            this.archives.set(arc.id, arc);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load archives from disk', e);
    }
  }

  private saveOrdersToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      const list = this.getAllOrders();
      fs.writeFileSync(path.join(DATA_DIR, 'orders.json'), JSON.stringify(list, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to save orders to disk', e);
    }
  }

  private loadOrdersFromDisk() {
    try {
      const file = path.join(DATA_DIR, 'orders.json');
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf-8');
        const list: Order[] = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) {
          for (const ord of list) {
            this.orders.set(ord.id, ord);
            this.orders.set(ord.reference, ord);
            if (ord.tickets) {
              for (const t of ord.tickets) {
                this.tickets.set(t.id, t);
                this.tickets.set(t.token, t);
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load orders from disk', e);
    }
  }

  private saveScannerTokensToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      const list = Array.from(this.scannerTokens.values());
      fs.writeFileSync(path.join(DATA_DIR, 'scanner_tokens.json'), JSON.stringify(list, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to save scanner tokens to disk', e);
    }
  }

  private loadScannerTokensFromDisk() {
    try {
      const file = path.join(DATA_DIR, 'scanner_tokens.json');
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf-8');
        const list: ScannerToken[] = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) {
          for (const t of list) {
            this.scannerTokens.set(t.token, t);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load scanner tokens from disk', e);
    }
  }

  private saveSettingsToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(path.join(DATA_DIR, 'settings.json'), JSON.stringify(this.settings, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to save settings to disk', e);
    }
  }

  private loadSettingsFromDisk() {
    try {
      const file = path.join(DATA_DIR, 'settings.json');
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf-8');
        const saved = JSON.parse(raw);
        if (saved && typeof saved === 'object') {
          this.settings = { ...this.settings, ...saved };
        }
      }
    } catch (e) {
      console.warn('Failed to load settings from disk', e);
    }
  }

  public getSettings(): PlatformSettings {
    return { ...this.settings };
  }

  public updateSettings(data: Partial<PlatformSettings>): PlatformSettings {
    this.settings = { ...this.settings, ...data };
    this.saveSettingsToDisk();
    return { ...this.settings };
  }

  private seedInitialData() {
    // 1. Initial Users
    const adminUser: User = {
      id: 'usr_admin_01',
      email: 'bienaodylan428@gmail.com',
      name: 'Directeur Artistique & Production',
      role: 'super_admin',
      emailVerified: true,
      createdAt: '2026-01-10T00:00:00Z',
    };
    const gateAgent: User = {
      id: 'usr_agent_01',
      email: 'scanner.porte1@lumareel.co',
      name: 'Agent Contrôle — Porte Ouest',
      role: 'gate_agent',
      emailVerified: true,
      createdAt: '2026-02-15T00:00:00Z',
    };
    const clientUser: User = {
      id: 'usr_client_01',
      email: 'collecteur@lumareel.co',
      name: 'Alexandre V.',
      role: 'customer',
      emailVerified: true,
      createdAt: '2026-03-01T00:00:00Z',
    };
    this.users.set(adminUser.id, adminUser);
    this.users.set(adminUser.email, adminUser);
    this.users.set(gateAgent.id, gateAgent);
    this.users.set(gateAgent.email, gateAgent);
    this.users.set(clientUser.id, clientUser);
    this.users.set(clientUser.email, clientUser);

    // 2. Initial Partner Organizers
    const orgDope: ExternalOrganizer = {
      id: 'org_dope_music',
      companyName: 'Dope Music Hub Paris',
      contactName: 'Malik Diop',
      email: 'contact@dopemusic.fr',
      phone: '+33 6 42 18 99 00',
      city: 'Paris / Abidjan',
      country: 'France / Côte d’Ivoire',
      status: 'approved',
      eventsCount: 1,
      commissionRate: 5.0,
      createdAt: '2026-04-12T10:00:00Z',
    };

    const orgNyokobop: ExternalOrganizer = {
      id: 'org_nyokobop',
      companyName: 'Collectif Nyokobop',
      contactName: 'Camille N.',
      email: 'live@nyokobop.org',
      phone: '+225 07 88 12 45 78',
      city: 'Abidjan',
      country: 'Côte d’Ivoire',
      status: 'approved',
      eventsCount: 1,
      commissionRate: 5.0,
      createdAt: '2026-05-20T14:30:00Z',
    };

    const orgCoastline: ExternalOrganizer = {
      id: 'org_coastline',
      companyName: 'Coastline Events',
      contactName: 'Stéphane Kouassi',
      email: 'booking@coastline.ci',
      phone: '+225 05 44 21 00 11',
      city: 'Abidjan',
      country: 'Côte d’Ivoire',
      status: 'approved',
      eventsCount: 1,
      commissionRate: 6.0,
      createdAt: '2026-06-01T09:15:00Z',
    };

    this.organizers.set(orgDope.id, orgDope);
    this.organizers.set(orgNyokobop.id, orgNyokobop);
    this.organizers.set(orgCoastline.id, orgCoastline);

    // 3. Featured Upcoming Concerts : Exact 4 Artists provided by user from official posters
    // 1. Jeune Lion (19 Décembre 2026)
    const jeuneLionCategories: TicketCategory[] = [
      {
        id: 'cat_jl_gp',
        name: 'PASS GP',
        price: 10000,
        currency: 'FCFA',
        quota: 3500,
        sold: 0,
        description: 'Accès Fosse Générale Esplanade plein-pied au pied de la scène.',
        perks: ['Entrée Fosse GP', 'Accès buvettes & stands'],
      },
      {
        id: 'cat_jl_vip',
        name: 'PASS VIP',
        price: 20000,
        currency: 'FCFA',
        quota: 1000,
        sold: 0,
        description: 'Emplacement privilégié surélevé, vue panoramique et acoustique renforcée.',
        perks: ['Entrée prioritaire VIP', 'Vue centrale surélevée', 'Badge collector'],
      },
      {
        id: 'cat_jl_vvip',
        name: 'PASS VVIP',
        price: 40000,
        currency: 'FCFA',
        quota: 300,
        sold: 0,
        description: 'Salon prestige privatif, cocktail dînatoire & coupe-file officiel.',
        perks: ['Accès salon VIP', 'Cocktail prestige', 'Place premier rang', 'Hôte dédié'],
      },
    ];

    const eventJeuneLion: ConcertEvent = {
      id: 'evt_jeune_lion',
      slug: 'jeune-lion-en-concert',
      title: 'JEUNE LION EN CONCERT',
      subtitle: 'La grande messe scénique d’Abidjan · Esplanade Palais de la Culture',
      artist: 'JEUNE LION',
      date: '2026-12-19',
      time: '15:00',
      doorsOpen: '13:30',
      venue: 'Esplanade du Palais de la Culture',
      city: 'Abidjan',
      country: 'Côte d’Ivoire',
      address: 'Palais de la Culture Bernard Binlin-Dadié, Treichville, Abidjan',
      description: 'Une communion scénique monumentale. Jeune Lion investit l’Esplanade du Palais de la Culture avec une direction artistique et une scénographie d’ombres et de faisceaux signée LUMARÉEL CO.',
      artistPortrait: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36__3__e428cb5c.jpeg',
      officialPoster: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31__2__4a5b834d.jpeg',
      bannerImage: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31__2__4a5b834d.jpeg',
      status: 'published',
      isFeatured: true,
      organizerType: 'lumareel',
      organizerName: 'LUMARÉEL CO.',
      genre: 'Rap / Drill Ivoire',
      platformFeePercent: 0,
      infoline: '+225 07 03 847 316 / +225 05 05 227 122',
      categories: jeuneLionCategories,
    };

    // 2. Tiakola (20 Décembre 2026)
    const tiakolaCategories: TicketCategory[] = [
      {
        id: 'cat_tiakola_cat1',
        name: 'CATÉGORIE 1',
        price: 10000,
        currency: 'FCFA',
        quota: 5000,
        sold: 0,
        description: 'Accès plain-pied fosse Parc des Expositions.',
        perks: ['Entrée fosse', 'Accès zone scénique'],
      },
      {
        id: 'cat_tiakola_or',
        name: 'CARRÉ OR',
        price: 20000,
        currency: 'FCFA',
        quota: 1500,
        sold: 0,
        description: 'Zone privilégiée en élévation, acoustique spatiale renforcée.',
        perks: ['Coupe-file', 'Tribune Or réservée', 'Badge collector'],
      },
      {
        id: 'cat_tiakola_vip',
        name: 'VIP',
        price: 50000,
        currency: 'FCFA',
        quota: 400,
        sold: 0,
        description: 'Loge VIP avec champagne, service cocktail & rencontre backstage.',
        perks: ['Loge VIP', 'Champagne & buffet', 'Pass backstage officiel'],
      },
    ];

    const eventTiakola: ConcertEvent = {
      id: 'evt_tiakola',
      slug: 'tiakola-mpoint-m-abidjan',
      title: 'TIAKOLA — M’POINT M ABIDJAN',
      subtitle: 'Le concert événement au Parc des Expositions d’Abidjan',
      artist: 'TIAKOLA',
      date: '2026-12-20',
      time: '14:00',
      doorsOpen: '12:30',
      venue: 'Parc des Expositions d’Abidjan',
      city: 'Abidjan',
      country: 'Côte d’Ivoire',
      address: 'Route de l’Aéroport International Félix Houphouët-Boigny, Port-Bouët',
      description: 'Le prodige de la mélo débarque à Abidjan pour une date historique. Le spectacle M’POINT M s’installe au Parc des Expositions pour une communion explosive devant plus de 10 000 spectateurs.',
      artistPortrait: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36__2__2459f9b9.jpeg',
      officialPoster: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31_ef0db41e.jpeg',
      bannerImage: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31_ef0db41e.jpeg',
      status: 'published',
      isFeatured: true,
      organizerType: 'lumareel',
      organizerName: 'LUMARÉEL CO.',
      genre: 'Mélodie / Rap Français',
      platformFeePercent: 0,
      infoline: '+225 07 78 78 41 78',
      categories: tiakolaCategories,
    };

    // 3. Wantché (23 Décembre 2026)
    const wantcheCategories: TicketCategory[] = [
      {
        id: 'cat_wantche_gp',
        name: 'PASS GP',
        price: 10000,
        currency: 'FCFA',
        quota: 3000,
        sold: 0,
        description: 'Accès fosse centrale Esplanade du Palais de la Culture.',
        perks: ['Entrée Fosse GP', 'Accès direct stands'],
      },
      {
        id: 'cat_wantche_vip',
        name: 'PASS VIP',
        price: 20000,
        currency: 'FCFA',
        quota: 800,
        sold: 0,
        description: 'Zone VIP surélevée, acoustique haute précision & visibilité totale.',
        perks: ['Coupe-file', 'Tribune VIP réservée', 'Badge collector'],
      },
      {
        id: 'cat_wantche_vvip',
        name: 'PASS VVIP',
        price: 40000,
        currency: 'FCFA',
        quota: 250,
        sold: 0,
        description: 'Expérience prestige VVIP avec salon dînatoire & accès privilégié.',
        perks: ['Accès salon VVIP', 'Cocktail signature', 'Place premier rang', 'Hôte dédié'],
      },
    ];

    const eventWantche: ConcertEvent = {
      id: 'evt_wantche',
      slug: 'wantche-en-concert',
      title: 'WANTCHÉ EN CONCERT',
      subtitle: 'Esplanade du Palais de la Culture d’Abidjan · 23 Décembre 2026',
      artist: 'WANTCHÉ',
      date: '2026-12-23',
      time: '16:00',
      doorsOpen: '14:30',
      venue: 'Esplanade du Palais de la Culture d’Abidjan',
      city: 'Abidjan',
      country: 'Côte d’Ivoire',
      address: 'Boulevard Hassan II, Treichville, Abidjan',
      description: 'Une intensité scénique rare. Wantché s’empare de l’Esplanade avec une énergie volcanique, fusionnant rythmes bruts et scénographie visuelle conçue par LUMARÉEL CO.',
      artistPortrait: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36__1__5dc7b4f5.jpeg',
      officialPoster: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.30_0f827a3a.jpeg',
      bannerImage: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.30_0f827a3a.jpeg',
      status: 'published',
      isFeatured: true,
      organizerType: 'lumareel',
      organizerName: 'LUMARÉEL CO.',
      genre: 'Afro-Trap / Nouvelle Vague',
      platformFeePercent: 0,
      infoline: '+225 01 53 508 210',
      categories: wantcheCategories,
    };

    // 4. Jamsco (30 Décembre 2026)
    const jamscoCategories: TicketCategory[] = [
      {
        id: 'cat_jamsco_gp',
        name: 'PASS GP',
        price: 10000,
        currency: 'FCFA',
        quota: 2500,
        sold: 0,
        description: 'Accès Fosse Générale Palais de la Culture Salle Lougah François.',
        perks: ['Entrée Fosse GP', 'Accès zone scénique'],
      },
      {
        id: 'cat_jamsco_vip',
        name: 'PASS VIP',
        price: 30000,
        currency: 'FCFA',
        quota: 600,
        sold: 0,
        description: 'Carré VIP prestige en tribune d’honneur Salle Lougah François.',
        perks: ['Accès prioritaire VIP', 'Tribune réservée', 'Cocktail signature'],
      },
    ];

    const eventJamsco: ConcertEvent = {
      id: 'evt_jamsco',
      slug: 'jamsco-en-concert',
      title: 'JAMSCO EN CONCERT',
      subtitle: 'Palais de la Culture Salle Lougah François · 30 Décembre 2026',
      artist: 'JAMSCO',
      date: '2026-12-30',
      time: '15:00',
      doorsOpen: '13:30',
      venue: 'Palais de la Culture Salle Lougah François',
      city: 'Abidjan',
      country: 'Côte d’Ivoire',
      address: 'Boulevard Hassan II, Treichville, Abidjan',
      description: 'Le couronnement scénique de Jamsco. Une scénographie royale signée LUMARÉEL CO. et un spectacle d’une envergure totale dans la mythique salle Lougah François.',
      artistPortrait: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36_70028046.jpeg',
      officialPoster: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31__1__b3fd3b01.jpeg',
      bannerImage: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31__1__b3fd3b01.jpeg',
      status: 'published',
      isFeatured: true,
      organizerType: 'lumareel',
      organizerName: 'LUMARÉEL CO.',
      genre: 'Afro-Rap / Live Show',
      platformFeePercent: 0,
      infoline: '+225 07 87 37 83 26',
      categories: jamscoCategories,
    };

    this.events.set(eventJeuneLion.id, eventJeuneLion);
    this.events.set(eventJeuneLion.slug, eventJeuneLion);
    this.events.set(eventTiakola.id, eventTiakola);
    this.events.set(eventTiakola.slug, eventTiakola);
    this.events.set(eventWantche.id, eventWantche);
    this.events.set(eventWantche.slug, eventWantche);
    this.events.set(eventJamsco.id, eventJamsco);
    this.events.set(eventJamsco.slug, eventJamsco);
    this.events.set(eventJamsco.id, eventJamsco);
    this.events.set(eventJamsco.slug, eventJamsco);

    // 4. Initial News Articles
    this.newsArticles = [
      {
        id: 'news_01',
        slug: 'billetterie-jeune-lion-ouverte',
        title: 'Ouverture officielle de la billetterie pour Jeune Lion au Sofitel Hôtel Ivoire',
        category: 'BILLETTERIE',
        date: '2026-10-25',
        summary: 'Les quotas pour les catégories Fosse et Carré Or sont désormais disponibles à l’achat. Jauge stricte de 930 places.',
        content: 'LUMARÉEL CO. annonce l’ouverture des ventes pour la messe scénique de Jeune Lion. Pour garantir l’intégrité acoustique du Palais des Congrès, aucun billet supplémentaire ne sera mis en vente une fois les quotas atteints.',
        imageUrl: DEFAULT_IMAGES.newsJeuneLion,
        readTime: '2 min',
        author: 'Rédaction LUMARÉEL',
      },
      {
        id: 'news_02',
        slug: 'ouverture-marketplace-organisateurs',
        title: 'LUMARÉEL ouvre sa plateforme aux organisateurs et labels indépendants',
        category: 'PLATEFORME',
        date: '2026-10-18',
        summary: 'Dope Music Hub et le collectif Nyokobop rejoignent les premiers partenaires à déployer leurs billetteries avec notre protocole inviolable.',
        content: 'Désormais, les promoteurs et labels indépendants peuvent postuler pour diffuser et commercialiser leurs événements via l’infrastructure technologique de LUMARÉEL.',
        imageUrl: DEFAULT_IMAGES.newsMarketplace,
        readTime: '3 min',
        author: 'Direction Technique',
      },
      {
        id: 'news_03',
        slug: 'acoustique-spatiale-nocturne-v',
        title: 'Spatialisation 36 canaux : les coulisses de la scénographie de Nocturne V',
        category: 'INGÉNIERIE SCÉNIQUE',
        date: '2026-10-04',
        summary: 'Comment les ingénieurs sonores de LUMARÉEL ont transformé le Hall 1 du Parc des Expositions en nef acoustique immersive.',
        content: 'Découvrez le protocole de diffusion sonore déployé pour le concert de Kazé et l’Orchestre Obsidien.',
        imageUrl: DEFAULT_IMAGES.nocturneBanner,
        readTime: '4 min',
        author: 'Studio d’Ingénierie',
      },
    ];

    // 4. Initial Verified Order & Tickets (for demonstration and scan testing)
    const seedOrderRef = 'LMR-CMD-8832';
    const seedOrderId = 'ord_seed_01';
    const seedOrder: Order = {
      id: seedOrderId,
      reference: seedOrderRef,
      customerId: clientUser.id,
      customerName: clientUser.name,
      customerEmail: clientUser.email,
      customerPhone: '+225 07 00 11 22 33',
      eventId: eventWantche.id,
      eventTitle: eventWantche.title,
      eventDate: eventWantche.date,
      eventVenue: eventWantche.venue,
      categoryId: 'cat_wantche_vibration',
      categoryName: 'FOSSE VIBRATION',
      quantity: 2,
      unitPrice: 15000,
      totalAmount: 30000,
      currency: 'FCFA',
      paymentStatus: 'completed',
      paymentProvider: 'geniuspay',
      paymentRef: 'gp_tx_live_99217834',
      createdAt: '2026-10-20T14:22:00Z',
      paidAt: '2026-10-20T14:24:12Z',
    };

    const ticket1: Ticket = {
      id: 'tkt_demo_01',
      orderId: seedOrderId,
      orderRef: seedOrderRef,
      eventId: eventWantche.id,
      eventTitle: eventWantche.title,
      eventDate: eventWantche.date,
      eventTime: eventWantche.time,
      eventVenue: eventWantche.venue,
      categoryId: 'cat_wantche_vibration',
      categoryName: 'FOSSE VIBRATION',
      serialNumber: 'LMR-2026-WAN-4821',
      token: 'TKT_SEC_98A4F1E08C3B127',
      holderName: 'Alexandre V. (Billet 1/2)',
      holderEmail: clientUser.email,
      status: 'valid',
      issuedAt: '2026-10-20T14:24:12Z',
    };

    const ticket2: Ticket = {
      id: 'tkt_demo_02',
      orderId: seedOrderId,
      orderRef: seedOrderRef,
      eventId: eventWantche.id,
      eventTitle: eventWantche.title,
      eventDate: eventWantche.date,
      eventTime: eventWantche.time,
      eventVenue: eventWantche.venue,
      categoryId: 'cat_wantche_vibration',
      categoryName: 'FOSSE VIBRATION',
      serialNumber: 'LMR-2026-WAN-4822',
      token: 'TKT_SEC_B24CD77382EF091',
      holderName: 'Alexandre V. (Billet 2/2)',
      holderEmail: clientUser.email,
      status: 'used',
      issuedAt: '2026-10-20T14:24:12Z',
      checkedInAt: '2026-10-25T19:45:00Z',
      checkedInBy: 'Agent #Porte-Ouest',
    };

    this.orders.set(seedOrderId, seedOrder);
    this.tickets.set(ticket1.id, ticket1);
    this.tickets.set(ticket1.token, ticket1);
    this.tickets.set(ticket2.id, ticket2);
    this.tickets.set(ticket2.token, ticket2);

    // 5. Initial Archives (Matches user screenshot: TRK, Dopelym, Leto)
    const archive1: ArchiveProduction = {
      id: 'arc_trk',
      title: 'TRK en concert',
      year: '2026',
      city: 'Abidjan',
      country: 'Côte d’Ivoire',
      venue: 'Palais des Congrès du Sofitel Hôtel Ivoire',
      artists: ['TRK', 'INVITÉS EXCLUSIFS'],
      coverImage: DEFAULT_IMAGES.archiveCover,
      description: 'Palais des Congrès du Sofitel Hôtel Ivoire, soirée live organisée par LUMAREEL CO.',
      photos: [DEFAULT_IMAGES.archiveCover],
      isPublished: true,
      orderIndex: 1,
    };

    const archive2: ArchiveProduction = {
      id: 'arc_dopelym',
      title: 'Dopelym en concert',
      year: '2026',
      city: 'Abidjan',
      country: 'Côte d’Ivoire',
      venue: 'Hall 1 du Parc des Expositions d’Abidjan',
      artists: ['Dopelym', 'SCÈNE ÉLECTRO-RAP XXL'],
      coverImage: DEFAULT_IMAGES.archiveCover,
      description: 'Hall 1 du Parc des Expositions d’Abidjan, un show électro-rap sur une scène XXL.',
      photos: [DEFAULT_IMAGES.archiveCover],
      isPublished: true,
      orderIndex: 2,
    };

    const archive3: ArchiveProduction = {
      id: 'arc_leto',
      title: 'Leto en concert',
      year: '2023',
      city: 'Abidjan',
      country: 'Côte d’Ivoire',
      venue: 'Lycée Classique d’Abidjan',
      artists: ['Leto', 'LUMARÉEL ORCHESTRATION'],
      coverImage: DEFAULT_IMAGES.archiveCover,
      description: 'Lycée Classique d’Abidjan, la soirée fondatrice qui a posé la signature scénique de LUMAREEL CO.',
      photos: [DEFAULT_IMAGES.archiveCover],
      isPublished: true,
      orderIndex: 3,
    };

    this.archives.set(archive1.id, archive1);
    this.archives.set(archive2.id, archive2);
    this.archives.set(archive3.id, archive3);

    // 6. Initial Works
    const work1: WorkProduction = {
      id: 'wrk_01',
      title: 'Scénographie Lumineuse & Acoustique 360°',
      client: 'Fondation Contemporaine & LUMARÉEL Studio',
      year: '2025',
      scope: 'Conception spatiale, ingénierie de diffusion acoustique & programmation DMX',
      description: 'Conception intégrale d’un anneau d’éclairage cinétique synchronisé en microsecondes avec les impulsions sonores.',
      imageUrl: DEFAULT_IMAGES.workCover,
    };

    const work2: WorkProduction = {
      id: 'wrk_02',
      title: 'Direction Artistique & Production Live — Éclipse Tour',
      client: 'KAZÉ x Éditions Obscures',
      year: '2024 — 2025',
      scope: 'Direction créative, scénographie, régie générale et billetterie exclusive',
      description: 'Coordination de 7 représentations uniques dans des lieux atypiques à travers l’Afrique de l’Ouest et l’Europe.',
      imageUrl: DEFAULT_IMAGES.workCover,
    };

    this.works.set(work1.id, work1);
    this.works.set(work2.id, work2);

    // 7. Seed Sample Tickets for Immediate Gate Scanner Testing
    const testValidTicket: Ticket = {
      id: 'tkt_lion_vip_991',
      orderId: 'ord_demo_01',
      orderRef: 'LMR-CMD-88310',
      eventId: 'evt_jeune_lion',
      eventTitle: 'JEUNE LION EN CONCERT',
      eventDate: '2026-12-19',
      eventTime: '15:00',
      eventVenue: 'Esplanade du Palais de la Culture Bernard Binlin-Dadié, Abidjan',
      categoryId: 'cat_jeune_lion_vip',
      categoryName: 'PASS VIP PRESTIGE',
      serialNumber: 'LMR-2026-JEU-8891',
      token: 'TKT_SEC_LION_VIP_991',
      holderName: 'Alexandre V. (Collecteur LUMARÉEL)',
      holderEmail: 'collecteur@lumareel.co',
      status: 'valid',
      issuedAt: '2026-10-25T14:30:00Z',
    };

    const testUsedTicket: Ticket = {
      id: 'tkt_tiakola_used_01',
      orderId: 'ord_demo_02',
      orderRef: 'LMR-CMD-44102',
      eventId: 'evt_tiakola',
      eventTitle: 'TIAKOLA — M’POINT M ABIDJAN',
      eventDate: '2026-12-20',
      eventTime: '14:00',
      eventVenue: 'Parc des Expositions d’Abidjan',
      categoryId: 'cat_tiakola_or',
      categoryName: 'CARRÉ OR',
      serialNumber: 'LMR-2026-TIA-4412',
      token: 'TKT_SEC_TIAKOLA_USED_01',
      holderName: 'Kouassi Dylan',
      holderEmail: 'dylan.k@gmail.com',
      status: 'used',
      issuedAt: '2026-10-26T10:00:00Z',
      checkedInAt: '2026-10-28T13:45:12Z',
      checkedInBy: 'Vigile Entrée A',
    };

    this.tickets.set(testValidTicket.id, testValidTicket);
    this.tickets.set(testValidTicket.token, testValidTicket);
    this.tickets.set(testUsedTicket.id, testUsedTicket);
    this.tickets.set(testUsedTicket.token, testUsedTicket);

    // 8. Seed Demo Magic Link Scanner Token for testing
    const demoScannerToken: ScannerToken = {
      id: 'sct_demo_lion',
      token: 'SEC_VGL_DEMO_JEUNELION2026',
      eventId: 'evt_jeune_lion',
      eventTitle: 'JEUNE LION EN CONCERT',
      artistName: 'JEUNE LION',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      createdBy: 'Direction LUMARÉEL CO.',
      revoked: false,
    };
    this.scannerTokens.set(demoScannerToken.token, demoScannerToken);
    this.scannerTokens.set(demoScannerToken.id, demoScannerToken);
  }

  // User management
  public getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  public getUserByEmail(email: string): User | undefined {
    const user = this.users.get(email.toLowerCase());
    if (user && user.email.toLowerCase() === 'bienaodylan428@gmail.com') {
      user.role = 'super_admin';
    }
    return user;
  }

  public registerUser(name: string, email: string, role: User['role'] = 'customer'): User {
    const existing = this.getUserByEmail(email);
    if (existing) {
      if (email.toLowerCase() === 'bienaodylan428@gmail.com') {
        existing.role = 'super_admin';
      }
      return existing;
    }

    const assignedRole = email.toLowerCase() === 'bienaodylan428@gmail.com' ? 'super_admin' : role;
    const user: User = {
      id: `usr_${crypto.randomBytes(6).toString('hex')}`,
      email: email.toLowerCase(),
      name: email.toLowerCase() === 'bienaodylan428@gmail.com' ? (name || 'Dylan B. (Super Admin)') : name,
      role: assignedRole,
      emailVerified: true,
      createdAt: new Date().toISOString(),
    };
    this.users.set(user.id, user);
    this.users.set(user.email, user);
    return user;
  }

  // Events
  public getAllEvents(): ConcertEvent[] {
    const list: ConcertEvent[] = [];
    const seen = new Set<string>();
    for (const evt of this.events.values()) {
      if (!seen.has(evt.id)) {
        seen.add(evt.id);
        list.push(evt);
      }
    }
    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  public getEvent(idOrSlug: string): ConcertEvent | undefined {
    return this.events.get(idOrSlug);
  }

  public getFeaturedEvent(): ConcertEvent | undefined {
    const all = this.getAllEvents();
    return all.find(e => e.isFeatured && e.status === 'published') || all.find(e => e.status === 'published');
  }

  public saveEvent(eventData: Partial<ConcertEvent> & { title: string }): ConcertEvent {
    const id = eventData.id || `evt_${crypto.randomBytes(5).toString('hex')}`;
    const slug = eventData.slug || eventData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const existing = this.events.get(id);
    const event: ConcertEvent = {
      id,
      slug,
      title: eventData.title,
      subtitle: eventData.subtitle || '',
      artist: eventData.artist || 'Artiste Non Défini',
      date: eventData.date || '2026-12-01',
      time: eventData.time || '20:30',
      doorsOpen: eventData.doorsOpen || '19:30',
      venue: eventData.venue || 'Pavillon LUMARÉEL',
      city: eventData.city || 'Abidjan',
      country: eventData.country || 'Côte d’Ivoire',
      address: eventData.address || '',
      description: eventData.description || '',
      artistPortrait: eventData.artistPortrait || DEFAULT_IMAGES.nocturnePoster,
      officialPoster: eventData.officialPoster || DEFAULT_IMAGES.nocturnePoster,
      bannerImage: eventData.bannerImage || DEFAULT_IMAGES.nocturneBanner,
      status: eventData.status || 'published',
      isFeatured: !!eventData.isFeatured,
      organizerType: eventData.organizerType || (eventData.organizerId ? 'partner' : 'lumareel'),
      organizerName: eventData.organizerName || 'LUMARÉEL CO.',
      organizerId: eventData.organizerId,
      genre: eventData.genre || 'Concert Live',
      platformFeePercent: eventData.platformFeePercent ?? (eventData.organizerType === 'partner' ? 5.0 : 0),
      categories: eventData.categories && eventData.categories.length > 0 ? eventData.categories : (existing?.categories || [
        {
          id: `cat_${crypto.randomBytes(4).toString('hex')}`,
          name: 'ADMISSION GÉNÉRALE',
          price: 20000,
          currency: 'FCFA',
          quota: 200,
          sold: 0,
          description: 'Accès au concert',
          perks: ['Entrée standard'],
        }
      ]),
    };

    this.events.set(event.id, event);
    this.events.set(event.slug, event);
    this.saveEventsToDisk();
    return event;
  }

  public updateEvent(id: string, updateData: Partial<ConcertEvent>): ConcertEvent | undefined {
    const existing = this.events.get(id);
    if (!existing) return undefined;

    const updated: ConcertEvent = {
      ...existing,
      ...updateData,
      id: existing.id,
      slug: updateData.slug || (updateData.title && updateData.title !== existing.title ? updateData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : existing.slug),
      categories: updateData.categories && updateData.categories.length > 0 ? updateData.categories : existing.categories,
    };

    this.events.set(updated.id, updated);
    this.events.set(updated.slug, updated);
    this.saveEventsToDisk();
    return updated;
  }

  public deleteEvent(id: string): boolean {
    const existing = this.events.get(id);
    if (!existing) return false;
    this.events.delete(existing.id);
    this.events.delete(existing.slug);
    this.saveEventsToDisk();
    return true;
  }

  // News & Communiqués
  public getAllNews(): NewsArticle[] {
    return this.newsArticles;
  }

  public getNewsBySlug(slug: string): NewsArticle | undefined {
    return this.newsArticles.find(n => n.slug === slug || n.id === slug);
  }

  // External Organizers Management (Marketplace)
  public getAllOrganizers(): ExternalOrganizer[] {
    return Array.from(this.organizers.values());
  }

  public getOrganizer(id: string): ExternalOrganizer | undefined {
    return this.organizers.get(id);
  }

  public registerOrganizer(data: {
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    city: string;
    country: string;
  }): ExternalOrganizer {
    const id = `org_${crypto.randomBytes(5).toString('hex')}`;
    const organizer: ExternalOrganizer = {
      id,
      companyName: data.companyName,
      contactName: data.contactName,
      email: data.email.toLowerCase(),
      phone: data.phone,
      city: data.city,
      country: data.country || 'Côte d’Ivoire',
      status: 'pending', // Submissions remain pending review as specified in Section 9
      eventsCount: 0,
      commissionRate: 5.0,
      createdAt: new Date().toISOString(),
    };
    this.organizers.set(organizer.id, organizer);
    return organizer;
  }

  public getOrganizerEvents(organizerId: string): ConcertEvent[] {
    return this.getAllEvents().filter(e => e.organizerId === organizerId);
  }

  // Orders and Ticket Emission
  public createPendingOrder(params: {
    customerId: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    eventId: string;
    categoryId: string;
    quantity: number;
  }): { success: boolean; order?: Order; error?: string } {
    const event = this.getEvent(params.eventId);
    if (!event) return { success: false, error: 'Concert introuvable.' };
    if (event.status !== 'published') return { success: false, error: 'Cet événement n’est pas disponible à la vente.' };

    const category = event.categories.find(c => c.id === params.categoryId);
    if (!category) return { success: false, error: 'Catégorie de billet introuvable.' };

    const available = category.quota - category.sold;
    if (params.quantity <= 0 || params.quantity > 8) {
      return { success: false, error: 'La quantité sélectionnée doit être comprise entre 1 et 8 billets.' };
    }
    if (params.quantity > available) {
      return { success: false, error: `Quota insuffisant. Seuls ${available} billets restants dans cette catégorie.` };
    }

    const orderRef = `LMR-${Math.floor(1000 + Math.random() * 9000)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const orderId = `ord_${crypto.randomBytes(6).toString('hex')}`;
    const totalAmount = category.price * params.quantity;

    const order: Order = {
      id: orderId,
      reference: orderRef,
      customerId: params.customerId,
      customerName: params.customerName,
      customerEmail: params.customerEmail.toLowerCase(),
      customerPhone: params.customerPhone,
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.date,
      eventVenue: event.venue,
      categoryId: category.id,
      categoryName: category.name,
      quantity: params.quantity,
      unitPrice: category.price,
      totalAmount,
      currency: category.currency,
      paymentStatus: 'pending',
      paymentProvider: 'geniuspay',
      paymentRef: `gp_init_${crypto.randomBytes(8).toString('hex')}`,
      createdAt: new Date().toISOString(),
    };

    this.orders.set(order.id, order);
    return { success: true, order };
  }

  // Confirm payment & atomic ticket emission (Idempotent!)
  public confirmPaymentAndIssueTickets(orderId: string, paymentRef?: string): { success: boolean; order?: Order; tickets?: Ticket[]; error?: string } {
    const order = this.orders.get(orderId);
    if (!order) return { success: false, error: 'Commande introuvable.' };

    // Idempotent safeguard: If already completed, return existing issued tickets
    if (order.paymentStatus === 'completed') {
      const existingTickets = this.getTicketsForOrder(order.id);
      return { success: true, order, tickets: existingTickets };
    }

    const event = this.getEvent(order.eventId);
    if (!event) return { success: false, error: 'Événement associé introuvable.' };

    const category = event.categories.find(c => c.id === order.categoryId);
    if (!category) return { success: false, error: 'Catégorie de billet introuvable.' };

    // Atomically decrement quota
    category.sold += order.quantity;
    if (category.sold >= category.quota) {
      const allSold = event.categories.every(c => c.sold >= c.quota);
      if (allSold) event.status = 'sold_out';
    }

    // Update order status
    order.paymentStatus = 'completed';
    order.paidAt = new Date().toISOString();
    if (paymentRef) order.paymentRef = paymentRef;

    // Issue unique electronic tickets
    const issuedTickets: Ticket[] = [];
    const eventCode = event.title.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'LMR');

    for (let i = 1; i <= order.quantity; i++) {
      const ticketId = `tkt_${crypto.randomBytes(8).toString('hex')}`;
      const serialNumber = `LMR-2026-${eventCode}-${Math.floor(1000 + Math.random() * 9000)}`;
      const token = `TKT_SEC_${crypto.randomBytes(12).toString('hex').toUpperCase()}`;

      const ticket: Ticket = {
        id: ticketId,
        orderId: order.id,
        orderRef: order.reference,
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: event.time,
        eventVenue: event.venue,
        categoryId: category.id,
        categoryName: category.name,
        serialNumber,
        token,
        holderName: `${order.customerName}${order.quantity > 1 ? ` (${i}/${order.quantity})` : ''}`,
        holderEmail: order.customerEmail,
        status: 'valid',
        issuedAt: new Date().toISOString(),
      };

      this.tickets.set(ticket.id, ticket);
      this.tickets.set(ticket.token, ticket);
      issuedTickets.push(ticket);
    }

    order.tickets = issuedTickets;

    // Queue Transactional Confirmation Email
    this.emails.unshift({
      id: `eml_${crypto.randomBytes(6).toString('hex')}`,
      recipient: order.customerEmail,
      subject: `Confirmation de commande ${order.reference} — ${event.title}`,
      type: 'ticket_confirmation',
      orderRef: order.reference,
      status: 'sent',
      timestamp: new Date().toISOString(),
      contentPreview: `Merci ${order.customerName}. Vos ${order.quantity} billet(s) pour "${event.title}" sont confirmés. Référence : ${order.reference}.`,
    });

    return { success: true, order, tickets: issuedTickets };
  }

  public getTicketsForOrder(orderId: string): Ticket[] {
    const list: Ticket[] = [];
    const seen = new Set<string>();
    for (const tkt of this.tickets.values()) {
      if (tkt.orderId === orderId && !seen.has(tkt.id)) {
        seen.add(tkt.id);
        list.push(tkt);
      }
    }
    return list;
  }

  public getOrdersForCustomer(customerEmail: string): Order[] {
    const emailNorm = customerEmail.toLowerCase();
    const result: Order[] = [];
    for (const ord of this.orders.values()) {
      if (ord.customerEmail.toLowerCase() === emailNorm) {
        // Attach tickets if completed
        if (ord.paymentStatus === 'completed') {
          ord.tickets = this.getTicketsForOrder(ord.id);
        }
        result.push(ord);
      }
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getAllOrders(): Order[] {
    const list = Array.from(this.orders.values());
    for (const ord of list) {
      if (ord.paymentStatus === 'completed') {
        ord.tickets = this.getTicketsForOrder(ord.id);
      }
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getTicketByToken(tokenOrId: string): Ticket | undefined {
    return this.tickets.get(tokenOrId);
  }

  // Atomic Entry Gate Verification
  public verifyAndCheckInTicket(params: {
    tokenOrSerial: string;
    targetEventId: string;
    gateAgentId: string;
  }): ScanVerificationResult {
    const query = params.tokenOrSerial.trim();
    // Look up by token or serial
    let ticket: Ticket | undefined = this.tickets.get(query);
    if (!ticket) {
      for (const t of this.tickets.values()) {
        if (t.serialNumber.toUpperCase() === query.toUpperCase() || t.token.toUpperCase() === query.toUpperCase()) {
          ticket = t;
          break;
        }
      }
    }

    const logEntry = {
      id: `chk_${crypto.randomBytes(6).toString('hex')}`,
      ticketId: ticket ? ticket.id : 'unknown',
      eventId: params.targetEventId,
      gateAgentId: params.gateAgentId,
      result: 'INVALID_OR_NOT_FOUND',
      timestamp: new Date().toISOString(),
    };

    if (!ticket) {
      this.checkInLogs.unshift(logEntry);
      return {
        status: 'INVALID_OR_NOT_FOUND',
        message: 'Billet non reconnu dans le système LUMARÉEL. Vérifiez la source.',
      };
    }

    // Verify Target Event Match
    if (params.targetEventId && ticket.eventId !== params.targetEventId) {
      logEntry.result = 'WRONG_EVENT';
      this.checkInLogs.unshift(logEntry);
      return {
        status: 'WRONG_EVENT',
        message: `Erreur d'événement : ce billet est réservé pour "${ticket.eventTitle}", pas pour le concert actuellement scanné.`,
        ticket,
      };
    }

    // Verify Cancellation
    if (ticket.status === 'cancelled') {
      logEntry.result = 'CANCELLED';
      this.checkInLogs.unshift(logEntry);
      return {
        status: 'CANCELLED',
        message: 'Billet annulé ou remboursé. Entrée strictement refusée.',
        ticket,
      };
    }

    // Verify Already Used (Double Scan Prevention)
    if (ticket.status === 'used') {
      logEntry.result = 'ALREADY_USED';
      this.checkInLogs.unshift(logEntry);
      return {
        status: 'ALREADY_USED',
        message: `Billet DÉJÀ VALIDÉ ! Entrée refusée pour risque de copie.`,
        ticket,
        previousCheckIn: {
          checkedInAt: ticket.checkedInAt || 'Heure inconnue',
          checkedInBy: ticket.checkedInBy || 'Agent non spécifié',
        },
      };
    }

    // Atomic Check-In Success
    ticket.status = 'used';
    ticket.checkedInAt = new Date().toISOString();
    ticket.checkedInBy = params.gateAgentId;

    logEntry.result = 'VALID';
    this.checkInLogs.unshift(logEntry);

    return {
      status: 'VALID',
      message: `Entrée autorisée — Bienvenue chez LUMARÉEL CO.`,
      ticket,
    };
  }

  // Archives & Works
  public getAllArchives(includeDrafts: boolean = false): ArchiveProduction[] {
    return Array.from(this.archives.values())
      .filter(a => includeDrafts || a.isPublished !== false)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public saveArchive(data: Partial<ArchiveProduction> & { title: string }): ArchiveProduction {
    const id = data.id || `arc_${Date.now()}`;
    const existing = this.archives.get(id);
    const archive: ArchiveProduction = {
      id,
      title: data.title,
      year: data.year || existing?.year || '2026',
      date: data.date || existing?.date || '2026',
      city: data.city || existing?.city || 'Abidjan',
      country: data.country || existing?.country || 'Côte d’Ivoire',
      venue: data.venue || existing?.venue || 'Palais de la Culture',
      artists: data.artists || existing?.artists || [data.title],
      coverImage: data.coverImage || existing?.coverImage || DEFAULT_IMAGES.archiveCover,
      description: data.description ?? existing?.description ?? '',
      youtubeUrl: data.youtubeUrl ?? existing?.youtubeUrl ?? '',
      youtubeEmbedUrl: data.youtubeEmbedUrl ?? existing?.youtubeEmbedUrl ?? '',
      duration: data.duration || existing?.duration || 'Live HD',
      photos: data.photos || existing?.photos || [],
      isPublished: data.isPublished !== undefined ? data.isPublished : (existing?.isPublished !== undefined ? existing.isPublished : true),
      orderIndex: data.orderIndex || existing?.orderIndex || (this.archives.size + 1),
    };
    this.archives.set(archive.id, archive);
    this.saveArchivesToDisk();
    return archive;
  }

  public deleteArchive(id: string): boolean {
    const res = this.archives.delete(id);
    this.saveArchivesToDisk();
    return res;
  }

  public getAllWorks(): WorkProduction[] {
    return Array.from(this.works.values());
  }

  public getEmails(): TransactionalEmail[] {
    return this.emails;
  }

  public getAdminStats(): AdminStats {
    let totalTicketsSold = 0;
    let totalQuota = 0;
    let confirmedRevenueXof = 0;
    let pendingOrdersCount = 0;
    let paidOrdersCount = 0;

    for (const evt of this.getAllEvents()) {
      for (const cat of evt.categories) {
        totalTicketsSold += cat.sold;
        totalQuota += cat.quota;
      }
    }

    for (const ord of this.orders.values()) {
      if (ord.paymentStatus === 'completed') {
        confirmedRevenueXof += ord.totalAmount;
        paidOrdersCount++;
      } else if (ord.paymentStatus === 'pending') {
        pendingOrdersCount++;
      }
    }

    let checkedInTickets = 0;
    const seen = new Set<string>();
    for (const t of this.tickets.values()) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        if (t.status === 'used') checkedInTickets++;
      }
    }

    return {
      publishedEvents: this.getAllEvents().filter(e => e.status === 'published').length,
      ticketsSold: totalTicketsSold,
      totalQuota,
      confirmedRevenueXof,
      pendingOrdersCount,
      paidOrdersCount,
      checkedInTickets,
    };
  }

  // Scanner Tokens (Magic Link for Gate Agents)
  public createScannerToken(eventId: string, createdBy: string = 'Super Administrateur', durationHours: number = 24): ScannerToken | null {
    const event = this.getEvent(eventId);
    if (!event) return null;

    const token = `SEC_VGL_${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
    const id = `sct_${crypto.randomBytes(6).toString('hex')}`;
    const now = Date.now();
    const expiresAt = new Date(now + durationHours * 3600 * 1000).toISOString();

    const scannerToken: ScannerToken = {
      id,
      token,
      eventId: event.id,
      eventTitle: event.title,
      artistName: event.artist,
      createdAt: new Date(now).toISOString(),
      expiresAt,
      createdBy,
      revoked: false,
    };

    this.scannerTokens.set(token, scannerToken);
    this.scannerTokens.set(id, scannerToken);
    this.saveScannerTokensToDisk();
    return scannerToken;
  }

  public verifyScannerToken(token: string, eventId?: string): { valid: boolean; token?: ScannerToken; error?: string; event?: ConcertEvent } {
    if (!token) {
      return { valid: false, error: 'Token manquant ou format invalide.' };
    }

    // Special static super-admin bypass token
    if (token === 'SEC_SESSION_AUTHORIZED') {
      const defaultEvt = (eventId ? this.getEvent(eventId) : null) || this.getFeaturedEvent() || this.getAllEvents()[0];
      return {
        valid: true,
        event: defaultEvt,
        token: {
          id: 'sct_admin_session',
          token: 'SEC_SESSION_AUTHORIZED',
          eventId: defaultEvt?.id || '',
          eventTitle: defaultEvt?.title || 'Contrôle Global',
          artistName: defaultEvt?.artist || 'LUMARÉEL CO.',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          revoked: false,
        },
      };
    }

    const scannerToken = this.scannerTokens.get(token);
    if (!scannerToken) {
      return { valid: false, error: 'Token de scan introuvable ou non reconnu.' };
    }

    if (scannerToken.revoked) {
      return { valid: false, error: 'Ce lien d’accès a été révoqué par l’administrateur.' };
    }

    const now = Date.now();
    const expiration = new Date(scannerToken.expiresAt).getTime();
    if (now > expiration) {
      return { valid: false, error: 'Ce lien d’accès a expiré. Veuillez demander un nouveau lien à l’administrateur.' };
    }

    const event = this.getEvent(scannerToken.eventId);
    if (eventId && scannerToken.eventId !== eventId) {
      return { valid: false, error: 'Le token fourni ne correspond pas à cet événement.' };
    }

    return {
      valid: true,
      token: scannerToken,
      event: event || undefined,
    };
  }

  public getScannerTokensForEvent(eventId: string): ScannerToken[] {
    const list: ScannerToken[] = [];
    const seen = new Set<string>();
    for (const t of this.scannerTokens.values()) {
      if (t.eventId === eventId && !seen.has(t.id)) {
        seen.add(t.id);
        list.push(t);
      }
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export const db = new LumareelDatabase();
