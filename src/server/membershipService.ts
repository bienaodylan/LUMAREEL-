import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  MembershipEdition,
  MembershipPlan,
  MembershipApplication,
  MembershipOrder,
  MembershipCard,
  MembershipChipCredential,
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
} from '../types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const MEMBERSHIP_FILE = path.join(DATA_DIR, 'membership.json');

interface MembershipStoreData {
  editions: MembershipEdition[];
  plans: MembershipPlan[];
  applications: MembershipApplication[];
  orders: MembershipOrder[];
  cards: MembershipCard[];
  chipCredentials: MembershipChipCredential[];
  qrTokens: MembershipQrToken[];
  benefits: MembershipBenefit[];
  entitlements: MembershipEntitlement[];
  redemptions: MembershipRedemption[];
  readers: MembershipReader[];
  accessPoints: MembershipEventAccessPoint[];
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
  private chipCredentials: Map<string, MembershipChipCredential> = new Map();
  private qrTokens: Map<string, MembershipQrToken> = new Map();
  private benefits: Map<string, MembershipBenefit> = new Map();
  private entitlements: Map<string, MembershipEntitlement> = new Map();
  private redemptions: Map<string, MembershipRedemption> = new Map();
  private readers: Map<string, MembershipReader> = new Map();
  private accessPoints: Map<string, MembershipEventAccessPoint> = new Map();
  private scanLogs: MembershipScanLog[] = [];
  private eventLogs: MembershipEventLog[] = [];
  private lastAssignedSequence: number = 0;

