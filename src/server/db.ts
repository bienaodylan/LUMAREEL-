import crypto from 'crypto';
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
} from '../types';

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

// Initial in-memory database store
class LumareelDatabase {
  private users: Map<string, User> = new Map();
  private events: Map<string, ConcertEvent> = new Map();
  private orders: Map<string, Order> = new Map();
  private tickets: Map<string, Ticket> = new Map();
  private archives: Map<string, ArchiveProduction> = new Map();
  private works: Map<string, WorkProduction> = new Map();
  private organizers: Map<string, ExternalOrganizer> = new Map();
  private newsArticles: NewsArticle[] = [];
  private emails: TransactionalEmail[] = [];
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

    // 3. Featured Upcoming Concerts : Exact 4 Artists provided by user
    // 1. Wantché
    const wantcheCategories: TicketCategory[] = [
      {
        id: 'cat_wantche_vibration',
        name: 'FOSSE VIBRATION',
        price: 15000,
        currency: 'XOF',
        quota: 600,
        sold: 320,
        description: 'Accès fosse centrale au pied de la scène scénographiée.',
        perks: ['Entrée fosse direct', 'Accès buvettes'],
      },
      {
        id: 'cat_wantche_or',
        name: 'CARRÉ OR',
        price: 25000,
        currency: 'XOF',
        quota: 250,
        sold: 180,
        description: 'Gradin central surélevé, acoustique haute précision.',
        perks: ['Accès prioritaire Carré Or', 'Vue panoramique'],
      },
      {
        id: 'cat_wantche_vip',
        name: 'EXPÉRIENCE VIP LUMARÉEL',
        price: 50000,
        currency: 'XOF',
        quota: 70,
        sold: 61,
        description: 'Salon privé, balances sonores & cocktail signature.',
        perks: ['Accès backstage', 'Cocktail signature', 'Place premier rang'],
      },
    ];

    const eventWantche: ConcertEvent = {
      id: 'evt_wantche',
      slug: 'wantche-en-concert',
      title: 'WANTCHÉ EN CONCERT',
      subtitle: 'Scénographie immersive & nouvelle vague ivoire',
      artist: 'WANTCHÉ',
      date: '2026-11-20',
      time: '20:00',
      doorsOpen: '18:30',
      venue: 'Palais des Congrès du Sofitel Hôtel Ivoire',
      city: 'Abidjan',
      country: 'Côte d’Ivoire',
      address: 'Boulevard Hassan II, Cocody, Abidjan',
      description: 'Une immersion scénique d’une intensité rare. Wantché s’empare de la scène principale avec une direction artistique sans compromis, mêlant rythmes novateurs et faisceaux d’ombres signés LUMARÉEL CO.',
      artistPortrait: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36__1__5dc7b4f5.jpeg',
      officialPoster: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36__1__5dc7b4f5.jpeg',
      bannerImage: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36__1__5dc7b4f5.jpeg',
      status: 'published',
      isFeatured: true,
      organizerType: 'lumareel',
      organizerName: 'LUMARÉEL CO.',
      genre: 'Afro-Trap / Nouvelle Vague',
      platformFeePercent: 0,
      categories: wantcheCategories,
    };

    // 2. Tiakola
    const tiakolaCategories: TicketCategory[] = [
      {
        id: 'cat_tiakola_fosse',
        name: 'FOSSE GÉNÉRALE',
        price: 20000,
        currency: 'XOF',
        quota: 1200,
        sold: 890,
        description: 'Accès plain-pied fosse Parc des Expositions.',
        perks: ['Entrée fosse générale', 'Accès zone scénique'],
      },
      {
        id: 'cat_tiakola_or',
        name: 'CARRÉ OR PRESTIGE',
        price: 40000,
        currency: 'XOF',
        quota: 400,
        sold: 360,
        description: 'Zone VIP en hauteur, acoustique spatiale renforcée.',
        perks: ['Coupe-file', 'Tribune Or réservée', 'Badge collector'],
      },
      {
        id: 'cat_tiakola_vip',
        name: 'LOGE VIP BDLM',
        price: 80000,
        currency: 'XOF',
        quota: 100,
        sold: 92,
        description: 'Salon privatif avec champagne & rencontre backstage.',
        perks: ['Loge VIP', 'Champagne & buffet', 'Pass backstage officiel'],
      },
    ];

