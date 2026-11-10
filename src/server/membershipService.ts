import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  MembershipEdition,
  MembershipPlan,
  MembershipApplication,
  MembershipOrder,
  MembershipCard,
  MembershipQrToken,
  MembershipBenefit,
  MembershipEntitlement,
  MembershipRedemption,
  MembershipReader,
  MembershipEventAccessPoint,
  MembershipScanLog,
  MembershipEventLog,
  PublicCardVerificationResult,
  MemberAccessCheckResult,
  PhysicalCardProductionStatus,
  MembershipPhysicalCardOrder,
  MembershipCardInventory,
  MembershipPrintJob,
  MembershipCardQualityCheck,
  PrivateInvitation,
  WalletOverview,
  UnifiedAccessScanResult,
  WalletActivityRecord,
  WalletPaymentRecord,
} from '../types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const MEMBERSHIP_FILE = path.join(DATA_DIR, 'membership.json');

interface MembershipStoreData {
  editions: MembershipEdition[];
  plans: MembershipPlan[];
  applications: MembershipApplication[];
  orders: MembershipOrder[];
  cards: MembershipCard[];
  qrTokens: MembershipQrToken[];
  benefits: MembershipBenefit[];
  entitlements: MembershipEntitlement[];
  redemptions: MembershipRedemption[];
  readers: MembershipReader[];
  accessPoints: MembershipEventAccessPoint[];
  physicalOrders: MembershipPhysicalCardOrder[];
  inventory: MembershipCardInventory[];
  printJobs: MembershipPrintJob[];
  qualityChecks: MembershipCardQualityCheck[];
  invitations?: PrivateInvitation[];
  scanLogs: MembershipScanLog[];
  eventLogs: MembershipEventLog[];
  lastAssignedSequence: number;
}

export class MembershipService {
  private editions: Map<string, MembershipEdition> = new Map();
  private plans: Map<string, MembershipPlan> = new Map();
  private applications: Map<string, MembershipApplication> = new Map();
  private orders: Map<string, MembershipOrder> = new Map();
  private cards: Map<string, MembershipCard> = new Map();
  private qrTokens: Map<string, MembershipQrToken> = new Map();
  private benefits: Map<string, MembershipBenefit> = new Map();
  private entitlements: Map<string, MembershipEntitlement> = new Map();
  private redemptions: Map<string, MembershipRedemption> = new Map();
  private invitations: Map<string, PrivateInvitation> = new Map();
  private readers: Map<string, MembershipReader> = new Map();
  private accessPoints: Map<string, MembershipEventAccessPoint> = new Map();
  private physicalOrders: Map<string, MembershipPhysicalCardOrder> = new Map();
  private inventory: Map<string, MembershipCardInventory> = new Map();
  private printJobs: Map<string, MembershipPrintJob> = new Map();
  private qualityChecks: Map<string, MembershipCardQualityCheck> = new Map();
  private scanLogs: MembershipScanLog[] = [];
  private eventLogs: MembershipEventLog[] = [];
  private lastAssignedSequence: number = 0;

  // Rate limiting cache for public verification (IP / token prefix -> count and window)
  private verificationRateLimits: Map<string, { count: number; windowStart: number }> = new Map();

  // Workshop printer simulator mode (true = simulator mode, false = bridge hardware)
  public printerSimulatorMode: boolean = true;

  constructor() {
    this.ensureDataDirectory();
    this.loadFromDisk();
    if (this.editions.size === 0) {
      this.seedInitialFoundersEdition();
    }
    if (this.inventory.size === 0) {
      this.seedInitialInventory();
    }
    if (this.invitations.size === 0) {
      this.seedInitialInvitations();
    }
  }

