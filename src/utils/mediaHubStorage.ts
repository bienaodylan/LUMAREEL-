import { COMMUNITY_MEDIA } from './communityStorage';
import type { TvAccessTier, TvEntitlementClient } from './tvAccess';

export type MediaPlacement = 'backstage' | 'memories' | 'lumareel_tv';
export type MediaItemStatus = 'draft' | 'published' | 'rejected';
export type VisualContextRole = 'none' | 'artist' | 'concert' | 'editorial';
export type ContributorRole = 'editorial' | 'photographer' | 'media_collaborator';
export type MediaAccessLevel = 'public' | 'members' | 'black_card' | 'specific';

export type TvContentCategory =
  | 'originals'
  | 'concerts_live'
  | 'backstage'
  | 'interviews'
  | 'retrospectives';

export type TvPrivacyLevel = 'public' | 'private' | 'restricted';

export interface MediaHubItem {
  id: string;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  mediaType: 'photo' | 'video';
  url: string;
  thumbnailUrl?: string;
  embedUrl?: string;
  duration?: string;
  tag?: string;
  placement: MediaPlacement;
  /** LUMARÉEL TV structured fields */
  tvCategory?: TvContentCategory;
  privacyLevel?: TvPrivacyLevel;
  tvAccessTier?: TvAccessTier;
  isFeaturedOnTv?: boolean;
  publishedAt?: string;
  albumTitle?: string;
  eventId?: string;
  artistName?: string;
  date: string;
  status: MediaItemStatus;
  downloadable: boolean;
  membersOnly: boolean;
  accessLevel?: MediaAccessLevel;
  accessNoteFr?: string;
  accessNoteEn?: string;
  visualContextRole: VisualContextRole;
  submittedByName: string;
  submittedByRole: 'super_admin' | ContributorRole;
  notes?: string[];
  createdAt: string;
}

export interface MediaAccessEvaluation {
  allowed: boolean;
  level: MediaAccessLevel;
  tvTier: TvAccessTier;
  labelFr: string;
  labelEn: string;
  requirementFr: string;
  requirementEn: string;
}

export const TV_CATEGORY_META: Record<
  TvContentCategory,
  { labelFr: string; labelEn: string; shortFr: string; shortEn: string }
> = {
  originals: {
    labelFr: 'LUMARÉEL Originals',
    labelEn: 'LUMARÉEL Originals',
    shortFr: 'Original',
    shortEn: 'Original',
  },
  concerts_live: {
    labelFr: 'Concerts & Live',
    labelEn: 'Concerts & Live',
    shortFr: 'Concert Live',
    shortEn: 'Live Concert',
  },
  backstage: {
    labelFr: 'Backstage',
    labelEn: 'Backstage',
    shortFr: 'Backstage',
    shortEn: 'Backstage',
  },
  interviews: {
    labelFr: 'Interviews',
    labelEn: 'Interviews',
    shortFr: 'Interview',
    shortEn: 'Interview',
  },
  retrospectives: {
    labelFr: 'Rétrospectives',
    labelEn: 'Retrospectives',
    shortFr: 'Rétrospective',
    shortEn: 'Retrospective',
  },
};

export function resolveTvCategory(item: MediaHubItem): TvContentCategory {
  if (item.tvCategory) return item.tvCategory;
  const tag = (item.tag || '').toLowerCase();
  if (tag.includes('interview') || tag.includes('studio') || tag.includes('loge')) return 'interviews';
  if (tag.includes('original') || tag.includes('scénographie') || tag.includes('film')) return 'originals';
  if (tag.includes('rétro') || tag.includes('retro') || tag.includes('concert') || item.placement === 'memories') {
    return item.mediaType === 'video' ? 'concerts_live' : 'retrospectives';
  }
  return 'backstage';
}

export function resolveTvAccessTier(item: MediaHubItem): TvAccessTier {
  if (item.tvAccessTier) return item.tvAccessTier;
  const legacy = resolveMediaAccessLevel(item);
  if (legacy === 'public') return 'free';
  if (legacy === 'members') return 'tv_pass';
  if (legacy === 'black_card') return 'card';
  return 'vip';
}

