import { ArchiveProduction, Order, User } from '../types';
import { loadStoredMemberCard } from './memberCardStorage';

import backstageSoundcheckImg from '../assets/images/backstage_soundcheck_1795735706175.jpg';
import concertMemoriesCrowdImg from '../assets/images/concert_memories_crowd_1795735706315.jpg';
import flashVipDropImg from '../assets/images/flash_vip_drop_1795735706997.jpg';
import backstageStudioImg from '../assets/images/backstage_studio_session_1795735706831.jpg';
import crowdArchiveImg from '../assets/images/black_card_concerts_crowd_1794694902084.jpg';
import vipMezzanineImg from '../assets/images/black_card_vip_mezzanine_1794694903429.jpg';
import loungeStageImg from '../assets/images/vip_lounge_empty_stage_1795099845090.jpg';

export const COMMUNITY_MEDIA = {
  backstageSoundcheckImg,
  concertMemoriesCrowdImg,
  flashVipDropImg,
  backstageStudioImg,
  crowdArchiveImg,
  vipMezzanineImg,
  loungeStageImg,
};

// ============================================================================
// BARÈME OFFICIEL DES POINTS LUMARÉEL
// ============================================================================

export const POINTS_RULES = {
  COMPLETE_PROFILE: 50,
  REFERRAL_PURCHASE: 200,
  STANDARD_TICKET: 100,
  VIP_TICKET: 250,
  CONCERT_ATTENDANCE_QR: 150,
  BLACK_CARD_SUBSCRIPTION: 300,
  APP_CHALLENGE_SUGGESTION: 75,
  APP_CHALLENGE_MEMORY: 100,
  APP_CHALLENGE_BACKSTAGE: 50,
} as const;

export const REFERRAL_CREDIT_FCFA = 500;

// ============================================================================
// TYPES
// ============================================================================

export interface RedeemedReward {
  id: string;
  rewardId: string;
  title: string;
  category: 'free_ticket' | 'backstage_exp' | 'private_invite' | 'partner_discount' | 'credit';
  pointsCost: number;
  voucherCode: string;
  redeemedAt: string;
  status: 'active' | 'used';
}

export interface ReferralEntry {
  id: string;
  friendName: string;
  friendEmail?: string;
  status: 'signed_up' | 'purchased';
  creditFcfa: number;
  pointsAwarded: number;
  createdAt: string;
}

export interface ClaimedFlashOffer {
  id: string;
  offerId: string;
  title: string;
  code: string;
  claimedAt: string;
  type: 'flash_sale' | 'surprise';
  detail: string;
}

export interface UserPointsState {
  profileCompleted: boolean;
  profileDetails?: {
    city?: string;
    phone?: string;
    favoriteGenre?: string;
  };
  completedChallenges: string[];
  redeemedRewards: RedeemedReward[];
  referrals: ReferralEntry[];
  appliedReferralCode?: string;
  welcomeReferralCreditFcfa: number;
  claimedFlashOffers: ClaimedFlashOffer[];
  bonusSurprisePoints: number;
  lastSurpriseClaimDate?: string;
}

export interface SharedConcertMemory {
  id: string;
  eventId: string;
  authorName: string;
  mediaType: 'photo' | 'video';
  mediaUrl: string;
  caption: string;
  createdAt: string;
}

export interface CommunitySuggestion {
  id: string;
  type: 'artist_venue' | 'general_event';
  artistName?: string;
  title: string;
  cityOrVenue: string;
  description: string;
  authorName: string;
  votes: number;
  votedByKeys: string[];
  createdAt: string;
}

// ============================================================================
// STORAGE HELPERS
// ============================================================================

const POINTS_PREFIX = 'lumareel_loyalty_state_v2_';
const MEMORIES_KEY = 'lumareel_shared_concert_memories_v1';
const SUGGESTIONS_KEY = 'lumareel_community_suggestions_v1';

export function getUserStorageKey(user: User | null): string {
  if (user?.email) return user.email.toLowerCase().trim();
  return 'guest_local';
}

export function generateReferralCode(user: User | null): string {
  if (!user) return 'LMR-INVITE-26';
  const rawName = (user.name || user.email.split('@')[0] || 'MEMBRE')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 5);
  let hash = 0;
  const seed = `${user.id}:${user.email.toLowerCase()}`;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 9999;
  }
  const suffix = String(Math.abs(hash)).padStart(3, '0').slice(-3);
  return `LMR-${rawName || 'CLUB'}${suffix}`;
}