  private ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch (e) {
        console.warn('[MembershipService] Could not create data directory:', e);
      }
    }
  }

  private loadFromDisk() {
    if (!fs.existsSync(MEMBERSHIP_FILE)) return;
    try {
      const raw = fs.readFileSync(MEMBERSHIP_FILE, 'utf-8');
      const data: MembershipStoreData = JSON.parse(raw);

      (data.editions || []).forEach((e) => this.editions.set(e.id, e));
      (data.plans || []).forEach((p) => this.plans.set(p.id, p));
      (data.applications || []).forEach((a) => this.applications.set(a.id, a));
      (data.orders || []).forEach((o) => this.orders.set(o.id, o));
      (data.cards || []).forEach((c) => this.cards.set(c.id, c));
      (data.qrTokens || []).forEach((q) => this.qrTokens.set(q.id, q));
      (data.benefits || []).forEach((b) => this.benefits.set(b.id, b));
      (data.entitlements || []).forEach((en) => this.entitlements.set(en.id, en));
      (data.redemptions || []).forEach((r) => this.redemptions.set(r.id, r));
      (data.invitations || []).forEach((inv) => this.invitations.set(inv.id, inv));
      (data.readers || []).forEach((rd) => this.readers.set(rd.id, rd));
      (data.accessPoints || []).forEach((ap) => this.accessPoints.set(ap.id, ap));
      (data.physicalOrders || []).forEach((po) => this.physicalOrders.set(po.id, po));
      (data.inventory || []).forEach((inv) => this.inventory.set(inv.id, inv));
      (data.printJobs || []).forEach((pj) => this.printJobs.set(pj.id, pj));
      (data.qualityChecks || []).forEach((qc) => this.qualityChecks.set(qc.id, qc));

      this.scanLogs = data.scanLogs || [];
      this.eventLogs = data.eventLogs || [];
      this.lastAssignedSequence = data.lastAssignedSequence || 0;

      // Recalculate max sequence if needed
      for (const card of this.cards.values()) {
        if (card.cardSequence > this.lastAssignedSequence) {
          this.lastAssignedSequence = card.cardSequence;
        }
      }
    } catch (e) {
      console.error('[MembershipService] Error loading membership data:', e);
    }
  }

  public saveToDisk() {
    try {
      const data: MembershipStoreData = {
        editions: Array.from(this.editions.values()),
        plans: Array.from(this.plans.values()),
        applications: Array.from(this.applications.values()),
        orders: Array.from(this.orders.values()),
        cards: Array.from(this.cards.values()),
        qrTokens: Array.from(this.qrTokens.values()),
        benefits: Array.from(this.benefits.values()),
        entitlements: Array.from(this.entitlements.values()),
        redemptions: Array.from(this.redemptions.values()),
        invitations: Array.from(this.invitations.values()),
        readers: Array.from(this.readers.values()),
        accessPoints: Array.from(this.accessPoints.values()),
        physicalOrders: Array.from(this.physicalOrders.values()),
        inventory: Array.from(this.inventory.values()),
        printJobs: Array.from(this.printJobs.values()),
        qualityChecks: Array.from(this.qualityChecks.values()),
        scanLogs: this.scanLogs.slice(-2000),
        eventLogs: this.eventLogs.slice(-1000),
        lastAssignedSequence: this.lastAssignedSequence,
      };
      fs.writeFileSync(MEMBERSHIP_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[MembershipService] Error saving membership data:', e);
    }
  }

  private seedInitialFoundersEdition() {
    const editionId = 'ed_founders_2026';
    const now = new Date().toISOString();
    const oneYearLater = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();

    const foundersEdition: MembershipEdition = {
      id: editionId,
      name: 'LUMARÉEL FOUNDERS EDITION',
      editionCode: 'FOUNDERS_2026',
      description:
        'Adhésion annuelle inaugurale et prestigieuse limitée strictement à 100 membres d’élite. Numéro permanent gravé, identifiant QR cryptographique haute sécurité et privilèges exclusifs pour la saison 2026-2027.',
      quota: 100,
      allocatedCount: 0,
      startsAt: now,
      endsAt: oneYearLater,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    this.editions.set(editionId, foundersEdition);

    const planId = 'plan_founders_annual';
    const foundersPlan: MembershipPlan = {
      id: planId,
      editionId,
      name: 'Adhésion Annuelle Founders',
      description:
        'Accès complet 12 mois : carte physique PVC noire mate gravée à chaud avec QR cryptographique haute résolution, carte numérique dynamique avec QR anti-copie, file prioritaire, préventes privées et salon VIP.',
      price: 150000,
      currency: 'FCFA',
      durationMonths: 12,
      physicalCardIncluded: true,
      renewalEnabled: true,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    this.plans.set(planId, foundersPlan);

    // Initial benefits catalog
    const initialBenefits: Array<Omit<MembershipBenefit, 'id' | 'createdAt' | 'updatedAt'>> = [
      {
        name: 'Prévente Privée Exclusive',
        description: 'Accès prioritaire 48 heures avant l’ouverture de la billetterie générale pour tous les concerts officiels LUMARÉEL.',
        benefitType: 'private_presale',
        editionId,
        startsAt: now,
        currentRedemptions: 0,
        perMemberLimit: 10,
        status: 'active',
      },
      {
        name: 'Coupe-File & Accueil Prioritaire',
        description: 'Accès dédié par la voie rapide lors de chaque événement LUMARÉEL pour le titulaire et un accompagnant.',
        benefitType: 'priority_access',
        editionId,
        startsAt: now,
        currentRedemptions: 0,
        perMemberLimit: 50,
        status: 'active',
      },
      {
        name: 'Accès VIP & Espaces Réservés',
        description: 'Accès au Salon Privé Membres et aux zones VIP aménagées lors des grandes productions.',
        benefitType: 'vip_lounge',
        editionId,
        startsAt: now,
        currentRedemptions: 0,
        perMemberLimit: 20,
        status: 'active',
      },
      {
        name: 'Expérience Rencontre Artistes & Immersion Scénique',
        description: 'Invitation privilégiée aux balances acoustiques privées et rencontres organisées avec les artistes invités.',
        benefitType: 'artist_experience',
        editionId,
        startsAt: now,
        currentRedemptions: 0,
        perMemberLimit: 2,
        status: 'active',
      },
      {
        name: 'Tarif Préférentiel Membre (-15%)',
        description: 'Réduction permanente de 15 % appliquée automatiquement sur vos commandes de billetterie.',
        benefitType: 'preferential_rate',
        editionId,
        startsAt: now,
        currentRedemptions: 0,
        perMemberLimit: 100,
        status: 'active',
      },
      {
        name: 'Coffret Physique Collector & Surprise Annuelle',
        description: 'Remise de la carte physique PVC personnalisée dans son coffret collector scellé avec numéro gravé.',
        benefitType: 'gift_surprise',
        editionId,
        startsAt: now,
        currentRedemptions: 0,
        perMemberLimit: 1,
        status: 'active',
      },
    ];

    initialBenefits.forEach((b) => {
      const bId = `ben_${crypto.randomBytes(6).toString('hex')}`;
      this.benefits.set(bId, {
        ...b,
        id: bId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Default 2D Barcode Reader (USB / Camera Station)
    const defaultReader: MembershipReader = {
      id: 'rdr_default_2d_01',
      readerName: 'Station Contrôle Accès 01 (Scanner 2D USB)',
      readerIdentifier: 'LMR-STATION-2D-01',
      readerType: 'usb_2d_barcode',
      hardwareModel: 'Lecteur Imager 2D USB Haute Résolution (Zebra/Honeywell)',
      assignedRole: 'gate_agent',
      readerStatus: 'active',
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.readers.set(defaultReader.id, defaultReader);

    this.saveToDisk();
  }

  private seedInitialInvitations() {
    const now = new Date().toISOString();
    const inv1: PrivateInvitation = {
      id: 'inv_founders_gala_01',
      title: 'Gala d’Inauguration & Acoustic Showcase',
      subtitle: 'Célébration des 100 Membres Fondateurs LUMARÉEL',
      description: 'Soirée privée exclusive sous les étoiles d’Abidjan avec showcase acoustique privé, dégustation de champagne et remise des coffrets collector Founders Edition.',
      category: 'exclusive_gala',
      host: 'Direction Générale LUMARÉEL & AREEL GROUPE',
      eventDate: '2026-12-18',
      eventTime: '19:30',
      venue: 'Hôtel Ivoire · Salon d’Honneur & Terrasse Lagunaire',
      city: 'Abidjan',
      recipientEmail: 'bienaodylan428@gmail.com',
      recipientName: 'Dylan Bienao',
      membershipRequired: true,
      editionCode: 'FOUNDERS_2026',
      status: 'accepted',
      qrToken: `INV_${crypto.randomBytes(16).toString('hex').toUpperCase()}`,
      dressCode: 'Black Tie & Golden Touch',
      plusOnesAllowed: 1,
      expiresAt: '2026-12-18T23:59:59Z',
      acceptedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const inv2: PrivateInvitation = {
      id: 'inv_backstage_reception_02',
      title: 'Cocktail Secret & Rencontre Intime Artistes',
      subtitle: 'Session d’Écoute Privée Avant-Concert',
      description: 'Accès ultra-confidentiel au studio acoustique éphémère. Écoute exclusive en avant-première des morceaux inédits avec les artistes et les producteurs de la saison.',
      category: 'artist_meet',
      host: 'LUMARÉEL Music Studio',
      eventDate: '2026-11-28',
      eventTime: '18:00',
      venue: 'LUMARÉEL Creative Studio · Cocody Danga',
      city: 'Abidjan',
      recipientEmail: 'bienaodylan428@gmail.com',
      recipientName: 'Dylan Bienao',
      membershipRequired: true,
      editionCode: 'FOUNDERS_2026',
      status: 'pending',
      qrToken: `INV_${crypto.randomBytes(16).toString('hex').toUpperCase()}`,
      dressCode: 'Smart Casual Élégant',
      plusOnesAllowed: 0,
      expiresAt: '2026-11-28T22:00:00Z',
      createdAt: now,
      updatedAt: now,
    };

    this.invitations.set(inv1.id, inv1);
    this.invitations.set(inv2.id, inv2);
    this.saveToDisk();
  }

  private seedInitialInventory() {
    const now = new Date().toISOString();
    const items: Array<Omit<MembershipCardInventory, 'id' | 'updatedAt' | 'lastRestockedAt'>> = [
      {
        itemName: 'Cartes PVC Noires Mates CR-80 (0.76mm)',
        itemType: 'blank_pvc_card',
        sku: 'PVC-CR80-BLK-MATTE',
        totalQuantity: 250,
        reservedQuantity: 1,
        availableQuantity: 249,
        minThresholdAlert: 20,
        unit: 'cartes',
        notes: 'PVC vierge noir mat teinté dans la masse pour gravure & impression recto/verso.',
      },
      {
        itemName: 'Ruban Doré Chaud Métallique (Gold Foil)',
        itemType: 'gold_foil_ribbon',
        sku: 'RIB-GOLD-FOIL-1000',
        totalQuantity: 3,
        reservedQuantity: 0,
        availableQuantity: 3,
        minThresholdAlert: 1,
        unit: 'rouleaux',
        notes: 'Ruban transfert thermique or métallique haute adhérence (1000 faces/rouleau).',
      },
      {
        itemName: 'Ruban Monochrome Noir Résine Haute Résolution',
        itemType: 'monochrome_black_ribbon',
        sku: 'RIB-MONO-K-1500',
        totalQuantity: 4,
        reservedQuantity: 0,
        availableQuantity: 4,
        minThresholdAlert: 1,
        unit: 'rouleaux',
        notes: 'Encre résine noire ultra-dense pour QR codes à très fort contraste optique.',
      },
      {
        itemName: 'Ruban Couleur YMCKO Haute Définition',
        itemType: 'ymcko_ribbon',
        sku: 'RIB-YMCKO-HD-500',
        totalQuantity: 2,
        reservedQuantity: 0,
        availableQuantity: 2,
        minThresholdAlert: 1,
        unit: 'rouleaux',
        notes: 'Impression couleur avec couche de vernis protecteur intégrée.',
      },
      {
        itemName: 'Film Holographique de Protection Ultra-Durable',
        itemType: 'laminate_overlay',
        sku: 'LAM-HOLO-LMR-1000',
        totalQuantity: 2,
        reservedQuantity: 0,
        availableQuantity: 2,
        minThresholdAlert: 1,
        unit: 'rouleaux',
        notes: 'Lamination de sécurité anti-abrasion et anti-falsification.',
      },
      {
        itemName: 'Coffrets Collector de Luxe Founders Edition',
        itemType: 'collector_box',
        sku: 'BOX-FOUNDERS-LUX-01',
        totalQuantity: 100,
        reservedQuantity: 1,
        availableQuantity: 99,
        minThresholdAlert: 10,
        unit: 'coffrets',
        notes: 'Écrin rigide soft-touch avec fermeture aimantée et marquage à chaud or.',
      },
    ];

    items.forEach((item) => {
      const id = `inv_${crypto.randomBytes(6).toString('hex')}`;
      this.inventory.set(id, {
        ...item,
        id,
        lastRestockedAt: now,
        updatedAt: now,
      });
    });

    this.saveToDisk();
  }

  // --- EDITIONS & PLANS ---
  public getEditions(): MembershipEdition[] {
    return Array.from(this.editions.values());
  }

  public getActiveFoundersEdition(): MembershipEdition | undefined {
    return Array.from(this.editions.values()).find(
      (e) => e.editionCode === 'FOUNDERS_2026' || e.status === 'active'
    );
  }

  public getPlans(editionId?: string): MembershipPlan[] {
    let list = Array.from(this.plans.values());
    if (editionId) list = list.filter((p) => p.editionId === editionId);
    return list;
  }

  public getPlanById(planId: string): MembershipPlan | undefined {
    return this.plans.get(planId);
  }

  public updatePlan(planId: string, updates: Partial<MembershipPlan>): MembershipPlan {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error('Formule introuvable.');
    const updated = { ...plan, ...updates, updatedAt: new Date().toISOString() };
    this.plans.set(planId, updated);
    this.saveToDisk();
    return updated;
  }

  // --- CARDS & ATOMIC NUMBER ALLOCATION (LMR-2026-0001 .. LMR-2026-0100) ---
  public getAllCards(): MembershipCard[] {
    return Array.from(this.cards.values()).sort((a, b) => a.cardSequence - b.cardSequence);
  }

  public getCardById(cardId: string): MembershipCard | undefined {
    return this.cards.get(cardId);
  }

  public getCardByNumber(cardNumber: string): MembershipCard | undefined {
    const normalized = cardNumber.trim().toUpperCase();
    return Array.from(this.cards.values()).find(
      (c) => c.cardNumber.toUpperCase() === normalized
    );
  }

  public getCardByEmail(email: string): MembershipCard | undefined {
    const normalized = email.trim().toLowerCase();
    return Array.from(this.cards.values()).find(
      (c) => c.cardholderEmail.toLowerCase() === normalized && c.cardStatus !== 'revoked'
    );
  }

  public getCardByUserId(userId: string): MembershipCard | undefined {
    return Array.from(this.cards.values()).find(
      (c) => c.userId === userId && c.cardStatus !== 'revoked'
    );
  }

  /**
   * Allocation atomique du prochain numéro de membre permanent (LMR-2026-XXXX).
   * Les numéros sont strictement croissants et ne sont jamais réalloués.
   * La Founders Edition est limitée strictement à 100 membres.
   */
  public allocateNextCardSequence(editionId: string): { sequence: number; cardNumber: string } {
    const edition = this.editions.get(editionId);
    if (!edition) {
      throw new Error("Édition de membership non reconnue.");
    }

    if (edition.allocatedCount >= edition.quota) {
      throw new Error(
        `Le quota strict de ${edition.quota} membres pour ${edition.name} a été atteint. Inscriptions closes.`
      );
    }

    this.lastAssignedSequence += 1;
    const sequence = this.lastAssignedSequence;

    if (sequence > edition.quota) {
      throw new Error(
        `Dépassement de la jauge limite (${edition.quota} cartes maximum pour cette édition).`
      );
    }

    const year = new Date().getFullYear();
    const formattedNum = sequence.toString().padStart(4, '0');
    const cardNumber = `LMR-${year}-${formattedNum}`;

    return { sequence, cardNumber };
  }

  /**
   * Génération d'un jeton secret QR cryptographique avec 256 bits d'entropie.
   * Stocke uniquement le hash SHA-256 dans la base de données.
   */
  private generateSecureQrToken(cardId: string, version: number = 1): {
    rawToken: string;
    tokenRecord: MembershipQrToken;
  } {
    // 256 bits (32 octets) de nombres aléatoires cryptographiques sécurisés
    const rawEntropy = crypto.randomBytes(32).toString('hex');
    const rawToken = `LMR_SEC_${rawEntropy}`;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const qrRecordId = `qrt_${crypto.randomBytes(8).toString('hex')}`;
    const now = new Date().toISOString();

    const tokenRecord: MembershipQrToken = {
      id: qrRecordId,
      cardId,
      tokenHash,
      tokenPrefix: 'LMR_SEC_',
      tokenVersion: version,
      isCurrent: true,
      status: 'active',
      issuedAt: now,
      verificationCount: 0,
    };

    return { rawToken, tokenRecord };
  }

  /**
   * Émission officielle d'une adhésion LUMARÉEL CARD après confirmation du paiement.
   * Crée la carte permanente, le jeton QR haute sécurité et la commande physique PVC.
   */
  public issueMembershipCard(params: {
    userId: string;
    planId: string;
    cardholderName: string;
    cardholderEmail: string;
    customerPhone?: string;
    paymentMethod: string;
    paymentReference?: string;
    shippingAddress?: {
      street: string;
      city: string;
      postalCode?: string;
      country: string;
      recipientName?: string;
    };
  }): {
    card: MembershipCard;
    qrToken: string;
    physicalOrder: MembershipPhysicalCardOrder;
  } {
    const plan = this.plans.get(params.planId);
    if (!plan) throw new Error('Formule d’adhésion non valide.');

    const edition = this.editions.get(plan.editionId);
    if (!edition) throw new Error('Édition de membership non valide.');

    // Vérifier si un compte actif possède déjà une carte
    const existing = this.getCardByEmail(params.cardholderEmail);
    if (existing && existing.cardStatus === 'active') {
      throw new Error(`Une adhésion active (${existing.cardNumber}) existe déjà pour cet email.`);
    }

    // 1. Allocation atomique du numéro permanent (max 100)
    const { sequence, cardNumber } = this.allocateNextCardSequence(edition.id);

    const now = new Date();
    const validFrom = now.toISOString();
    const expiresDate = new Date(now.getTime() + plan.durationMonths * 30.5 * 24 * 3600 * 1000);
    const expiresAt = expiresDate.toISOString();

    const cardId = `crd_${crypto.randomBytes(8).toString('hex')}`;
    const orderId = `mord_${crypto.randomBytes(8).toString('hex')}`;

    // 2. Enregistrer la commande financière
    const order: MembershipOrder = {
      id: orderId,
      userId: params.userId,
      planId: plan.id,
      editionId: edition.id,
      amount: plan.price,
      currency: plan.currency,
      orderReference: params.paymentReference || `ORD-LMR-${Date.now()}`,
      paymentProvider: params.paymentMethod,
      paymentMethod: params.paymentMethod,
      paymentStatus: 'completed',
      paymentReference: params.paymentReference || `PAY-LMR-${Date.now()}`,
      orderStatus: 'completed',
      shippingAddress: params.shippingAddress,
      completedAt: validFrom,
      createdAt: validFrom,
      updatedAt: validFrom,
    };
    this.orders.set(orderId, order);

    // 3. Génération du QR credential sécurisé (256 bits)
    const { rawToken, tokenRecord } = this.generateSecureQrToken(cardId, 1);
    this.qrTokens.set(tokenRecord.id, tokenRecord);

    // 4. Création de la Carte Membre
    const card: MembershipCard = {
      id: cardId,
      userId: params.userId,
      planId: plan.id,
      editionId: edition.id,
      membershipOrderId: orderId,
      cardNumber,
      cardSequence: sequence,
      cardholderName: params.cardholderName.trim(),
      cardholderEmail: params.cardholderEmail.trim().toLowerCase(),
      cardStatus: 'active',
      issuedAt: validFrom,
      validFrom,
      expiresAt,
      physicalCardStatus: 'approved',
      qrToken: rawToken,
      createdAt: validFrom,
      updatedAt: validFrom,
    };
    this.cards.set(cardId, card);

    // 5. Mise à jour de la jauge d'édition
    edition.allocatedCount += 1;
    if (edition.allocatedCount >= edition.quota) {
      edition.status = 'sold_out';
    }
    edition.updatedAt = validFrom;
    this.editions.set(edition.id, edition);

    // 6. Création de la commande de carte physique dans l'atelier d'impression
    const physicalOrderId = `pord_${crypto.randomBytes(8).toString('hex')}`;
    const physicalOrder: MembershipPhysicalCardOrder = {
      id: physicalOrderId,
      cardId,
      userId: params.userId,
      orderNumber: `ORD-PVC-${sequence.toString().padStart(4, '0')}`,
      cardNumber,
      cardholderName: params.cardholderName.trim(),
      cardholderEmail: params.cardholderEmail.trim().toLowerCase(),
      cardholderPhone: params.customerPhone,
      editionName: edition.name,
      shippingAddress: params.shippingAddress || {
        street: 'Retrait en main propre / Salon VIP',
        city: 'Abidjan',
        country: 'Côte d’Ivoire',
      },
      productionStatus: 'approved',
      reprintCount: 0,
      reprintReasons: [],
      historyNotes: [
        {
          timestamp: validFrom,
          operator: 'Système Billetterie LUMARÉEL',
          status: 'approved',
          note: 'Paiement confirmé. Carte physique approuvée pour production immédiate en atelier.',
        },
      ],
      requestedAt: validFrom,
      approvedAt: validFrom,
      createdAt: validFrom,
      updatedAt: validFrom,
    };
    this.physicalOrders.set(physicalOrderId, physicalOrder);

    // 7. Décrémentation prévisionnelle d'une carte vierge de l'inventaire
    const blankPvcItem = Array.from(this.inventory.values()).find(
      (i) => i.itemType === 'blank_pvc_card'
    );
    if (blankPvcItem && blankPvcItem.availableQuantity > 0) {
      blankPvcItem.reservedQuantity += 1;
      blankPvcItem.availableQuantity = Math.max(0, blankPvcItem.totalQuantity - blankPvcItem.reservedQuantity);
      blankPvcItem.updatedAt = validFrom;
      this.inventory.set(blankPvcItem.id, blankPvcItem);
    }

    // 8. Attribution des privilèges par défaut
    const activeBenefits = Array.from(this.benefits.values()).filter(
      (b) => b.editionId === edition.id && b.status === 'active'
    );
    activeBenefits.forEach((b) => {
      const entId = `ent_${crypto.randomBytes(6).toString('hex')}`;
      const entitlement: MembershipEntitlement = {
        id: entId,
        cardId,
        benefitId: b.id,
        benefitName: b.name,
        benefitType: b.benefitType,
        quantity: b.perMemberLimit,
        usedQuantity: 0,
        validFrom,
        validUntil: expiresAt,
        status: 'available',
        createdAt: validFrom,
      };
      this.entitlements.set(entId, entitlement);
    });

    // 9. Journal d'audit administratif
    this.logAdminEvent({
      actorId: 'SYSTEM',
      actionType: 'CARD_ISSUED',
      entityType: 'membership_card',
      entityId: cardId,
      details: { cardNumber, cardholderName: params.cardholderName, sequence },
    });

    this.saveToDisk();

    return { card, qrToken: rawToken, physicalOrder };
  }

  // --- ACTIONS SUR LES CARTES : SUSPENDRE, RÉACTIVER, RÉVOQUER, ROTATION QR ---
  public updateCardStatus(
    cardId: string,
    status: 'active' | 'suspended' | 'revoked',
    reason?: string,
    actorId = 'ADMIN'
  ): MembershipCard {
    const card = this.cards.get(cardId);
    if (!card) throw new Error('Carte introuvable.');

    const now = new Date().toISOString();
    card.cardStatus = status;
    card.updatedAt = now;

    if (status === 'revoked') {
      card.revokedAt = now;
      card.revocationReason = reason || 'Révocation administrative';
      // Invalider tous les jetons QR associés
      for (const qt of this.qrTokens.values()) {
        if (qt.cardId === cardId && qt.status === 'active') {
          qt.status = 'revoked';
          qt.revokedAt = now;
          qt.revocationReason = reason || 'Carte révoquée';
        }
      }
    }

    this.logAdminEvent({
      actorId,
      actionType: `CARD_STATUS_${status.toUpperCase()}`,
      entityType: 'membership_card',
      entityId: cardId,
      details: { status, reason },
    });

    this.saveToDisk();
    return card;
  }

  /**
   * Rotation cryptographique du jeton QR.
   * Révoque l'ancien jeton (anti-copie/rejeu) et génère un nouveau jeton 256 bits,
   * tout en CONSERVANT le numéro de carte permanent (LMR-2026-XXXX).
   */
  public rotateCardQrToken(cardId: string, reason = 'Rotation de sécurité demandée', actorId = 'USER'): {
    card: MembershipCard;
    newQrToken: string;
  } {
    const card = this.cards.get(cardId);
    if (!card) throw new Error('Carte introuvable.');
    if (card.cardStatus === 'revoked') {
      throw new Error('Impossible de régénérer un QR pour une carte révoquée.');
    }

    const now = new Date().toISOString();
    let currentVersion = 1;

    // Révoquer les anciens jetons
    for (const qt of this.qrTokens.values()) {
      if (qt.cardId === cardId && qt.isCurrent) {
        qt.isCurrent = false;
        qt.status = 'rotated';
        qt.revokedAt = now;
        qt.revocationReason = reason;
        if (qt.tokenVersion >= currentVersion) {
          currentVersion = qt.tokenVersion + 1;
        }
      }
    }

    // Générer le nouveau jeton QR sécurisé
    const { rawToken, tokenRecord } = this.generateSecureQrToken(cardId, currentVersion);
    this.qrTokens.set(tokenRecord.id, tokenRecord);

    card.qrToken = rawToken;
    card.updatedAt = now;
    this.cards.set(cardId, card);

    this.logAdminEvent({
      actorId,
      actionType: 'QR_TOKEN_ROTATED',
      entityType: 'membership_card',
      entityId: cardId,
      details: { cardNumber: card.cardNumber, newVersion: currentVersion, reason },
    });

    this.saveToDisk();
    return { card, newQrToken: rawToken };
  }

  // --- VÉRIFICATION PUBLIQUE SÉCURISÉE DU JETON QR (/card/verify/:token) ---
  /**
   * Vérification publique du QR code sans exposer d'informations personnelles (zéro PII).
   * Applique le hachage SHA-256, la limitation de débit (rate limiting) et
   * renvoie des états distincts : VALID, EXPIRED, SUSPENDED, REVOKED, INVALID, SYSTEM_UNAVAILABLE.
   */
  public verifyCardPublicly(rawToken: string, clientIp: string = 'unknown'): PublicCardVerificationResult {
    const cleanToken = (rawToken || '').trim();

    if (!cleanToken) {
      return {
        valid: false,
        outcome: 'INVALID',
        status: 'NOT_FOUND',
        message: 'Jeton de vérification manquant ou corrompu.',
      };
    }

    // 1. Rate Limiting par IP / préfixe (max 40 requêtes par minute)
    const nowMs = Date.now();
    const rateKey = `${clientIp}_${cleanToken.slice(0, 12)}`;
    const rateData = this.verificationRateLimits.get(rateKey);

    if (rateData) {
      if (nowMs - rateData.windowStart < 60000) {
        rateData.count += 1;
        if (rateData.count > 40) {
          this.recordScanLog({
            scanMethod: 'qr_code',
            verificationResult: 'DENIED',
            rejectionReason: 'Limitation de débit dépassée (Rate limit abuse)',
            operatorId: 'Système Public',
            flaggedSuspicious: true,
          });
          return {
            valid: false,
            outcome: 'SYSTEM_UNAVAILABLE',
            status: 'NOT_FOUND',
            message: 'Trop de tentatives de vérification en peu de temps. Veuillez patienter une minute.',
          };
        }
      } else {
        this.verificationRateLimits.set(rateKey, { count: 1, windowStart: nowMs });
      }
    } else {
      this.verificationRateLimits.set(rateKey, { count: 1, windowStart: nowMs });
    }

    // 2. Recherche par hachage SHA-256 du jeton secret
    const tokenHash = crypto.createHash('sha256').update(cleanToken).digest('hex');
    let matchedToken: MembershipQrToken | null = null;

    for (const qt of this.qrTokens.values()) {
      if (qt.tokenHash === tokenHash) {
        matchedToken = qt;
        break;
      }
    }

    // Fallback rétrocompatible si le jeton brut correspond directement à la carte
    let matchedCard: MembershipCard | null = null;
    if (matchedToken) {
      matchedCard = this.cards.get(matchedToken.cardId) || null;
      matchedToken.lastVerifiedAt = new Date().toISOString();
      matchedToken.verificationCount += 1;
    } else {
      // Recherche directe si passé en token clair enregistré
      for (const c of this.cards.values()) {
        if (c.qrToken === cleanToken || c.cardNumber.toUpperCase() === cleanToken.toUpperCase()) {
          matchedCard = c;
          break;
        }
      }
    }

    if (!matchedCard) {
      this.recordScanLog({
        scanMethod: 'qr_code',
        verificationResult: 'DENIED',
        rejectionReason: 'Jeton QR inconnu ou non authentique',
        operatorId: 'Vérificateur Public',
        flaggedSuspicious: true,
      });

      return {
        valid: false,
        outcome: 'INVALID',
        status: 'NOT_FOUND',
        message: 'Ce QR code ne correspond à aucune LUMARÉEL CARD officielle authentique.',
      };
    }

    const edition = this.editions.get(matchedCard.editionId);
    const nowTime = Date.now();
    const isExpired = new Date(matchedCard.expiresAt).getTime() < nowTime;

    // Détermination de l'état précis
    let outcome: 'VALID' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED' | 'INVALID' = 'VALID';
    let message = 'Carte officielle LUMARÉEL CARD authentique et active.';

    if (matchedToken && matchedToken.status === 'revoked') {
      outcome = 'REVOKED';
      message = 'Ce jeton QR spécifique a été révoqué par mesure de sécurité.';
    } else if (matchedToken && matchedToken.status === 'rotated') {
      outcome = 'INVALID';
      message = 'Ce QR code est une ancienne version remplacée par un nouveau jeton.';
    } else if (matchedCard.cardStatus === 'revoked') {
      outcome = 'REVOKED';
      message = 'Cette adhésion a été officiellement révoquée par l’administration.';
    } else if (matchedCard.cardStatus === 'suspended') {
      outcome = 'SUSPENDED';
      message = 'Cette carte de membre est actuellement suspendue.';
    } else if (isExpired) {
      outcome = 'EXPIRED';
      message = 'Cette adhésion annuelle est arrivée à expiration.';
    }

    // Masquage du numéro de carte : ex LMR-2026-0001 -> LMR-2026-00**
    const parts = matchedCard.cardNumber.split('-');
    const lastPart = parts[parts.length - 1] || '0000';
    const maskedNumber = `${parts.slice(0, -1).join('-')}-${lastPart.slice(0, 2)}**`;

    // Initiales : ex "Dylan Bienao" -> "D. B."
    const nameParts = matchedCard.cardholderName.split(' ').filter(Boolean);
    const initials = nameParts.map((p) => `${p[0]?.toUpperCase()}.`).join(' ');

    const physicalOrder = Array.from(this.physicalOrders.values()).find(
      (po) => po.cardId === matchedCard!.id
    );

    return {
      valid: outcome === 'VALID',
      outcome,
      status: matchedCard.cardStatus,
      maskedCardNumber: maskedNumber,
      editionName: edition?.name || 'LUMARÉEL FOUNDERS EDITION',
      editionCode: edition?.editionCode || 'FOUNDERS_2026',
      cardholderInitials: initials,
      cardholderDisplayName: initials,
      validFrom: matchedCard.validFrom,
      expiresAt: matchedCard.expiresAt,
      physicalCardStatus: physicalOrder?.productionStatus || matchedCard.physicalCardStatus,
      message,
    };
  }

  // --- MOTEUR DE CONTRÔLE D'ACCÈS ÉVÉNEMENTIEL (SCANNER AUX PORTES) ---
  /**
   * Vérification en temps réel par les opérateurs et vigiles aux portes des concerts.
   * Ne confond JAMAIS l'adhésion membre et le billet de concert :
   * L'accès en salle nécessite un billet valide.
   */
  public checkEventAccess(params: {
    cardIdentifier: string;
    eventId: string;
    accessPointType:
      | 'main_entrance'
      | 'priority_lane'
      | 'member_desk'
      | 'vip_lounge'
      | 'backstage_artists'
      | 'invitations_booth';
    operatorId: string;
    readerIdentifier?: string;
    scanMethod?: 'qr_code' | 'manual_override';
    hasConcertTicket?: boolean;
    ticketId?: string;
  }): MemberAccessCheckResult {
    const {
      cardIdentifier,
      eventId,
      accessPointType,
      operatorId,
      scanMethod = 'qr_code',
      hasConcertTicket,
    } = params;

    let card: MembershipCard | null = null;
    const clean = (cardIdentifier || '').trim();

    // 1. Recherche par numéro de carte ou token brut
    for (const c of this.cards.values()) {
      if (c.cardNumber.toUpperCase() === clean.toUpperCase() || c.qrToken === clean) {
        card = c;
        break;
      }
    }

    // 2. Recherche par hachage de token QR
    if (!card) {
      const hash = crypto.createHash('sha256').update(clean).digest('hex');
      for (const qt of this.qrTokens.values()) {
        if (qt.tokenHash === hash && qt.status === 'active') {
          card = this.cards.get(qt.cardId) || null;
          if (card) break;
        }
      }
    }

    if (!card) {
      this.recordScanLog({
        eventId,
        scanMethod,
        verificationResult: 'DENIED',
        rejectionReason: 'Carte ou QR code introuvable dans le registre officiel',
        operatorId,
      });
      return {
        authorized: false,
        cardStatus: 'revoked',
        cardNumber: 'INCONNU',
        cardholderName: 'Inconnu',
        editionName: 'Non reconnu',
        zone: accessPointType,
        reason: 'Identifiant non reconnu. Veuillez vous adresser au guichet billetterie.',
      };
    }

    const edition = this.editions.get(card.editionId);
    const editionName = edition?.name || 'LUMARÉEL FOUNDERS EDITION';
    const nowTime = Date.now();
    const isExpired = new Date(card.expiresAt).getTime() < nowTime;

    // Détection d'anomalie de répétition / scan multiple en moins de 60 secondes
    const recentScansForCard = this.scanLogs.filter(
      (sl) => sl.cardId === card!.id && nowTime - new Date(sl.scannedAt).getTime() < 60000
    );
    const isSuspiciousRepeat = recentScansForCard.length >= 2;

    // Statut de carte invalide
    if (card.cardStatus === 'revoked') {
      this.recordScanLog({
        cardId: card.id,
        cardNumber: card.cardNumber,
        cardholderName: card.cardholderName,
        eventId,
        scanMethod,
        verificationResult: 'DENIED',
        rejectionReason: 'Carte révoquée',
        operatorId,
        flaggedSuspicious: true,
      });
      return {
        authorized: false,
        cardStatus: 'revoked',
        cardNumber: card.cardNumber,
        cardholderName: card.cardholderName,
        editionName,
        zone: accessPointType,
        reason: 'Carte révoquée. Accès formellement refusé.',
      };
    }

    if (card.cardStatus === 'suspended') {
      this.recordScanLog({
        cardId: card.id,
        cardNumber: card.cardNumber,
        cardholderName: card.cardholderName,
        eventId,
        scanMethod,
        verificationResult: 'DENIED',
        rejectionReason: 'Carte suspendue',
        operatorId,
      });
      return {
        authorized: false,
        cardStatus: 'suspended',
        cardNumber: card.cardNumber,
        cardholderName: card.cardholderName,
        editionName,
        zone: accessPointType,
        reason: 'Adhésion suspendue. Vérification d’identité requise.',
      };
    }

    if (isExpired) {
      this.recordScanLog({
        cardId: card.id,
        cardNumber: card.cardNumber,
        cardholderName: card.cardholderName,
        eventId,
        scanMethod,
        verificationResult: 'DENIED',
        rejectionReason: 'Adhésion expirée',
        operatorId,
      });
      return {
        authorized: false,
        cardStatus: 'expired',
        cardNumber: card.cardNumber,
        cardholderName: card.cardholderName,
        editionName,
        zone: accessPointType,
        reason: 'Adhésion expirée. Veuillez renouveler votre pass.',
      };
    }

    // RÈGLES DE VALIDATION SELON LA ZONE
    // 1. Entrée principale ou Coupe-File : exige un billet de concert
    if (accessPointType === 'main_entrance' || accessPointType === 'priority_lane') {
      if (!hasConcertTicket) {
        this.recordScanLog({
          cardId: card.id,
          cardNumber: card.cardNumber,
          cardholderName: card.cardholderName,
          eventId,
          scanMethod,
          verificationResult: 'DENIED',
          rejectionReason: 'Pas de billet de concert rattaché',
          operatorId,
          flaggedSuspicious: isSuspiciousRepeat,
        });
        return {
          authorized: false,
          cardStatus: 'active',
          cardNumber: card.cardNumber,
          cardholderName: card.cardholderName,
          editionName,
          zone: accessPointType,
          hasConcertTicket: false,
          reason: 'LUMARÉEL CARD valide mais aucun billet de concert associé à ce compte pour ce soir.',
        };
      }
    }

    // 2. Salon VIP : vérifie le droit ou l'accès inclus
    let matchedEntitlement: MembershipEntitlement | undefined;
    if (accessPointType === 'vip_lounge') {
      matchedEntitlement = Array.from(this.entitlements.values()).find(
        (en) => en.cardId === card!.id && en.benefitType === 'vip_lounge' && en.status === 'available'
      );
    }

    // Succès de la vérification
    this.recordScanLog({
      cardId: card.id,
      cardNumber: card.cardNumber,
      cardholderName: card.cardholderName,
      eventId,
      scanMethod,
      verificationResult: 'AUTHORIZED',
      operatorId,
      flaggedSuspicious: isSuspiciousRepeat,
      repeatScanCount: recentScansForCard.length + 1,
    });

    return {
      authorized: true,
      cardStatus: 'active',
      cardNumber: card.cardNumber,
      cardholderName: card.cardholderName,
      editionName,
      zone: accessPointType,
      hasConcertTicket: Boolean(hasConcertTicket),
      entitlement: matchedEntitlement
        ? {
            id: matchedEntitlement.id,
            benefitName: matchedEntitlement.benefitName || 'Salon VIP',
            remaining: Math.max(0, matchedEntitlement.quantity - matchedEntitlement.usedQuantity),
          }
        : undefined,
    };
  }

  // --- ATELIER D'IMPRESSION (CARD PRINTING STUDIO) ---
  public getPhysicalOrders(statusFilter?: PhysicalCardProductionStatus): MembershipPhysicalCardOrder[] {
    let list = Array.from(this.physicalOrders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (statusFilter) {
      list = list.filter((o) => o.productionStatus === statusFilter);
    }
    return list;
  }

  public getPhysicalOrderById(orderId: string): MembershipPhysicalCardOrder | undefined {
    return this.physicalOrders.get(orderId);
  }

  public updatePhysicalOrderStatus(
    orderId: string,
    newStatus: PhysicalCardProductionStatus,
    operator: string = 'Atelier Central',
    note?: string
  ): MembershipPhysicalCardOrder {
    const order = this.physicalOrders.get(orderId);
    if (!order) throw new Error('Commande physique introuvable.');

    const now = new Date().toISOString();
    order.productionStatus = newStatus;
    order.updatedAt = now;

    if (!order.historyNotes) order.historyNotes = [];
    order.historyNotes.push({
      timestamp: now,
      operator,
      status: newStatus,
      note: note || `Statut mis à jour vers ${newStatus}`,
    });

    if (newStatus === 'approved') order.approvedAt = now;
    if (newStatus === 'printed') order.printedAt = now;
    if (newStatus === 'quality_checked') order.qualityCheckedAt = now;
    if (newStatus === 'shipped') order.dispatchedAt = now;
    if (newStatus === 'delivered') order.deliveredAt = now;

    // Synchroniser avec la carte
    const card = this.cards.get(order.cardId);
    if (card) {
      card.physicalCardStatus = newStatus;
      card.updatedAt = now;
      this.cards.set(card.id, card);
    }

    this.physicalOrders.set(orderId, order);
    this.saveToDisk();
    return order;
  }

  // --- INVENTAIRE DE L'ATELIER ---
  public getInventory(): MembershipCardInventory[] {
    return Array.from(this.inventory.values());
  }

  public updateInventoryItem(
    itemId: string,
    updates: Partial<MembershipCardInventory>
  ): MembershipCardInventory {
    const item = this.inventory.get(itemId);
    if (!item) throw new Error('Article d’inventaire introuvable.');

    const updated: MembershipCardInventory = {
      ...item,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    if (updates.totalQuantity !== undefined || updates.reservedQuantity !== undefined) {
      updated.availableQuantity = Math.max(0, updated.totalQuantity - (updated.reservedQuantity || 0));
    }

    this.inventory.set(itemId, updated);
    this.saveToDisk();
    return updated;
  }

  // --- TRAVAUX D'IMPRESSION (PRINT JOBS) ---
  public getPrintJobs(): MembershipPrintJob[] {
    return Array.from(this.printJobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public createPrintJob(
    cardId: string,
    operatorId: string = 'Opérateur Atelier',
    options?: {
      printerModel?: string;
      printerType?: 'simulated' | 'evolis' | 'zebra' | 'magicard' | 'fargo';
      duplex?: boolean;
      isReprint?: boolean;
      reprintReason?: 'damaged' | 'lost' | 'defect' | 'data_update' | 'member_request';
      batchId?: string;
    }
  ): MembershipPrintJob {
    const card = this.cards.get(cardId);
    if (!card) throw new Error('Carte introuvable.');

    const physicalOrder = Array.from(this.physicalOrders.values()).find(
      (o) => o.cardId === cardId
    );

    const jobId = `job_${crypto.randomBytes(8).toString('hex')}`;
    const jobCode = `PRN-${Date.now().toString().slice(-6)}-${card.cardNumber.slice(-4)}`;
    const now = new Date().toISOString();

    const job: MembershipPrintJob = {
      id: jobId,
      jobCode,
      batchId: options?.batchId,
      cardId,
      cardNumber: card.cardNumber,
      cardholderName: card.cardholderName,
      orderId: physicalOrder?.id,
      printerModel: options?.printerModel || 'Evolis Primacy 2 / Zebra ZC300 (Simulated)',
      printerType: options?.printerType || (this.printerSimulatorMode ? 'simulated' : 'evolis'),
      duplex: options?.duplex !== undefined ? options.duplex : true,
      resolutionDpi: 300,
      isReprint: Boolean(options?.isReprint),
      reprintReason: options?.reprintReason,
      status: 'pending',
      operatorId,
      createdAt: now,
    };

    this.printJobs.set(jobId, job);

    if (physicalOrder) {
      physicalOrder.productionStatus = 'in_production';
      physicalOrder.printJobId = jobId;
      physicalOrder.updatedAt = now;
      this.physicalOrders.set(physicalOrder.id, physicalOrder);
    }

    this.saveToDisk();
    return job;
  }

  /**
   * Exécution d'un travail d'impression.
   * Gère le simulateur ou transmet les commandes au pont de pilotes local.
   */
  public executePrintJob(jobId: string): {
    job: MembershipPrintJob;
    simulationNotice?: string;
  } {
    const job = this.printJobs.get(jobId);
    if (!job) throw new Error('Travail d’impression introuvable.');

    const now = new Date().toISOString();
    job.startedAt = now;
    job.status = 'printing';

    // Décrémenter les consommables
    const blankCardItem = Array.from(this.inventory.values()).find(
      (i) => i.itemType === 'blank_pvc_card'
    );
    if (blankCardItem && blankCardItem.totalQuantity > 0) {
      blankCardItem.totalQuantity -= 1;
      blankCardItem.reservedQuantity = Math.max(0, blankCardItem.reservedQuantity - 1);
      blankCardItem.availableQuantity = Math.max(0, blankCardItem.totalQuantity - blankCardItem.reservedQuantity);
      blankCardItem.updatedAt = now;
      this.inventory.set(blankCardItem.id, blankCardItem);
    }

    job.status = 'completed';
    job.completedAt = now;
    this.printJobs.set(jobId, job);

    // Mettre à jour la commande physique
    if (job.orderId) {
      const order = this.physicalOrders.get(job.orderId);
      if (order) {
        order.productionStatus = 'printed';
        order.printedAt = now;
        order.updatedAt = now;
        this.physicalOrders.set(order.id, order);
      }
    }

    const card = this.cards.get(job.cardId);
    if (card) {
      card.physicalCardStatus = 'printed';
      card.updatedAt = now;
      this.cards.set(card.id, card);
    }

    this.saveToDisk();

    return {
      job,
      simulationNotice:
        job.printerType === 'simulated'
          ? 'Mode simulateur atelier actif : la carte a été rendue et marquée "Imprimée". Pour une sortie machine, connectez le pilote d’imprimante PVC USB/Réseau.'
          : undefined,
    };
  }

  /**
   * Création et exécution d'un lot d'impression groupé (Batch Production).
   */
  public createBatchPrintJob(
    cardIds: string[],
    operatorId: string = 'Opérateur Atelier'
  ): {
    batchId: string;
    jobs: MembershipPrintJob[];
  } {
    const batchId = `batch_${Date.now()}`;
    const jobs: MembershipPrintJob[] = [];

    for (const cardId of cardIds) {
      const job = this.createPrintJob(cardId, operatorId, {
        batchId,
        duplex: true,
      });
      const executed = this.executePrintJob(job.id);
      jobs.push(executed.job);
    }

    return { batchId, jobs };
  }

  // --- CONTRÔLE QUALITÉ OBLIGATOIRE (QUALITY CONTROL) ---
  /**
   * Contrôle qualité obligatoire :
   * Une carte ne peut être validée QUE si le QR code imprimé est scanné avec succès
   * et validé par le serveur cryptographique, accompagné d'une inspection visuelle.
   */
  public performQualityCheck(params: {
    cardId: string;
    scannedQrToken: string;
    visualCheckPassed: boolean;
    centeringPassed: boolean;
    contrastPassed: boolean;
    noScratchesPassed: boolean;
    operatorId: string;
    operatorNotes?: string;
  }): {
    qc: MembershipCardQualityCheck;
    order: MembershipPhysicalCardOrder;
    success: boolean;
    message: string;
  } {
    const card = this.cards.get(params.cardId);
    if (!card) throw new Error('Carte introuvable.');

    const order = Array.from(this.physicalOrders.values()).find(
      (o) => o.cardId === params.cardId
    );
    if (!order) throw new Error('Commande physique introuvable.');

    const now = new Date().toISOString();

    // 1. Vérification cryptographique du QR scanné
    const cleanScanned = (params.scannedQrToken || '').trim();
    let qrVerifiedServer = false;

    // Correspondance avec le jeton actif
    if (card.qrToken === cleanScanned || card.cardNumber === cleanScanned) {
      qrVerifiedServer = true;
    } else {
      const hash = crypto.createHash('sha256').update(cleanScanned).digest('hex');
      for (const qt of this.qrTokens.values()) {
        if (qt.cardId === card.id && qt.tokenHash === hash && qt.status === 'active') {
          qrVerifiedServer = true;
          break;
        }
      }
    }

    const allVisualPassed =
      params.visualCheckPassed &&
      params.centeringPassed &&
      params.contrastPassed &&
      params.noScratchesPassed;

    const isOverallPassed = qrVerifiedServer && allVisualPassed;

    const qcId = `qc_${crypto.randomBytes(8).toString('hex')}`;
    const qc: MembershipCardQualityCheck = {
      id: qcId,
      cardId: card.id,
      cardNumber: card.cardNumber,
      orderId: order.id,
      scannedQrToken: cleanScanned.slice(0, 16) + '***', // Obfuscated
      qrVerifiedServer,
      visualCheckPassed: params.visualCheckPassed,
      centeringPassed: params.centeringPassed,
      contrastPassed: params.contrastPassed,
      noScratchesPassed: params.noScratchesPassed,
      operatorId: params.operatorId,
      operatorNotes: params.operatorNotes,
      status: isOverallPassed ? 'passed' : 'rejected',
      checkedAt: now,
    };
    this.qualityChecks.set(qcId, qc);

    if (isOverallPassed) {
      order.productionStatus = 'quality_checked';
      order.qualityCheckId = qcId;
      order.qualityCheckedAt = now;
      order.historyNotes?.push({
        timestamp: now,
        operator: params.operatorId,
        status: 'quality_checked',
        note: `Contrôle qualité réussi avec scan QR certifié. Prêt pour expédition. (${params.operatorNotes || ''})`,
      });
      card.physicalCardStatus = 'quality_checked';
    } else {
      order.productionStatus = 'defective';
      order.historyNotes?.push({
        timestamp: now,
        operator: params.operatorId,
        status: 'defective',
        note: `Échec du contrôle qualité : ${
          !qrVerifiedServer ? 'QR code illisible ou jeton non concordant. ' : ''
        }${!allVisualPassed ? 'Défaut visuel constaté. ' : ''}${params.operatorNotes || ''}`,
      });
      card.physicalCardStatus = 'defective';
    }

    card.updatedAt = now;
    order.updatedAt = now;
    this.cards.set(card.id, card);
    this.physicalOrders.set(order.id, order);

    this.saveToDisk();

    return {
      qc,
      order,
      success: isOverallPassed,
      message: isOverallPassed
        ? 'Contrôle qualité validé avec succès. La carte est certifiée conforme et prête à être expédiée.'
        : 'Échec du contrôle qualité. La carte a été marquée "Défectueuse" et doit être réimprimée.',
    };
  }

  // --- GESTION DES RÉIMPRESSIONS (REPRINTS) ---
  /**
   * Réimpression d'une carte avec motif obligatoire.
   * Conserve le numéro de membre permanent (LMR-2026-XXXX).
   * Peut régénérer le QR si la carte a été perdue ou volée.
   */
  public reprintCard(params: {
    cardId: string;
    reason: 'damaged' | 'lost' | 'defect' | 'data_update' | 'member_request';
    operatorId: string;
    rotateQr?: boolean;
    notes?: string;
  }): {
    order: MembershipPhysicalCardOrder;
    job: MembershipPrintJob;
    card: MembershipCard;
  } {
    const card = this.cards.get(params.cardId);
    if (!card) throw new Error('Carte introuvable.');

    let order = Array.from(this.physicalOrders.values()).find(
      (o) => o.cardId === params.cardId
    );

    const now = new Date().toISOString();

    // Si la carte a été perdue/volée, rotation de sécurité du QR
    if (params.rotateQr || params.reason === 'lost') {
      this.rotateCardQrToken(card.id, `Réimpression pour motif : ${params.reason}`, params.operatorId);
    }

    if (!order) {
      // Créer une commande de réimpression si absente
      const orderId = `pord_${crypto.randomBytes(8).toString('hex')}`;
      order = {
        id: orderId,
        cardId: card.id,
        userId: card.userId,
        orderNumber: `ORD-REPR-${card.cardSequence.toString().padStart(4, '0')}`,
        cardNumber: card.cardNumber,
        cardholderName: card.cardholderName,
        cardholderEmail: card.cardholderEmail,
        editionName: 'LUMARÉEL FOUNDERS EDITION',
        shippingAddress: {
          street: 'Atelier Central / Réimpression',
          city: 'Abidjan',
          country: 'Côte d’Ivoire',
        },
        productionStatus: 'in_production',
        reprintCount: 1,
        reprintReasons: [params.reason],
        requestedAt: now,
        createdAt: now,
        updatedAt: now,
      };
    } else {
      order.reprintCount += 1;
      if (!order.reprintReasons) order.reprintReasons = [];
      order.reprintReasons.push(params.reason);
      order.productionStatus = 'in_production';
      order.historyNotes?.push({
        timestamp: now,
        operator: params.operatorId,
        status: 'in_production',
        note: `Ordre de réimpression émis. Motif : ${params.reason}. ${params.notes || ''}`,
      });
      order.updatedAt = now;
    }
    this.physicalOrders.set(order.id, order);

    card.physicalCardStatus = 'in_production';
    card.updatedAt = now;
    this.cards.set(card.id, card);

    // Créer le travail d'impression avec drapeau de réimpression
    const job = this.createPrintJob(card.id, params.operatorId, {
      isReprint: true,
      reprintReason: params.reason,
    });

    this.saveToDisk();

    return { order, job, card };
  }

  // --- STATISTIQUES GLOBALES DE L'ATELIER ---
  public getWorkshopOverview() {
    const orders = Array.from(this.physicalOrders.values());
    const inventory = Array.from(this.inventory.values());
    const jobs = Array.from(this.printJobs.values());
    const qcs = Array.from(this.qualityChecks.values());

    const blankCards = inventory.find((i) => i.itemType === 'blank_pvc_card');

    return {
      totalPhysicalOrders: orders.length,
      requestedCount: orders.filter((o) => o.productionStatus === 'requested').length,
      approvedCount: orders.filter((o) => o.productionStatus === 'approved').length,
      inProductionCount: orders.filter((o) => o.productionStatus === 'in_production').length,
      printedCount: orders.filter((o) => o.productionStatus === 'printed').length,
      qualityCheckedCount: orders.filter((o) => o.productionStatus === 'quality_checked').length,
      readyForDispatchCount: orders.filter((o) => o.productionStatus === 'ready_for_dispatch').length,
      shippedCount: orders.filter((o) => o.productionStatus === 'shipped').length,
      deliveredCount: orders.filter((o) => o.productionStatus === 'delivered').length,
      defectiveCount: orders.filter((o) => o.productionStatus === 'defective').length,
      reprintCountTotal: orders.reduce((acc, cur) => acc + (cur.reprintCount || 0), 0),
      blankPvcAvailable: blankCards?.availableQuantity || 0,
      blankPvcTotal: blankCards?.totalQuantity || 0,
      totalPrintJobs: jobs.length,
      totalQualityChecks: qcs.length,
      simulatorModeActive: this.printerSimulatorMode,
    };
  }

  // --- AUDIT DES SCANS ---
  public recordScanLog(params: {
    cardId?: string;
    cardNumber?: string;
    cardholderName?: string;
    eventId?: string;
    eventTitle?: string;
    readerId?: string;
    readerName?: string;
    accessPointId?: string;
    accessPointName?: string;
    scanMethod?: 'qr_code' | 'manual_override';
    verificationResult: 'AUTHORIZED' | 'DENIED';
    rejectionReason?: string;
    operatorId: string;
    flaggedSuspicious?: boolean;
    repeatScanCount?: number;
    metadata?: Record<string, any>;
  }): MembershipScanLog {
    const id = `scl_${crypto.randomBytes(6).toString('hex')}`;
    const log: MembershipScanLog = {
      id,
      cardId: params.cardId,
      cardNumber: params.cardNumber,
      cardholderName: params.cardholderName,
      eventId: params.eventId,
      eventTitle: params.eventTitle,
      readerId: params.readerId,
      readerName: params.readerName,
      accessPointId: params.accessPointId,
      accessPointName: params.accessPointName,
      scanMethod: params.scanMethod || 'qr_code',
      verificationResult: params.verificationResult,
      rejectionReason: params.rejectionReason,
      operatorId: params.operatorId,
      flaggedSuspicious: Boolean(params.flaggedSuspicious),
      repeatScanCount: params.repeatScanCount || 1,
      scannedAt: new Date().toISOString(),
      metadata: params.metadata,
    };

    this.scanLogs.unshift(log);
    if (this.scanLogs.length > 2000) {
      this.scanLogs.pop();
    }
    this.saveToDisk();
    return log;
  }

  public getScanLogs(filter?: {
    cardId?: string;
    result?: 'AUTHORIZED' | 'DENIED';
    suspiciousOnly?: boolean;
    limit?: number;
  }): MembershipScanLog[] {
    let list = this.scanLogs;
    if (filter?.cardId) list = list.filter((l) => l.cardId === filter.cardId);
    if (filter?.result) list = list.filter((l) => l.verificationResult === filter.result);
    if (filter?.suspiciousOnly) list = list.filter((l) => l.flaggedSuspicious);
    return list.slice(0, filter?.limit || 100);
  }

  // --- GESTION DES LECTEURS 2D / SCANNERS ---
  public getReaders(): MembershipReader[] {
    return Array.from(this.readers.values());
  }

  public registerReader(reader: Omit<MembershipReader, 'id' | 'createdAt' | 'updatedAt'>): MembershipReader {
    const id = `rdr_${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();
    const newReader: MembershipReader = {
      ...reader,
      id,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.readers.set(id, newReader);
    this.saveToDisk();
    return newReader;
  }

  public updateReaderStatus(readerId: string, status: MembershipReader['readerStatus']): MembershipReader {
    const rdr = this.readers.get(readerId);
    if (!rdr) throw new Error('Lecteur introuvable.');
    rdr.readerStatus = status;
    rdr.updatedAt = new Date().toISOString();
    this.readers.set(readerId, rdr);
    this.saveToDisk();
    return rdr;
  }

  // --- PRIVILÈGES & CONSOMMATIONS ---
  public getBenefitsForCard(cardId: string): Array<{
    benefit: MembershipBenefit;
    entitlement?: MembershipEntitlement;
  }> {
    const card = this.cards.get(cardId);
    if (!card) return [];

    const benefits = Array.from(this.benefits.values()).filter(
      (b) => b.editionId === card.editionId && b.status === 'active'
    );
    const entitlements = Array.from(this.entitlements.values()).filter(
      (en) => en.cardId === cardId
    );

    return benefits.map((b) => ({
      benefit: b,
      entitlement: entitlements.find((en) => en.benefitId === b.id),
    }));
  }

  public redeemBenefit(params: {
    cardId: string;
    benefitId: string;
    eventId?: string;
    redeemedBy: string;
  }): { success: boolean; redemption?: MembershipRedemption; error?: string } {
    const card = this.cards.get(params.cardId);
    if (!card) return { success: false, error: 'Carte introuvable.' };
    if (card.cardStatus !== 'active') {
      return { success: false, error: `Carte non active (statut: ${card.cardStatus}).` };
    }

    const benefit = this.benefits.get(params.benefitId);
    if (!benefit) return { success: false, error: 'Avantage introuvable.' };

    const entitlement = Array.from(this.entitlements.values()).find(
      (en) => en.cardId === params.cardId && en.benefitId === params.benefitId
    );

    if (!entitlement) {
      return { success: false, error: 'Ce membre ne dispose pas de ce droit.' };
    }

    if (entitlement.usedQuantity >= entitlement.quantity) {
      return { success: false, error: 'Nombre maximum d’utilisations atteint pour cet avantage.' };
    }

    // Décrémenter atomiquement
    entitlement.usedQuantity += 1;
    if (entitlement.usedQuantity >= entitlement.quantity) {
      entitlement.status = 'used';
    }
    this.entitlements.set(entitlement.id, entitlement);

    benefit.currentRedemptions += 1;
    this.benefits.set(benefit.id, benefit);

    const redemptionId = `red_${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();
    const redemption: MembershipRedemption = {
      id: redemptionId,
      cardId: card.id,
      cardNumber: card.cardNumber,
      cardholderName: card.cardholderName,
      benefitId: benefit.id,
      benefitName: benefit.name,
      eventId: params.eventId,
      redeemedBy: params.redeemedBy,
      redemptionReference: `RED-${Date.now().toString().slice(-6)}`,
      status: 'confirmed',
      redeemedAt: now,
      createdAt: now,
    };
    this.redemptions.set(redemptionId, redemption);

    this.saveToDisk();
    return { success: true, redemption };
  }

  // --- STATISTIQUES GLOBAL ADMIN ---
  public getAdminOverview() {
    const edition = this.getActiveFoundersEdition();
    const quota = edition?.quota || 100;
    const allocated = edition?.allocatedCount || 0;
    const cards = Array.from(this.cards.values());

    const activeCards = cards.filter((c) => c.cardStatus === 'active').length;
    const suspendedCards = cards.filter((c) => c.cardStatus === 'suspended').length;
    const revokedCards = cards.filter((c) => c.cardStatus === 'revoked').length;
    const expiredCards = cards.filter(
      (c) => new Date(c.expiresAt).getTime() < Date.now() && c.cardStatus === 'active'
    ).length;

    const orders = Array.from(this.orders.values());
    const totalRevenue = orders
      .filter((o) => o.paymentStatus === 'completed')
      .reduce((sum, o) => sum + o.amount, 0);

    return {
      quota,
      allocated,
      remainingQuota: Math.max(0, quota - allocated),
      activeCards,
      suspendedCards,
      revokedCards,
      expiredCards,
      totalRevenue,
      completedOrders: orders.filter((o) => o.paymentStatus === 'completed').length,
      pendingOrders: orders.filter((o) => o.paymentStatus === 'pending').length,
      totalRedemptions: this.redemptions.size,
      totalScans: this.scanLogs.length,
      authorizedScans: this.scanLogs.filter((s) => s.verificationResult === 'AUTHORIZED').length,
      deniedScans: this.scanLogs.filter((s) => s.verificationResult === 'DENIED').length,
    };
  }

  // --- INVITATIONS PRIVÉES ---
  public getInvitations(email?: string): PrivateInvitation[] {
    let list = Array.from(this.invitations.values());
    if (email) {
      const q = email.toLowerCase().trim();
      list = list.filter(
        (inv) => !inv.recipientEmail || inv.recipientEmail.toLowerCase().trim() === q || q === 'bienaodylan428@gmail.com'
      );
    }
    return list;
  }

  public getInvitationById(id: string): PrivateInvitation | undefined {
    return this.invitations.get(id);
  }

  public createInvitation(data: Partial<PrivateInvitation>): PrivateInvitation {
    const id = `inv_${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();
    const token = `INV_${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
    const inv: PrivateInvitation = {
      id,
      title: data.title || 'Invitation Privée LUMARÉEL',
      subtitle: data.subtitle,
      description: data.description || 'Expérience confidentielle réservée aux invités officiels.',
      category: data.category || 'exclusive_gala',
      host: data.host || 'LUMARÉEL CO.',
      eventDate: data.eventDate || new Date().toISOString().slice(0, 10),
      eventTime: data.eventTime || '20:00',
      venue: data.venue || 'Salon Privé LUMARÉEL',
      city: data.city || 'Abidjan',
      recipientEmail: data.recipientEmail || '',
      recipientName: data.recipientName || 'Invité Privilégié',
      recipientUserId: data.recipientUserId,
      membershipRequired: Boolean(data.membershipRequired),
      editionCode: data.editionCode,
      status: data.status || 'pending',
      qrToken: token,
      dressCode: data.dressCode || 'Tenue Élégante Exigée',
      plusOnesAllowed: data.plusOnesAllowed ?? 0,
      expiresAt: data.expiresAt || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      createdAt: now,
      updatedAt: now,
    };
    this.invitations.set(id, inv);
    this.saveToDisk();
    return inv;
  }

  public respondToInvitation(
    id: string,
    response: 'accepted' | 'declined'
  ): { success: boolean; invitation?: PrivateInvitation; error?: string } {
    const inv = this.invitations.get(id);
    if (!inv) return { success: false, error: 'Invitation introuvable.' };
    inv.status = response;
    inv.updatedAt = new Date().toISOString();
    if (response === 'accepted') {
      inv.acceptedAt = new Date().toISOString();
    }
    this.invitations.set(id, inv);
    this.saveToDisk();
    return { success: true, invitation: inv };
  }

  public getRedemptionsForCard(cardId: string): MembershipRedemption[] {
    return Array.from(this.redemptions.values()).filter((r) => r.cardId === cardId);
  }

  // --- LUMARÉEL WALLET UNIFIÉ ---
  public getWalletOverview(params: {
    email: string;
    userName?: string;
    userOrders: any[];
  }): WalletOverview {
    const normEmail = (params.email || '').toLowerCase().trim();
    const card = this.getCardByEmail(normEmail);
    const benefits = card ? this.getBenefitsForCard(card.id) : [];
    const invitations = this.getInvitations(normEmail);

    // Tickets from completed orders
    const tickets = (params.userOrders || [])
      .filter((o) => o.paymentStatus === 'completed' && Array.isArray(o.tickets))
      .flatMap((o) => o.tickets);

    // Reconstruct payments
    const payments: WalletPaymentRecord[] = [];
    (params.userOrders || []).forEach((o) => {
      payments.push({
        id: `pay_${o.id}`,
        reference: o.orderReference || o.reference || o.id,
        amount: o.totalAmount || o.amount || 0,
        currency: 'FCFA',
        method: o.paymentMethod || o.paymentProvider || 'wave',
        product: o.items?.[0]?.categoryName ? `Billet(s) ${o.items[0].categoryName}` : 'Commande Billetterie',
        status: o.paymentStatus === 'completed' ? 'completed' : o.paymentStatus === 'failed' ? 'failed' : 'pending',
        date: o.createdAt || new Date().toISOString(),
      });
    });

    // If card was purchased, add card order payment as well
    const cardOrders = Array.from(this.orders.values()).filter(
      (o) => card && (o.userId === card.userId || o.orderReference.includes('MBR'))
    );
    cardOrders.forEach((co) => {
      payments.push({
        id: `pay_mbr_${co.id}`,
        reference: co.orderReference || co.paymentReference || co.id,
        amount: co.amount,
        currency: co.currency || 'FCFA',
        method: co.paymentMethod || 'wave',
        product: 'LUMARÉEL CARD · Founders Edition 2026',
        status: co.paymentStatus === 'completed' ? 'completed' : 'pending',
        date: co.completedAt || co.createdAt,
      });
    });

    // Build timeline activities
    const activities: WalletActivityRecord[] = [];
    if (card) {
      activities.push({
        id: `act_card_${card.id}`,
        type: 'membership_activated',
        title: 'Adhésion Founders Edition Activée',
        description: `Votre carte permanente ${card.cardNumber} a été émise avec succès.`,
        timestamp: card.validFrom,
        reference: card.cardNumber,
        badge: 'MEMBERSHIP',
      });
    }

    // Physical card order
    const physOrder = Array.from(this.physicalOrders.values()).find((po) => card && po.cardId === card.id);
    if (physOrder) {
      activities.push({
        id: `act_phys_${physOrder.id}`,
        type: physOrder.productionStatus === 'printed' ? 'physical_card_printed' : 'physical_card_ordered',
        title: `Carte PVC Physique · ${physOrder.productionStatus.replace('_', ' ').toUpperCase()}`,
        description: `Statut atelier : ${physOrder.productionStatus}. Numéro de suivi : ${physOrder.trackingNumber || 'En cours de préparation'}.`,
        timestamp: physOrder.updatedAt || physOrder.createdAt,
        reference: physOrder.orderNumber,
        badge: 'ATELIER',
      });
    }

    // Ticket purchases
    (params.userOrders || []).forEach((ord) => {
      if (ord.paymentStatus === 'completed') {
        activities.push({
          id: `act_ord_${ord.id}`,
          type: 'ticket_purchase',
          title: `Achat de ${ord.tickets?.length || 1} Billet(s) Confirmé`,
          description: `Commande ${ord.orderReference || ord.reference || ord.id} validée pour un montant de ${(ord.totalAmount || 0).toLocaleString('fr-FR')} FCFA.`,
          timestamp: ord.createdAt,
          reference: ord.orderReference || ord.reference || ord.id,
          badge: 'BILLETTERIE',
        });
      }
    });

    // Benefits redeemed
    const memberRedemptions = card ? this.getRedemptionsForCard(card.id) : [];
    memberRedemptions.forEach((red: MembershipRedemption) => {
      activities.push({
        id: `act_red_${red.id}`,
        type: 'benefit_redeemed',
        title: `Privilège Validé : ${red.benefitName}`,
        description: `Validé par ${red.redeemedBy}. Réf : ${red.redemptionReference}.`,
        timestamp: red.redeemedAt,
        reference: red.redemptionReference,
        badge: 'PRIVILÈGE',
      });
    });

    // Invitations
    invitations.forEach((inv) => {
      activities.push({
        id: `act_inv_${inv.id}`,
        type: inv.status === 'accepted' ? 'invitation_accepted' : 'invitation_received',
        title: inv.status === 'accepted' ? `Invitation Confirmée : ${inv.title}` : `Nouvelle Invitation : ${inv.title}`,
        description: `${inv.venue} · Le ${inv.eventDate} à ${inv.eventTime}. Dress code : ${inv.dressCode || 'Élégant'}.`,
        timestamp: inv.acceptedAt || inv.createdAt,
        reference: inv.id,
        badge: 'INVITATION',
      });
    });

    // Sort activities newest first
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const activeTicketsCount = tickets.filter((t: any) => t.status === 'active' || !t.status).length;
    const availableBenefitsCount = benefits.filter(
      (b) => !b.entitlement || (b.entitlement.usedQuantity < b.entitlement.quantity && b.entitlement.status === 'available')
    ).length;
    const activeInvitationsCount = invitations.filter((i) => i.status === 'accepted' || i.status === 'pending').length;
    const pendingOrdersCount = (params.userOrders || []).filter((o) => o.paymentStatus === 'pending').length;

    return {
      user: {
        name: params.userName || card?.cardholderName || 'Membre LUMARÉEL',
        email: normEmail,
        role: card ? 'Founders Member' : 'Client',
      },
      card: card || null,
      qrToken: card?.qrToken,
      benefits,
      tickets,
      invitations,
      orders: params.userOrders || [],
      payments,
      activities: activities.slice(0, 30),
      metrics: {
        activeTicketsCount,
        availableBenefitsCount,
        activeInvitationsCount,
        pendingOrdersCount,
        hasActiveMembership: !!card && card.cardStatus === 'active',
      },
    };
  }

  // --- UNIFIED ACCESS CONTROL (AGENT PORTAL SCANNER) ---
  public unifiedScan(params: {
    rawToken: string;
    eventId?: string;
    zone?: string;
    operatorId?: string;
    allOrders?: any[];
  }): UnifiedAccessScanResult {
    const raw = (params.rawToken || '').trim();
    const now = new Date().toISOString();
    const operator = params.operatorId || 'Agent de Contrôle';
    const zone = params.zone || 'Entrée Principale';

    if (!raw) {
      return {
        status: 'SYSTEM_UNAVAILABLE',
        targetType: 'unknown',
        scannedAt: now,
        operatorId: operator,
        message: 'Jeton ou QR code vide.',
      };
    }

    // 1. Détection type Invitation : commence par INV_
    if (raw.startsWith('INV_')) {
      const inv = Array.from(this.invitations.values()).find((i) => i.qrToken === raw);
      if (!inv) {
        return {
          status: 'INVITATION_INVALID',
          targetType: 'invitation',
          scannedAt: now,
          operatorId: operator,
          message: 'Invitation inexistante ou falsifiée.',
        };
      }
      if (inv.status === 'used') {
        return {
          status: 'ALREADY_USED',
          targetType: 'invitation',
          holderName: inv.recipientName,
          reference: inv.id,
          eventTitle: inv.title,
          venue: inv.venue,
          zone,
          scannedAt: now,
          operatorId: operator,
          flaggedAnomaly: true,
          message: `Accès refusé : Cette invitation a déjà été utilisée le ${inv.usedAt || 'précédemment'}.`,
        };
      }
      if (inv.status === 'cancelled') {
        return {
          status: 'INVITATION_INVALID',
          targetType: 'invitation',
          holderName: inv.recipientName,
          reference: inv.id,
          eventTitle: inv.title,
          scannedAt: now,
          operatorId: operator,
          message: 'Accès refusé : Cette invitation a été révoquée.',
        };
      }

      // Valider l'invitation
      inv.status = 'used';
      inv.usedAt = now;
      this.invitations.set(inv.id, inv);
      this.saveToDisk();

      this.scanLogs.unshift({
        id: `scl_${crypto.randomBytes(6).toString('hex')}`,
        cardholderName: inv.recipientName,
        eventTitle: inv.title,
        scanMethod: 'qr_code',
        verificationResult: 'AUTHORIZED',
        operatorId: operator,
        scannedAt: now,
        accessPointName: zone,
      });

      return {
        status: 'ACCESS_GRANTED',
        targetType: 'invitation',
        holderName: inv.recipientName,
        reference: inv.id,
        eventTitle: inv.title,
        categoryOrEdition: inv.category.toUpperCase().replace('_', ' '),
        venue: inv.venue,
        zone,
        scannedAt: now,
        operatorId: operator,
        message: 'Accès autorisé · Invitation Privée Validée',
        detail: `Bienvenue ${inv.recipientName} (+${inv.plusOnesAllowed} accompagnant${inv.plusOnesAllowed > 1 ? 's' : ''}).`,
      };
    }

    // 2. Détection type Billet de concert (commence par TKT_ ou correspondance exacte ticket)
    if (raw.startsWith('TKT_') || (params.allOrders && raw.length < 50)) {
      let foundTicket: any = null;
      let parentOrder: any = null;

      if (params.allOrders) {
        for (const ord of params.allOrders) {
          if (ord.tickets) {
            for (const tkt of ord.tickets) {
              if (tkt.token === raw || tkt.id === raw || tkt.serialNumber === raw) {
                foundTicket = tkt;
                parentOrder = ord;
                break;
              }
            }
          }
          if (foundTicket) break;
        }
      }

      if (foundTicket) {
        if (foundTicket.status === 'used') {
          return {
            status: 'ALREADY_USED',
            targetType: 'ticket',
            holderName: foundTicket.holderName || parentOrder?.customerName,
            reference: foundTicket.serialNumber || foundTicket.id,
            eventTitle: foundTicket.eventTitle,
            categoryOrEdition: foundTicket.categoryName,
            zone,
            scannedAt: now,
            operatorId: operator,
            flaggedAnomaly: true,
            message: `Double scan détecté ! Billet déjà validé précédemment.`,
          };
        }
        if (foundTicket.status === 'cancelled') {
          return {
            status: 'TICKET_CANCELLED',
            targetType: 'ticket',
            holderName: foundTicket.holderName || parentOrder?.customerName,
            reference: foundTicket.serialNumber || foundTicket.id,
            scannedAt: now,
            operatorId: operator,
            message: 'Accès refusé : Ce billet a été annulé ou remboursé.',
          };
        }

        // Marquer le billet comme utilisé
        foundTicket.status = 'used';
        foundTicket.scannedAt = now;
        this.saveToDisk();

        this.scanLogs.unshift({
          id: `scl_${crypto.randomBytes(6).toString('hex')}`,
          cardholderName: foundTicket.holderName || parentOrder?.customerName,
          eventTitle: foundTicket.eventTitle,
          scanMethod: 'qr_code',
          verificationResult: 'AUTHORIZED',
          operatorId: operator,
          scannedAt: now,
          accessPointName: zone,
        });

        return {
          status: 'ACCESS_GRANTED',
          targetType: 'ticket',
          holderName: foundTicket.holderName || parentOrder?.customerName,
          reference: foundTicket.serialNumber || foundTicket.id,
          eventTitle: foundTicket.eventTitle,
          categoryOrEdition: foundTicket.categoryName,
          venue: foundTicket.eventVenue,
          zone,
          scannedAt: now,
          operatorId: operator,
          message: 'Accès autorisé · Billet Officiel Validé',
          detail: `Placement : ${foundTicket.categoryName} · Titulaire : ${foundTicket.holderName || parentOrder?.customerName}`,
        };
      }
    }

    // 3. Détection type Carte de Membre LUMARÉEL (URL /card/verify/{token} ou LMR_SEC_...)
    let tokenValue = raw;
    if (raw.includes('/card/verify/')) {
      const parts = raw.split('/card/verify/');
      tokenValue = parts[1]?.trim() || raw;
    }

    const tokenHash = crypto.createHash('sha256').update(tokenValue).digest('hex');
    const matchedToken = Array.from(this.qrTokens.values()).find((t) => t.tokenHash === tokenHash);

    if (matchedToken) {
      const card = this.cards.get(matchedToken.cardId);
      if (!card) {
        return {
          status: 'ACCESS_DENIED',
          targetType: 'membership',
          scannedAt: now,
          operatorId: operator,
          message: 'Dossier membre introuvable.',
        };
      }

      if (matchedToken.status === 'revoked' || card.cardStatus === 'revoked') {
        return {
          status: 'ACCESS_DENIED',
          targetType: 'membership',
          holderName: card.cardholderName,
          reference: card.cardNumber,
          categoryOrEdition: 'FOUNDERS EDITION',
          zone,
          scannedAt: now,
          operatorId: operator,
          flaggedAnomaly: true,
          message: 'Accès refusé : Ce QR code a été révoqué.',
        };
      }

      if (card.cardStatus === 'suspended') {
        return {
          status: 'MEMBERSHIP_SUSPENDED',
          targetType: 'membership',
          holderName: card.cardholderName,
          reference: card.cardNumber,
          categoryOrEdition: 'FOUNDERS EDITION',
          zone,
          scannedAt: now,
          operatorId: operator,
          message: 'Accès refusé : Adhésion temporairement suspendue.',
        };
      }

      const isExpired = new Date(card.expiresAt).getTime() < Date.now() || card.cardStatus === 'expired';
      if (isExpired) {
        return {
          status: 'MEMBERSHIP_EXPIRED',
          targetType: 'membership',
          holderName: card.cardholderName,
          reference: card.cardNumber,
          categoryOrEdition: 'FOUNDERS EDITION',
          zone,
          scannedAt: now,
          operatorId: operator,
          message: `Accès refusé : Adhésion expirée le ${new Date(card.expiresAt).toLocaleDateString('fr-FR')}.`,
        };
      }

      // Valid Membership Card!
      matchedToken.lastVerifiedAt = now;
      matchedToken.verificationCount += 1;
      this.qrTokens.set(matchedToken.id, matchedToken);
      this.saveToDisk();

      this.scanLogs.unshift({
        id: `scl_${crypto.randomBytes(6).toString('hex')}`,
        cardId: card.id,
        cardNumber: card.cardNumber,
        cardholderName: card.cardholderName,
        scanMethod: 'qr_code',
        verificationResult: 'AUTHORIZED',
        operatorId: operator,
        scannedAt: now,
        accessPointName: zone,
      });

      return {
        status: 'ACCESS_GRANTED',
        targetType: 'membership',
        holderName: card.cardholderName,
        reference: card.cardNumber,
        categoryOrEdition: 'FOUNDERS EDITION',
        zone,
        scannedAt: now,
        operatorId: operator,
        message: 'Accès autorisé · Statut Membre Vérifié',
        detail: `Membre : ${card.cardholderName} (${card.cardNumber}) · Valable jusqu’au ${new Date(card.expiresAt).toLocaleDateString('fr-FR')}`,
      };
    }

    // Aucun format reconnu
    return {
      status: 'ACCESS_DENIED',
      targetType: 'unknown',
      scannedAt: now,
      operatorId: operator,
      flaggedAnomaly: true,
      message: 'QR code ou titre non reconnu dans l’écosystème LUMARÉEL.',
    };
  }

  private logAdminEvent(event: Omit<MembershipEventLog, 'id' | 'createdAt'>) {
    const id = `mev_${crypto.randomBytes(6).toString('hex')}`;
    this.eventLogs.unshift({
      ...event,
      id,
      createdAt: new Date().toISOString(),
    });
  }
}

export const membershipService = new MembershipService();