export function resolvePrivacyLevel(item: MediaHubItem): TvPrivacyLevel {
  if (item.privacyLevel) return item.privacyLevel;
  const tier = resolveTvAccessTier(item);
  if (tier === 'free') return 'public';
  if (tier === 'tv_pass') return 'private';
  return 'restricted';
}

export function resolveMediaAccessLevel(item: MediaHubItem): MediaAccessLevel {
  if (item.accessLevel) return item.accessLevel;
  if (item.tvAccessTier === 'free') return 'public';
  if (item.tvAccessTier === 'tv_pass') return 'members';
  if (item.tvAccessTier === 'card') return 'black_card';
  if (item.tvAccessTier === 'vip') return 'specific';
  return item.membersOnly ? 'black_card' : 'public';
}

/**
 * Single centralized LUMARÉEL TV permission evaluator combining:
 * - Free content (accessible to everyone)
 * - TV Pass content (accessible via active TV Pass OR eligible LUMARÉEL Card)
 * - Card content (accessible via eligible LUMARÉEL Card)
 * - VIP content (accessible via eligible LUMARÉEL Card with VIP tier OR verified concert ticket)
 */
export function evaluateTvMediaAccess(
  item: MediaHubItem,
  entitlement: TvEntitlementClient | null | undefined,
  options?: { hasSpecificAccess?: boolean }
): MediaAccessEvaluation {
  const tier = resolveTvAccessTier(item);
  const legacyLevel = resolveMediaAccessLevel(item);
  const hasCardAccess = Boolean(entitlement?.cardAccess?.eligible);
  const hasSubAccess = Boolean(entitlement?.subscriptionAccess?.active);
  const hasVipCard = hasCardAccess && entitlement?.maxTier === 'vip';
  const hasSpecific = Boolean(options?.hasSpecificAccess);

  if (tier === 'free') {
    return {
      allowed: true,
      level: 'public',
      tvTier: 'free',
      labelFr: 'Gratuit',
      labelEn: 'Free',
      requirementFr: 'Accessible à tous sur LUMARÉEL TV.',
      requirementEn: 'Open to everyone on LUMARÉEL TV.',
    };
  }

  if (tier === 'tv_pass') {
    return {
      allowed: hasSubAccess || hasCardAccess,
      level: legacyLevel,
      tvTier: 'tv_pass',
      labelFr: 'TV Pass',
      labelEn: 'TV Pass',
      requirementFr:
        item.accessNoteFr ||
        'Accessible avec un LUMARÉEL TV Pass actif ou une LUMARÉEL Card éligible.',
      requirementEn:
        item.accessNoteEn ||
        'Available with an active LUMARÉEL TV Pass or an eligible LUMARÉEL Card.',
    };
  }

  if (tier === 'card') {
    return {
      allowed: hasCardAccess,
      level: 'black_card',
      tvTier: 'card',
      labelFr: 'LUMARÉEL Card',
      labelEn: 'LUMARÉEL Card',
      requirementFr:
        item.accessNoteFr ||
        'Exclusivité réservée aux détenteurs d’une LUMARÉEL Card active et éligible.',
      requirementEn:
        item.accessNoteEn ||
        'Exclusive release reserved for active, eligible LUMARÉEL Card holders.',
    };
  }

  // tier === 'vip'
  return {
    allowed: hasVipCard || hasSpecific,
    level: 'specific',
    tvTier: 'vip',
    labelFr: 'Accès VIP',
    labelEn: 'VIP Access',
    requirementFr:
      item.accessNoteFr ||
      'Accès VIP requis : LUMARÉEL Card éligible ou billet vérifié pour cet événement.',
    requirementEn:
      item.accessNoteEn ||
      'VIP access required: eligible LUMARÉEL Card or verified event ticket.',
  };
}