const DEFAULT_POINTS_STATE: UserPointsState = {
  profileCompleted: false,
  completedChallenges: [],
  redeemedRewards: [],
  referrals: [],
  welcomeReferralCreditFcfa: 0,
  claimedFlashOffers: [],
  bonusSurprisePoints: 0,
};

export function loadUserPointsState(user: User | null): UserPointsState {
  if (typeof window === 'undefined') return { ...DEFAULT_POINTS_STATE };
  try {
    const raw = localStorage.getItem(`${POINTS_PREFIX}${getUserStorageKey(user)}`);
    if (!raw) return { ...DEFAULT_POINTS_STATE };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_POINTS_STATE,
      ...parsed,
      completedChallenges: Array.isArray(parsed.completedChallenges) ? parsed.completedChallenges : [],
      redeemedRewards: Array.isArray(parsed.redeemedRewards) ? parsed.redeemedRewards : [],
      referrals: Array.isArray(parsed.referrals) ? parsed.referrals : [],
      claimedFlashOffers: Array.isArray(parsed.claimedFlashOffers) ? parsed.claimedFlashOffers : [],
    };
  } catch {
    return { ...DEFAULT_POINTS_STATE };
  }
}

export function saveUserPointsState(user: User | null, state: UserPointsState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${POINTS_PREFIX}${getUserStorageKey(user)}`, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
}

export function markChallengeCompleted(user: User | null, challengeId: string): boolean {
  const current = loadUserPointsState(user);
  if (current.completedChallenges.includes(challengeId)) return false;
  const next: UserPointsState = {
    ...current,
    completedChallenges: [...current.completedChallenges, challengeId],
  };
  saveUserPointsState(user, next);
  return true;
}

// ============================================================================
// LIVE POINTS SUMMARY ENGINE (COMPUTED FROM REAL ORDERS, QR SCANS, CARD & STATE)
// ============================================================================

export interface PointsBreakdownItem {
  id: string;
  labelFr: string;
  labelEn: string;
  points: number;
  date?: string;
}

export interface ComputedPointsSummary {
  totalEarned: number;
  totalSpent: number;
  availablePoints: number;
  ticketingCreditFcfa: number;
  hasActiveBlackCard: boolean;
  standardTicketsCount: number;
  vipTicketsCount: number;
  attendedConcertsCount: number;
  confirmedReferralsCount: number;
  breakdown: PointsBreakdownItem[];
}

function isVipCategory(categoryName: string, unitPrice: number): boolean {
  const lower = (categoryName || '').toLowerCase();
  return /vip|vvip|or|gold|loge|table|carr[eé]|prestige|salon|backstage/.test(lower) || unitPrice >= 25000;
}

export function computeUserPointsSummary(
  user: User | null,
  orders: Order[],
  state: UserPointsState
): ComputedPointsSummary {
  const breakdown: PointsBreakdownItem[] = [];
  let totalEarned = 0;

  // 1. Compte créé & profil complété (50 pts)
  const hasAccountAndProfile = Boolean(user) && (state.profileCompleted || Boolean(user?.name && user?.email));
  if (hasAccountAndProfile) {
    totalEarned += POINTS_RULES.COMPLETE_PROFILE;
    breakdown.push({
      id: 'account_profile',
      labelFr: 'Compte créé & profil complété',
      labelEn: 'Account created & profile completed',
      points: POINTS_RULES.COMPLETE_PROFILE,
      date: user?.createdAt,
    });
  }

  // 2. Billets achetés (Standard = 100 pts, VIP = 250 pts) + Présence vérifiée par scan QR (150 pts)
  let standardTicketsCount = 0;
  let vipTicketsCount = 0;
  let attendedConcertsCount = 0;

  const userEmail = user?.email?.toLowerCase().trim();
  const userOrders = (orders || []).filter((o) => {
    if (o.paymentStatus !== 'completed') return false;
    if (!userEmail) return false;
    return !o.customerEmail || o.customerEmail.toLowerCase().trim() === userEmail;
  });

  for (const order of userOrders) {
    const qty = Math.max(1, Number(order.quantity) || 1);
    const vip = isVipCategory(order.categoryName, Number(order.unitPrice) || 0);
    if (vip) {
      vipTicketsCount += qty;
      const pts = qty * POINTS_RULES.VIP_TICKET;
      totalEarned += pts;
      breakdown.push({
        id: `order_${order.id}`,
        labelFr: `Billet VIP (${qty}×) · ${order.eventTitle}`,
        labelEn: `VIP Ticket (${qty}×) · ${order.eventTitle}`,
        points: pts,
        date: order.paidAt || order.createdAt,
      });
    } else {
      standardTicketsCount += qty;
      const pts = qty * POINTS_RULES.STANDARD_TICKET;
      totalEarned += pts;
      breakdown.push({
        id: `order_${order.id}`,
        labelFr: `Billet standard (${qty}×) · ${order.eventTitle}`,
        labelEn: `Standard ticket (${qty}×) · ${order.eventTitle}`,
        points: pts,
        date: order.paidAt || order.createdAt,
      });
    }

    const usedTickets = (order.tickets || []).filter((t) => t.status === 'used');
    if (usedTickets.length > 0) {
      attendedConcertsCount += usedTickets.length;
      const pts = usedTickets.length * POINTS_RULES.CONCERT_ATTENDANCE_QR;
      totalEarned += pts;
      breakdown.push({
        id: `qr_${order.id}`,
        labelFr: `Présence vérifiée par scan QR (${usedTickets.length}×) · ${order.eventTitle}`,
        labelEn: `QR-verified concert attendance (${usedTickets.length}×) · ${order.eventTitle}`,
        points: pts,
        date: usedTickets[0]?.checkedInAt || order.eventDate,
      });
    }
  }

  // 3. Abonnement LUMARÉEL Black Card
  const storedCard = loadStoredMemberCard(user?.email);
  const hasActiveBlackCard = Boolean(storedCard && storedCard.cardStatus === 'active');
  if (hasActiveBlackCard) {
    totalEarned += POINTS_RULES.BLACK_CARD_SUBSCRIPTION;
    breakdown.push({
      id: 'black_card_sub',
      labelFr: 'Abonnement LUMARÉEL Black Card actif',
      labelEn: 'Active LUMARÉEL Black Card membership',
      points: POINTS_RULES.BLACK_CARD_SUBSCRIPTION,
      date: storedCard?.issuedAt,
    });
  }

  // 4. Parrainages ayant effectué un premier achat (200 pts + 500 FCFA chacun)
  const confirmedReferrals = state.referrals.filter((r) => r.status === 'purchased');
  if (confirmedReferrals.length > 0) {
    const pts = confirmedReferrals.length * POINTS_RULES.REFERRAL_PURCHASE;
    totalEarned += pts;
    breakdown.push({
      id: 'referrals_confirmed',
      labelFr: `Parrainage validé (${confirmedReferrals.length} ami${confirmedReferrals.length > 1 ? 's' : ''})`,
      labelEn: `Verified referrals (${confirmedReferrals.length} friend${confirmedReferrals.length > 1 ? 's' : ''})`,
      points: pts,
      date: confirmedReferrals[0]?.createdAt,
    });
  }

  // 5. Défis de l'application
  const challengePointsMap: Record<string, { pts: number; fr: string; en: string }> = {
    challenge_suggestion: {
      pts: POINTS_RULES.APP_CHALLENGE_SUGGESTION,
      fr: 'Défi · Suggestion publiée dans la Boîte à idées',
      en: 'Challenge · Suggestion posted in Suggestion Box',
    },
    challenge_memory: {
      pts: POINTS_RULES.APP_CHALLENGE_MEMORY,
      fr: 'Défi · Souvenir partagé après un concert',
      en: 'Challenge · Concert memory shared',
    },
    challenge_backstage: {
      pts: POINTS_RULES.APP_CHALLENGE_BACKSTAGE,
      fr: 'Défi · Découverte exclusive Backstage',
      en: 'Challenge · Backstage exclusive explored',
    },
    challenge_profile_full: {
      pts: 50,
      fr: 'Défi · Profil musical complété à 100 %',
      en: 'Challenge · 100% member profile completed',
    },
  };

  for (const cid of state.completedChallenges) {
    const meta = challengePointsMap[cid];
    if (meta) {
      totalEarned += meta.pts;
      breakdown.push({
        id: cid,
        labelFr: meta.fr,
        labelEn: meta.en,
        points: meta.pts,
      });
    }
  }

  // 6. Points bonus surprises
  if (state.bonusSurprisePoints > 0) {
    totalEarned += state.bonusSurprisePoints;
    breakdown.push({
      id: 'surprise_bonus',
      labelFr: 'Récompenses surprises débloquées',
      labelEn: 'Surprise rewards unlocked',
      points: state.bonusSurprisePoints,
      date: state.lastSurpriseClaimDate,
    });
  }

  const totalSpent = state.redeemedRewards.reduce((acc, r) => acc + r.pointsCost, 0);
  const availablePoints = Math.max(0, totalEarned - totalSpent);
  const referralCreditFromFriends = confirmedReferrals.reduce((acc, r) => acc + r.creditFcfa, 0);
  const ticketingCreditFcfa = referralCreditFromFriends + (state.welcomeReferralCreditFcfa || 0);

  return {
    totalEarned,
    totalSpent,
    availablePoints,
    ticketingCreditFcfa,
    hasActiveBlackCard,
    standardTicketsCount,
    vipTicketsCount,
    attendedConcertsCount,
    confirmedReferralsCount: confirmedReferrals.length,
    breakdown,
  };
}

// ============================================================================
// SOUVENIRS DE CONCERTS PARTAGÉS PAR LES PARTICIPANTS
// ============================================================================

const SEED_SHARED_MEMORIES: SharedConcertMemory[] = [
  {
    id: 'mem_seed_1',
    eventId: 'memory_abidjan_night',
    authorName: 'Koffi A.',
    mediaType: 'photo',
    mediaUrl: concertMemoriesCrowdImg,
    caption: 'L’énergie au rappel devant la scène principale, inoubliable.',
    createdAt: '2026-10-20T22:15:00Z',
  },
  {
    id: 'mem_seed_2',
    eventId: 'memory_abidjan_night',
    authorName: 'Amina T.',
    mediaType: 'photo',
    mediaUrl: crowdArchiveImg,
    caption: 'Vue depuis le carré VIP au moment des projecteurs or.',
    createdAt: '2026-10-21T09:40:00Z',
  },
];

export function loadSharedMemories(): SharedConcertMemory[] {
  if (typeof window === 'undefined') return SEED_SHARED_MEMORIES;
  try {
    const raw = localStorage.getItem(MEMORIES_KEY);
    if (!raw) return SEED_SHARED_MEMORIES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED_SHARED_MEMORIES;
  } catch {
    return SEED_SHARED_MEMORIES;
  }
}

export function saveSharedMemory(memory: SharedConcertMemory): SharedConcertMemory[] {
  const existing = loadSharedMemories();
  const next = [memory, ...existing];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(MEMORIES_KEY, JSON.stringify(next.slice(0, 60)));
    } catch {
      // storage quota fallback
    }
  }
  return next;
}

export interface ConcertMemoryAlbum {
  id: string;
  title: string;
  artist: string;
  date: string;
  venue: string;
  city: string;
  coverImage: string;
  recapEmbedUrl: string;
  recapDuration: string;
  officialPhotos: Array<{ url: string; captionFr: string; captionEn: string }>;
  highlights: Array<{ time: string; titleFr: string; titleEn: string; descFr: string; descEn: string }>;
}

export function buildConcertMemoryAlbums(archives: ArchiveProduction[]): ConcertMemoryAlbum[] {
  const fromArchives: ConcertMemoryAlbum[] = (archives || [])
    .filter((a) => a.isPublished)
    .map((a, idx) => {
      const photos = (a.photos && a.photos.length > 0 ? a.photos : [a.coverImage]).filter(Boolean);
      const fallbackPool = [concertMemoriesCrowdImg, crowdArchiveImg, vipMezzanineImg, backstageSoundcheckImg];
      const enrichedPhotos = [...photos];
      while (enrichedPhotos.length < 3) {
        enrichedPhotos.push(fallbackPool[(idx + enrichedPhotos.length) % fallbackPool.length]);
      }

      return {
        id: a.id,
        title: a.title,
        artist: (a.artists && a.artists.join(' · ')) || 'LUMARÉEL Live',
        date: a.date || a.year,
        venue: a.venue,
        city: a.city,
        coverImage: a.coverImage || concertMemoriesCrowdImg,
        recapEmbedUrl: a.youtubeEmbedUrl || 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
        recapDuration: a.duration || '14:20',
        officialPhotos: enrichedPhotos.map((url, pIdx) => ({
          url,
          captionFr: `${a.title} — Prise officielle #${pIdx + 1}`,
          captionEn: `${a.title} — Official still #${pIdx + 1}`,
        })),
        highlights: [
          {
            time: '00:45',
            titleFr: 'Entrée en scène & ouverture lumineuse',
            titleEn: 'Stage entrance & lighting reveal',
            descFr: 'L’instant où la salle bascule dans le noir avant le premier drop.',
            descEn: 'The moment the hall goes dark before the opening drop.',
          },
          {
            time: '06:18',
            titleFr: 'Chœur du public à l’unisson',
            titleEn: 'Crowd sing-along peak',
            descFr: 'Plus de 3 000 voix reprises a cappella sous les faisceaux dorés.',
            descEn: 'Over 3,000 voices singing a cappella beneath the gold beams.',
          },
          {
            time: '12:04',
            titleFr: 'Final & salut des artistes',
            titleEn: 'Encore finale & curtain call',
            descFr: 'Rappel prolongé et photo de famille officielle face au public.',
            descEn: 'Extended encore and official crowd family photo.',
          },
        ],
      };
    });

  if (fromArchives.length > 0) return fromArchives;

  return [
    {
      id: 'memory_abidjan_night',
      title: 'LUMARÉEL Live Session — Abidjan',
      artist: 'Collectif LUMARÉEL & Invités',
      date: '19 Octobre 2026',
      venue: 'Palais de la Culture',
      city: 'Abidjan',
      coverImage: concertMemoriesCrowdImg,
      recapEmbedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
      recapDuration: '16:45',
      officialPhotos: [
        {
          url: concertMemoriesCrowdImg,
          captionFr: 'Vue scène principale au moment du rappel',
          captionEn: 'Main stage view during the encore',
        },
        {
          url: crowdArchiveImg,
          captionFr: 'Public en fusion sous les projecteurs',
          captionEn: 'Crowd under the warm tungsten beams',
        },
        {
          url: vipMezzanineImg,
          captionFr: 'Ambiance mezzanine & carré privilégié',
          captionEn: 'VIP mezzanine atmosphere',
        },
        {
          url: backstageSoundcheckImg,
          captionFr: 'Balances de dernière minute avant ouverture des portes',
          captionEn: 'Final soundcheck before doors open',
        },
      ],
      highlights: [
        {
          time: '01:12',
          titleFr: 'Ouverture scénographique',
          titleEn: 'Scenography opening',
          descFr: 'Mise en lumière monumentale et entrée des musiciens live.',
          descEn: 'Monumental lighting reveal and live band entrance.',
        },
        {
          time: '07:50',
          titleFr: 'Invité surprise sur scène',
          titleEn: 'Surprise guest appearance',
          descFr: 'Duo inédit accueilli par une ovation debout.',
          descEn: 'Unannounced duet met with a standing ovation.',
        },
        {
          time: '14:30',
          titleFr: 'Final acoustique',
          titleEn: 'Acoustic finale',
          descFr: 'Clôture intimiste éclairée par les téléphones du public.',
          descEn: 'Intimate closing moment lit by the crowd.',
        },
      ],
    },
  ];
}

