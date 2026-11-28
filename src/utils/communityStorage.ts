import { ArchiveProduction, Order, User } from '../types';
import { loadStoredMemberCard } from './memberCardStorage';

import backstageSoundcheckImg from '../assets/images/backstage_soundcheck_1795735706175.jpg';
import concertMemoriesCrowdImg from '../assets/images/concert_memories_crowd_1795735706315.jpg';
import flashVipDropImg from '../assets/images/flash_vip_drop_1795735706997.jpg';
import backstageStudioImg from '../assets/images/backstage_studio_session_1795735706831.jpg';
import crowdArchiveImg from '../assets/images/black_card_concerts_crowd_1794694902084.jpg';
import vipMezzanineImg from '../assets/images/black_card_vip_mezzanine_1794694903429.jpg';
import loungeStageImg from '../assets/images/vip_lounge_empty_stage_1795099845090.jpg';
import blackCardHeroBannerImg from '../assets/images/black_card_hero_banner_1795099705118.jpg';
import blackCardHeroLoungeImg from '../assets/images/black_card_hero_lounge_top_1794694901310.jpg';
import blackCardHeroNightImg from '../assets/images/black_card_hero_night_tall_1794694902515.jpg';
import blackCardHeroPortraitImg from '../assets/images/black_card_hero_portrait_left_1794694901752.jpg';
import darkCardHeroBackdropImg from '../assets/images/dark_card_hero_backdrop_1795099845525.jpg';

export const COMMUNITY_MEDIA = {
  backstageSoundcheckImg,
  concertMemoriesCrowdImg,
  flashVipDropImg,
  backstageStudioImg,
  crowdArchiveImg,
  vipMezzanineImg,
  loungeStageImg,
  blackCardHeroBannerImg,
  blackCardHeroLoungeImg,
  blackCardHeroNightImg,
  blackCardHeroPortraitImg,
  darkCardHeroBackdropImg,
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
  _state: UserPointsState
): ComputedPointsSummary {
  const breakdown: PointsBreakdownItem[] = [];
  let totalEarned = 0;
  let standardTicketsCount = 0;
  let vipTicketsCount = 0;
  let attendedConcertsCount = 0;

  const userEmail = user?.email?.toLowerCase().trim();
  const userOrders = userEmail
    ? (orders || []).filter(
        (order) =>
          order.paymentStatus === 'completed' &&
          Boolean(order.customerEmail) &&
          order.customerEmail.toLowerCase().trim() === userEmail
      )
    : [];

  for (const order of userOrders) {
    const qty = Math.max(1, Number(order.quantity) || 1);
    const vip = isVipCategory(order.categoryName, Number(order.unitPrice) || 0);
    const points = qty * (vip ? POINTS_RULES.VIP_TICKET : POINTS_RULES.STANDARD_TICKET);
    totalEarned += points;
    if (vip) vipTicketsCount += qty;
    else standardTicketsCount += qty;

    breakdown.push({
      id: `order_${order.id}`,
      labelFr: `${vip ? 'Billet VIP' : 'Billet standard'} (${qty}×) · ${order.eventTitle}`,
      labelEn: `${vip ? 'VIP ticket' : 'Standard ticket'} (${qty}×) · ${order.eventTitle}`,
      points,
      date: order.paidAt || order.createdAt,
    });

    const usedTickets = (order.tickets || []).filter((ticket) => ticket.status === 'used');
    if (usedTickets.length > 0) {
      attendedConcertsCount += usedTickets.length;
      const attendancePoints = usedTickets.length * POINTS_RULES.CONCERT_ATTENDANCE_QR;
      totalEarned += attendancePoints;
      breakdown.push({
        id: `qr_${order.id}`,
        labelFr: `Présence vérifiée par scan QR (${usedTickets.length}×) · ${order.eventTitle}`,
        labelEn: `QR-verified concert attendance (${usedTickets.length}×) · ${order.eventTitle}`,
        points: attendancePoints,
        date: usedTickets[0]?.checkedInAt || order.eventDate,
      });
    }
  }

  // Les défis, parrainages, crédits et échanges ne sont pas crédités depuis le navigateur.
  const storedCard = loadStoredMemberCard(user?.email);
  const hasActiveBlackCard = Boolean(storedCard && storedCard.cardStatus === 'active');

  return {
    totalEarned,
    totalSpent: 0,
    availablePoints: totalEarned,
    ticketingCreditFcfa: 0,
    hasActiveBlackCard,
    standardTicketsCount,
    vipTicketsCount,
    attendedConcertsCount,
    confirmedReferralsCount: 0,
    breakdown,
  };
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function parseConcertDateToDayEndMs(dateStr?: string): number | null {
  if (!dateStr) return null;
  const isoDay = String(dateStr).slice(0, 10);
  const ms = new Date(`${isoDay}T23:59:59`).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function isMemorySharingWindowOpen(dateStr?: string): boolean {
  const concertDayEndMs = parseConcertDateToDayEndMs(dateStr);
  if (concertDayEndMs === null) return false;
  return Date.now() <= concertDayEndMs + SEVEN_DAYS_MS;
}

/** Compresse une image côté client en JPEG optimisé pour une publication fiable. */
export async function compressImageDataUrl(
  file: File,
  maxDimension = 1280,
  quality = 0.78
): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Impossible de lire le fichier image.'));
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier image.'));
    reader.readAsDataURL(file);
  });

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return rawDataUrl;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const naturalW = img.naturalWidth || img.width;
        const naturalH = img.naturalHeight || img.height;
        if (!naturalW || !naturalH) {
          resolve(rawDataUrl);
          return;
        }
        const scale = Math.min(1, maxDimension / Math.max(naturalW, naturalH));
        const targetW = Math.max(1, Math.round(naturalW * scale));
        const targetH = Math.max(1, Math.round(naturalH * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed && compressed.length < rawDataUrl.length ? compressed : rawDataUrl);
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Lecture impossible'));
    reader.onerror = () => reject(new Error('Lecture impossible'));
    reader.readAsDataURL(file);
  });
}