/** Legacy wrapper kept for backward compatibility with older call sites. */
export function evaluateMediaAccess(
  item: MediaHubItem,
  ctx: {
    isAuthenticated: boolean;
    hasBlackCard: boolean;
    hasTvPass?: boolean;
    hasSpecificAccess?: boolean;
  }
): MediaAccessEvaluation {
  const syntheticEntitlement: TvEntitlementClient = {
    hasAccess: Boolean(ctx.hasBlackCard || ctx.hasTvPass),
    source:
      ctx.hasBlackCard && ctx.hasTvPass
        ? 'both'
        : ctx.hasBlackCard
        ? 'lumareel_card'
        : ctx.hasTvPass
        ? 'tv_pass'
        : 'none',
    maxTier: ctx.hasBlackCard ? 'vip' : ctx.hasTvPass ? 'tv_pass' : 'free',
    cardAccess: { eligible: Boolean(ctx.hasBlackCard) },
    subscriptionAccess: { active: Boolean(ctx.hasTvPass) },
    checkedAt: '',
  };
  return evaluateTvMediaAccess(item, syntheticEntitlement, {
    hasSpecificAccess: ctx.hasSpecificAccess,
  });
}

export interface ContributorAccessInvite {
  id: string;
  name: string;
  email: string;
  role: ContributorRole;
  accessCode: string;
  assignedEventIds: string[];
  status: 'active' | 'revoked';
  createdAt: string;
}

export interface EventVisualOverride {
  artist?: string;
  concert?: string;
  editorial?: string;
}

export type VisualOverridesMap = Record<string, EventVisualOverride>;

const MEDIA_ITEMS_KEY = 'lumareel_media_hub_items_v2';
const CONTRIBUTORS_KEY = 'lumareel_media_contributors_v1';
const VISUAL_OVERRIDES_KEY = 'lumareel_visual_overrides_v1';
const MEDIA_HUB_EVENT = 'lumareel-media-hub-updated';

