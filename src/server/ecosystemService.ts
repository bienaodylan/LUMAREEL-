import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const STORE_PATH = path.join(DATA_DIR, 'ecosystem-store.json');

export interface CmsMediaItem {
  id: string;
  title: string;
  altText: string;
  fileUrl: string;
  mimeType: string;
  mediaType: 'image' | 'video';
  sizeBytes: number;
  folder: 'general' | 'concerts' | 'black_card' | 'souvenirs' | 'homepage' | 'rewards';
  tags: string[];
  createdBy: string;
  createdAt: string;
}

export interface HomepageCmsConfig {
  searchPlaceholderFr: string;
  searchPlaceholderEn: string;
  announcementBanner: string;
  announcementActive: boolean;
  featuredHeroEyebrowFr: string;
  featuredHeroEyebrowEn: string;
  updatedAt: string;
}

export interface BlackCardBenefitCms {
  id: string;
  titleFr: string;
  descFr: string;
  titleEn: string;
  descEn: string;
}

export interface BlackCardCmsConfig {
  available: boolean;
  frontImageUrl: string;
  backImageUrl: string;
  priceAmount: number;
  currency: string;
  validityLabelFr: string;
  validityLabelEn: string;
  heroTitleFr: string;
  heroSubFr: string;
  heroTitleEn: string;
  heroSubEn: string;
  ctaOrderFr: string;
  ctaOrderEn: string;
  climaxTitleFr: string;
  climaxSubFr: string;
  climaxTitleEn: string;
  climaxSubEn: string;
  benefits: BlackCardBenefitCms[];
  updatedAt: string;
}

export interface SouvenirPhotoItem {
  id: string;
  photoKey: string;
  photoUrl: string;
  title: string;
  caption: string;
  artist: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  albumId: string;
  aspectRatio: number; // width/height, e.g. 0.72 portrait, 1.35 landscape
  downloadable: boolean;
  isPublished: boolean;
  tags: string[];
  createdAt: string;
}

