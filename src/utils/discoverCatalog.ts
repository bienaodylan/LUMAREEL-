import { ConcertEvent, NewsArticle } from '../types';
import { COMMUNITY_MEDIA, getUserStorageKey } from './communityStorage';
import { formatDateLong } from './dateUtils';
import { SupportedLanguage } from '../i18n/translations';
import { User } from '../types';

export type ExperienceStatus =
  | 'available'
  | 'members_only'
  | 'coming_soon'
  | 'full'
  | 'ended';

export type ExperienceActionType =
  | 'discover'
  | 'participate'
  | 'register'
  | 'request_invite'
  | 'book';

export interface LumareelExperience {
  id: string;
  categoryFr: string;
  categoryEn: string;
  titleFr: string;
  titleEn: string;
  shortDescFr: string;
  shortDescEn: string;
  fullDescFr: string;
  fullDescEn: string;
  image: string;
  dateLabel?: string;
  venueLabel?: string;
  conditionsFr: string;
  conditionsEn: string;
  status: ExperienceStatus;
  actionType: ExperienceActionType;
  mode: 'points' | 'fcfa' | 'black_card' | 'invite' | 'register';
  remaining: number;
  total: number;
  pointsCost?: number;
  priceFcfa?: number;
  eventId?: string;
  eventSlug?: string;
}

export interface DiscoverDetailPayload {
  kind: 'article' | 'experience';
  id: string;
  kicker: string;
  title: string;
  subtitle?: string;
  description: string;
  body?: string[];
  image: string;
  dateLabel?: string;
  venueLabel?: string;
  conditions?: string;
  availabilityLabel?: string;
  status?: ExperienceStatus;
  actionLabel?: string;
  experienceId?: string;
  eventSlug?: string;
}

export interface StoredExperienceAction {
  experienceId: string;
  code: string;
  action: 'booked' | 'registered' | 'invite_requested';
  createdAt: string;
}

const EXPERIENCE_ACTIONS_PREFIX = 'lumareel_exp_actions_v1_';

export function loadUserExperienceActions(user: User | null): StoredExperienceAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${EXPERIENCE_ACTIONS_PREFIX}${getUserStorageKey(user)}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveUserExperienceAction(
  user: User | null,
  entry: StoredExperienceAction
): StoredExperienceAction[] {
  const existing = loadUserExperienceActions(user);
  const next = [entry, ...existing.filter((e) => e.experienceId !== entry.experienceId)];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(
        `${EXPERIENCE_ACTIONS_PREFIX}${getUserStorageKey(user)}`,
        JSON.stringify(next)
      );
    } catch {
      // ignore storage quota errors
    }
  }
  return next;
}

export function getExperienceStatusLabel(
  status: ExperienceStatus,
  isEn: boolean
): { label: string; variant: 'valid' | 'points' | 'study' | 'neutral' } {
  switch (status) {
    case 'available':
      return { label: isEn ? 'AVAILABLE' : 'DISPONIBLE', variant: 'valid' };
    case 'members_only':
      return { label: isEn ? 'MEMBERS ONLY' : 'RÉSERVÉ AUX MEMBRES', variant: 'points' };
    case 'coming_soon':
      return { label: isEn ? 'COMING SOON' : 'BIENTÔT DISPONIBLE', variant: 'study' };
    case 'full':
      return { label: isEn ? 'SOLD OUT' : 'COMPLET', variant: 'neutral' };
    case 'ended':
      return { label: isEn ? 'ENDED' : 'TERMINÉ', variant: 'neutral' };
  }
}

export function getExperienceActionLabel(
  actionType: ExperienceActionType,
  isEn: boolean
): string {
  switch (actionType) {
    case 'book':
      return isEn ? 'Book' : 'Réserver';
    case 'participate':
      return isEn ? 'Participate' : 'Participer';
    case 'register':
      return isEn ? 'Register' : 'S’inscrire';
    case 'request_invite':
      return isEn ? 'Request an invitation' : 'Demander une invitation';
    case 'discover':
    default:
      return isEn ? 'Discover' : 'Découvrir';
  }
}