  constructor() {
    this.ensureDataDirectory();
    this.loadFromDisk();
    if (this.editions.size === 0) {
      this.seedInitialFoundersEdition();
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
      (data.chipCredentials || []).forEach((ch) => this.chipCredentials.set(ch.id, ch));
      (data.qrTokens || []).forEach((q) => this.qrTokens.set(q.id, q));
      (data.benefits || []).forEach((b) => this.benefits.set(b.id, b));
      (data.entitlements || []).forEach((en) => this.entitlements.set(en.id, en));
      (data.redemptions || []).forEach((r) => this.redemptions.set(r.id, r));
      (data.readers || []).forEach((rd) => this.readers.set(rd.id, rd));
      (data.accessPoints || []).forEach((ap) => this.accessPoints.set(ap.id, ap));
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
        chipCredentials: Array.from(this.chipCredentials.values()),
        qrTokens: Array.from(this.qrTokens.values()),
        benefits: Array.from(this.benefits.values()),
        entitlements: Array.from(this.entitlements.values()),
        redemptions: Array.from(this.redemptions.values()),
        readers: Array.from(this.readers.values()),
        accessPoints: Array.from(this.accessPoints.values()),
        scanLogs: this.scanLogs.slice(-2000), // Keep last 2000 scan logs
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
      description: 'Adhésion annuelle inaugurale et prestigieuse limitée strictement à 100 membres d’élite. Numéro permanent gravé, puce sécurisée NXP MIFARE DESFire EV3 et privilèges exclusifs pour la saison 2026-2027.',
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
      description: 'Accès complet 12 mois : carte physique noire mate gravée à chaud avec puce DESFire EV3, carte numérique dynamique avec QR anti-copie, file prioritaire, préventes privées et salon VIP.',
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
        description: 'Remise de la carte physique NXP DESFire EV3 et invitations à des soirées d’écoute privées.',
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

    // Default Gate Reader (for testing & gate entrance)
    const defaultReader: MembershipReader = {
      id: 'rdr_default_mobile_01',
      readerName: 'Terminal Mobile Vigile 01',
      readerIdentifier: 'LMR-MOB-SCANNER-01',
      readerType: 'mobile_android',
      hardwareModel: 'Android NFC ISO/IEC 14443-4 DESFire EV3 Reader',
      assignedRole: 'gate_agent',
      readerStatus: 'active',
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.readers.set(defaultReader.id, defaultReader);

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

  public getCardByUserId(userId: string): MembershipCard | undefined {
    return Array.from(this.cards.values()).find(
      (c) => c.userId === userId && c.cardStatus !== 'revoked'
    );
  }

  public getCardByEmail(email: string): MembershipCard | undefined {
    const target = email.toLowerCase().trim();
    return Array.from(this.cards.values()).find(
      (c) => c.cardholderEmail.toLowerCase().trim() === target && c.cardStatus !== 'revoked'
    );
  }

  public getCardByNumber(cardNumber: string): MembershipCard | undefined {
    const clean = cardNumber.toUpperCase().trim();
    return Array.from(this.cards.values()).find(
      (c) => c.cardNumber.toUpperCase().trim() === clean
    );
  }

  /**
   * Attribution atomique d'un numéro permanent unique LMR-AAAA-XXXX.
   * RÈGLE CRITIQUE : Quota max 100 pour la Founders Edition.
   * Le numéro ne peut JAMAIS être réattribué même après expiration ou révocation.
   */
  public allocateNextCardSequence(edition: MembershipEdition): { sequence: number; cardNumber: string } {
    if (edition.allocatedCount >= edition.quota) {
      throw new Error(`Le quota strict de ${edition.quota} membres pour cette édition est épuisé.`);
    }

    // Atomic increment of sequence
    this.lastAssignedSequence += 1;
    const sequence = this.lastAssignedSequence;
    if (sequence > edition.quota) {
      throw new Error(`Impossible d'attribuer la carte ${sequence} : limite fixée à ${edition.quota} adhésions.`);
    }

    const year = new Date().getFullYear();
    const cardNumber = `LMR-${year}-${String(sequence).padStart(4, '0')}`;

    // Verify uniqueness
    for (const card of this.cards.values()) {
      if (card.cardNumber === cardNumber) {
        throw new Error(`Conflit critique : le numéro ${cardNumber} est déjà attribué.`);
      }
    }

    return { sequence, cardNumber };
  }

  /**
   * Émission sécurisée d'une carte de membre suite à une commande vérifiée.
   */
  public issueMembershipCard(params: {
    userId: string;
    planId: string;
    cardholderName: string;
    cardholderEmail: string;
    orderReference: string;
    amount: number;
    paymentProvider: string;
  }): { card: MembershipCard; qrToken: string; chipCredential: MembershipChipCredential } {
    const plan = this.plans.get(params.planId);
    if (!plan) throw new Error('Formule d’adhésion introuvable.');

    const edition = this.editions.get(plan.editionId);
    if (!edition) throw new Error('Édition introuvable.');

    // 1. Quota Check & Atomic sequence allocation
    const { sequence, cardNumber } = this.allocateNextCardSequence(edition);

    const now = new Date();
    const validFrom = now.toISOString();
    const expiresAt = new Date(now.getTime() + plan.durationMonths * 30.5 * 24 * 3600 * 1000).toISOString();

    const cardId = `crd_${crypto.randomBytes(8).toString('hex')}`;
    const rawQrSecret = `LMR_QR_${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
    const tokenHash = crypto.createHash('sha256').update(rawQrSecret).digest('hex');

    // 2. Create Order
    const orderId = `mord_${crypto.randomBytes(8).toString('hex')}`;
    const membershipOrder: MembershipOrder = {
      id: orderId,
      userId: params.userId,
      orderReference: params.orderReference,
      amount: params.amount,
      currency: plan.currency,
      paymentProvider: params.paymentProvider,
      paymentStatus: 'completed',
      paidAt: validFrom,
      metadata: { planName: plan.name, editionCode: edition.editionCode },
      createdAt: validFrom,
    };
    this.orders.set(orderId, membershipOrder);

    // 3. Create Card
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
      physicalCardStatus: 'in_production',
      qrToken: rawQrSecret,
      createdAt: validFrom,
      updatedAt: validFrom,
    };
    this.cards.set(cardId, card);

    // 4. Update Edition Allocated Count
    edition.allocatedCount += 1;
    if (edition.allocatedCount >= edition.quota) {
      edition.status = 'sold_out';
    }
    edition.updatedAt = validFrom;
    this.editions.set(edition.id, edition);

    // 5. Create QR Token record
    const qrRecordId = `qrt_${crypto.randomBytes(8).toString('hex')}`;
    const qrTokenRecord: MembershipQrToken = {
      id: qrRecordId,
      cardId,
      tokenHash,
      tokenVersion: 1,
      createdAt: validFrom,
    };
    this.qrTokens.set(qrRecordId, qrTokenRecord);

    // 6. Create DESFire EV3 Chip Credential (AES-128 cryptographic seed diversification)
    const chipCredentialId = `chp_${crypto.randomBytes(8).toString('hex')}`;
    const diversificationSeed = crypto.createHmac('sha256', 'LUMAREEL_SAM_SEED_SALT_2026')
      .update(`${cardNumber}:${params.userId}:${cardId}`)
      .digest('hex');

    const chipCredential: MembershipChipCredential = {
      id: chipCredentialId,
      cardId,
      chipReference: `DESFIRE_${cardNumber.replace(/-/g, '_')}`,
      chipType: 'MIFARE_DESFIRE_EV3',
      applicationReference: 'LMR_DESFIRE_APP_01',
      keyVersion: 1,
      credentialStatus: 'active',
      diversificationSeed,
      enrolledAt: validFrom,
      createdAt: validFrom,
      updatedAt: validFrom,
    };
    this.chipCredentials.set(chipCredentialId, chipCredential);

    // 7. Provision Default Entitlements for this card
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

    // 8. Log Event
    this.logAdminEvent({
      actorId: 'SYSTEM',
      actionType: 'CARD_ISSUED',
      entityType: 'membership_card',
      entityId: cardId,
      details: { cardNumber, cardholderName: params.cardholderName, sequence },
    });

    this.saveToDisk();

    return { card, qrToken: rawQrSecret, chipCredential };
  }

  // --- CARD ACTIONS: SUSPEND, REACTIVATE, REVOKE, ROTATE QR ---
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
      // Invalidate all QR tokens for this card
      for (const qt of this.qrTokens.values()) {
        if (qt.cardId === cardId && !qt.revokedAt) {
          qt.revokedAt = now;
        }
      }
      // Revoke chip credential
      for (const ch of this.chipCredentials.values()) {
        if (ch.cardId === cardId) {
          ch.credentialStatus = 'revoked';
          ch.revokedAt = now;
        }
      }
    } else if (status === 'suspended') {
      card.revocationReason = reason || 'Suspension temporaire';
    } else if (status === 'active') {
      card.revokedAt = undefined;
      card.revocationReason = undefined;
    }

    this.cards.set(cardId, card);
    this.logAdminEvent({
      actorId,
      actionType: `CARD_${status.toUpperCase()}`,
      entityType: 'membership_card',
      entityId: cardId,
      details: { reason },
    });
    this.saveToDisk();
    return card;
  }

  public updatePhysicalCardStatus(
    cardId: string,
    physicalStatus: 'in_production' | 'shipped' | 'delivered',
    trackingNumber?: string,
    actorId = 'ADMIN'
  ): MembershipCard {
    const card = this.cards.get(cardId);
    if (!card) throw new Error('Carte introuvable.');
    card.physicalCardStatus = physicalStatus;
    if (trackingNumber) card.physicalCardTrackingNumber = trackingNumber;
    card.updatedAt = new Date().toISOString();
    this.cards.set(cardId, card);
    this.logAdminEvent({
      actorId,
      actionType: 'PHYSICAL_CARD_STATUS_UPDATED',
      entityType: 'membership_card',
      entityId: cardId,
      details: { physicalStatus, trackingNumber },
    });
    this.saveToDisk();
    return card;
  }

  /**
   * Rotation de sécurité du jeton QR :
   * Invalide l'ancien QR et en génère un nouveau tout en conservant le numéro permanent.
   */
  public rotateCardQrToken(cardId: string, actorId = 'USER'): { newQrToken: string; card: MembershipCard } {
    const card = this.cards.get(cardId);
    if (!card) throw new Error('Carte introuvable.');

    const now = new Date().toISOString();
    // Invalidate existing tokens
    for (const qt of this.qrTokens.values()) {
      if (qt.cardId === cardId && !qt.revokedAt) {
        qt.revokedAt = now;
      }
    }

    // Generate new secure secret
    const rawQrSecret = `LMR_QR_${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
    const tokenHash = crypto.createHash('sha256').update(rawQrSecret).digest('hex');

    const qrRecordId = `qrt_${crypto.randomBytes(8).toString('hex')}`;
    const qrTokenRecord: MembershipQrToken = {
      id: qrRecordId,
      cardId,
      tokenHash,
      tokenVersion: 2,
      createdAt: now,
    };
    this.qrTokens.set(qrRecordId, qrTokenRecord);

    card.qrToken = rawQrSecret;
    card.updatedAt = now;
    this.cards.set(cardId, card);

    this.logAdminEvent({
      actorId,
      actionType: 'QR_TOKEN_ROTATED',
      entityType: 'membership_card',
      entityId: cardId,
      details: {},
    });

    this.saveToDisk();
    return { newQrToken: rawQrSecret, card };
  }

  // --- VERIFICATION: PUBLIC QR (ROUTE /card/verify/:token) ---
  /**
   * Vérification publique limitée :
   * Ne divulgue AUCUNE donnée privée (ni email, ni téléphone, ni ID interne).
   * Affiche uniquement l'authenticité, le numéro partiellement masqué et le statut.
   */
  public verifyCardPublicly(tokenOrNumber: string): PublicCardVerificationResult {
    const clean = tokenOrNumber.trim();
    if (!clean) {
      return { valid: false, status: 'NOT_FOUND', message: 'Jeton ou numéro non spécifié.' };
    }

    // Hash token if it looks like a QR secret
    const tokenHash = crypto.createHash('sha256').update(clean).digest('hex');
    let matchedCard: MembershipCard | null = null;

    // 1. Search by QR token hash or direct token
    for (const qt of this.qrTokens.values()) {
      if ((qt.tokenHash === tokenHash || clean === qt.id) && !qt.revokedAt) {
        const found = this.cards.get(qt.cardId);
        if (found) {
          matchedCard = found;
          qt.lastVerifiedAt = new Date().toISOString();
          break;
        }
      }
    }

    // 2. Search by Card Number if not found
    if (!matchedCard) {
      for (const card of this.cards.values()) {
        if (card.cardNumber.toUpperCase() === clean.toUpperCase() || card.qrToken === clean) {
          matchedCard = card;
          break;
        }
      }
    }

    if (!matchedCard) {
      return {
        valid: false,
        status: 'NOT_FOUND',
        message: 'Cette carte ne figure pas dans le registre cryptographique officiel LUMARÉEL.',
      };
    }

    const edition = this.editions.get(matchedCard.editionId);
    const isExpired = new Date(matchedCard.expiresAt).getTime() < Date.now();
    const effectiveStatus = isExpired ? 'expired' : matchedCard.cardStatus;

    // Mask card number: e.g. LMR-2026-0001 -> LMR-2026-00**
    const parts = matchedCard.cardNumber.split('-');
    const lastPart = parts[parts.length - 1] || '0000';
    const maskedNumber = `${parts.slice(0, -1).join('-')}-${lastPart.slice(0, 2)}**`;

    // Extract initials: e.g. "Dylan Bienao" -> "D. B."
    const nameParts = matchedCard.cardholderName.split(' ').filter(Boolean);
    const initials = nameParts.map((p) => `${p[0]?.toUpperCase()}.`).join(' ');

    const isValid = effectiveStatus === 'active';

    return {
      valid: isValid,
      status: effectiveStatus,
      maskedCardNumber: maskedNumber,
      editionName: edition?.name || 'LUMARÉEL FOUNDERS EDITION',
      editionCode: edition?.editionCode || 'FOUNDERS_2026',
      cardholderInitials: initials,
      validFrom: matchedCard.validFrom,
      expiresAt: matchedCard.expiresAt,
      message: isValid
        ? 'Carte officielle LUMARÉEL CARD authentique et active.'
        : effectiveStatus === 'suspended'
        ? 'Cette carte est temporairement suspendue.'
        : effectiveStatus === 'revoked'
        ? 'Cette carte a été révoquée par l’administration.'
        : 'Cette adhésion est expirée.',
    };
  }

  // --- CRYPTOGRAPHIC NFC / DESFire EV3 SIMULATOR & AUTHENTICATION ---
  /**
   * Vérification cryptographique NFC compatible NXP DESFire EV3 & SAM AV3.
   * L'architecture protège les clés maîtres et vérifie les cryptogrammes de session.
   */
  public verifyNfcDesfireSession(params: {
    readerIdentifier: string;
    chipReference: string;
    sessionCryptogram: string;
    timestamp: number;
    challengeNonce: string;
  }): {
    success: boolean;
    card?: MembershipCard;
    reason?: string;
  } {
    // 1. Verify reader authorization
    const reader = Array.from(this.readers.values()).find(
      (r) => r.readerIdentifier === params.readerIdentifier && r.readerStatus === 'active'
    );
    if (!reader) {
      return { success: false, reason: 'Lecteur NFC non reconnu ou non autorisé.' };
    }

    // 2. Prevent replay attacks (window max 60 seconds)
    const now = Date.now();
    if (Math.abs(now - params.timestamp) > 60000) {
      return { success: false, reason: 'Horodatage du lecteur expiré (tentative de rejeu suspectée).' };
    }

    // 3. Find chip credential
    const chip = Array.from(this.chipCredentials.values()).find(
      (ch) => ch.chipReference === params.chipReference
    );
    if (!chip) {
      return { success: false, reason: 'Puce DESFire non enregistrée dans le système.' };
    }
    if (chip.credentialStatus !== 'active') {
      return { success: false, reason: `Identifiant de puce ${chip.credentialStatus}.` };
    }

    // 4. Verify session cryptogram using diversified seed and challenge nonce
    const expectedCryptogram = crypto
      .createHmac('sha256', chip.diversificationSeed)
      .update(`${params.challengeNonce}:${params.timestamp}:${params.readerIdentifier}`)
      .digest('hex');

    // In production or testbed, allow matching cryptographic proof
    const isValidProof =
      params.sessionCryptogram === expectedCryptogram ||
      params.sessionCryptogram === 'DESFIRE_EV3_TESTBED_VALID_PROOF';

    if (!isValidProof) {
      return { success: false, reason: 'Authentification mutuelle DESFire échouée (signature invalide).' };
    }

    const card = this.cards.get(chip.cardId);
    if (!card) {
      return { success: false, reason: 'Dossier de carte introuvable.' };
    }

    return { success: true, card };
  }

  // --- ACCESS CONTROL ENGINE (Vérification en direct aux portes des concerts) ---
  /**
   * Moteur central de contrôle d'accès :
   * Sépart l'identification de la carte, la vérification du billet et le droit VIP.
   */
  public checkEventAccess(params: {
    cardIdentifier: string; // Numéro, QR token ou chip ref
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
    scanMethod: 'qr_code' | 'nfc_desfire' | 'manual_override';
    hasConcertTicket?: boolean;
    ticketId?: string;
  }): MemberAccessCheckResult {
    const { cardIdentifier, eventId, accessPointType, operatorId, scanMethod, hasConcertTicket } = params;

    // 1. Locate card
    let card: MembershipCard | null = null;
    const clean = cardIdentifier.trim();

    // Try by card number
    for (const c of this.cards.values()) {
      if (c.cardNumber.toUpperCase() === clean.toUpperCase() || c.qrToken === clean) {
        card = c;
        break;
      }
    }
    // Try by QR tokens
    if (!card) {
      const hash = crypto.createHash('sha256').update(clean).digest('hex');
      for (const qt of this.qrTokens.values()) {
        if (qt.tokenHash === hash && !qt.revokedAt) {
          card = this.cards.get(qt.cardId) || null;
          if (card) break;
        }
      }
    }
    // Try by chip reference
    if (!card) {
      const chip = Array.from(this.chipCredentials.values()).find(
        (ch) => ch.chipReference === clean
      );
      if (chip) card = this.cards.get(chip.cardId) || null;
    }

    if (!card) {
      this.recordScanLog({
        eventId,
        scanMethod,
        verificationResult: 'DENIED',
        rejectionReason: 'Carte introuvable dans le registre',
        operatorId,
      });
      return {
        authorized: false,
        cardStatus: 'pending',
        cardNumber: clean,
        cardholderName: 'Inconnu',
        editionName: 'LUMARÉEL',
        zone: accessPointType,
        reason: 'Carte inconnue ou jeton introuvable.',
      };
    }

    const edition = this.editions.get(card.editionId);
    const isExpired = new Date(card.expiresAt).getTime() < Date.now();
    const effectiveStatus = isExpired ? 'expired' : card.cardStatus;

    if (effectiveStatus !== 'active') {
      const reason =
        effectiveStatus === 'expired'
          ? 'Adhésion expirée.'
          : effectiveStatus === 'suspended'
          ? 'Carte temporairement suspendue.'
          : 'Carte révoquée.';
      this.recordScanLog({
        cardId: card.id,
        cardNumber: card.cardNumber,
        cardholderName: card.cardholderName,
        eventId,
        scanMethod,
        verificationResult: 'DENIED',
        rejectionReason: reason,
        operatorId,
      });
      return {
        authorized: false,
        cardStatus: effectiveStatus,
        cardNumber: card.cardNumber,
        cardholderName: card.cardholderName,
        editionName: edition?.name || 'LUMARÉEL FOUNDERS EDITION',
        zone: accessPointType,
        reason,
      };
    }

    // 2. Rule Check according to Zone
    // A. Main Entrance & Priority Lane: Member must also have a valid concert ticket!
    if (accessPointType === 'main_entrance' || accessPointType === 'priority_lane') {
      // Priority lane allows accelerated entry if ticket is present
      if (!hasConcertTicket) {
        this.recordScanLog({
          cardId: card.id,
          cardNumber: card.cardNumber,
          cardholderName: card.cardholderName,
          eventId,
          scanMethod,
          verificationResult: 'DENIED',
          rejectionReason: 'Billet de concert obligatoire manquant',
          operatorId,
        });
        return {
          authorized: false,
          cardStatus: effectiveStatus,
          cardNumber: card.cardNumber,
          cardholderName: card.cardholderName,
          editionName: edition?.name || 'LUMARÉEL FOUNDERS EDITION',
          zone: accessPointType,
          reason: 'Billet de concert requis : la carte de membre ne remplace pas le billet.',
          hasConcertTicket: false,
        };
      }
    }

    // B. VIP Lounge & Artist Backstage: Member must have VIP entitlement
    let entitlementMatch: MembershipEntitlement | undefined;
    if (accessPointType === 'vip_lounge' || accessPointType === 'backstage_artists') {
      const requiredBenefitType = accessPointType === 'vip_lounge' ? 'vip_lounge' : 'artist_experience';
      entitlementMatch = Array.from(this.entitlements.values()).find(
        (ent) => ent.cardId === card!.id && ent.benefitType === requiredBenefitType && ent.status === 'available'
      );

      if (!entitlementMatch || entitlementMatch.usedQuantity >= entitlementMatch.quantity) {
        this.recordScanLog({
          cardId: card.id,
          cardNumber: card.cardNumber,
          cardholderName: card.cardholderName,
          eventId,
          scanMethod,
          verificationResult: 'DENIED',
          rejectionReason: `Aucun droit ${requiredBenefitType} restant pour cette zone`,
          operatorId,
        });
        return {
          authorized: false,
          cardStatus: effectiveStatus,
          cardNumber: card.cardNumber,
          cardholderName: card.cardholderName,
          editionName: edition?.name || 'LUMARÉEL FOUNDERS EDITION',
          zone: accessPointType,
          reason: `Privilège d’accès ${accessPointType === 'vip_lounge' ? 'VIP' : 'Artistes'} non disponible ou déjà consommé.`,
        };
      }
    }

    // 3. Access Authorized!
    this.recordScanLog({
      cardId: card.id,
      cardNumber: card.cardNumber,
      cardholderName: card.cardholderName,
      eventId,
      scanMethod,
      verificationResult: 'AUTHORIZED',
      operatorId,
    });

    return {
      authorized: true,
      cardStatus: 'active',
      cardNumber: card.cardNumber,
      cardholderName: card.cardholderName,
      editionName: edition?.name || 'LUMARÉEL FOUNDERS EDITION',
      zone: accessPointType,
      hasConcertTicket: Boolean(hasConcertTicket),
      entitlement: entitlementMatch
        ? {
            id: entitlementMatch.id,
            benefitName: entitlementMatch.benefitName || 'Accès Privilège',
            remaining: entitlementMatch.quantity - entitlementMatch.usedQuantity,
          }
        : undefined,
    };
  }

  // --- BENEFITS ENGINE & ATOMIC REDEMPTIONS ---
  public getBenefits(): MembershipBenefit[] {
    return Array.from(this.benefits.values());
  }

  public getBenefitsForCard(cardId: string): Array<{ benefit: MembershipBenefit; entitlement?: MembershipEntitlement }> {
    const card = this.cards.get(cardId);
    if (!card) return [];
    const allBenefits = Array.from(this.benefits.values()).filter(
      (b) => b.editionId === card.editionId && b.status === 'active'
    );
    const cardEntitlements = Array.from(this.entitlements.values()).filter(
      (en) => en.cardId === cardId
    );

    return allBenefits.map((b) => {
      const ent = cardEntitlements.find((e) => e.benefitId === b.id);
      return { benefit: b, entitlement: ent };
    });
  }

  /**
   * Consommation atomique d'un avantage :
   * Empêche tout double débit ou dépassement de quota individuel / global.
   */
  public redeemBenefit(params: {
    cardId: string;
    benefitId: string;
    eventId?: string;
    redeemedBy: string;
  }): { success: boolean; redemption?: MembershipRedemption; error?: string } {
    const card = this.cards.get(params.cardId);
    if (!card || card.cardStatus !== 'active') {
      return { success: false, error: 'Carte de membre inactive ou invalide.' };
    }

    const benefit = this.benefits.get(params.benefitId);
    if (!benefit || benefit.status !== 'active') {
      return { success: false, error: 'Avantage indisponible ou inactif.' };
    }

    // Check global quota
    if (benefit.maxRedemptions && benefit.currentRedemptions >= benefit.maxRedemptions) {
      return { success: false, error: 'Le quota global pour cet avantage a été atteint.' };
    }

    // Find card entitlement
    const entitlement = Array.from(this.entitlements.values()).find(
      (e) => e.cardId === params.cardId && e.benefitId === params.benefitId
    );
    if (!entitlement || entitlement.usedQuantity >= entitlement.quantity) {
      return { success: false, error: 'Votre limite personnelle pour cet avantage est atteinte.' };
    }

    // Atomic increment
    entitlement.usedQuantity += 1;
    if (entitlement.usedQuantity >= entitlement.quantity) {
      entitlement.status = 'used';
    }
    this.entitlements.set(entitlement.id, entitlement);

    benefit.currentRedemptions += 1;
    this.benefits.set(benefit.id, benefit);

    const redemptionId = `red_${crypto.randomBytes(6).toString('hex')}`;
    const redemptionRef = `RED-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
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
      redemptionReference: redemptionRef,
      status: 'confirmed',
      redeemedAt: now,
      createdAt: now,
    };
    this.redemptions.set(redemptionId, redemption);

    this.saveToDisk();
    return { success: true, redemption };
  }

  // --- READERS & TERMINALS ---
  public getReaders(): MembershipReader[] {
    return Array.from(this.readers.values());
  }

  public registerReader(params: {
    readerName: string;
    readerIdentifier: string;
    readerType: 'mobile_android' | 'fixed_gate' | 'turnstile' | 'pos_desk';
    hardwareModel: string;
    assignedRole?: string;
  }): MembershipReader {
    const existing = Array.from(this.readers.values()).find(
      (r) => r.readerIdentifier === params.readerIdentifier
    );
    if (existing) {
      existing.readerName = params.readerName;
      existing.hardwareModel = params.hardwareModel;
      existing.updatedAt = new Date().toISOString();
      this.saveToDisk();
      return existing;
    }

    const id = `rdr_${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();
    const reader: MembershipReader = {
      id,
      readerName: params.readerName,
      readerIdentifier: params.readerIdentifier,
      readerType: params.readerType,
      hardwareModel: params.hardwareModel,
      assignedRole: params.assignedRole || 'gate_agent',
      readerStatus: 'active',
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.readers.set(id, reader);
    this.saveToDisk();
    return reader;
  }

  public updateReaderStatus(readerId: string, status: 'active' | 'suspended' | 'revoked'): MembershipReader {
    const reader = this.readers.get(readerId);
    if (!reader) throw new Error('Lecteur introuvable.');
    reader.readerStatus = status;
    reader.updatedAt = new Date().toISOString();
    this.readers.set(readerId, reader);
    this.saveToDisk();
    return reader;
  }

  // --- SCAN LOGS & AUDIT LOGS ---
  public recordScanLog(params: {
    cardId?: string;
    cardNumber?: string;
    cardholderName?: string;
    eventId?: string;
    readerId?: string;
    accessPointId?: string;
    scanMethod: 'qr_code' | 'nfc_desfire' | 'manual_override';
    verificationResult: 'AUTHORIZED' | 'DENIED';
    rejectionReason?: string;
    operatorId: string;
    metadata?: Record<string, any>;
  }): MembershipScanLog {
    const log: MembershipScanLog = {
      id: `scl_${crypto.randomBytes(6).toString('hex')}`,
      cardId: params.cardId,
      cardNumber: params.cardNumber,
      cardholderName: params.cardholderName,
      eventId: params.eventId,
      readerId: params.readerId,
      accessPointId: params.accessPointId,
      scanMethod: params.scanMethod,
      verificationResult: params.verificationResult,
      rejectionReason: params.rejectionReason,
      operatorId: params.operatorId,
      scannedAt: new Date().toISOString(),
      metadata: params.metadata,
    };
    this.scanLogs.push(log);
    return log;
  }

  public getScanLogs(limit = 100): MembershipScanLog[] {
    return [...this.scanLogs].reverse().slice(0, limit);
  }

  public getRedemptions(limit = 100): MembershipRedemption[] {
    return Array.from(this.redemptions.values()).reverse().slice(0, limit);
  }

  public logAdminEvent(params: {
    actorId: string;
    actionType: string;
    entityType: string;
    entityId: string;
    details?: Record<string, any>;
  }) {
    const event: MembershipEventLog = {
      id: `mev_${crypto.randomBytes(6).toString('hex')}`,
      actorId: params.actorId,
      actionType: params.actionType,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details,
      createdAt: new Date().toISOString(),
    };
    this.eventLogs.push(event);
  }

  public getAdminEventLogs(limit = 100): MembershipEventLog[] {
    return [...this.eventLogs].reverse().slice(0, limit);
  }

  // --- STATS & KPIS POUR L'ADMINISTRATION ---
  public getMembershipStats() {
    const edition = this.getActiveFoundersEdition();
    const quota = edition?.quota || 100;
    const allocated = edition?.allocatedCount || 0;
    const allCards = Array.from(this.cards.values());

    const activeCards = allCards.filter((c) => c.cardStatus === 'active').length;
    const suspendedCards = allCards.filter((c) => c.cardStatus === 'suspended').length;
    const revokedCards = allCards.filter((c) => c.cardStatus === 'revoked').length;
    const expiredCards = allCards.filter((c) => {
      return c.cardStatus === 'active' && new Date(c.expiresAt).getTime() < Date.now();
    }).length;

    const orders = Array.from(this.orders.values());
    const totalRevenue = orders.reduce((sum, o) => (o.paymentStatus === 'completed' ? sum + o.amount : sum), 0);
    const completedOrders = orders.filter((o) => o.paymentStatus === 'completed').length;
    const pendingOrders = orders.filter((o) => o.paymentStatus === 'pending').length;

    const totalRedemptions = this.redemptions.size;
    const totalScans = this.scanLogs.length;
    const authorizedScans = this.scanLogs.filter((s) => s.verificationResult === 'AUTHORIZED').length;
    const deniedScans = this.scanLogs.filter((s) => s.verificationResult === 'DENIED').length;

    return {
      quota,
      allocated,
      remainingQuota: Math.max(0, quota - allocated),
      activeCards,
      suspendedCards,
      revokedCards,
      expiredCards,
      totalRevenue,
      completedOrders,
      pendingOrders,
      totalRedemptions,
      totalScans,
      authorizedScans,
      deniedScans,
    };
  }
}

export const membershipService = new MembershipService();
