export type Role = 'super_admin' | 'box_office' | 'gate_agent' | 'customer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  emailVerified: boolean;
  createdAt: string;
  passwordHash?: string;
}

export interface TicketCategory {
  id: string;
  name: string;
  price: number;
  currency: 'FCFA' | 'XOF' | 'EUR' | string;
  quota: number;
  sold: number;
  description: string;
  perks: string[];
  // NOUVEAU : Propriétés pour le design visuel du billet physique
  ticketImageUrl?: string; // L'URL de l'image (blob local ou URL cloud)
  ticketImageFile?: File;  // Le fichier physique sélectionné depuis l'ordinateur
}

export interface ConcertEvent {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  artist: string;
  date: string; // ISO date 'YYYY-MM-DD'
  time: string; // '20:30'
  doorsOpen: string; // '19:30'
  venue: string;
  city: string;
  country: string;
  address: string;
  description: string;
  artistPortrait: string; // Portrait visual
  officialPoster: string; // Official poster (3:4)
  bannerImage: string; // Cinematic panoramic banner (16:9)
  coverImage?: string;
  status: 'published' | 'draft' | 'sold_out' | 'cancelled' | 'completed';
  isFeatured: boolean;
  organizerType: 'lumareel' | 'partner';
  organizerName: string;
  organizerId?: string;
  genre: string; // 'Rap / Hip-Hop' | 'Électro & Expérimental' | 'Afrobeats / Live' | etc.
  platformFeePercent?: number; // Configurable commission
  infoline?: string; // Contact phone for ticketing
  categories: TicketCategory[];
}

export interface ExternalOrganizer {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  status: 'pending' | 'approved' | 'rejected';
  eventsCount: number;
  commissionRate: number;
  createdAt: string;
}

export interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  date: string;
  summary: string;
  content: string;
  imageUrl: string;
  readTime: string;
  author: string;
}

export interface Order {
  id: string;
  reference: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  categoryId: string;
  categoryName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: 'FCFA' | 'XOF' | 'EUR' | string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentProvider: 'geniuspay' | 'wave' | 'orange_money' | 'mtn_momo' | 'moov_money' | 'djamo' | 'card' | string;
  paymentRef: string;
  createdAt: string;
  paidAt?: string;
  tickets?: Ticket[];
}

export interface Ticket {
  id: string;
  orderId: string;
  orderRef: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  categoryId: string;
  categoryName: string;
  serialNumber: string; // e.g. LMR-2026-NOC-4821
  token: string; // Cryptographic validation token embedded in QR
  holderName: string;
  holderEmail: string;
  status: 'valid' | 'used' | 'cancelled';
  issuedAt: string;
  checkedInAt?: string;
  checkedInBy?: string;
}

export interface ScanVerificationResult {
  status: 'VALID' | 'ALREADY_USED' | 'WRONG_EVENT' | 'INVALID_OR_NOT_FOUND' | 'CANCELLED';
  message: string;
  ticket?: Ticket;
  previousCheckIn?: {
    checkedInAt: string;
    checkedInBy: string;
  };
}

export interface ArchiveProduction {
  id: string;
  title: string;
  year: string;
  date?: string; // e.g. "19 Décembre 2026"
  city: string;
  country: string;
  venue: string;
  artists: string[];
  coverImage: string; // 16:9 thumbnail
  description: string;
  youtubeUrl?: string; // YouTube video link (e.g. watch?v=... or youtu.be/...)
  youtubeEmbedUrl?: string; // Converted embed URL
  duration?: string; // e.g. "18:42" or "Recap HD"
  photos: string[]; // Photo gallery
  isPublished: boolean;
  orderIndex: number;
}

export interface WorkProduction {
  id: string;
  title: string;
  client: string;
  year: string;
  scope: string;
  description: string;
  imageUrl: string;
}

export interface TransactionalEmail {
  id: string;
  recipient: string;
  subject: string;
  type: 'ticket_confirmation' | 'account_verification' | 'payment_notice';
  orderRef?: string;
  status: 'sent' | 'queued' | 'failed';
  timestamp: string;
  contentPreview: string;
  htmlContent?: string;
  customerName?: string;
  eventTitle?: string;
  artistName?: string;
  totalAmount?: number;
  currency?: string;
  ticketsCount?: number;
}

export interface AdminStats {
  publishedEvents: number;
  ticketsSold: number;
  totalQuota: number;
  confirmedRevenueXof: number;
  pendingOrdersCount: number;
  paidOrdersCount: number;
  checkedInTickets: number;
}

export interface ScannerToken {
  id: string;
  token: string;
  eventId: string;
  eventTitle: string;
  artistName: string;
  createdAt: string;
  expiresAt: string;
  createdBy?: string;
  revoked?: boolean;
}

export interface PlatformSettings {
  platformName: string;
  tagline: string;
  logoUrl?: string;
  logoMonogram: string;
  currency: string;
  infoline: string;
  gateToken: string;
  githubRepoUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  socialLinks?: {
    tiktok?: string;
    instagram?: string;
    snapchat?: string;
    youtube?: string;
    facebook?: string;
  };
}

