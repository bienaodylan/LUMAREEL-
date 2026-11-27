import { COMMUNITY_MEDIA } from './communityStorage';

export type MediaPlacement = 'backstage' | 'memories';
export type MediaItemStatus = 'draft' | 'published' | 'rejected';
export type VisualContextRole = 'none' | 'artist' | 'concert' | 'editorial';
export type ContributorRole = 'editorial' | 'photographer' | 'media_collaborator';

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
  albumTitle?: string;
  eventId?: string;
  artistName?: string;
  date: string;
  status: MediaItemStatus;
  downloadable: boolean;
  membersOnly: boolean;
  visualContextRole: VisualContextRole;
  submittedByName: string;
  submittedByRole: 'super_admin' | ContributorRole;
  notes?: string[];
  createdAt: string;
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
    placement: 'backstage',
    date: 'Nov 2026',
    status: 'published',
    downloadable: false,
    membersOnly: false,
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
    placement: 'backstage',
    date: 'Nov 2026',
    status: 'published',
    downloadable: false,
    membersOnly: false,
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
    placement: 'backstage',
    date: 'Oct 2026',
    status: 'published',
    downloadable: false,
    membersOnly: false,
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
      'Les minutes qui suivent la sortie de scène, réservées aux détenteurs de la LUMARÉEL Black Card.',
    descriptionEn:
      'The raw minutes right after walking off stage, reserved for LUMARÉEL Black Card holders.',
    mediaType: 'video',
    url: COMMUNITY_MEDIA.vipMezzanineImg,
    thumbnailUrl: COMMUNITY_MEDIA.vipMezzanineImg,
    embedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
    duration: '14:05',
    tag: 'Black Card',
    placement: 'backstage',
    date: 'Nov 2026',
    status: 'published',
    downloadable: false,
    membersOnly: true,
    visualContextRole: 'none',
    submittedByName: 'Direction LUMARÉEL',
    submittedByRole: 'super_admin',
    notes: [
      'Accès exclusif réservé aux membres LUMARÉEL Black Card.',
      'Réactions à chaud des artistes dans les loges privées.',
    ],
    createdAt: '2026-11-18T23:45:00Z',
  },
  {
    id: 'media_mem_1',
    title: 'Ouverture devant la fosse — Abidjan',
    titleEn: 'Opening silhouette before the crowd — Abidjan',
    description: 'Prise officielle grand angle au lancement du concert.',
    descriptionEn: 'Official wide-angle still at show opening.',
    mediaType: 'photo',
    url: COMMUNITY_MEDIA.concertMemoriesCrowdImg,
    thumbnailUrl: COMMUNITY_MEDIA.concertMemoriesCrowdImg,
    tag: 'Officiel',
    placement: 'memories',
    albumTitle: 'LUMARÉEL Live Session — Abidjan',
    date: 'Oct 2026',
    status: 'published',
    downloadable: true,
    membersOnly: false,
    visualContextRole: 'none',
    submittedByName: 'Photographe Officiel LUMARÉEL',
    submittedByRole: 'photographer',
    createdAt: '2026-10-20T21:10:00Z',
  },
  {
    id: 'media_mem_2',
    title: 'Foule en fusion sous les faisceaux',
    titleEn: 'Crowd under stage beams',
    description: 'Vue de la salle complète pendant le rappel final.',
    descriptionEn: 'Full hall perspective during the final encore.',
    mediaType: 'photo',
    url: COMMUNITY_MEDIA.crowdArchiveImg,
    thumbnailUrl: COMMUNITY_MEDIA.crowdArchiveImg,
    tag: 'Officiel',
    placement: 'memories',
    albumTitle: 'LUMARÉEL Live Session — Abidjan',
    date: 'Oct 2026',
    status: 'published',
    downloadable: true,
    membersOnly: false,
    visualContextRole: 'none',
    submittedByName: 'Photographe Officiel LUMARÉEL',
    submittedByRole: 'photographer',
    createdAt: '2026-10-20T22:30:00Z',
  },
];

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
  if (typeof window === 'undefined') return INITIAL_MEDIA_HUB_ITEMS;
  try {
    const raw = localStorage.getItem(MEDIA_ITEMS_KEY);
    if (!raw) return INITIAL_MEDIA_HUB_ITEMS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_MEDIA_HUB_ITEMS;
    return parsed;
  } catch {
    return INITIAL_MEDIA_HUB_ITEMS;
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
  const existing = loadMediaHubItems();
  const idx = existing.findIndex((x) => x.id === item.id);
  const next =
    idx >= 0
      ? existing.map((x) => (x.id === item.id ? item : x))
      : [item, ...existing];
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