export function isSafeMediaUrl(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/')) return true;
  if (trimmed.startsWith('data:image/')) return true;
  if (trimmed.startsWith('data:video/')) return true;
  if (trimmed.startsWith('blob:')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isDirectVideoUrl(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/uploads/videos/')) return true;
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:video/')) return true;
  return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(trimmed);
}

/**
 * All existing Memories & Backstage items preserved and migrated into LUMARÉEL TV
 * categories and access tiers (no media removed).
 */
export const INITIAL_MEDIA_HUB_ITEMS: MediaHubItem[] = [
  {
    id: 'media_bs_1',
    title: '2h avant les portes : la tension monte sur scène',
    titleEn: '2 hours before doors: backstage tension builds',
    description: 'Les derniers réglages juste avant que la salle ne se remplisse.',
    descriptionEn: 'Final stage checks right before the crowd walks in.',
    mediaType: 'video',
    url: COMMUNITY_MEDIA.backstageSoundcheckImg,
    thumbnailUrl: COMMUNITY_MEDIA.backstageSoundcheckImg,
    embedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
    duration: '08:42',
    tag: 'Coulisses',
    placement: 'lumareel_tv',
    tvCategory: 'originals',
    privacyLevel: 'public',
    tvAccessTier: 'free',
    isFeaturedOnTv: true,
    publishedAt: '2026-11-10',
    date: 'Nov 2026',
    status: 'published',
    downloadable: false,
    membersOnly: false,
    accessLevel: 'public',
    visualContextRole: 'editorial',
    submittedByName: 'Équipe LUMARÉEL',
    submittedByRole: 'super_admin',
    notes: ['Filmé en direct avant l’ouverture des portes.'],
    createdAt: '2026-11-10T18:00:00Z',
  },
  {
    id: 'media_bs_2',
    title: 'Minuit au studio : comment on prépare un gros live',
    titleEn: 'Midnight in the studio: prepping a big live show',
    description: 'Des rires, des instrus et les derniers ajustements avant la scène.',
    descriptionEn: 'Late-night beats, laughs, and final rehearsals before showtime.',
    mediaType: 'video',
    url: COMMUNITY_MEDIA.backstageStudioImg,
    thumbnailUrl: COMMUNITY_MEDIA.backstageStudioImg,
    embedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
    duration: '11:15',
    tag: 'Studio',
    placement: 'lumareel_tv',
    tvCategory: 'interviews',
    privacyLevel: 'private',
    tvAccessTier: 'tv_pass',
    publishedAt: '2026-11-12',
    date: 'Nov 2026',
    status: 'published',
    downloadable: false,
    membersOnly: true,
    accessLevel: 'members',
    visualContextRole: 'none',
    submittedByName: 'Équipe LUMARÉEL',
    submittedByRole: 'super_admin',
    notes: ['Session tournée de nuit avec l’équipe musicale.'],
    createdAt: '2026-11-12T22:00:00Z',
  },
  {
    id: 'media_bs_3',
    title: 'Comment on monte une scène LUMARÉEL de zéro',
    titleEn: 'Building a LUMARÉEL stage from scratch',
    description: 'De la salle vide aux jeux de lumière, tout le montage en coulisses.',
    descriptionEn: 'From an empty room to full concert lights behind the scenes.',
    mediaType: 'video',
    url: COMMUNITY_MEDIA.loungeStageImg,
    thumbnailUrl: COMMUNITY_MEDIA.loungeStageImg,
    embedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
    duration: '06:28',
    tag: 'Backstage',
    placement: 'lumareel_tv',
    tvCategory: 'backstage',
    privacyLevel: 'private',
    tvAccessTier: 'tv_pass',
    publishedAt: '2026-10-28',
    date: 'Oct 2026',
    status: 'published',
    downloadable: false,
    membersOnly: true,
    accessLevel: 'members',
    visualContextRole: 'none',
    submittedByName: 'Équipe LUMARÉEL',
    submittedByRole: 'super_admin',
    notes: ['Du premier projecteur jusqu’au show complet.'],
    createdAt: '2026-10-28T16:30:00Z',
  },
  {
    id: 'media_bs_4',
    title: 'Juste après le show : on entre dans les loges',
    titleEn: 'Right after the show: inside the greenroom',
    description: 'Les réactions à chaud des artistes dès leur sortie de scène.',
    descriptionEn: 'Raw reactions from the artists right after stepping off stage.',
    mediaType: 'video',
    url: COMMUNITY_MEDIA.vipMezzanineImg,
    thumbnailUrl: COMMUNITY_MEDIA.vipMezzanineImg,
    embedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
    duration: '14:05',
    tag: 'Loges',
    placement: 'lumareel_tv',
    tvCategory: 'backstage',
    privacyLevel: 'restricted',
    tvAccessTier: 'card',
    publishedAt: '2026-11-18',
    date: 'Nov 2026',
    status: 'published',
    downloadable: false,
    membersOnly: true,
    accessLevel: 'black_card',
    visualContextRole: 'none',
    submittedByName: 'Équipe LUMARÉEL',
    submittedByRole: 'super_admin',
    notes: ['Réservé aux membres Black Card.'],
    createdAt: '2026-11-18T23:45:00Z',
  },
  {
    id: 'media_mem_1',
    title: 'Quand la fosse explose dès le premier son',
    titleEn: 'When the crowd erupts on track one',
    description: 'Photo prise au tout début du concert à Abidjan.',
    descriptionEn: 'Shot right as the Abidjan concert kicked off.',
    mediaType: 'photo',
    url: COMMUNITY_MEDIA.concertMemoriesCrowdImg,
    thumbnailUrl: COMMUNITY_MEDIA.concertMemoriesCrowdImg,
    tag: 'Live',
    placement: 'lumareel_tv',
    tvCategory: 'concerts_live',
    privacyLevel: 'private',
    tvAccessTier: 'tv_pass',
    albumTitle: 'Dopelym Live — Abidjan',
    publishedAt: '2026-10-20',
    date: 'Oct 2026',
    status: 'published',
    downloadable: true,
    membersOnly: true,
    accessLevel: 'members',
    visualContextRole: 'none',
    submittedByName: 'Équipe LUMARÉEL',
    submittedByRole: 'photographer',
    createdAt: '2026-10-20T21:10:00Z',
  },
  {
    id: 'media_mem_2',
    title: 'Le dernier rappel sous les lumières d’Abidjan',
    titleEn: 'Final encore under Abidjan lights',
    description: 'Toute la salle debout pour clôturer la soirée.',
    descriptionEn: 'Everyone on their feet to close the night.',
    mediaType: 'photo',
    url: COMMUNITY_MEDIA.crowdArchiveImg,
    thumbnailUrl: COMMUNITY_MEDIA.crowdArchiveImg,
    tag: 'Souvenir',
    placement: 'lumareel_tv',
    tvCategory: 'retrospectives',
    privacyLevel: 'restricted',
    tvAccessTier: 'vip',
    albumTitle: 'Dopelym Live — Abidjan',
    publishedAt: '2026-10-20',
    date: 'Oct 2026',
    status: 'published',
    downloadable: true,
    membersOnly: true,
    accessLevel: 'specific',
    visualContextRole: 'none',
    submittedByName: 'Équipe LUMARÉEL',
    submittedByRole: 'photographer',
    createdAt: '2026-10-20T22:30:00Z',
  },
  {
    id: 'media_tv_orig_2',
    title: '24h à Abidjan avec la team avant le grand soir',
    titleEn: '24 hours in Abidjan before the big night',
    description: 'Du studio jusqu’à la grande scène, on vous emmène toute la journée.',
    descriptionEn: 'From studio sessions to the main stage, follow the whole day.',
    mediaType: 'video',
    url: COMMUNITY_MEDIA.blackCardHeroBannerImg,
    thumbnailUrl: COMMUNITY_MEDIA.blackCardHeroBannerImg,
    embedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
    duration: '24:10',
    tag: 'Original',
    placement: 'lumareel_tv',
    tvCategory: 'originals',
    privacyLevel: 'private',
    tvAccessTier: 'tv_pass',
    isFeaturedOnTv: true,
    publishedAt: '2026-11-22',
    date: 'Nov 2026',
    status: 'published',
    downloadable: false,
    membersOnly: true,
    accessLevel: 'members',
    visualContextRole: 'editorial',
    submittedByName: 'Équipe LUMARÉEL',
    submittedByRole: 'super_admin',
    notes: ['Tourné sur trois soirs à Abidjan.'],
    createdAt: '2026-11-22T20:00:00Z',
  },
  {
    id: 'media_tv_orig_3',
    title: 'Ceux qu’on ne voit jamais pendant un concert',
    titleEn: 'The crew you never see during a concert',
    description: 'Rencontre avec l’équipe qui fait tourner tout le show en coulisses.',
    descriptionEn: 'Meet the people who keep the entire show running backstage.',
    mediaType: 'video',
    url: COMMUNITY_MEDIA.darkCardHeroBackdropImg,
    thumbnailUrl: COMMUNITY_MEDIA.darkCardHeroBackdropImg,
    embedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
    duration: '16:40',
    tag: 'Docu',
    placement: 'lumareel_tv',
    tvCategory: 'originals',
    privacyLevel: 'private',
    tvAccessTier: 'tv_pass',
    publishedAt: '2026-11-16',
    date: 'Nov 2026',
    status: 'published',
    downloadable: false,
    membersOnly: true,
    accessLevel: 'members',
    visualContextRole: 'none',
    submittedByName: 'Équipe LUMARÉEL',
    submittedByRole: 'super_admin',
    notes: ['Tourné dans les coulisses avec toute l’équipe.'],
    createdAt: '2026-11-16T19:00:00Z',
  },
  {
    id: 'media_tv_live_1',
    title: 'Dopelym retourne le Palais de la Culture (Live intégral)',
    titleEn: 'Dopelym lights up Palais de la Culture (Full Live)',
    description: 'Tout le concert à Abidjan, du premier son jusqu’au rappel.',
    descriptionEn: 'The full Abidjan concert from the opening track to the encore.',
    mediaType: 'video',
    url: COMMUNITY_MEDIA.concertMemoriesCrowdImg,
    thumbnailUrl: COMMUNITY_MEDIA.concertMemoriesCrowdImg,
    embedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
    duration: '48:15',
    tag: 'Concert',
    placement: 'lumareel_tv',
    tvCategory: 'concerts_live',
    privacyLevel: 'private',
    tvAccessTier: 'tv_pass',
    artistName: 'DOPELYM',
    publishedAt: '2026-11-20',
    date: 'Nov 2026',
    status: 'published',
    downloadable: false,
    membersOnly: true,
    accessLevel: 'members',
    visualContextRole: 'concert',
    submittedByName: 'Équipe LUMARÉEL',
    submittedByRole: 'super_admin',
    notes: ['Avec les rappels et les invités surprises.'],
    createdAt: '2026-11-20T21:00:00Z',
  },
  {
    id: 'media_tv_live_2',
    title: 'Jeune Lion en live face à la lagune',
    titleEn: 'Jeune Lion live by the lagoon',
    description: 'Une session au coucher du soleil au Sofitel Hôtel Ivoire.',
    descriptionEn: 'A sunset live session at Sofitel Hôtel Ivoire.',
    mediaType: 'video',
    url: COMMUNITY_MEDIA.blackCardHeroNightImg,
    thumbnailUrl: COMMUNITY_MEDIA.blackCardHeroNightImg,
    embedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
    duration: '31:20',
    tag: 'Live',
    placement: 'lumareel_tv',
    tvCategory: 'concerts_live',
    privacyLevel: 'private',
    tvAccessTier: 'tv_pass',
    artistName: 'JEUNE LION',
    publishedAt: '2026-11-14',
    date: 'Nov 2026',
    status: 'published',
    downloadable: false,
    membersOnly: true,
    accessLevel: 'members',
    visualContextRole: 'concert',
    submittedByName: 'Équipe LUMARÉEL',
    submittedByRole: 'super_admin',
    notes: ['Version live exclusive LUMARÉEL TV.'],
    createdAt: '2026-11-14T20:15:00Z',
  },
  {
    id: 'media_tv_live_3',
    title: 'Didi B avec un vrai orchestre : les meilleurs moments',
    titleEn: 'Didi B with a live orchestra: best moments',
    description: 'Les passages les plus forts du concert au Parc des Expositions.',
    descriptionEn: 'The biggest highlights from the show at Parc des Expositions.',
    mediaType: 'video',
    url: COMMUNITY_MEDIA.crowdArchiveImg,
    thumbnailUrl: COMMUNITY_MEDIA.crowdArchiveImg,
    embedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
    duration: '19:45',
    tag: 'Live',
    placement: 'lumareel_tv',
    tvCategory: 'concerts_live',
    privacyLevel: 'private',
    tvAccessTier: 'tv_pass',
    artistName: 'DIDI B',
    publishedAt: '2026-11-05',
    date: 'Nov 2026',
    status: 'published',
    downloadable: false,
    membersOnly: true,
    accessLevel: 'members',
    visualContextRole: 'concert',
    submittedByName: 'Équipe LUMARÉEL',
    submittedByRole: 'super_admin',
    notes: ['Rap live et 18 musiciens sur la même scène.'],
    createdAt: '2026-11-05T19:30:00Z',
  },
  {
    id: 'media_tv_int_2',
    title: 'Josey se confie juste après son concert acoustique',
    titleEn: 'Josey opens up right after her acoustic show',
    description: 'Discussion sans filtre en loge après la Salle Anoumabo.',
    descriptionEn: 'Unfiltered backstage chat after her Salle Anoumabo night.',
    mediaType: 'video',
    url: COMMUNITY_MEDIA.blackCardHeroPortraitImg,
    thumbnailUrl: COMMUNITY_MEDIA.blackCardHeroPortraitImg,
    embedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
    duration: '12:30',
    tag: 'Interview',
    placement: 'lumareel_tv',
    tvCategory: 'interviews',
    privacyLevel: 'private',
    tvAccessTier: 'tv_pass',
    artistName: 'JOSEY',
    publishedAt: '2026-11-08',
    date: 'Nov 2026',
    status: 'published',
    downloadable: false,
    membersOnly: true,
    accessLevel: 'members',
    visualContextRole: 'artist',
    submittedByName: 'Équipe LUMARÉEL',
    submittedByRole: 'super_admin',
    notes: ['Tourné en loge juste après la fin du concert.'],
    createdAt: '2026-11-08T18:10:00Z',
  },
  {
    id: 'media_tv_bs_5',
    title: '1h avec Himra avant de monter sur scène',
    titleEn: '1 hour with Himra before hitting the stage',
    description: 'On a suivi Himra dans les couloirs jusqu’au premier morceau.',
    descriptionEn: 'Following Himra from the hallway warm-up to track one.',
    mediaType: 'video',
    url: COMMUNITY_MEDIA.flashVipDropImg,
    thumbnailUrl: COMMUNITY_MEDIA.flashVipDropImg,
    embedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
    duration: '09:55',
    tag: 'Vlog',
    placement: 'lumareel_tv',
    tvCategory: 'backstage',
    privacyLevel: 'private',
    tvAccessTier: 'tv_pass',
    artistName: 'HIMRA',
    publishedAt: '2026-11-03',
    date: 'Nov 2026',
    status: 'published',
    downloadable: false,
    membersOnly: true,
    accessLevel: 'members',
    visualContextRole: 'none',
    submittedByName: 'Équipe LUMARÉEL',
    submittedByRole: 'super_admin',
    notes: ['100 % coulisses, zéro filtre.'],
    createdAt: '2026-11-03T21:40:00Z',
  },
  {
    id: 'media_tv_retro_1',
    title: 'Le best-of de toute la saison 2026 à Abidjan',
    titleEn: 'Best of the 2026 season in Abidjan',
    description: 'Six nuits de concerts résumées en une seule vidéo.',
    descriptionEn: 'Six unforgettable concert nights packed into one video.',
    mediaType: 'video',
    url: COMMUNITY_MEDIA.blackCardHeroLoungeImg,
    thumbnailUrl: COMMUNITY_MEDIA.blackCardHeroLoungeImg,
    embedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
    duration: '15:12',
    tag: 'Best-of',
    placement: 'lumareel_tv',
    tvCategory: 'retrospectives',
    privacyLevel: 'private',
    tvAccessTier: 'tv_pass',
    publishedAt: '2026-11-24',
    date: 'Nov 2026',
    status: 'published',
    downloadable: false,
    membersOnly: true,
    accessLevel: 'members',
    visualContextRole: 'editorial',
    submittedByName: 'Équipe LUMARÉEL',
    submittedByRole: 'super_admin',
    notes: ['Les meilleurs moments sur scène et dans le public.'],
    createdAt: '2026-11-24T17:00:00Z',
  },
];

function normalizeMediaHubItem(raw: MediaHubItem): MediaHubItem {
  const tvCategory = resolveTvCategory(raw);
  const tvAccessTier = resolveTvAccessTier(raw);
  const privacyLevel = resolvePrivacyLevel({ ...raw, tvAccessTier });
  return {
    ...raw,
    tvCategory,
    tvAccessTier,
    privacyLevel,
    publishedAt: raw.publishedAt || raw.createdAt?.slice(0, 10),
  };
}

function emitMediaHubUpdate(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MEDIA_HUB_EVENT));
  }
}