// ============================================================================
// LUMARÉEL CARD — TYPES DU SYSTÈME DE MEMBERSHIP & CONTRÔLE D'ACCÈS HYBRIDE
// ============================================================================

export type MembershipCardStatus = 'pending' | 'active' | 'suspended' | 'revoked' | 'expired';
export type PhysicalCardStatus = 'not_requested' | 'in_production' | 'shipped' | 'delivered' | 'replaced';

export interface MembershipEdition {
  id: string;
  name: string;
  editionCode: string; // e.g. 'FOUNDERS_2026'
  description: string;
  quota: number; // 100 max
  allocatedCount: number;
  startsAt: string;
  endsAt?: string;
  status: 'draft' | 'active' | 'sold_out' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface MembershipPlan {
  id: string;
  editionId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  durationMonths: number;
  physicalCardIncluded: boolean;
  renewalEnabled: boolean;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface MembershipApplication {
  id: string;
  userId: string;
  planId: string;
  applicationReference: string;
  applicationStatus: 'pending' | 'approved' | 'rejected' | 'converted';
  termsVersion: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  notes?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt: string;
}

export interface MembershipOrder {
  id: string;
  userId: string;
  planId?: string;
  editionId?: string;
  applicationId?: string;
  orderReference: string;
  paymentReference?: string;
  amount: number;
  currency: string;
  paymentProvider: string;
  paymentMethod?: string;
  providerTransactionId?: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  orderStatus?: string;
  shippingAddress?: any;
  paidAt?: string;
  completedAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
}

export interface MembershipCard {
  id: string;
  userId: string;
  planId: string;
  editionId: string;
  membershipOrderId?: string;
  cardNumber: string; // 'LMR-2026-0001' ... 'LMR-2026-0100'
  cardSequence: number; // 1 .. 100
  cardholderName: string;
  cardholderEmail: string;
  cardStatus: MembershipCardStatus;
  issuedAt: string;
  validFrom: string;
  expiresAt: string;
  renewedAt?: string;
  revokedAt?: string;
  revocationReason?: string;
  replacedByCardId?: string;
  physicalCardStatus: PhysicalCardProductionStatus;
  physicalCardTrackingNumber?: string;
  qrToken?: string;
  createdAt: string;
  updatedAt: string;
}

export type PhysicalCardProductionStatus =
  | 'requested'
  | 'payment_pending'
  | 'approved'
  | 'in_production'
  | 'printed'
  | 'quality_checked'
  | 'ready_for_dispatch'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'blocked'
  | 'lost'
  | 'returned'
  | 'replacement_requested'
  | 'defective';

export type CardVerificationOutcome =
  | 'VALID'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'REVOKED'
  | 'INVALID'
  | 'SYSTEM_UNAVAILABLE';

export interface MembershipQrToken {
  id: string;
  cardId: string;
  tokenHash: string;
  tokenPrefix: string;
  tokenVersion: number;
  isCurrent: boolean;
  status: 'active' | 'rotated' | 'revoked';
  revocationReason?: string;
  issuedAt: string;
  revokedAt?: string;
  lastVerifiedAt?: string;
  verificationCount: number;
}

export interface MembershipPhysicalCardOrder {
  id: string;
  cardId: string;
  userId: string;
  orderNumber: string;
  cardNumber: string;
  cardholderName: string;
  cardholderEmail: string;
  cardholderPhone?: string;
  editionName: string;
  shippingAddress: {
    street: string;
    city: string;
    postalCode?: string;
    country: string;
    recipientName?: string;
  };
  productionStatus: PhysicalCardProductionStatus;
  batchId?: string;
  printJobId?: string;
  qualityCheckId?: string;
  trackingNumber?: string;
  shippingCarrier?: string;
  reprintCount: number;
  reprintReasons?: string[];
  historyNotes?: {
    timestamp: string;
    operator: string;
    status: PhysicalCardProductionStatus;
    note?: string;
  }[];
  requestedAt: string;
  approvedAt?: string;
  printedAt?: string;
  qualityCheckedAt?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipCardInventory {
  id: string;
  itemName: string;
  itemType:
    | 'blank_pvc_card'
    | 'gold_foil_ribbon'
    | 'ymcko_ribbon'
    | 'monochrome_black_ribbon'
    | 'laminate_overlay'
    | 'collector_box';
  sku: string;
  totalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minThresholdAlert: number;
  unit: string;
  notes?: string;
  lastRestockedAt: string;
  updatedAt: string;
}

export interface MembershipPrintJob {
  id: string;
  jobCode: string;
  batchId?: string;
  cardId: string;
  cardNumber: string;
  cardholderName: string;
  orderId?: string;
  printerModel: string;
  printerType: 'simulated' | 'evolis' | 'zebra' | 'magicard' | 'fargo';
  duplex: boolean;
  resolutionDpi: number;
  isReprint: boolean;
  reprintReason?: 'damaged' | 'lost' | 'defect' | 'data_update' | 'member_request';
  status: 'pending' | 'spooling' | 'printing' | 'completed' | 'failed' | 'cancelled';
  operatorId: string;
  failureReason?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface MembershipCardQualityCheck {
  id: string;
  cardId: string;
  cardNumber: string;
  orderId?: string;
  printJobId?: string;
  scannedQrToken: string;
  qrVerifiedServer: boolean;
  visualCheckPassed: boolean;
  centeringPassed: boolean;
  contrastPassed: boolean;
  noScratchesPassed: boolean;
  operatorId: string;
  operatorNotes?: string;
  status: 'passed' | 'rejected';
  checkedAt: string;
}

export type CardTemplateTheme = 'founders_noir_or' | 'minimaliste_obsidienne' | 'prestige_monogramme';

export interface CardDesignerConfig {
  templateTheme: CardTemplateTheme;
  cardFormat: 'CR80_STANDARD';
  dimensionsMm: { width: 85.60; height: 53.98 };
  targetDpi: 300 | 600;
  bleedMm: number;
  safeZoneMm: number;
  frontLogoScale: number;
  qrQuietZoneModules: number;
  qrSizeMm: number;
  includeHologramStamp: boolean;
  includeGuillochePattern: boolean;
  monochromeVerso: boolean;
}

export type BenefitType =
  | 'private_presale'
  | 'priority_access'
  | 'exclusive_invitation'
  | 'preferential_rate'
  | 'vip_lounge'
  | 'artist_experience'
  | 'gift_surprise'
  | 'partner_offer';

export interface MembershipBenefit {
  id: string;
  name: string;
  description: string;
  benefitType: BenefitType;
  editionId?: string;
  eventId?: string;
  eventTitle?: string;
  startsAt: string;
  endsAt?: string;
  maxRedemptions?: number;
  currentRedemptions: number;
  perMemberLimit: number;
  conditions?: Record<string, any>;
  status: 'draft' | 'active' | 'expired' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface MembershipEntitlement {
  id: string;
  cardId: string;
  benefitId: string;
  benefitName?: string;
  benefitType?: BenefitType;
  quantity: number;
  usedQuantity: number;
  validFrom: string;
  validUntil?: string;
  status: 'available' | 'reserved' | 'confirmed' | 'used' | 'cancelled' | 'expired';
  createdAt: string;
}

export interface MembershipRedemption {
  id: string;
  cardId: string;
  cardNumber?: string;
  cardholderName?: string;
  benefitId: string;
  benefitName?: string;
  eventId?: string;
  eventTitle?: string;
  redeemedBy: string;
  redemptionReference: string;
  status: 'confirmed' | 'cancelled' | 'disputed';
  redeemedAt: string;
  createdAt: string;
}

export interface MembershipReader {
  id: string;
  readerName: string;
  readerIdentifier: string;
  readerType: 'usb_2d_barcode' | 'mobile_camera' | 'fixed_gate_qr' | 'pos_desk';
  hardwareModel: string;
  eventId?: string;
  eventTitle?: string;
  assignedRole: string;
  readerStatus: 'active' | 'suspended' | 'revoked' | 'maintenance';
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipEventAccessPoint {
  id: string;
  eventId: string;
  name: string;
  accessPointType:
    | 'main_entrance'
    | 'priority_lane'
    | 'member_desk'
    | 'vip_lounge'
    | 'backstage_artists'
    | 'invitations_booth';
  allowedBenefitTypes: BenefitType[];
  accessRules?: Record<string, any>;
  status: 'active' | 'closed';
  createdAt: string;
}

export interface MembershipScanLog {
  id: string;
  cardId?: string;
  cardNumber?: string;
  cardholderName?: string;
  eventId?: string;
  eventTitle?: string;
  readerId?: string;
  readerName?: string;
  accessPointId?: string;
  accessPointName?: string;
  scanMethod: 'qr_code' | 'manual_override';
  verificationResult: 'AUTHORIZED' | 'DENIED';
  rejectionReason?: string;
  operatorId: string;
  scannedAt: string;
  flaggedSuspicious?: boolean;
  repeatScanCount?: number;
  metadata?: Record<string, any>;
}

export interface MembershipEventLog {
  id: string;
  actorId: string;
  actionType: string;
  entityType: string;
  entityId: string;
  details?: Record<string, any>;
  createdAt: string;
}

export interface PublicCardVerificationResult {
  valid: boolean;
  outcome: CardVerificationOutcome;
  status: MembershipCardStatus | 'NOT_FOUND';
  maskedCardNumber?: string;
  editionName?: string;
  editionCode?: string;
  cardholderDisplayName?: string;
  cardholderInitials?: string;
  validFrom?: string;
  expiresAt?: string;
  physicalCardStatus?: PhysicalCardProductionStatus;
  message: string;
}

export interface MemberAccessCheckResult {
  authorized: boolean;
  cardStatus: MembershipCardStatus;
  cardNumber: string;
  cardholderName: string;
  editionName: string;
  zone: string;
  reason?: string;
  hasConcertTicket?: boolean;
  concertTicketStatus?: string;
  entitlement?: {
    id: string;
    benefitName: string;
    remaining: number;
  };
}