async function resolveAssetBlob(url: string): Promise<Blob | null> {
  try {
    if (url.startsWith('data:')) {
      const res = await fetch(url);
      return await res.blob();
    }
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  }
}

export async function downloadMediaAsset(url: string, filename: string): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  try {
    const blob = await resolveAssetBlob(url);
    if (blob) {
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 2500);
      return true;
    }
  } catch {
    // fallback direct link below
  }

  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch {
    return false;
  }
}

export async function shareMediaAsset(params: {
  title: string;
  text: string;
  url?: string;
  assetUrl?: string;
  filename?: string;
}): Promise<'shared' | 'copied' | 'failed'> {
  const { title, text, url, assetUrl, filename } = params;
  const pageUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    // Tentative de partage du fichier réel (photo ou vidéo) lorsque le navigateur le permet
    if (assetUrl && filename && typeof File !== 'undefined') {
      try {
        const blob = await resolveAssetBlob(assetUrl);
        if (blob) {
          const mime =
            blob.type || (filename.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg');
          const file = new File([blob], filename, { type: mime });
          if (
            typeof navigator.canShare === 'function' &&
            navigator.canShare({ files: [file] })
          ) {
            await navigator.share({ title, text, files: [file] });
            return 'shared';
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return 'shared';
      }
    }

    try {
      await navigator.share({ title, text, url: pageUrl });
      return 'shared';
    } catch (err: any) {
      if (err?.name === 'AbortError') return 'shared';
    }
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(`${text} ${pageUrl}`.trim());
      return 'copied';
    }
  } catch {
    // ignore clipboard error
  }
  return 'failed';
}

export function loadSharedMemories(): SharedConcertMemory[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MEMORIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filtrer d'éventuels anciens seeds génériques non reliés à un concert réel
    return parsed.filter(
      (item: SharedConcertMemory) =>
        item &&
        typeof item.id === 'string' &&
        !item.id.startsWith('mem_seed_') &&
        typeof item.eventId === 'string'
    );
  } catch {
    return [];
  }
}

export function saveSharedMemory(memory: SharedConcertMemory): SharedConcertMemory[] {
  const existing = loadSharedMemories();
  const next = [memory, ...existing];
  if (typeof window !== 'undefined') {
    // Sauvegarde robuste : si le quota est atteint, on réduit progressivement les plus anciens
    let candidate = next.slice(0, 40);
    while (candidate.length > 0) {
      try {
        localStorage.setItem(MEMORIES_KEY, JSON.stringify(candidate));
        break;
      } catch {
        if (candidate.length === 1) break;
        candidate = candidate.slice(0, candidate.length - 1);
      }
    }
  }
  return next;
}

export function deleteSharedMemory(id: string): SharedConcertMemory[] {
  const existing = loadSharedMemories();
  const next = existing.filter((m) => m.id !== id);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(MEMORIES_KEY, JSON.stringify(next));
    } catch {
      // ignore
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
  recapDuration?: string;
  officialPhotos: Array<{ url: string; captionFr: string; captionEn: string }>;
  highlights?: Array<{ time: string; titleFr: string; titleEn: string; descFr: string; descEn: string }>;
}