export function subscribeMediaHub(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (e: StorageEvent) => {
    if (
      e.key === MEDIA_ITEMS_KEY ||
      e.key === CONTRIBUTORS_KEY ||
      e.key === VISUAL_OVERRIDES_KEY
    ) {
      listener();
    }
  };
  window.addEventListener(MEDIA_HUB_EVENT, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(MEDIA_HUB_EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function loadMediaHubItems(): MediaHubItem[] {
  const seedNormalized = INITIAL_MEDIA_HUB_ITEMS.map(normalizeMediaHubItem);
  if (typeof window === 'undefined') return seedNormalized;
  try {
    const raw = localStorage.getItem(MEDIA_ITEMS_KEY);
    if (!raw) return seedNormalized;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return seedNormalized;
    }
    const storedNormalized = parsed.map((item: MediaHubItem) => normalizeMediaHubItem(item));
    const existingIds = new Set(storedNormalized.map((item) => item.id));
    const missingSeed = seedNormalized.filter((seedItem) => !existingIds.has(seedItem.id));
    return [...storedNormalized, ...missingSeed];
  } catch {
    return seedNormalized;
  }
}

export function saveMediaHubItems(items: MediaHubItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MEDIA_ITEMS_KEY, JSON.stringify(items));
    emitMediaHubUpdate();
  } catch {
    // storage quota fallback
  }
}