export function buildLumareelExperiences(
  events: ConcertEvent[],
  language: SupportedLanguage,
  bookedCounts: Record<string, number> = {}
): LumareelExperience[] {
  const published = (events || []).filter((e) => e.status !== 'draft');
  const primary = published[0] || null;
  const secondary = published[1] || primary;

  const lowestPriceFcfa = (() => {
    if (!primary?.categories?.length) return 15000;
    const prices = primary.categories.map((c) => Number(c.price || 0)).filter((p) => p > 0);
    return prices.length > 0 ? Math.min(...prices) : 15000;
  })();

  const primaryDate = primary ? formatDateLong(primary.date, language) : undefined;
  const secondaryDate = secondary ? formatDateLong(secondary.date, language) : undefined;

  const memberPointsRem = Math.max(0, 6 - (bookedCounts['member_points'] || 0));
  const soundcheckRem = Math.max(0, 8 - (bookedCounts['soundcheck_meet'] || 0));
  const releasedRem = Math.max(0, 4 - (bookedCounts['released_seats'] || 0));
  const blackCardRem = Math.max(0, 3 - (bookedCounts['black_card'] || 0));

  return [
    {
      id: 'soundcheck_meet',
      categoryFr: 'Rencontre & Backstage',
      categoryEn: 'Meet & Backstage',
      titleFr: primary
        ? `Balances & rencontre — ${primary.artist || primary.title}`
        : 'Balances privées & rencontre artistique',
      titleEn: primary
        ? `Soundcheck & meet — ${primary.artist || primary.title}`
        : 'Private soundcheck & artist meet',
      shortDescFr: 'Accès en petit comité avant l’ouverture des portes et moment d’échange en coulisses.',
      shortDescEn: 'Small-group access before doors open with a dedicated backstage meet.',
      fullDescFr:
        'Assistez aux réglages son et lumière de la scène principale avant l’arrivée du public, suivi d’un moment privilégié avec l’équipe artistique. Accès strictement nominatif et limité.',
      fullDescEn:
        'Attend main-stage sound and light rehearsals ahead of general admission, followed by a hosted backstage moment. Strictly personal and capped.',
      image: COMMUNITY_MEDIA.backstageSoundcheckImg,
      dateLabel: primaryDate,
      venueLabel: primary ? `${primary.venue}${primary.city ? `, ${primary.city}` : ''}` : 'Abidjan',
      conditionsFr: 'Compte LUMARÉEL requis · 1 inscription par membre · Validation sous réserve de disponibilité.',
      conditionsEn: 'LUMARÉEL account required · 1 registration per member · Subject to availability.',
      status: soundcheckRem > 0 ? 'available' : 'full',
      actionType: 'register',
      mode: 'register',
      remaining: soundcheckRem,
      total: 12,
      eventId: primary?.id,
      eventSlug: primary?.slug,
    },
    {
      id: 'black_card',
      categoryFr: 'Expérience VIP · LUMARÉEL Black Card',
      categoryEn: 'VIP Experience · LUMARÉEL Black Card',
      titleFr: 'Salon privé & accès prioritaire LUMARÉEL Black Card',
      titleEn: 'Private lounge & LUMARÉEL Black Card priority',
      shortDescFr: 'Accueil dédié, entrée coupe-file et quota réservé aux membres LUMARÉEL Black Card actifs.',
      shortDescEn: 'Dedicated hospitality, fast-track entry and reserved allocation for active LUMARÉEL Black Card members.',
      fullDescFr:
        'Un espace calme et soigné pensé pour vivre le concert dans les meilleures conditions : entrée dédiée, hôte d’accueil et contingent prioritaire même lorsque la billetterie grand public affiche complet.',
      fullDescEn:
        'A curated hospitality setting for show night: dedicated entry, host reception, and priority allocation even when general tickets sell out.',
      image: COMMUNITY_MEDIA.vipMezzanineImg,
      dateLabel: primaryDate,
      venueLabel: primary ? `${primary.venue}${primary.city ? `, ${primary.city}` : ''}` : 'Abidjan',
      conditionsFr: 'Réservé aux titulaires d’une LUMARÉEL Black Card active · Pièce d’identité à l’entrée.',
      conditionsEn: 'Reserved for active LUMARÉEL Black Card holders · ID required at entry.',
      status: blackCardRem > 0 ? 'members_only' : 'full',
      actionType: 'book',
      mode: 'black_card',
      remaining: blackCardRem,
      total: 5,
      eventId: primary?.id,
      eventSlug: primary?.slug,
    },
    {
      id: 'member_points',
      categoryFr: 'Quota Membres',
      categoryEn: 'Member Quota',
      titleFr: primary
        ? `Quota membres — ${primary.artist || primary.title}`
        : 'Quota réservé membres fidèles',
      titleEn: primary
        ? `Member quota — ${primary.artist || primary.title}`
        : 'Loyal member reserved quota',
      shortDescFr: 'Échangez vos points LUMARÉEL contre une place issue du contingent membre.',
      shortDescEn: 'Redeem your LUMARÉEL points for a reserved seat from the member pool.',
      fullDescFr:
        'LUMARÉEL réserve un contingent dédié aux membres actifs de la plateforme. Échangez vos points cumulés pour sécuriser votre billet directement sans frais supplémentaires.',
      fullDescEn:
        'LUMARÉEL holds a dedicated ticket pool for active members. Redeem earned points directly to secure your seat with zero extra fees.',
      image: primary?.bannerImage || primary?.officialPoster || COMMUNITY_MEDIA.loungeStageImg,
      dateLabel: primaryDate,
      venueLabel: primary ? `${primary.venue}${primary.city ? `, ${primary.city}` : ''}` : 'Abidjan',
      conditionsFr: '800 points LUMARÉEL requis · Non transférable · Limité à 1 place par compte.',
      conditionsEn: '800 LUMARÉEL points required · Non-transferable · Limit 1 seat per account.',
      status: memberPointsRem > 0 ? 'available' : 'full',
      actionType: 'participate',
      mode: 'points',
      pointsCost: 800,
      remaining: memberPointsRem,
      total: 10,
      eventId: primary?.id,
      eventSlug: primary?.slug,
    },
    {
      id: 'released_seats',
      categoryFr: 'Accès Billetterie',
      categoryEn: 'Ticketing Access',
      titleFr: secondary
        ? `Places remises à disposition — ${secondary.artist || secondary.title}`
        : 'Places remises à disposition',
      titleEn: secondary
        ? `Released seats — ${secondary.artist || secondary.title}`
        : 'Released official seats',
      shortDescFr: 'Billets officiels réattribués au tarif d’origine, sans aucune majoration.',
      shortDescEn: 'Official reallocated tickets at original face value, zero markup.',
      fullDescFr:
        'Des billets issus de quotas partenaires non utilisés sont remis en vente au tarif officiel LUMARÉEL avec génération immédiate de votre QR code infalsifiable.',
      fullDescEn:
        'Unused partner allocations are released back at official LUMARÉEL pricing with instant verified QR code issuance.',
      image: secondary?.officialPoster || secondary?.bannerImage || COMMUNITY_MEDIA.concertMemoriesCrowdImg,
      dateLabel: secondaryDate,
      venueLabel: secondary ? `${secondary.venue}${secondary.city ? `, ${secondary.city}` : ''}` : 'Abidjan',
      conditionsFr: `Tarif officiel dès ${lowestPriceFcfa.toLocaleString('fr-FR')} FCFA · Paiement sécurisé.`,
      conditionsEn: `Official price from ${lowestPriceFcfa.toLocaleString('fr-FR')} FCFA · Secure checkout.`,
      status: releasedRem > 0 ? 'available' : 'full',
      actionType: 'book',
      mode: 'fcfa',
      priceFcfa: lowestPriceFcfa,
      remaining: releasedRem,
      total: 8,
      eventId: secondary?.id,
      eventSlug: secondary?.slug,
    },
    {
      id: 'private_listening',
      categoryFr: 'Invitation privée',
      categoryEn: 'Private Invitation',
      titleFr: 'Session d’écoute & soirée privée LUMARÉEL',
      titleEn: 'Private listening session & evening',
      shortDescFr: 'Rencontre intimiste sur demande d’invitation avant la prochaine annonce de saison.',
      shortDescEn: 'Intimate invitation-only session ahead of the next season reveal.',
      fullDescFr:
        'Une soirée hors format dédiée aux membres curieux : écoute en avant-première, échanges avec la direction artistique et annonce confidentielle des prochaines scènes.',
      fullDescEn:
        'An off-format evening for curious members: preview listening, conversation with artistic direction, and early reveal of upcoming stages.',
      image: COMMUNITY_MEDIA.backstageStudioImg,
      venueLabel: 'Abidjan · Lieu communiqué sur invitation',
      conditionsFr: 'Accès uniquement sur invitation validée · Jauge confidentielle.',
      conditionsEn: 'Approved invitation required · Confidential capacity.',
      status: 'available',
      actionType: 'request_invite',
      mode: 'invite',
      remaining: 10,
      total: 25,
    },
    {
      id: 'special_invite',
      categoryFr: 'Événement Privé',
      categoryEn: 'Private Event',
      titleFr: 'Dîner de clôture de saison',
      titleEn: 'Season closing dinner',
      shortDescFr: 'Accès nominatif sur invitation de la production · Ouverture prochaine.',
      shortDescEn: 'Named production invitation · Opening soon.',
      fullDescFr:
        'Rendez-vous privé réunissant partenaires, artistes et membres invités en fin de saison. Les demandes d’invitation ouvriront prochainement.',
      fullDescEn:
        'Private gathering bringing together partners, artists, and invited members at season close. Invitation requests will open soon.',
      image: COMMUNITY_MEDIA.loungeStageImg,
      venueLabel: 'Abidjan',
      conditionsFr: 'Sur invitation nominative uniquement · Non encore ouvert.',
      conditionsEn: 'Named invitation only · Not open yet.',
      status: 'coming_soon',
      actionType: 'request_invite',
      mode: 'invite',
      remaining: 0,
      total: 20,
    },
  ];
}