const CURATED_ARCHIVE_ALBUMS: ConcertMemoryAlbum[] = [
  {
    id: 'archive_dopelym_abidjan',
    title: 'Dopelym Live — Nuit d’Ouverture',
    artist: 'DOPELYM',
    date: '19 Octobre 2026',
    venue: 'Palais de la Culture',
    city: 'Abidjan',
    coverImage: concertMemoriesCrowdImg,
    recapEmbedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
    recapDuration: '03:18',
    officialPhotos: [
      { url: concertMemoriesCrowdImg, captionFr: 'Entrée sur scène — Palais de la Culture', captionEn: 'Stage entrance — Palais de la Culture' },
      { url: crowdArchiveImg, captionFr: 'Fosse en fusion sous les faisceaux', captionEn: 'Crowd glowing under stage beams' },
      { url: backstageSoundcheckImg, captionFr: 'Derniers réglages avant l’ouverture des portes', captionEn: 'Final soundcheck before doors open' },
      { url: blackCardHeroNightImg, captionFr: 'Atmosphère nocturne en mezzanine', captionEn: 'Late-night atmosphere from the mezzanine' },
      { url: vipMezzanineImg, captionFr: 'Vue panoramique depuis l’espace VIP', captionEn: 'Panoramic view from the VIP terrace' },
      { url: loungeStageImg, captionFr: 'Scénographie LUMARÉEL avant le rappel', captionEn: 'LUMARÉEL lighting design before the encore' },
    ],
  },
  {
    id: 'archive_jeune_lion_lagune',
    title: 'Jeune Lion — Nuit de la Lagune',
    artist: 'JEUNE LION',
    date: '28 Septembre 2026',
    venue: 'Sofitel Hôtel Ivoire',
    city: 'Abidjan',
    coverImage: blackCardHeroBannerImg,
    recapEmbedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
    recapDuration: '02:54',
    officialPhotos: [
      { url: blackCardHeroBannerImg, captionFr: 'Ouverture face à la lagune Ébrié', captionEn: 'Opening set overlooking Ébrié Lagoon' },
      { url: blackCardHeroPortraitImg, captionFr: 'Portrait en coulisses avant la montée sur scène', captionEn: 'Backstage portrait prior to stage call' },
      { url: blackCardHeroLoungeImg, captionFr: 'Salon privé des invités', captionEn: 'Private guest lounge' },
      { url: backstageStudioImg, captionFr: 'Répétition acoustique avec les musiciens', captionEn: 'Acoustic rehearsal with the live band' },
      { url: concertMemoriesCrowdImg, captionFr: 'Final lumineux devant la salle', captionEn: 'Illuminated finale facing the hall' },
      { url: flashVipDropImg, captionFr: 'Instant saisi au premier rang', captionEn: 'Captured moment from the front row' },
    ],
  },
  {
    id: 'archive_didi_b_symphonie',
    title: 'Didi B × Symphonie Urbaine',
    artist: 'DIDI B',
    date: '14 Août 2026',
    venue: 'Parc des Expositions',
    city: 'Abidjan',
    coverImage: crowdArchiveImg,
    recapEmbedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
    recapDuration: '04:06',
    officialPhotos: [
      { url: crowdArchiveImg, captionFr: 'Salle comble au Parc des Expositions', captionEn: 'Sold-out arena at Parc des Expositions' },
      { url: darkCardHeroBackdropImg, captionFr: 'Jeux de lumière sur l’orchestre live', captionEn: 'Lighting choreography over the live orchestra' },
      { url: backstageSoundcheckImg, captionFr: 'Balance des cuivres et percussions', captionEn: 'Brass and percussion soundcheck' },
      { url: vipMezzanineImg, captionFr: 'Tribune officielle pendant le rappel', captionEn: 'Official mezzanine during the encore' },
      { url: blackCardHeroNightImg, captionFr: 'Clôture nocturne du concert symphonique', captionEn: 'Nighttime finale of the symphonic show' },
      { url: concertMemoriesCrowdImg, captionFr: 'Le public reprend le refrain en chœur', captionEn: 'The crowd singing the chorus together' },
    ],
  },
  {
    id: 'archive_himra_salle_comble',
    title: 'Himra — Édition Salle Comble',
    artist: 'HIMRA',
    date: '05 Juillet 2026',
    venue: 'Palais de la Culture',
    city: 'Abidjan',
    coverImage: flashVipDropImg,
    recapEmbedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
    recapDuration: '02:42',
    officialPhotos: [
      { url: flashVipDropImg, captionFr: 'Explosion d’énergie dès le premier titre', captionEn: 'High energy from the opening track' },
      { url: blackCardHeroNightImg, captionFr: 'Faisceaux dorés sur la grande scène', captionEn: 'Golden beams across the main stage' },
      { url: crowdArchiveImg, captionFr: 'Mains levées sur toute la fosse', captionEn: 'Hands raised across the entire floor' },
      { url: backstageStudioImg, captionFr: 'Préparation de la setlist en loge', captionEn: 'Setlist prep in the greenroom' },
      { url: loungeStageImg, captionFr: 'Vue scène avant l’arrivée du public', captionEn: 'Stage vista before doors opened' },
    ],
  },
  {
    id: 'archive_josey_acoustique',
    title: 'Josey — Soirée Acoustique',
    artist: 'JOSEY',
    date: '12 Juin 2026',
    venue: 'Salle Anoumabo',
    city: 'Abidjan',
    coverImage: blackCardHeroPortraitImg,
    recapEmbedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
    recapDuration: '03:35',
    officialPhotos: [
      { url: blackCardHeroPortraitImg, captionFr: 'Interprétation intimiste en ouverture', captionEn: 'Intimate opening vocal performance' },
      { url: loungeStageImg, captionFr: 'Scène épurée pour le set acoustique', captionEn: 'Minimalist staging for the acoustic set' },
      { url: blackCardHeroLoungeImg, captionFr: 'Accueil des membres LUMARÉEL', captionEn: 'LUMARÉEL member reception' },
      { url: backstageSoundcheckImg, captionFr: 'Réglage voix et piano à queue', captionEn: 'Vocal and grand piano calibration' },
      { url: vipMezzanineImg, captionFr: 'Ovation debout à la fin du concert', captionEn: 'Standing ovation at the end of the concert' },
    ],
  },
  {
    id: 'archive_suspect95_edition',
    title: 'Suspect 95 — Session Spéciale',
    artist: 'SUSPECT 95',
    date: '18 Avril 2026',
    venue: 'Institut Français',
    city: 'Abidjan',
    coverImage: darkCardHeroBackdropImg,
    recapEmbedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
    recapDuration: '02:49',
    officialPhotos: [
      { url: darkCardHeroBackdropImg, captionFr: 'Scénographie nocturne à l’Institut Français', captionEn: 'Nighttime staging at Institut Français' },
      { url: backstageStudioImg, captionFr: 'Échanges avec le groupe en coulisses', captionEn: 'Backstage exchanges with the band' },
      { url: concertMemoriesCrowdImg, captionFr: 'Public en proximité directe avec la scène', captionEn: 'Audience up close to the stage' },
      { url: blackCardHeroBannerImg, captionFr: 'Temps fort de mi-concert', captionEn: 'Mid-show highlight moment' },
      { url: flashVipDropImg, captionFr: 'Dernier rappel sous les projecteurs', captionEn: 'Final encore under the spotlights' },
    ],
  },
];