export async function syncMediaHubFromServer(): Promise<MediaHubItem[]> {
  const localItems = loadMediaHubItems();
  if (typeof window === 'undefined') return localItems;
  try {
    const res = await fetch('/api/media-hub');
    if (!res.ok) return localItems;
    const data = await res.json();
    if (!data?.success || !Array.isArray(data.items) || data.items.length === 0) {
      return localItems;
    }
    const serverItems = (data.items as MediaHubItem[]).map(normalizeMediaHubItem);
    const serverIds = new Set(serverItems.map((i) => i.id));
    const merged = [
      ...serverItems,
      ...localItems.filter((item) => !serverIds.has(item.id)),
    ];
    saveMediaHubItems(merged);
    return merged;
  } catch {
    return localItems;
  }
}

export function upsertMediaHubItem(item: MediaHubItem): MediaHubItem[] {
  const normalized = normalizeMediaHubItem(item);
  const existing = loadMediaHubItems();
  const idx = existing.findIndex((x) => x.id === normalized.id);
  const next =
    idx >= 0
      ? existing.map((x) => (x.id === normalized.id ? normalized : x))
      : [normalized, ...existing];
  saveMediaHubItems(next);

  if (typeof window !== 'undefined') {
    fetch('/api/media-hub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalized),
    }).catch(() => {});
  }
  return next;
}