// ============================================================================
// BOÎTE À SUGGESTIONS COMMUNAUTAIRE
// ============================================================================

const SEED_SUGGESTIONS: CommunitySuggestion[] = [
  {
    id: 'sug_1',
    type: 'artist_venue',
    artistName: 'Didi B × Orchestre Live',
    title: 'Didi B en concert symphonique live',
    cityOrVenue: 'Abidjan · Parc des Expositions',
    description: 'Une production spéciale avec cuivres live et scénographie 360° au cœur de la salle.',
    authorName: 'Marc-Olivier K.',
    votes: 142,
    votedByKeys: [],
    createdAt: '2026-11-18T14:20:00Z',
  },
  {
    id: 'sug_2',
    type: 'artist_venue',
    artistName: 'Aya Nakamura',
    title: 'Soirée exclusive Aya Nakamura',
    cityOrVenue: 'Abidjan · Sofitel Hôtel Ivoire',
    description: 'Format concert immersif avec jauge limitée et accès Backstage pour les membres.',
    authorName: 'Saran D.',
    votes: 118,
    votedByKeys: [],
    createdAt: '2026-11-20T18:05:00Z',
  },
  {
    id: 'sug_3',
    type: 'general_event',
    title: 'Nuit Acoustique au bord de la lagune',
    cityOrVenue: 'Assinie / Cocody Lagune',
    description: 'Un rendez-vous mensuel coucher de soleil avec 3 voix acoustiques, son haute fidélité et tables lounge.',
    authorName: 'Yasmine B.',
    votes: 89,
    votedByKeys: [],
    createdAt: '2026-11-22T10:30:00Z',
  },
  {
    id: 'sug_4',
    type: 'general_event',
    title: 'Festival Afro-Électro & Scénographie Lumière',
    cityOrVenue: 'Dakar · Grand Théâtre',
    description: 'Deux nuits dédiées aux DJs et producteurs afro-house avec installations visuelles monumentales.',
    authorName: 'Cheikh N.',
    votes: 74,
    votedByKeys: [],
    createdAt: '2026-11-24T16:45:00Z',
  },
];

export function loadSuggestions(): CommunitySuggestion[] {
  if (typeof window === 'undefined') return SEED_SUGGESTIONS;
  try {
    const raw = localStorage.getItem(SUGGESTIONS_KEY);
    if (!raw) return SEED_SUGGESTIONS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_SUGGESTIONS;
  } catch {
    return SEED_SUGGESTIONS;
  }
}

export function saveSuggestions(list: CommunitySuggestion[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}