    const eventTiakola: ConcertEvent = {
      id: 'evt_tiakola',
      slug: 'tiakola-bdlm-live-tour',
      title: 'TIAKOLA — BDLM LIVE TOUR',
      subtitle: 'La mélo monumentale en concert événement',
      artist: 'TIAKOLA',
      date: '2026-11-28',
      time: '20:30',
      doorsOpen: '18:30',
      venue: 'Parc des Expositions d’Abidjan · Grand Hall',
      city: 'Abidjan',
      country: 'Côte d’Ivoire',
      address: 'Route de l’Aéroport International Félix Houphouët-Boigny',
      description: 'Le prodige de la mélo débarque à Abidjan pour une date historique. Le BDLM Live Tour s’installe au Parc des Expositions pour une communion explosive devant plus de 10 000 spectateurs.',
      artistPortrait: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36__2__2459f9b9.jpeg',
      officialPoster: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36__2__2459f9b9.jpeg',
      bannerImage: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36__2__2459f9b9.jpeg',
      status: 'published',
      isFeatured: true,
      organizerType: 'lumareel',
      organizerName: 'LUMARÉEL CO.',
      genre: 'Mélodie / Rap Français',
      platformFeePercent: 0,
      categories: tiakolaCategories,
    };

    // 3. Jeune Lion
    const jeuneLionCategories: TicketCategory[] = [
      {
        id: 'cat_fosse_jl',
        name: 'FOSSE VIBRATION',
        price: 15000,
        currency: 'XOF',
        quota: 600,
        sold: 340,
        description: 'Accès fosse centrale au cœur de la scénographie lumineuse.',
        perks: ['Entrée fosse', 'Accès direct bars'],
      },
      {
        id: 'cat_carre_or_jl',
        name: 'CARRÉ OR',
        price: 30000,
        currency: 'XOF',
        quota: 250,
        sold: 195,
        description: 'Zone privilégiée en élévation, acoustique haute fidélité.',
        perks: ['Accès prioritaire Carré Or', 'Vue dégagée', 'Programme exclusif'],
      },
      {
        id: 'cat_vip_jl',
        name: 'EXPÉRIENCE VIP LUMARÉEL',
        price: 60000,
        currency: 'XOF',
        quota: 80,
        sold: 72,
        description: 'Salon privatif, balances sonores, cocktail dînatoire & coupe-file.',
        perks: ['Accès backstage', 'Cocktail noir', 'Place réservée premier rang', 'Hôte dédié'],
      },
    ];

    const eventJeuneLion: ConcertEvent = {
      id: 'evt_jeune_lion',
      slug: 'jeune-lion-en-concert',
      title: 'JEUNE LION EN CONCERT',
      subtitle: 'La grande messe scénique d’Abidjan',
      artist: 'JEUNE LION',
      date: '2026-12-19',
      time: '20:30',
      doorsOpen: '19:00',
      venue: 'Palais des Congrès du Sofitel Hôtel Ivoire',
      city: 'Abidjan',
      country: 'Côte d’Ivoire',
      address: 'Boulevard Hassan II, Cocody',
      description: 'Une nuit de communion scénique pure. Après des mois de préparation en résidence secrète, Jeune Lion investit la scène monumentale avec une scénographie d’ombres et de faisceaux signée LUMARÉEL CO.',
      artistPortrait: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36__3__e428cb5c.jpeg',
      officialPoster: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36__3__e428cb5c.jpeg',
      bannerImage: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36__3__e428cb5c.jpeg',
      status: 'published',
      isFeatured: true,
      organizerType: 'lumareel',
      organizerName: 'LUMARÉEL CO.',
      genre: 'Rap / Drill Ivoire',
      platformFeePercent: 0,
      categories: jeuneLionCategories,
    };