export function deleteMediaHubItem(id: string): MediaHubItem[] {
  const existing = loadMediaHubItems();
  const next = existing.filter((x) => x.id !== id);
  saveMediaHubItems(next);

  if (typeof window !== 'undefined') {
    fetch(`/api/media-hub/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch(() => {});
  }
  return next;
}

/** Strict public filter: drafts and rejected submissions are NEVER exposed publicly. */
export function getPublishedMediaItems(items?: MediaHubItem[]): MediaHubItem[] {
  const source = items || loadMediaHubItems();
  return source.filter((item) => item.status === 'published' && isSafeMediaUrl(item.url));
}

// ============================================================================
// VISUAL OVERRIDES PER CONCERT CONTEXT (ADMIN MANUAL CONTROL)
// ============================================================================

export function loadVisualOverrides(): VisualOverridesMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(VISUAL_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveEventVisualOverride(
  eventId: string,
  context: keyof EventVisualOverride,
  url?: string
): VisualOverridesMap {
  const current = loadVisualOverrides();
  const nextEventOverride: EventVisualOverride = { ...(current[eventId] || {}) };
  if (url && isSafeMediaUrl(url)) {
    nextEventOverride[context] = url;
  } else {
    delete nextEventOverride[context];
  }
  const next: VisualOverridesMap = { ...current, [eventId]: nextEventOverride };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(VISUAL_OVERRIDES_KEY, JSON.stringify(next));
      emitMediaHubUpdate();
    } catch {
      // ignore
    }
  }
  return next;
}

// ============================================================================
// PHOTOGRAPHERS & MEDIA COLLABORATORS (SCOPED ACCESS, DRAFT-ONLY SUBMISSIONS)
// ============================================================================

export function loadContributorInvites(): ContributorAccessInvite[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CONTRIBUTORS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveContributorInvites(list: ContributorAccessInvite[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONTRIBUTORS_KEY, JSON.stringify(list));
    emitMediaHubUpdate();
  } catch {
    // ignore
  }
}

export function generateContributorCode(role: ContributorRole): string {
  const prefix =
    role === 'photographer' ? 'PHOTO' : role === 'editorial' ? 'EDIT' : 'MEDIA';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `LMR-${prefix}-${rand}`;
}

export function verifyContributorAccess(
  email: string,
  code: string
): ContributorAccessInvite | null {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim().toUpperCase();
  if (!cleanEmail || !cleanCode) return null;
  const list = loadContributorInvites();
  return (
    list.find(
      (inv) =>
        inv.status === 'active' &&
        inv.email.trim().toLowerCase() === cleanEmail &&
        inv.accessCode.trim().toUpperCase() === cleanCode
    ) || null
  );
}
