import { ConcertEvent } from '../types';
import {
  MediaHubItem,
  VisualOverridesMap,
  isSafeMediaUrl,
} from './mediaHubStorage';
import { COMMUNITY_MEDIA } from './communityStorage';

export type VisualDisplayContext = 'artist' | 'concert' | 'editorial';

export interface SelectedVisualResult {
  url: string;
  objectPositionClass: string;
  source: 'admin_override' | 'media_hub' | 'artist_portrait' | 'official_poster' | 'banner' | 'fallback';
}

/**
 * Sélection contextuelle intelligente des visuels LUMARÉEL :
 * - Contexte 'artist'    : privilégie un portrait cadré sur le visage (object-top)
 * - Contexte 'concert'   : privilégie l'affiche officielle ou le visuel principal admin
 * - Contexte 'editorial' : privilégie le format panoramique / photo de scène
 *
 * N'invente jamais de photo externe et respecte strictement les surcharges manuelles admin.
 */
export function selectEventVisual(
  event: ConcertEvent,
  context: VisualDisplayContext,
  publishedMedia: MediaHubItem[] = [],
  overrides: VisualOverridesMap = {}
): SelectedVisualResult {
  const eventOverride = overrides[event.id];
  const eventMedia = publishedMedia.filter(
    (m) =>
      m.status === 'published' &&
      m.mediaType === 'photo' &&
      (m.eventId === event.id ||
        (m.artistName &&
          event.artist &&
          m.artistName.toLowerCase().trim() === event.artist.toLowerCase().trim()))
  );

  // 1. Contrôle manuel prioritaire de l'administration
  if (eventOverride?.[context] && isSafeMediaUrl(eventOverride[context])) {
    return {
      url: eventOverride[context]!,
      objectPositionClass: context === 'artist' ? 'object-top' : 'object-center',
      source: 'admin_override',
    };
  }

  // 2. Média publié dans la médiathèque marqué pour ce contexte précis
  const contextTaggedMedia = eventMedia.find(
    (m) => m.visualContextRole === context && isSafeMediaUrl(m.url)
  );
  if (contextTaggedMedia) {
    return {
      url: contextTaggedMedia.url,
      objectPositionClass: context === 'artist' ? 'object-top' : 'object-center',
      source: 'media_hub',
    };
  }

  const hasPortrait = isSafeMediaUrl(event.artistPortrait);
  const hasPoster = isSafeMediaUrl(event.officialPoster);
  const hasBanner = isSafeMediaUrl(event.bannerImage);

  // 3. Sélection intelligente selon le contexte d'affichage
  if (context === 'artist') {
    if (hasPortrait) {
      return {
        url: event.artistPortrait,
        objectPositionClass: 'object-top',
        source: 'artist_portrait',
      };
    }
    if (hasPoster) {
      return {
        url: event.officialPoster,
        objectPositionClass: 'object-top',
        source: 'official_poster',
      };
    }
    if (hasBanner) {
      return {
        url: event.bannerImage,
        objectPositionClass: 'object-center',
        source: 'banner',
      };
    }
  }

  if (context === 'editorial') {
    if (hasBanner) {
      return {
        url: event.bannerImage,
        objectPositionClass: 'object-center',
        source: 'banner',
      };
    }
    if (hasPoster) {
      return {
        url: event.officialPoster,
        objectPositionClass: 'object-center',
        source: 'official_poster',
      };
    }
    if (hasPortrait) {
      return {
        url: event.artistPortrait,
        objectPositionClass: 'object-top',
        source: 'artist_portrait',
      };
    }
  }

  // Contexte 'concert' par défaut : affiche officielle d'abord
  if (hasPoster) {
    return {
      url: event.officialPoster,
      objectPositionClass: 'object-center',
      source: 'official_poster',
    };
  }
  if (hasBanner) {
    return {
      url: event.bannerImage,
      objectPositionClass: 'object-center',
      source: 'banner',
    };
  }
  if (hasPortrait) {
    return {
      url: event.artistPortrait,
      objectPositionClass: 'object-top',
      source: 'artist_portrait',
    };
  }

  return {
    url: COMMUNITY_MEDIA.crowdArchiveImg,
    objectPositionClass: 'object-center',
    source: 'fallback',
  };
}
