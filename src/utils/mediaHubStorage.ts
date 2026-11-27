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

const MEDIA_ITEMS_KEY = 'lumareel_media_hub_items_v1';
const CONTRIBUTORS_KEY = 'lumareel_media_contributors_v1';
const VISUAL_OVERRIDES_KEY = 'lumareel_visual_overrides_v1';
const MEDIA_HUB_EVENT = 'lumareel-media-hub-updated';

export function isSafeMediaUrl(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/')) return true;
  if (trimmed.startsWith('data:image/')) return true;
  if (trimmed.startsWith('blob:')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * All existing Memories & Backstage items preserved and migrated into LUMARÉEL TV
 * categories and access tiers (no media removed).
 */
export const INITIAL_MEDIA_HUB_ITEMS: MediaHubItem[] = [
  {
    id: 'media_bs_1',
    title: 'Dans le silence avant les portes',
    titleEn: 'Before doors open',
    description:
      'Deux heures avant l’arrivée du public, la régie façade et les musiciens règlent chaque fréquence de la salle.',
    descriptionEn:
      'Two hours before doors open, front-of-house engineers and live musicians calibrate every frequency in the hall.',
    mediaType: 'video',
    url: COMMUNITY_MEDIA.backstageSoundcheckImg,
    thumbnailUrl: COMMUNITY_MEDIA.backstageSoundcheckImg,
    embedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
    duration: '08:42',
    tag: 'Soundcheck',
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
    submittedByName: 'Direction LUMARÉEL',
    submittedByRole: 'super_admin',
    notes: [
      'Captation brute à la console principale sans coupure.',
      'Réglage des retours scène et test complet des faisceaux lumineux.',
      'Répétition du morceau d’ouverture en version acoustique inédite.',
    ],
    createdAt: '2026-11-10T18:00:00Z',
  },
  {
    id: 'media_bs_2',
    title: 'Minuit en studio — Arranger le set live',
    titleEn: 'Midnight in the studio — Scoring the live set',
    description:
      'Comment un titre studio est réécrit pour la scène : cuivres, transitions et dynamique live.',
    descriptionEn:
      'How a studio record is rebuilt for the stage: brass arrangements, transitions, and live dynamics.',
    mediaType: 'video',
    url: COMMUNITY_MEDIA.backstageStudioImg,
    thumbnailUrl: COMMUNITY_MEDIA.backstageStudioImg,
    embedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
    duration: '11:15',
    tag: 'Session Studio',
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
    accessNoteFr: 'Accessible avec le LUMARÉEL TV Pass ou une LUMARÉEL Card éligible.',
    accessNoteEn: 'Available with a LUMARÉEL TV Pass or an eligible LUMARÉEL Card.',
    visualContextRole: 'none',
    submittedByName: 'Direction LUMARÉEL',
    submittedByRole: 'super_admin',
    notes: [
      'Conversation intimiste avec le directeur musical de la tournée.',
      'Écoute des maquettes alternatives préparées exclusivement pour la scène.',
      'Préparation des transitions live avec les invités.',
    ],
    createdAt: '2026-11-12T22:00:00Z',
  },
  {
    id: 'media_bs_3',
    title: 'Architecture de lumière — Concevoir une scène LUMARÉEL',
    titleEn: 'Light architecture — Designing a LUMARÉEL stage',
    description:
      'Plans d’éclairage, géométrie des projecteurs et mise en espace des loges avant la nuit du concert.',
    descriptionEn:
      'Lighting plots, beam geometry, and lounge spatial staging before show night.',
    mediaType: 'video',
    url: COMMUNITY_MEDIA.loungeStageImg,
    thumbnailUrl: COMMUNITY_MEDIA.loungeStageImg,
    embedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
    duration: '06:28',
    tag: 'Scénographie',
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
    submittedByName: 'Direction LUMARÉEL',
    submittedByRole: 'super_admin',
    notes: [
      'Du croquis initial au montage complet sur site.',
      'Choix des contrastes lumineux propres à la signature scénique LUMARÉEL.',
    ],
    createdAt: '2026-10-28T16:30:00Z',
  },
  {
    id: 'media_bs_4',
    title: 'Carnet privé des loges — Rencontre d’après-concert',
    titleEn: 'Private greenroom diary — Post-show conversations',
    description:
      'Les minutes qui suivent la sortie de scène, réservées aux titulaires de la LUMARÉEL Card.',
    descriptionEn:
      'The raw minutes right after walking off stage, reserved for LUMARÉEL Card holders.',
    mediaType: 'video',
    url: COMMUNITY_MEDIA.vipMezzanineImg,
    thumbnailUrl: COMMUNITY_MEDIA.vipMezzanineImg,
    embedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
    duration: '14:05',
    tag: 'Loges Privées',
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
    submittedByName: 'Direction LUMARÉEL',
    submittedByRole: 'super_admin',
    notes: [
      'Accès exclusif réservé aux détenteurs de la LUMARÉEL Card.',
      'Réactions à chaud des artistes dans les loges privées.',
    ],
    createdAt: '2026-11-18T23:45:00Z',
  },
  {
    id: 'media_mem_1',
    title: 'Ouverture devant la fosse — Abidjan',
    titleEn: 'Opening silhouette before the crowd — Abidjan',
    description: 'Prise inédite grand angle au lancement du concert, sélection LUMARÉEL TV.',
    descriptionEn: 'Unreleased wide-angle still at show opening, LUMARÉEL TV selection.',
    mediaType: 'photo',
    url: COMMUNITY_MEDIA.concertMemoriesCrowdImg,
    thumbnailUrl: COMMUNITY_MEDIA.concertMemoriesCrowdImg,
    tag: 'Concert Live',
    placement: 'lumareel_tv',
    tvCategory: 'concerts_live',
    privacyLevel: 'private',
    tvAccessTier: 'tv_pass',
    albumTitle: 'LUMARÉEL Live Session — Abidjan',
    publishedAt: '2026-10-20',
    date: 'Oct 2026',
    status: 'published',
    downloadable: true,
    membersOnly: true,
    accessLevel: 'members',
    visualContextRole: 'none',
    submittedByName: 'Photographe Officiel LUMARÉEL',
    submittedByRole: 'photographer',
    createdAt: '2026-10-20T21:10:00Z',
  },
  {
    id: 'media_mem_2',
    title: 'Foule en fusion sous les faisceaux',
    titleEn: 'Crowd under stage beams',
    description:
      'Rétrospective photo du rappel final à Abidjan, accessible en accès VIP ou LUMARÉEL Card.',
    descriptionEn:
      'Final encore retrospective still from Abidjan, available with VIP access or LUMARÉEL Card.',
    mediaType: 'photo',
    url: COMMUNITY_MEDIA.crowdArchiveImg,
    thumbnailUrl: COMMUNITY_MEDIA.crowdArchiveImg,
    tag: 'Rétrospective',
    placement: 'lumareel_tv',
    tvCategory: 'retrospectives',
    privacyLevel: 'restricted',
    tvAccessTier: 'vip',
    albumTitle: 'LUMARÉEL Live Session — Abidjan',
    publishedAt: '2026-10-20',
    date: 'Oct 2026',
    status: 'published',
    downloadable: true,
    membersOnly: true,
    accessLevel: 'specific',
    visualContextRole: 'none',
    submittedByName: 'Photographe Officiel LUMARÉEL',
    submittedByRole: 'photographer',
    createdAt: '2026-10-20T22:30:00Z',
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
  if (typeof window === 'undefined') return INITIAL_MEDIA_HUB_ITEMS.map(normalizeMediaHubItem);
  try {
    const raw = localStorage.getItem(MEDIA_ITEMS_KEY);
    if (!raw) return INITIAL_MEDIA_HUB_ITEMS.map(normalizeMediaHubItem);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return INITIAL_MEDIA_HUB_ITEMS.map(normalizeMediaHubItem);
    }
    return parsed.map((item: MediaHubItem) => normalizeMediaHubItem(item));
  } catch {
    return INITIAL_MEDIA_HUB_ITEMS.map(normalizeMediaHubItem);
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

export function upsertMediaHubItem(item: MediaHubItem): MediaHubItem[] {
  const normalized = normalizeMediaHubItem(item);
  const existing = loadMediaHubItems();
  const idx = existing.findIndex((x) => x.id === normalized.id);
  const next =
    idx >= 0
      ? existing.map((x) => (x.id === normalized.id ? normalized : x))
      : [normalized, ...existing];
  saveMediaHubItems(next);
  return next;
}

export function deleteMediaHubItem(id: string): MediaHubItem[] {
  const existing = loadMediaHubItems();
  const next = existing.filter((x) => x.id !== id);
  saveMediaHubItems(next);
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