function normalizeArchiveMatch(value?: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function buildConcertMemoryAlbums(archives: ArchiveProduction[]): ConcertMemoryAlbum[] {
  const fromArchives: ConcertMemoryAlbum[] = (archives || [])
    .filter((a) => a.isPublished !== false)
    .map((a) => {
      const rawPhotos = (a.photos && a.photos.length > 0 ? a.photos : [a.coverImage]).filter(Boolean);
      const uniquePhotos = Array.from(new Set(rawPhotos));

      return {
        id: a.id,
        title: a.title,
        artist: (a.artists && a.artists.join(' · ')) || a.title || 'LUMARÉEL Live',
        date: a.date || a.year,
        venue: a.venue,
        city: a.city,
        coverImage: a.coverImage || uniquePhotos[0] || concertMemoriesCrowdImg,
        recapEmbedUrl: a.youtubeEmbedUrl || 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
        recapDuration: a.duration || '03:10',
        officialPhotos: uniquePhotos.map((url, pIdx) => ({
          url,
          captionFr: `${a.title} — ${pIdx + 1}`,
          captionEn: `${a.title} — ${pIdx + 1}`,
        })),
      };
    });

  const existingIds = new Set(fromArchives.map((a) => a.id));
  const existingTitles = new Set(fromArchives.map((a) => normalizeArchiveMatch(a.title)));

  const merged: ConcertMemoryAlbum[] = [...fromArchives];
  for (const curated of CURATED_ARCHIVE_ALBUMS) {
    if (existingIds.has(curated.id) || existingTitles.has(normalizeArchiveMatch(curated.title))) {
      continue;
    }
    merged.push(curated);
  }

  return merged;
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
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SUGGESTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && item.type === 'artist_venue')
      : [];
  } catch {
    return [];
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