export interface SouvenirCollection {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverUrl: string;
  isEditorial: boolean;
  ownerUserId?: string;
  ownerEmail?: string;
  isPublished: boolean;
  sortOrder: number;
  photoKeys: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyRule {
  key:
    | 'referral_referrer'
    | 'referral_referee'
    | 'ticket_purchase_standard'
    | 'ticket_purchase_vip'
    | 'black_card_activation'
    | 'concert_attendance';
  label: string;
  description: string;
  points: number;
  validationTrigger: string;
  maxPerUser: number | null;
  isActive: boolean;
  updatedAt: string;
}

export interface LoyaltyCampaign {
  id: string;
  title: string;
  description: string;
  ruleKey: LoyaltyRule['key'];
  bonusPoints: number;
  multiplier: number;
  maxClaims: number | null;
  claimsCount: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface LoyaltyReward {
  id: string;
  title: string;
  description: string;
  benefitLabel: string;
  pointsCost: number;
  stockLimit: number | null;
  redeemedCount: number;
  coverUrl: string;
  conditions: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface LoyaltyTransaction {
  id: string;
  userKey: string; // normalized lowercase email or Supabase UID
  userId?: string;
  userEmail: string;
  points: number; // positive earn/bonus, negative redeem
  transactionType: 'earn' | 'redeem' | 'bonus' | 'adjustment' | 'reversal';
  status: 'pending' | 'confirmed' | 'cancelled';
  reason: string;
  source: string;
  triggerRef: string;
  idempotencyKey: string;
  campaignId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface LoyaltyReferral {
  id: string;
  referrerKey: string;
  referrerEmail: string;
  referrerName: string;
  refereeKey: string;
  refereeEmail: string;
  refereeName: string;
  referralCode: string;
  status: 'pending' | 'validated' | 'rejected';
  rewardPoints: number;
  refereeBonusPoints: number;
  qualifyingEventRef?: string;
  rejectionReason?: string;
  createdAt: string;
  validatedAt?: string;
}

export interface LoyaltyRedemption {
  id: string;
  userKey: string;
  userEmail: string;
  rewardId: string;
  rewardTitle: string;
  pointsSpent: number;
  voucherCode: string;
  status: 'active' | 'used' | 'cancelled';
  transactionId: string;
  createdAt: string;
}

export interface MemberProfileRecord {
  userKey: string;
  userId?: string;
  email: string;
  name: string;
  phone: string;
  city: string;
  referralCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemberNotification {
  id: string;
  userKey: string;
  userEmail: string;
  type: 'points' | 'referral' | 'reward' | 'order' | 'card' | 'souvenir' | 'system';
  title: string;
  body: string;
  linkPage?: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

interface EcosystemStore {
  cmsMedia: CmsMediaItem[];
  homepageCms: HomepageCmsConfig;
  blackCardCms: BlackCardCmsConfig;
  souvenirPhotos: SouvenirPhotoItem[];
  souvenirCollections: SouvenirCollection[];
  loyaltyRules: LoyaltyRule[];
  loyaltyCampaigns: LoyaltyCampaign[];
  loyaltyRewards: LoyaltyReward[];
  loyaltyTransactions: LoyaltyTransaction[];
  loyaltyReferrals: LoyaltyReferral[];
  loyaltyRedemptions: LoyaltyRedemption[];
  memberProfiles: MemberProfileRecord[];
  notifications: MemberNotification[];
  auditLogs: AdminAuditLog[];
}

function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

function makeSlug(input: string): string {
  return (
    String(input || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `col-${Date.now()}`
  );
}

function generateReferralCode(seedEmail: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${seedEmail}:${crypto.randomBytes(6).toString('hex')}`)
    .digest('hex')
    .slice(0, 8)
    .toUpperCase();
  return `LMR-${hash}`;
}

function createDefaultStore(): EcosystemStore {
  const now = new Date().toISOString();

  const defaultMedia: CmsMediaItem[] = [
    {
      id: 'med_bc_front',
      title: 'LUMARÉEL Black Card — Recto officiel',
      altText: 'Face avant officielle de la LUMARÉEL Black Card',
      fileUrl: '/assets/aistudio/IMG_6112_896cf3ce.png',
      mimeType: 'image/png',
      mediaType: 'image',
      sizeBytes: 412000,
      folder: 'black_card',
      tags: ['black-card', 'recto', 'officiel'],
      createdBy: 'system',
      createdAt: now,
    },
    {
      id: 'med_bc_back',
      title: 'LUMARÉEL Black Card — Verso officiel',
      altText: 'Face arrière officielle de la LUMARÉEL Black Card',
      fileUrl: '/assets/aistudio/IMG_6111_952dcd49.png',
      mimeType: 'image/png',
      mediaType: 'image',
      sizeBytes: 398000,
      folder: 'black_card',
      tags: ['black-card', 'verso', 'officiel'],
      createdBy: 'system',
      createdAt: now,
    },
    {
      id: 'med_souv_1',
      title: 'Foule et lumières — Concert Abidjan',
      altText: 'Foule et lumière de scène au concert LUMARÉEL',
      fileUrl: '/media-assets/concert_memories_crowd_1795735706315.jpg',
      mimeType: 'image/jpeg',
      mediaType: 'image',
      sizeBytes: 325000,
      folder: 'souvenirs',
      tags: ['didi-b', 'abidjan', 'scene', 'souvenirs'],
      createdBy: 'system',
      createdAt: now,
    },
    {
      id: 'med_souv_2',
      title: 'Faisceaux de scène — Palais de la Culture',
      altText: 'Faisceaux lumineux sur la grande scène LUMARÉEL',
      fileUrl: '/media-assets/backstage_stage_beams_1795857146120.jpg',
      mimeType: 'image/jpeg',
      mediaType: 'image',
      sizeBytes: 318000,
      folder: 'souvenirs',
      tags: ['scene', 'himra', 'lumiere'],
      createdBy: 'system',
      createdAt: now,
    },
    {
      id: 'med_souv_3',
      title: 'Loge artiste — Cinq minutes avant scène',
      altText: 'Préparation en coulisses avant l’entrée sur scène',
      fileUrl: '/media-assets/backstage_artist_dressing_1795857144421.jpg',
      mimeType: 'image/jpeg',
      mediaType: 'image',
      sizeBytes: 294000,
      folder: 'souvenirs',
      tags: ['coulisses', 'backstage', 'portrait'],
      createdBy: 'system',
      createdAt: now,
    },
    {
      id: 'med_souv_4',
      title: 'Premiers rangs VIP — Soirée Signature',
      altText: 'Public aux premiers rangs face à la scène',
      fileUrl: '/media-assets/black_card_concerts_crowd_1794694902084.jpg',
      mimeType: 'image/jpeg',
      mediaType: 'image',
      sizeBytes: 342000,
      folder: 'concerts',
      tags: ['vip', 'public', 'premiers-rangs'],
      createdBy: 'system',
      createdAt: now,
    },
  ];

  const defaultPhotos: SouvenirPhotoItem[] = [
    {
      id: 'souv_01',
      photoKey: 'souv_01',
      photoUrl: '/media-assets/concert_memories_crowd_1795735706315.jpg',
      title: 'Lumières sur la fosse',
      caption: 'L’instant où toute la salle s’est levée sur le premier refrain.',
      artist: 'Didi B',
      eventId: 'evt-didi-b-abidjan-2026',
      eventTitle: 'DIDI B — MOJATRON LIVE ABIDJAN',
      eventDate: '2026-06-20',
      eventVenue: 'Parc des Expositions · Abidjan',
      albumId: 'alb-didi-b-2026',
      aspectRatio: 0.72,
      downloadable: true,
      isPublished: true,
      tags: ['fosse', 'lumiere', 'abidjan', 'didi-b'],
      createdAt: now,
    },
    {
      id: 'souv_02',
      photoKey: 'souv_02',
      photoUrl: '/media-assets/backstage_stage_beams_1795857146120.jpg',
      title: 'Faisceaux avant le rappel',
      caption: 'Mise en scène monumentale sous les projecteurs blancs.',
      artist: 'Himra',
      eventId: 'evt-himra-palais-2026',
      eventTitle: 'HIMRA — NUIT NOIRE AU PALAIS',
      eventDate: '2026-07-11',
      eventVenue: 'Palais de la Culture · Abidjan',
      albumId: 'alb-himra-2026',
      aspectRatio: 1.38,
      downloadable: true,
      isPublished: true,
      tags: ['scene', 'himra', 'palais'],
      createdAt: now,
    },
    {
      id: 'souv_03',
      photoKey: 'souv_03',
      photoUrl: '/media-assets/backstage_artist_dressing_1795857144421.jpg',
      title: 'Cinq minutes avant scène',
      caption: 'Silence concentré en coulisses juste avant l’appel du régisseur.',
      artist: 'Didi B',
      eventId: 'evt-didi-b-abidjan-2026',
      eventTitle: 'DIDI B — MOJATRON LIVE ABIDJAN',
      eventDate: '2026-06-20',
      eventVenue: 'Parc des Expositions · Abidjan',
      albumId: 'alb-didi-b-2026',
      aspectRatio: 0.68,
      downloadable: true,
      isPublished: true,
      tags: ['coulisses', 'portrait', 'didi-b'],
      createdAt: now,
    },
    {
      id: 'souv_04',
      photoKey: 'souv_04',
      photoUrl: '/media-assets/black_card_concerts_crowd_1794694902084.jpg',
      title: 'Premiers rangs en fusion',
      caption: 'Proximité absolue entre la scène et la communauté LUMARÉEL.',
      artist: 'Josey',
      eventId: 'evt-josey-symphonique-2026',
      eventTitle: 'JOSEY — SOIRÉE SIGNATURE',
      eventDate: '2026-08-15',
      eventVenue: 'Sofitel Hôtel Ivoire · Abidjan',
      albumId: 'alb-josey-2026',
      aspectRatio: 0.84,
      downloadable: true,
      isPublished: true,
      tags: ['public', 'vip', 'josey'],
      createdAt: now,
    },
    {
      id: 'souv_05',
      photoKey: 'souv_05',
      photoUrl: '/media-assets/vip_lounge_empty_stage_1795099845090.jpg',
      title: 'Scène vide avant l’ouverture',
      caption: 'Le calme architectural quelques instants avant l’arrivée des membres.',
      artist: 'Josey',
      eventId: 'evt-josey-symphonique-2026',
      eventTitle: 'JOSEY — SOIRÉE SIGNATURE',
      eventDate: '2026-08-15',
      eventVenue: 'Sofitel Hôtel Ivoire · Abidjan',
      albumId: 'alb-josey-2026',
      aspectRatio: 1.45,
      downloadable: true,
      isPublished: true,
      tags: ['architecture', 'scene', 'josey'],
      createdAt: now,
    },
    {
      id: 'souv_06',
      photoKey: 'souv_06',
      photoUrl: '/media-assets/black_card_hero_night_tall_1794694902515.jpg',
      title: 'Après-concert — Nuit blanche',
      caption: 'Ambiance feutrée entre membres Black Card après la dernière note.',
      artist: 'Himra',
      eventId: 'evt-himra-palais-2026',
      eventTitle: 'HIMRA — NUIT NOIRE AU PALAIS',
      eventDate: '2026-07-11',
      eventVenue: 'Palais de la Culture · Abidjan',
      albumId: 'alb-himra-2026',
      aspectRatio: 0.72,
      downloadable: true,
      isPublished: true,
      tags: ['nuit', 'lounge', 'himra'],
      createdAt: now,
    },
    {
      id: 'souv_07',
      photoKey: 'souv_07',
      photoUrl: '/media-assets/backstage_soundcheck_1795735706175.jpg',
      title: 'Balances de fin d’après-midi',
      caption: 'Réglages acoustiques millimétrés avant l’ouverture des portes.',
      artist: 'Didi B',
      eventId: 'evt-didi-b-abidjan-2026',
      eventTitle: 'DIDI B — MOJATRON LIVE ABIDJAN',
      eventDate: '2026-06-20',
      eventVenue: 'Parc des Expositions · Abidjan',
      albumId: 'alb-didi-b-2026',
      aspectRatio: 1.25,
      downloadable: true,
      isPublished: true,
      tags: ['balances', 'son', 'didi-b'],
      createdAt: now,
    },
    {
      id: 'souv_08',
      photoKey: 'souv_08',
      photoUrl: '/media-assets/black_card_hero_portrait_left_1794694901752.jpg',
      title: 'Portrait de nuit sous projecteur',
      caption: 'Éclat de lumière au milieu du public abidjanais.',
      artist: 'Himra',
      eventId: 'evt-himra-palais-2026',
      eventTitle: 'HIMRA — NUIT NOIRE AU PALAIS',
      eventDate: '2026-07-11',
      eventVenue: 'Palais de la Culture · Abidjan',
      albumId: 'alb-himra-2026',
      aspectRatio: 0.68,
      downloadable: true,
      isPublished: true,
      tags: ['portrait', 'nuit', 'himra'],
      createdAt: now,
    },
    {
      id: 'souv_09',
      photoKey: 'souv_09',
      photoUrl: '/media-assets/backstage_studio_session_1795735706831.jpg',
      title: 'Session studio nocturne',
      caption: 'Enregistrement exclusif avant la tournée nationale.',
      artist: 'Didi B',
      eventId: 'evt-didi-b-abidjan-2026',
      eventTitle: 'DIDI B — MOJATRON LIVE ABIDJAN',
      eventDate: '2026-06-20',
      eventVenue: 'Parc des Expositions · Abidjan',
      albumId: 'alb-didi-b-2026',
      aspectRatio: 1.32,
      downloadable: true,
      isPublished: true,
      tags: ['studio', 'coulisses', 'didi-b'],
      createdAt: now,
    },
    {
      id: 'souv_10',
      photoKey: 'souv_10',
      photoUrl: '/media-assets/black_card_vip_mezzanine_1794694903429.jpg',
      title: 'Mezzanine & vue panoramique',
      caption: 'Regard surplombant la salle juste avant l’entrée de l’orchestre.',
      artist: 'Josey',
      eventId: 'evt-josey-symphonique-2026',
      eventTitle: 'JOSEY — SOIRÉE SIGNATURE',
      eventDate: '2026-08-15',
      eventVenue: 'Sofitel Hôtel Ivoire · Abidjan',
      albumId: 'alb-josey-2026',
      aspectRatio: 0.78,
      downloadable: true,
      isPublished: true,
      tags: ['mezzanine', 'vip', 'josey'],
      createdAt: now,
    },
  ];

  const defaultCollections: SouvenirCollection[] = [
    {
      id: 'col_ed_nuits_abidjan',
      slug: 'nuits-dabidjan-2026',
      title: 'Nuits d’Abidjan · Édition 2026',
      description: 'Les cadres les plus intenses capturés au cœur de nos grandes soirées.',
      coverUrl: '/media-assets/concert_memories_crowd_1795735706315.jpg',
      isEditorial: true,
      isPublished: true,
      sortOrder: 1,
      photoKeys: ['souv_01', 'souv_02', 'souv_04', 'souv_08', 'souv_10'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'col_ed_coulisses',
      slug: 'silences-de-coulisses',
      title: 'Silences de coulisses',
      description: 'Avant l’entrée sur scène, lorsque l’adrénaline monte hors champ.',
      coverUrl: '/media-assets/backstage_artist_dressing_1795857144421.jpg',
      isEditorial: true,
      isPublished: true,
      sortOrder: 2,
      photoKeys: ['souv_03', 'souv_05', 'souv_06', 'souv_07', 'souv_09'],
      createdAt: now,
      updatedAt: now,
    },
  ];

  return {
    cmsMedia: defaultMedia,
    homepageCms: {
      searchPlaceholderFr: 'Rechercher un concert, un artiste, un lieu...',
      searchPlaceholderEn: 'Search a concert, an artist, a venue...',
      announcementBanner: '',
      announcementActive: false,
      featuredHeroEyebrowFr: 'À L’AFFICHE',
      featuredHeroEyebrowEn: 'FEATURED',
      updatedAt: now,
    },
    blackCardCms: {
      available: true,
      frontImageUrl: '/assets/aistudio/IMG_6112_896cf3ce.png',
      backImageUrl: '/assets/aistudio/IMG_6111_952dcd49.png',
      priceAmount: 50000,
      currency: 'FCFA',
      validityLabelFr: '12 mois',
      validityLabelEn: '12 months',
      heroTitleFr: 'Les concerts. Mais autrement.',
      heroSubFr: 'Plus qu’une présence. Une expérience privilégiée dans l’univers LUMARÉEL.',
      heroTitleEn: 'Concerts. Done differently.',
      heroSubEn: 'More than attendance. A privileged way into the LUMARÉEL universe.',
      ctaOrderFr: 'Obtenir ma Black Card',
      ctaOrderEn: 'Get my Black Card',
      climaxTitleFr: 'La carte. L’entrée. Les premiers rangs.',
      climaxSubFr: 'Présentez simplement votre Black Card et vivez chaque instant.',
      climaxTitleEn: 'The card. The entrance. The front row.',
      climaxSubEn: 'Simply present your Black Card and step into the night.',
      benefits: [
        {
          id: 'priority_queue',
          titleFr: 'Accès prioritaire dans la file d’attente',
          descFr: 'Vous franchissez les portes sans attendre, par le passage dédié aux membres.',
          titleEn: 'Priority queue access',
          descEn: 'Walk straight in through the dedicated member lane without waiting in line.',
        },
        {
          id: 'reserved_parking',
          titleFr: 'Place de parking réservée',
          descFr: 'Votre emplacement vous attend déjà à l’arrivée. Plus rien à chercher avant d’entrer.',
          titleEn: 'Reserved parking spot',
          descEn: 'Your space is already waiting when you arrive. Nothing to search for.',
        },
        {
          id: 'vip_front_row',
          titleFr: 'Placement VIP aux premiers rangs',
          descFr: 'Au plus près de la scène, là où l’énergie du concert prend toute son intensité.',
          titleEn: 'Front-row VIP seating',
          descEn: 'Right up close to the stage, where every moment carries its full intensity.',
        },
        {
          id: 'free_refreshment',
          titleFr: 'Rafraîchissement offert',
          descFr: 'Une boisson vous est offerte pour accompagner le moment en toute simplicité.',
          titleEn: 'Complimentary refreshment',
          descEn: 'A drink awaits you so you can unwind and take in the atmosphere effortlessly.',
        },
        {
          id: 'presale_access',
          titleFr: 'Accès aux préventes',
          descFr: 'Vous réservez vos places avant l’ouverture au grand public, dès l’annonce des dates.',
          titleEn: 'Presale access',
          descEn: 'Reserve your tickets before general public release as soon as new dates drop.',
        },
        {
          id: 'meet_and_greet',
          titleFr: 'Accès aux Meet & Greet',
          descFr: 'Ce qui se passe hors scène peut aussi vous appartenir : la rencontre réelle avec les artistes.',
          titleEn: 'Meet & Greet access',
          descEn: 'What happens off stage can belong to you too — meeting the artists in person.',
        },
        {
          id: 'partner_discount',
          titleFr: 'Réduction sur les articles de nos partenaires',
          descFr: 'L’univers LUMARÉEL se prolonge au-delà du concert, avec des tarifs préférentiels sur les articles de nos marques et boutiques partenaires.',
          titleEn: 'Discounts on partner items',
          descEn: 'The LUMARÉEL universe extends beyond concert night with preferential rates across our partner brands and shops.',
        },
      ],
      updatedAt: now,
    },
    souvenirPhotos: defaultPhotos,
    souvenirCollections: defaultCollections,
    loyaltyRules: [
      {
        key: 'referral_referrer',
        label: 'Parrainage validé (Parrain)',
        description: 'Crédité automatiquement dès le premier achat billet ou activation Black Card du filleul.',
        points: 500,
        validationTrigger: 'first_paid_order_or_card',
        maxPerUser: 50,
        isActive: true,
        updatedAt: now,
      },
      {
        key: 'referral_referee',
        label: 'Bienvenue parrainage (Filleul)',
        description: 'Bonus de bienvenue crédité automatiquement au filleul lors de son premier achat validé.',
        points: 150,
        validationTrigger: 'first_paid_order_or_card',
        maxPerUser: 1,
        isActive: true,
        updatedAt: now,
      },
      {
        key: 'ticket_purchase_standard',
        label: 'Achat billet standard',
        description: 'Points crédités automatiquement par billet standard confirmé.',
        points: 100,
        validationTrigger: 'completed_order',
        maxPerUser: null,
        isActive: true,
        updatedAt: now,
      },
      {
        key: 'ticket_purchase_vip',
        label: 'Achat billet VIP',
        description: 'Points crédités automatiquement par billet VIP confirmé.',
        points: 250,
        validationTrigger: 'completed_order',
        maxPerUser: null,
        isActive: true,
        updatedAt: now,
      },
      {
        key: 'black_card_activation',
        label: 'Activation LUMARÉEL Black Card',
        description: 'Crédité automatiquement lors de l’activation de votre Black Card.',
        points: 500,
        validationTrigger: 'black_card_active',
        maxPerUser: 1,
        isActive: true,
        updatedAt: now,
      },
      {
        key: 'concert_attendance',
        label: 'Présence confirmée au concert',
        description: 'Points crédités lors de la validation de votre billet au contrôle.',
        points: 150,
        validationTrigger: 'ticket_checkin',
        maxPerUser: null,
        isActive: true,
        updatedAt: now,
      },
    ],
    loyaltyCampaigns: [
      {
        id: 'camp_summer_ref_2026',
        title: 'Saison Concerts 2026 · Parrainage accéléré',
        description: 'Invitez vos proches sur LUMARÉEL : chaque premier billet validé débloque vos Gift Points automatiquement.',
        ruleKey: 'referral_referrer',
        bonusPoints: 100,
        multiplier: 1,
        maxClaims: 500,
        claimsCount: 0,
        startsAt: now,
        endsAt: '2026-12-31T23:59:59.000Z',
        isActive: true,
        createdAt: now,
      },
    ],
    loyaltyRewards: [
      {
        id: 'rew_drink_concert',
        title: 'Rafraîchissement offert au concert',
        description: 'Présente ton bon membre au bar officiel LUMARÉEL lors de ton prochain concert.',
        benefitLabel: '1 boisson offerte',
        pointsCost: 250,
        stockLimit: 200,
        redeemedCount: 0,
        coverUrl: '',
        conditions: 'Valable sur les concerts officiels LUMARÉEL, hors alcool fort.',
        isActive: true,
        sortOrder: 1,
        createdAt: now,
      },
      {
        id: 'rew_discount_5000',
        title: 'Réduction billet 5 000 FCFA',
        description: 'Code privilège immédiatement utilisable sur ta prochaine réservation.',
        benefitLabel: '-5 000 FCFA',
        pointsCost: 500,
        stockLimit: 150,
        redeemedCount: 0,
        coverUrl: '',
        conditions: 'Valable dès 15 000 FCFA d’achat sur la billetterie officielle.',
        isActive: true,
        sortOrder: 2,
        createdAt: now,
      },
      {
        id: 'rew_fast_lane',
        title: 'Pass File Prioritaire',
        description: 'Accède au concert par la file rapide dédiée sur la date de ton choix.',
        benefitLabel: 'Fast-Lane 1 soir',
        pointsCost: 800,
        stockLimit: 80,
        redeemedCount: 0,
        coverUrl: '',
        conditions: 'Valable pour 1 titulaire muni d’un billet valide.',
        isActive: true,
        sortOrder: 3,
        createdAt: now,
      },
      {
        id: 'rew_black_card_credit',
        title: 'Remise 15 000 FCFA sur la Black Card',
        description: 'Réduis le montant de ton adhésion annuelle LUMARÉEL Black Card.',
        benefitLabel: '-15 000 FCFA Black Card',
        pointsCost: 1500,
        stockLimit: 50,
        redeemedCount: 0,
        coverUrl: '/assets/aistudio/IMG_6112_896cf3ce.png',
        conditions: 'Non cumulable avec d’autres offres Black Card.',
        isActive: true,
        sortOrder: 4,
        createdAt: now,
      },
    ],
    loyaltyTransactions: [],
    loyaltyReferrals: [],
    loyaltyRedemptions: [],
    memberProfiles: [],
    notifications: [],
    auditLogs: [],
  };
}

class EcosystemService {
  private store: EcosystemStore;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    this.store = this.loadStore();
  }

  private loadStore(): EcosystemStore {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        const defaults = createDefaultStore();
        return {
          ...defaults,
          ...parsed,
          homepageCms: { ...defaults.homepageCms, ...(parsed.homepageCms || {}) },
          blackCardCms: {
            ...defaults.blackCardCms,
            ...(parsed.blackCardCms || {}),
            benefits:
              Array.isArray(parsed.blackCardCms?.benefits) && parsed.blackCardCms.benefits.length === 7
                ? parsed.blackCardCms.benefits
                : defaults.blackCardCms.benefits,
          },
          loyaltyRules:
            Array.isArray(parsed.loyaltyRules) && parsed.loyaltyRules.length > 0
              ? parsed.loyaltyRules
              : defaults.loyaltyRules,
          loyaltyRewards:
            Array.isArray(parsed.loyaltyRewards) && parsed.loyaltyRewards.length > 0
              ? parsed.loyaltyRewards
              : defaults.loyaltyRewards,
        };
      }
    } catch (err) {
      console.error('[EcosystemService] Store load error, resetting defaults:', err);
    }
    const fresh = createDefaultStore();
    this.persist(fresh);
    return fresh;
  }

  private persist(data: EcosystemStore = this.store) {
    try {
      const tmp = `${STORE_PATH}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tmp, STORE_PATH);
    } catch (err) {
      console.error('[EcosystemService] Persist error:', err);
    }
  }

  // ============================================================================
  // AUDIT LOGGING
  // ============================================================================
  public recordAudit(actorEmail: string, action: string, entityType: string, entityId?: string, details?: Record<string, unknown>) {
    const entry: AdminAuditLog = {
      id: `aud_${crypto.randomBytes(6).toString('hex')}`,
      actorEmail: normalizeEmail(actorEmail) || 'admin@lumareel.com',
      action,
      entityType,
      entityId,
      details,
      createdAt: new Date().toISOString(),
    };
    this.store.auditLogs.unshift(entry);
    if (this.store.auditLogs.length > 500) {
      this.store.auditLogs = this.store.auditLogs.slice(0, 500);
    }
    this.persist();
    return entry;
  }

  public getAuditLogs(limit = 100): AdminAuditLog[] {
    return this.store.auditLogs.slice(0, Math.min(Math.max(limit, 1), 300));
  }

  // ============================================================================
  // MEMBER PROFILES & NOTIFICATIONS
  // ============================================================================
  public ensureMemberProfile(params: { email: string; userId?: string; name?: string; phone?: string; city?: string }): MemberProfileRecord {
    const email = normalizeEmail(params.email);
    if (!email) {
      throw new Error('Adresse e-mail membre requise.');
    }
    let profile = this.store.memberProfiles.find((p) => p.userKey === email);
    const now = new Date().toISOString();
    if (!profile) {
      let code = generateReferralCode(email);
      while (this.store.memberProfiles.some((p) => p.referralCode === code)) {
        code = generateReferralCode(`${email}-${Math.random()}`);
      }
      profile = {
        userKey: email,
        userId: params.userId,
        email,
        name: (params.name || email.split('@')[0] || 'Membre LUMARÉEL').trim(),
        phone: (params.phone || '').trim(),
        city: (params.city || 'Abidjan').trim(),
        referralCode: code,
        createdAt: now,
        updatedAt: now,
      };
      this.store.memberProfiles.unshift(profile);
      this.persist();
    } else {
      let dirty = false;
      if (params.userId && !profile.userId) {
        profile.userId = params.userId;
        dirty = true;
      }
      if (params.name && (!profile.name || profile.name === email.split('@')[0])) {
        profile.name = params.name.trim();
        dirty = true;
      }
      if (dirty) {
        profile.updatedAt = now;
        this.persist();
      }
    }
    return profile;
  }

  public updateMemberProfile(email: string, updates: { name?: string; phone?: string; city?: string; userId?: string }): MemberProfileRecord {
    const profile = this.ensureMemberProfile({ email, userId: updates.userId });
    if (typeof updates.name === 'string' && updates.name.trim().length >= 2) {
      profile.name = updates.name.trim().slice(0, 120);
    }
    if (typeof updates.phone === 'string') {
      profile.phone = updates.phone.trim().slice(0, 40);
    }
    if (typeof updates.city === 'string') {
      profile.city = updates.city.trim().slice(0, 80);
    }
    profile.updatedAt = new Date().toISOString();
    this.persist();
    return profile;
  }

  public pushNotification(params: {
    email: string;
    type: MemberNotification['type'];
    title: string;
    body: string;
    linkPage?: string;
    metadata?: Record<string, unknown>;
  }): MemberNotification {
    const email = normalizeEmail(params.email);
    const notif: MemberNotification = {
      id: `ntf_${crypto.randomBytes(6).toString('hex')}`,
      userKey: email,
      userEmail: email,
      type: params.type,
      title: params.title,
      body: params.body,
      linkPage: params.linkPage,
      isRead: false,
      metadata: params.metadata,
      createdAt: new Date().toISOString(),
    };
    this.store.notifications.unshift(notif);
    this.persist();
    return notif;
  }

  public getNotifications(email: string): MemberNotification[] {
    const key = normalizeEmail(email);
    return this.store.notifications.filter((n) => n.userKey === key).slice(0, 60);
  }

  public markNotificationRead(email: string, notificationId?: string): number {
    const key = normalizeEmail(email);
    let updated = 0;
    for (const n of this.store.notifications) {
      if (n.userKey !== key) continue;
      if (!notificationId || n.id === notificationId) {
        if (!n.isRead) {
          n.isRead = true;
          updated += 1;
        }
      }
    }
    if (updated > 0) this.persist();
    return updated;
  }

  // ============================================================================
  // AUTONOMOUS GIFT POINTS TRANSACTIONAL ENGINE
  // ============================================================================
  public computeBalance(email: string): { balance: number; earned: number; used: number } {
    const key = normalizeEmail(email);
    let earned = 0;
    let used = 0;
    for (const tx of this.store.loyaltyTransactions) {
      if (tx.userKey !== key || tx.status !== 'confirmed') continue;
      if (tx.points > 0) earned += tx.points;
      else used += Math.abs(tx.points);
    }
    return { balance: Math.max(0, earned - used), earned, used };
  }

  private getActiveCampaignForRule(ruleKey: LoyaltyRule['key']): LoyaltyCampaign | null {
    const nowMs = Date.now();
    return (
      this.store.loyaltyCampaigns.find((c) => {
        if (!c.isActive || c.ruleKey !== ruleKey) return false;
        if (c.startsAt && new Date(c.startsAt).getTime() > nowMs) return false;
        if (c.endsAt && new Date(c.endsAt).getTime() < nowMs) return false;
        if (c.maxClaims !== null && c.claimsCount >= c.maxClaims) return false;
        return true;
      }) || null
    );
  }

  public awardPoints(params: {
    email: string;
    userId?: string;
    points: number;
    reason: string;
    source: string;
    triggerRef: string;
    idempotencyKey: string;
    transactionType?: LoyaltyTransaction['transactionType'];
    campaignId?: string;
    metadata?: Record<string, unknown>;
    notify?: boolean;
  }): { created: boolean; transaction: LoyaltyTransaction } {
    const email = normalizeEmail(params.email);
    if (!email || !Number.isFinite(params.points) || params.points <= 0) {
      throw new Error('Paramètres de crédit Gift Points invalides.');
    }
    const existing = this.store.loyaltyTransactions.find((t) => t.idempotencyKey === params.idempotencyKey);
    if (existing) {
      return { created: false, transaction: existing };
    }
    this.ensureMemberProfile({ email, userId: params.userId });
    const tx: LoyaltyTransaction = {
      id: `ptx_${crypto.randomBytes(6).toString('hex')}`,
      userKey: email,
      userId: params.userId,
      userEmail: email,
      points: Math.round(params.points),
      transactionType: params.transactionType || 'earn',
      status: 'confirmed',
      reason: params.reason,
      source: params.source,
      triggerRef: params.triggerRef,
      idempotencyKey: params.idempotencyKey,
      campaignId: params.campaignId,
      metadata: params.metadata,
      createdAt: new Date().toISOString(),
    };
    this.store.loyaltyTransactions.unshift(tx);

    if (params.notify !== false) {
      this.pushNotification({
        email,
        type: 'points',
        title: `+${tx.points} Gift Points crédités`,
        body: tx.reason,
        linkPage: 'rewards',
        metadata: { transactionId: tx.id, points: tx.points },
      });
    }

    this.persist();
    return { created: true, transaction: tx };
  }

  public redeemReward(params: { email: string; userId?: string; rewardId: string }): {
    redemption: LoyaltyRedemption;
    balance: number;
  } {
    const email = normalizeEmail(params.email);
    if (!email) throw new Error('Authentification requise.');
    this.ensureMemberProfile({ email, userId: params.userId });

    const reward = this.store.loyaltyRewards.find((r) => r.id === params.rewardId && r.isActive);
    if (!reward) {
      throw new Error('Récompense introuvable ou indisponible.');
    }
    if (reward.stockLimit !== null && reward.redeemedCount >= reward.stockLimit) {
      throw new Error('Cette récompense est actuellement épuisée.');
    }

    const summary = this.computeBalance(email);
    if (summary.balance < reward.pointsCost) {
      throw new Error(
        `Solde insuffisant (${summary.balance} GP disponibles pour ${reward.pointsCost} GP requis).`
      );
    }

    const voucherCode = `LMR-GIFT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const tx: LoyaltyTransaction = {
      id: `ptx_${crypto.randomBytes(6).toString('hex')}`,
      userKey: email,
      userId: params.userId,
      userEmail: email,
      points: -reward.pointsCost,
      transactionType: 'redeem',
      status: 'confirmed',
      reason: `Récompense débloquée : ${reward.title}`,
      source: 'reward_redemption',
      triggerRef: voucherCode,
      idempotencyKey: `redeem:${email}:${voucherCode}`,
      metadata: { rewardId: reward.id, voucherCode },
      createdAt: new Date().toISOString(),
    };

    const redemption: LoyaltyRedemption = {
      id: `red_${crypto.randomBytes(6).toString('hex')}`,
      userKey: email,
      userEmail: email,
      rewardId: reward.id,
      rewardTitle: reward.title,
      pointsSpent: reward.pointsCost,
      voucherCode,
      status: 'active',
      transactionId: tx.id,
      createdAt: new Date().toISOString(),
    };

    reward.redeemedCount += 1;
    this.store.loyaltyTransactions.unshift(tx);
    this.store.loyaltyRedemptions.unshift(redemption);

    this.pushNotification({
      email,
      type: 'reward',
      title: `Récompense débloquée · ${reward.benefitLabel || reward.title}`,
      body: `Code privilège : ${voucherCode} (${reward.pointsCost} GP utilisés).`,
      linkPage: 'rewards',
      metadata: { voucherCode, rewardId: reward.id },
    });

    this.persist();
    return {
      redemption,
      balance: this.computeBalance(email).balance,
    };
  }

  // ============================================================================
  // AUTOMATED REFERRAL ENGINE (ANTI-ABUSE + VALIDATION HOOKS)
  // ============================================================================
  public applyReferralCode(params: {
    refereeEmail: string;
    refereeName?: string;
    refereeUserId?: string;
    referralCode: string;
  }): { applied: boolean; referral?: LoyaltyReferral; message: string } {
    const refereeEmail = normalizeEmail(params.refereeEmail);
    const cleanCode = String(params.referralCode || '').trim().toUpperCase();
    if (!refereeEmail) {
      throw new Error('Compte utilisateur requis.');
    }
    if (cleanCode.length < 5) {
      throw new Error('Code de parrainage invalide.');
    }

    const refereeProfile = this.ensureMemberProfile({
      email: refereeEmail,
      userId: params.refereeUserId,
      name: params.refereeName,
    });

    // Block duplicate signup / multiple referrals for same referee
    const existingForReferee = this.store.loyaltyReferrals.find((r) => r.refereeKey === refereeEmail);
    if (existingForReferee) {
      return {
        applied: false,
        referral: existingForReferee,
        message: 'Un parrainage est déjà rattaché à ce compte.',
      };
    }

    const referrerProfile = this.store.memberProfiles.find((p) => p.referralCode === cleanCode);
    if (!referrerProfile) {
      throw new Error('Code de parrainage introuvable.');
    }

    // Strict self-referral prevention (same email, same userId, or same referral code)
    if (
      referrerProfile.userKey === refereeEmail ||
      (params.refereeUserId && referrerProfile.userId && referrerProfile.userId === params.refereeUserId) ||
      referrerProfile.referralCode === refereeProfile.referralCode
    ) {
      throw new Error('L’auto-parrainage est strictement interdit.');
    }

    const referrerRule = this.store.loyaltyRules.find((r) => r.key === 'referral_referrer');
    const refereeRule = this.store.loyaltyRules.find((r) => r.key === 'referral_referee');
    const maxRefs = referrerRule?.maxPerUser ?? 50;
    const currentReferrerTotal = this.store.loyaltyReferrals.filter(
      (r) => r.referrerKey === referrerProfile.userKey && r.status !== 'rejected'
    ).length;

    if (maxRefs !== null && currentReferrerTotal >= maxRefs) {
      throw new Error('Ce code a atteint la limite maximale de parrainages autorisée.');
    }

    const campaign = this.getActiveCampaignForRule('referral_referrer');
    const basePoints = referrerRule?.isActive ? referrerRule.points : 500;
    const expectedReward = Math.round(basePoints * (campaign?.multiplier || 1) + (campaign?.bonusPoints || 0));
    const refereeBonus = refereeRule?.isActive ? refereeRule.points : 0;

    const referral: LoyaltyReferral = {
      id: `ref_${crypto.randomBytes(6).toString('hex')}`,
      referrerKey: referrerProfile.userKey,
      referrerEmail: referrerProfile.email,
      referrerName: referrerProfile.name,
      refereeKey: refereeEmail,
      refereeEmail,
      refereeName: refereeProfile.name,
      referralCode: cleanCode,
      status: 'pending',
      rewardPoints: expectedReward,
      refereeBonusPoints: refereeBonus,
      createdAt: new Date().toISOString(),
    };

    this.store.loyaltyReferrals.unshift(referral);

    this.pushNotification({
      email: referrerProfile.email,
      type: 'referral',
      title: 'Nouvel invité inscrit via ton lien',
      body: `${refereeProfile.name} vient de rejoindre LUMARÉEL. Tes ${expectedReward} Gift Points seront crédités automatiquement dès son premier achat qualifiant.`,
      linkPage: 'rewards',
      metadata: { referralId: referral.id },
    });

    this.persist();
    return {
      applied: true,
      referral,
      message: 'Code de parrainage enregistré ! Il sera validé automatiquement après ton premier billet ou Black Card.',
    };
  }

  public validatePendingReferralForUser(params: {
    refereeEmail: string;
    qualifyingEventRef: string;
    triggerType: 'ticket_order' | 'black_card';
  }): LoyaltyReferral | null {
    const key = normalizeEmail(params.refereeEmail);
    const pending = this.store.loyaltyReferrals.find((r) => r.refereeKey === key && r.status === 'pending');
    if (!pending) return null;

    // Anti-abuse check: block if same order/card ref already validated another referral
    if (
      this.store.loyaltyReferrals.some(
        (r) => r.qualifyingEventRef === params.qualifyingEventRef && r.status === 'validated'
      )
    ) {
      return null;
    }

    const referrerRule = this.store.loyaltyRules.find((r) => r.key === 'referral_referrer');
    if (referrerRule && !referrerRule.isActive) return null;

    const maxRefs = referrerRule?.maxPerUser ?? 50;
    const validatedCount = this.store.loyaltyReferrals.filter(
      (r) => r.referrerKey === pending.referrerKey && r.status === 'validated'
    ).length;

    if (maxRefs !== null && validatedCount >= maxRefs) {
      pending.status = 'rejected';
      pending.rejectionReason = 'Plafond de parrainages atteint pour le parrain.';
      this.persist();
      return null;
    }

    const campaign = this.getActiveCampaignForRule('referral_referrer');
    const basePoints = referrerRule?.points ?? 500;
    const finalPoints = Math.round(basePoints * (campaign?.multiplier || 1) + (campaign?.bonusPoints || 0));

    pending.status = 'validated';
    pending.qualifyingEventRef = params.qualifyingEventRef;
    pending.rewardPoints = finalPoints;
    pending.validatedAt = new Date().toISOString();

    if (campaign) {
      campaign.claimsCount += 1;
    }

    this.awardPoints({
      email: pending.referrerEmail,
      points: finalPoints,
      reason:
        params.triggerType === 'black_card'
          ? `Parrainage validé · ${pending.refereeName} a activé sa Black Card`
          : `Parrainage validé · Premier concert de ${pending.refereeName}`,
      source: 'referral',
      triggerRef: pending.id,
      idempotencyKey: `referral_referrer:${pending.id}`,
      campaignId: campaign?.id,
      notify: true,
    });

    if (pending.refereeBonusPoints > 0) {
      this.awardPoints({
        email: pending.refereeEmail,
        points: pending.refereeBonusPoints,
        reason: 'Bonus de bienvenue parrainage validé',
        source: 'referral_welcome',
        triggerRef: pending.id,
        idempotencyKey: `referral_referee:${pending.id}`,
        transactionType: 'bonus',
        notify: true,
      });
    }

    this.persist();
    return pending;
  }

  public onOrderCompleted(params: {
    customerEmail: string;
    customerName?: string;
    orderId: string;
    categoryName?: string;
    quantity?: number;
    eventTitle?: string;
  }) {
    const email = normalizeEmail(params.customerEmail);
    if (!email) return;
    this.ensureMemberProfile({ email, name: params.customerName });

    const isVip = /vip|gold|prestige|carré/i.test(String(params.categoryName || ''));
    const ruleKey: LoyaltyRule['key'] = isVip ? 'ticket_purchase_vip' : 'ticket_purchase_standard';
    const rule = this.store.loyaltyRules.find((r) => r.key === ruleKey && r.isActive);

    if (rule && rule.points > 0) {
      const qty = Math.max(1, Number(params.quantity || 1));
      const campaign = this.getActiveCampaignForRule(ruleKey);
      const pts = Math.round(rule.points * qty * (campaign?.multiplier || 1) + (campaign?.bonusPoints || 0));
      this.awardPoints({
        email,
        points: pts,
        reason: `Achat ${qty} billet${qty > 1 ? 's' : ''} · ${params.eventTitle || 'Concert LUMARÉEL'}`,
        source: 'ticket_purchase',
        triggerRef: params.orderId,
        idempotencyKey: `ticket_order:${params.orderId}`,
        campaignId: campaign?.id,
        notify: true,
      });
    }

    this.validatePendingReferralForUser({
      refereeEmail: email,
      qualifyingEventRef: `order:${params.orderId}`,
      triggerType: 'ticket_order',
    });
  }

  public onBlackCardActivated(params: {
    email: string;
    name?: string;
    userId?: string;
    cardNumber: string;
  }) {
    const email = normalizeEmail(params.email);
    if (!email) return;
    this.ensureMemberProfile({ email, name: params.name, userId: params.userId });

    const rule = this.store.loyaltyRules.find((r) => r.key === 'black_card_activation' && r.isActive);
    if (rule && rule.points > 0) {
      const campaign = this.getActiveCampaignForRule('black_card_activation');
      const pts = Math.round(rule.points * (campaign?.multiplier || 1) + (campaign?.bonusPoints || 0));
      this.awardPoints({
        email,
        userId: params.userId,
        points: pts,
        reason: `Activation LUMARÉEL Black Card (${params.cardNumber})`,
        source: 'black_card_activation',
        triggerRef: params.cardNumber,
        idempotencyKey: `black_card:${params.cardNumber}`,
        campaignId: campaign?.id,
        notify: true,
      });
    }

    this.pushNotification({
      email,
      type: 'card',
      title: 'Ta LUMARÉEL Black Card est active',
      body: `Référence ${params.cardNumber}. Tes 7 privilèges sont disponibles immédiatement.`,
      linkPage: 'member_card',
    });

    this.validatePendingReferralForUser({
      refereeEmail: email,
      qualifyingEventRef: `card:${params.cardNumber}`,
      triggerType: 'black_card',
    });
  }

  public getMemberLoyaltyDashboard(params: { email: string; userId?: string; name?: string }) {
    const profile = this.ensureMemberProfile(params);
    const key = profile.userKey;
    const summary = this.computeBalance(key);
    const transactions = this.store.loyaltyTransactions.filter((t) => t.userKey === key).slice(0, 100);
    const referrals = this.store.loyaltyReferrals.filter((r) => r.referrerKey === key);
    const referredBy = this.store.loyaltyReferrals.find((r) => r.refereeKey === key) || null;
    const redemptions = this.store.loyaltyRedemptions.filter((r) => r.userKey === key);
    const rewards = this.store.loyaltyRewards
      .filter((r) => r.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const nowMs = Date.now();
    const activeCampaigns = this.store.loyaltyCampaigns.filter((c) => {
      if (!c.isActive) return false;
      if (c.startsAt && new Date(c.startsAt).getTime() > nowMs) return false;
      if (c.endsAt && new Date(c.endsAt).getTime() < nowMs) return false;
      return true;
    });
    const rules = this.store.loyaltyRules.filter((r) => r.isActive);

    return {
      profile,
      balance: summary.balance,
      earned: summary.earned,
      used: summary.used,
      transactions,
      referrals,
      referredBy,
      redemptions,
      rewards,
      activeCampaigns,
      rules,
    };
  }

  // ============================================================================
  // SOUVENIRS DISCOVERY & COLLECTIONS (EDITORIAL + MEMBER PERSONAL)
  // ============================================================================
  public getPublicSouvenirsFeed(userEmail?: string) {
    const photos = this.store.souvenirPhotos.filter((p) => p.isPublished);
    const editorialCollections = this.store.souvenirCollections
      .filter((c) => c.isEditorial && c.isPublished)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    let personalCollections: SouvenirCollection[] = [];
    if (userEmail) {
      const key = normalizeEmail(userEmail);
      personalCollections = this.store.souvenirCollections
        .filter((c) => !c.isEditorial && c.ownerEmail === key)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return {
      photos,
      editorialCollections,
      personalCollections,
    };
  }

  public createMemberCollection(params: {
    email: string;
    userId?: string;
    title: string;
    description?: string;
    initialPhotoKey?: string;
  }): SouvenirCollection {
    const email = normalizeEmail(params.email);
    const title = String(params.title || '').trim();
    if (!title || title.length < 2) {
      throw new Error('Donne un nom à ta collection (min. 2 caractères).');
    }
    const now = new Date().toISOString();
    const initialPhoto = params.initialPhotoKey
      ? this.store.souvenirPhotos.find((p) => p.photoKey === params.initialPhotoKey)
      : undefined;

    const col: SouvenirCollection = {
      id: `mcol_${crypto.randomBytes(6).toString('hex')}`,
      slug: `${makeSlug(title)}-${crypto.randomBytes(2).toString('hex')}`,
      title: title.slice(0, 80),
      description: String(params.description || '').trim().slice(0, 220),
      coverUrl: initialPhoto?.photoUrl || '',
      isEditorial: false,
      ownerUserId: params.userId,
      ownerEmail: email,
      isPublished: false,
      sortOrder: 0,
      photoKeys: initialPhoto ? [initialPhoto.photoKey] : [],
      createdAt: now,
      updatedAt: now,
    };
    this.store.souvenirCollections.unshift(col);
    this.persist();
    return col;
  }

  public togglePhotoInMemberCollection(params: {
    email: string;
    collectionId: string;
    photoKey: string;
  }): { collection: SouvenirCollection; saved: boolean } {
    const email = normalizeEmail(params.email);
    const col = this.store.souvenirCollections.find(
      (c) => c.id === params.collectionId && !c.isEditorial && c.ownerEmail === email
    );
    if (!col) {
      throw new Error('Collection introuvable ou non autorisée.');
    }
    const photo = this.store.souvenirPhotos.find((p) => p.photoKey === params.photoKey);
    const idx = col.photoKeys.indexOf(params.photoKey);
    let saved = false;
    if (idx >= 0) {
      col.photoKeys.splice(idx, 1);
      saved = false;
    } else {
      col.photoKeys.unshift(params.photoKey);
      saved = true;
      if (!col.coverUrl && photo?.photoUrl) {
        col.coverUrl = photo.photoUrl;
      }
    }
    col.updatedAt = new Date().toISOString();
    this.persist();
    return { collection: col, saved };
  }

  public deleteMemberCollection(email: string, collectionId: string): boolean {
    const key = normalizeEmail(email);
    const before = this.store.souvenirCollections.length;
    this.store.souvenirCollections = this.store.souvenirCollections.filter(
      (c) => !(c.id === collectionId && !c.isEditorial && c.ownerEmail === key)
    );
    const deleted = this.store.souvenirCollections.length < before;
    if (deleted) this.persist();
    return deleted;
  }

  // ============================================================================
  // ADMIN CMS, MEDIA LIBRARY, SOUVENIRS & LOYALTY MANAGEMENT
  // ============================================================================
  public getPublicCms() {
    return {
      homepage: this.store.homepageCms,
      blackCard: this.store.blackCardCms,
    };
  }

  public updateHomepageCms(actorEmail: string, patch: Partial<HomepageCmsConfig>): HomepageCmsConfig {
    this.store.homepageCms = {
      ...this.store.homepageCms,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.recordAudit(actorEmail, 'update_homepage_cms', 'cms_settings', 'homepage');
    this.persist();
    return this.store.homepageCms;
  }

  public updateBlackCardCms(actorEmail: string, patch: Partial<BlackCardCmsConfig>): BlackCardCmsConfig {
    this.store.blackCardCms = {
      ...this.store.blackCardCms,
      ...patch,
      priceAmount:
        patch.priceAmount !== undefined && Number.isFinite(Number(patch.priceAmount)) && Number(patch.priceAmount) > 0
          ? Number(patch.priceAmount)
          : this.store.blackCardCms.priceAmount,
      updatedAt: new Date().toISOString(),
    };
    this.recordAudit(actorEmail, 'update_black_card_cms', 'cms_settings', 'black_card', {
      priceAmount: this.store.blackCardCms.priceAmount,
      available: this.store.blackCardCms.available,
    });
    this.persist();
    return this.store.blackCardCms;
  }

  public listMedia(usedUrls: Set<string>): Array<CmsMediaItem & { isUsed: boolean }> {
    // Also detect internal usage across CMS, Souvenirs, Rewards
    const allUsed = new Set<string>(usedUrls);
    allUsed.add(this.store.blackCardCms.frontImageUrl);
    allUsed.add(this.store.blackCardCms.backImageUrl);
    this.store.souvenirPhotos.forEach((p) => allUsed.add(p.photoUrl));
    this.store.souvenirCollections.forEach((c) => c.coverUrl && allUsed.add(c.coverUrl));
    this.store.loyaltyRewards.forEach((r) => r.coverUrl && allUsed.add(r.coverUrl));

    return this.store.cmsMedia.map((m) => ({
      ...m,
      isUsed: allUsed.has(m.fileUrl),
    }));
  }

  public registerMedia(actorEmail: string, item: Omit<CmsMediaItem, 'id' | 'createdAt' | 'createdBy'>): CmsMediaItem {
    const created: CmsMediaItem = {
      ...item,
      id: `med_${crypto.randomBytes(6).toString('hex')}`,
      createdBy: normalizeEmail(actorEmail) || 'admin@lumareel.com',
      createdAt: new Date().toISOString(),
    };
    this.store.cmsMedia.unshift(created);
    this.recordAudit(actorEmail, 'upload_media', 'cms_media', created.id, { title: created.title, folder: created.folder });
    this.persist();
    return created;
  }

  public deleteMedia(actorEmail: string, mediaId: string): CmsMediaItem | null {
    const idx = this.store.cmsMedia.findIndex((m) => m.id === mediaId);
    if (idx < 0) return null;
    const [removed] = this.store.cmsMedia.splice(idx, 1);
    this.recordAudit(actorEmail, 'delete_media', 'cms_media', mediaId, { fileUrl: removed.fileUrl });
    this.persist();
    return removed;
  }

  public adminAddSouvenirPhoto(actorEmail: string, input: Partial<SouvenirPhotoItem>): SouvenirPhotoItem {
    const id = `souv_${crypto.randomBytes(5).toString('hex')}`;
    const photo: SouvenirPhotoItem = {
      id,
      photoKey: id,
      photoUrl: String(input.photoUrl || '').trim(),
      title: String(input.title || 'Instant concert LUMARÉEL').trim(),
      caption: String(input.caption || '').trim(),
      artist: String(input.artist || 'LUMARÉEL').trim(),
      eventId: String(input.eventId || 'evt-general').trim(),
      eventTitle: String(input.eventTitle || 'Concert LUMARÉEL').trim(),
      eventDate: String(input.eventDate || new Date().toISOString().slice(0, 10)).trim(),
      eventVenue: String(input.eventVenue || 'Abidjan').trim(),
      albumId: String(input.albumId || `alb-${makeSlug(input.eventTitle || 'general')}`),
      aspectRatio: Number(input.aspectRatio) > 0.3 && Number(input.aspectRatio) < 2.5 ? Number(input.aspectRatio) : 0.8,
      downloadable: input.downloadable !== false,
      isPublished: input.isPublished !== false,
      tags: Array.isArray(input.tags) ? input.tags : [],
      createdAt: new Date().toISOString(),
    };
    if (!photo.photoUrl) throw new Error('URL ou fichier image requis.');
    this.store.souvenirPhotos.unshift(photo);
    this.recordAudit(actorEmail, 'add_souvenir_photo', 'souvenir_photo', photo.id, { artist: photo.artist, eventTitle: photo.eventTitle });
    this.persist();
    return photo;
  }

  public adminDeleteSouvenirPhoto(actorEmail: string, photoId: string): boolean {
    const before = this.store.souvenirPhotos.length;
    this.store.souvenirPhotos = this.store.souvenirPhotos.filter((p) => p.id !== photoId);
    if (this.store.souvenirPhotos.length < before) {
      this.store.souvenirCollections.forEach((c) => {
        c.photoKeys = c.photoKeys.filter((k) => k !== photoId);
      });
      this.recordAudit(actorEmail, 'delete_souvenir_photo', 'souvenir_photo', photoId);
      this.persist();
      return true;
    }
    return false;
  }

  public adminSaveEditorialCollection(
    actorEmail: string,
    input: Partial<SouvenirCollection> & { id?: string }
  ): SouvenirCollection {
    const now = new Date().toISOString();
    const existing = input.id
      ? this.store.souvenirCollections.find((c) => c.id === input.id && c.isEditorial)
      : undefined;

    if (existing) {
      existing.title = String(input.title ?? existing.title).trim();
      existing.description = String(input.description ?? existing.description).trim();
      existing.coverUrl = String(input.coverUrl ?? existing.coverUrl).trim();
      existing.isPublished = input.isPublished ?? existing.isPublished;
      existing.sortOrder = input.sortOrder ?? existing.sortOrder;
      if (Array.isArray(input.photoKeys)) existing.photoKeys = input.photoKeys;
      existing.updatedAt = now;
      this.recordAudit(actorEmail, 'update_editorial_collection', 'souvenir_collection', existing.id, { title: existing.title });
      this.persist();
      return existing;
    }

    const title = String(input.title || '').trim();
    if (!title) throw new Error('Titre de la collection éditoriale requis.');
    const created: SouvenirCollection = {
      id: `col_ed_${crypto.randomBytes(5).toString('hex')}`,
      slug: makeSlug(title),
      title,
      description: String(input.description || '').trim(),
      coverUrl: String(input.coverUrl || '').trim(),
      isEditorial: true,
      isPublished: input.isPublished !== false,
      sortOrder: this.store.souvenirCollections.filter((c) => c.isEditorial).length + 1,
      photoKeys: Array.isArray(input.photoKeys) ? input.photoKeys : [],
      createdAt: now,
      updatedAt: now,
    };
    this.store.souvenirCollections.push(created);
    this.recordAudit(actorEmail, 'create_editorial_collection', 'souvenir_collection', created.id, { title: created.title });
    this.persist();
    return created;
  }

  public adminDeleteEditorialCollection(actorEmail: string, collectionId: string): boolean {
    const before = this.store.souvenirCollections.length;
    this.store.souvenirCollections = this.store.souvenirCollections.filter(
      (c) => !(c.id === collectionId && c.isEditorial)
    );
    if (this.store.souvenirCollections.length < before) {
      this.recordAudit(actorEmail, 'delete_editorial_collection', 'souvenir_collection', collectionId);
      this.persist();
      return true;
    }
    return false;
  }

  public getAdminLoyaltyOverview() {
    const members = this.store.memberProfiles.map((m) => {
      const bal = this.computeBalance(m.email);
      const referralsCount = this.store.loyaltyReferrals.filter((r) => r.referrerKey === m.userKey).length;
      const validatedReferrals = this.store.loyaltyReferrals.filter(
        (r) => r.referrerKey === m.userKey && r.status === 'validated'
      ).length;
      return {
        ...m,
        ...bal,
        referralsCount,
        validatedReferrals,
      };
    });

    return {
      rules: this.store.loyaltyRules,
      campaigns: this.store.loyaltyCampaigns,
      rewards: this.store.loyaltyRewards,
      referrals: this.store.loyaltyReferrals,
      transactions: this.store.loyaltyTransactions.slice(0, 150),
      redemptions: this.store.loyaltyRedemptions.slice(0, 100),
      members,
    };
  }

  public adminUpdateLoyaltyRule(actorEmail: string, key: LoyaltyRule['key'], patch: Partial<LoyaltyRule>): LoyaltyRule {
    const rule = this.store.loyaltyRules.find((r) => r.key === key);
    if (!rule) throw new Error('Règle introuvable.');
    if (patch.points !== undefined && Number.isFinite(Number(patch.points)) && Number(patch.points) >= 0) {
      rule.points = Math.round(Number(patch.points));
    }
    if (patch.maxPerUser !== undefined) {
      rule.maxPerUser = patch.maxPerUser === null || patch.maxPerUser === ('' as any) ? null : Math.max(1, Number(patch.maxPerUser));
    }
    if (typeof patch.isActive === 'boolean') rule.isActive = patch.isActive;
    if (typeof patch.description === 'string') rule.description = patch.description.trim();
    rule.updatedAt = new Date().toISOString();
    this.recordAudit(actorEmail, 'update_loyalty_rule', 'loyalty_rule', key, { points: rule.points, isActive: rule.isActive });
    this.persist();
    return rule;
  }

  public adminSaveLoyaltyReward(actorEmail: string, input: Partial<LoyaltyReward> & { id?: string }): LoyaltyReward {
    const existing = input.id ? this.store.loyaltyRewards.find((r) => r.id === input.id) : undefined;
    if (existing) {
      if (input.title) existing.title = input.title.trim();
      if (input.description !== undefined) existing.description = input.description.trim();
      if (input.benefitLabel !== undefined) existing.benefitLabel = input.benefitLabel.trim();
      if (input.pointsCost !== undefined && Number(input.pointsCost) > 0) existing.pointsCost = Math.round(Number(input.pointsCost));
      if (input.stockLimit !== undefined) existing.stockLimit = input.stockLimit === null ? null : Math.max(1, Number(input.stockLimit));
      if (input.coverUrl !== undefined) existing.coverUrl = input.coverUrl.trim();
      if (input.conditions !== undefined) existing.conditions = input.conditions.trim();
      if (typeof input.isActive === 'boolean') existing.isActive = input.isActive;
      this.recordAudit(actorEmail, 'update_loyalty_reward', 'loyalty_reward', existing.id, { title: existing.title, pointsCost: existing.pointsCost });
      this.persist();
      return existing;
    }
    if (!input.title || !input.pointsCost || Number(input.pointsCost) <= 0) {
      throw new Error('Titre et coût en Gift Points requis.');
    }
    const created: LoyaltyReward = {
      id: `rew_${crypto.randomBytes(5).toString('hex')}`,
      title: input.title.trim(),
      description: String(input.description || '').trim(),
      benefitLabel: String(input.benefitLabel || '').trim(),
      pointsCost: Math.round(Number(input.pointsCost)),
      stockLimit: input.stockLimit ? Math.max(1, Number(input.stockLimit)) : null,
      redeemedCount: 0,
      coverUrl: String(input.coverUrl || '').trim(),
      conditions: String(input.conditions || '').trim(),
      isActive: input.isActive !== false,
      sortOrder: this.store.loyaltyRewards.length + 1,
      createdAt: new Date().toISOString(),
    };
    this.store.loyaltyRewards.push(created);
    this.recordAudit(actorEmail, 'create_loyalty_reward', 'loyalty_reward', created.id, { title: created.title });
    this.persist();
    return created;
  }

  public adminSaveLoyaltyCampaign(actorEmail: string, input: Partial<LoyaltyCampaign> & { id?: string }): LoyaltyCampaign {
    const existing = input.id ? this.store.loyaltyCampaigns.find((c) => c.id === input.id) : undefined;
    if (existing) {
      if (input.title) existing.title = input.title.trim();
      if (input.description !== undefined) existing.description = input.description.trim();
      if (input.bonusPoints !== undefined) existing.bonusPoints = Math.max(0, Math.round(Number(input.bonusPoints)));
      if (input.multiplier !== undefined) existing.multiplier = Math.max(1, Number(input.multiplier));
      if (input.maxClaims !== undefined) existing.maxClaims = input.maxClaims === null ? null : Math.max(1, Number(input.maxClaims));
      if (input.startsAt !== undefined) existing.startsAt = input.startsAt;
      if (input.endsAt !== undefined) existing.endsAt = input.endsAt;
      if (typeof input.isActive === 'boolean') existing.isActive = input.isActive;
      this.recordAudit(actorEmail, 'update_loyalty_campaign', 'loyalty_campaign', existing.id, { title: existing.title });
      this.persist();
      return existing;
    }
    if (!input.title || !input.ruleKey) throw new Error('Titre et règle cible requis.');
    const created: LoyaltyCampaign = {
      id: `camp_${crypto.randomBytes(5).toString('hex')}`,
      title: input.title.trim(),
      description: String(input.description || '').trim(),
      ruleKey: input.ruleKey,
      bonusPoints: Math.max(0, Math.round(Number(input.bonusPoints || 0))),
      multiplier: Math.max(1, Number(input.multiplier || 1)),
      maxClaims: input.maxClaims ? Math.max(1, Number(input.maxClaims)) : null,
      claimsCount: 0,
      startsAt: input.startsAt || new Date().toISOString(),
      endsAt: input.endsAt || null,
      isActive: input.isActive !== false,
      createdAt: new Date().toISOString(),
    };
    this.store.loyaltyCampaigns.unshift(created);
    this.recordAudit(actorEmail, 'create_loyalty_campaign', 'loyalty_campaign', created.id, { title: created.title });
    this.persist();
    return created;
  }

  public adminRejectReferral(actorEmail: string, referralId: string, reason = 'Rejeté pour suspicion d’abus'): LoyaltyReferral | null {
    const ref = this.store.loyaltyReferrals.find((r) => r.id === referralId && r.status === 'pending');
    if (!ref) return null;
    ref.status = 'rejected';
    ref.rejectionReason = reason;
    this.recordAudit(actorEmail, 'reject_referral', 'loyalty_referral', referralId, { reason });
    this.persist();
    return ref;
  }
}

export const ecosystemService = new EcosystemService();