export function articleToDiscoverDetail(
  article: NewsArticle,
  events: ConcertEvent[],
  isEn: boolean
): DiscoverDetailPayload {
  const matchedEvent = (events || []).find((ev) => {
    const hay = `${article.title} ${article.summary}`.toLowerCase();
    return (
      ev.artist &&
      hay.includes(ev.artist.toLowerCase())
    );
  });

  return {
    kind: 'article',
    id: article.id,
    kicker: `${article.category || (isEn ? 'EDITORIAL' : 'ÉDITORIAL')}${article.readTime ? ` · ${article.readTime}` : ''}`,
    title: article.title,
    subtitle: article.summary,
    description: article.summary,
    body: [article.content],
    image: article.imageUrl,
    dateLabel: article.date,
    venueLabel: article.author || 'LUMARÉEL',
    eventSlug: matchedEvent?.slug,
    actionLabel: matchedEvent
      ? isEn
        ? 'Book tickets'
        : 'Réserver'
      : undefined,
  };
}

export function experienceToDiscoverDetail(
  exp: LumareelExperience,
  isEn: boolean
): DiscoverDetailPayload {
  const availabilityLabel =
    exp.status === 'coming_soon'
      ? isEn
        ? 'Opening soon'
        : 'Ouverture prochaine'
      : exp.status === 'ended'
      ? isEn
        ? 'Ended'
        : 'Terminé'
      : exp.remaining <= 0
      ? isEn
        ? 'Sold out'
        : 'Complet'
      : `${exp.remaining} / ${exp.total} ${isEn ? 'available' : 'disponibles'}`;

  return {
    kind: 'experience',
    id: exp.id,
    experienceId: exp.id,
    kicker: isEn ? exp.categoryEn : exp.categoryFr,
    title: isEn ? exp.titleEn : exp.titleFr,
    subtitle: isEn ? exp.shortDescEn : exp.shortDescFr,
    description: isEn ? exp.fullDescEn : exp.fullDescFr,
    image: exp.image,
    dateLabel: exp.dateLabel,
    venueLabel: exp.venueLabel,
    conditions: isEn ? exp.conditionsEn : exp.conditionsFr,
    availabilityLabel,
    status: exp.status,
    actionLabel: getExperienceActionLabel(exp.actionType, isEn),
    eventSlug: exp.eventSlug,
  };
}