    // 4. Jamsco
    const jamscoCategories: TicketCategory[] = [
      {
        id: 'cat_jamsco_standard',
        name: 'FOSSE EARLY ACCESS',
        price: 15000,
        currency: 'XOF',
        quota: 500,
        sold: 280,
        description: 'Accès fosse scène extérieure bord de piscine.',
        perks: ['Entrée coupe-file', 'Accès zone scène'],
      },
      {
        id: 'cat_jamsco_vip',
        name: 'CARRÉ VIP PRESTIGE',
        price: 35000,
        currency: 'XOF',
        quota: 150,
        sold: 110,
        description: 'Emplacement premium avec service bar dédié.',
        perks: ['Accès VIP', 'Cocktail de bienvenue', 'Vue imprenable'],
      },
      {
        id: 'cat_jamsco_table',
        name: 'TABLE ROYALE KINGDOM',
        price: 100000,
        currency: 'XOF',
        quota: 30,
        sold: 24,
        description: 'Table privée 4 personnes avec champagne prestige.',
        perks: ['Table réservée', 'Champagne Millésimé', 'Service majordome'],
      },
    ];

    const eventJamsco: ConcertEvent = {
      id: 'evt_jamsco',
      slug: 'jamsco-en-concert',
      title: 'JAMSCO EN CONCERT — KINGDOM LIVE',
      subtitle: 'Le couronnement scénique · Nuit du réveillon',
      artist: 'JAMSCO',
      date: '2026-12-31',
      time: '21:00',
      doorsOpen: '19:30',
      venue: 'Scène Piscine du Sofitel Ivoire · Abidjan',
      city: 'Abidjan',
      country: 'Côte d’Ivoire',
      address: 'Boulevard Hassan II, Cocody, Abidjan',
      description: 'Pour clore l’année 2026, Jamsco livre une performance scénique d’exception au bord de l’eau. Acoustique amplifiée, arrangements live inédits et scénographie royale signée LUMARÉEL CO.',
      artistPortrait: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36_70028046.jpeg',
      officialPoster: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36_70028046.jpeg',
      bannerImage: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36_70028046.jpeg',
      status: 'published',
      isFeatured: true,
      organizerType: 'lumareel',
      organizerName: 'LUMARÉEL CO.',
      genre: 'Afro-Rap / Live Band',
      platformFeePercent: 0,
      categories: jamscoCategories,
    };

    this.events.set(eventWantche.id, eventWantche);
    this.events.set(eventWantche.slug, eventWantche);
    this.events.set(eventTiakola.id, eventTiakola);
    this.events.set(eventTiakola.slug, eventTiakola);
    this.events.set(eventJeuneLion.id, eventJeuneLion);
    this.events.set(eventJeuneLion.slug, eventJeuneLion);
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
      currency: 'XOF',
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
  }

  // User management
  public getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.users.get(email.toLowerCase());
  }

  public registerUser(name: string, email: string, role: User['role'] = 'customer'): User {
    const existing = this.getUserByEmail(email);
    if (existing) return existing;

    const user: User = {
      id: `usr_${crypto.randomBytes(6).toString('hex')}`,
      email: email.toLowerCase(),
      name,
      role,
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
          currency: 'XOF',
          quota: 200,
          sold: 0,
          description: 'Accès au concert',
          perks: ['Entrée standard'],
        }
      ]),
    };

    this.events.set(event.id, event);
    this.events.set(event.slug, event);
    return event;
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
  public getAllArchives(): ArchiveProduction[] {
    return Array.from(this.archives.values())
      .filter(a => a.isPublished)
      .sort((a, b) => a.orderIndex - b.orderIndex);
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
}

export const db = new LumareelDatabase();
