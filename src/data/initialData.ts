import type { ArchiveProduction, ConcertEvent, NewsArticle, Order } from '../types/index.ts';

/**
 * Safe offline defaults for the client.
 * Production content is loaded from the configured database/API.
 * Keep these collections empty rather than shipping fabricated concert,
 * news, order, or archive records.
 */
export const INITIAL_EVENTS: ConcertEvent[] = [];
export const INITIAL_NEWS: NewsArticle[] = [];
export const INITIAL_ORDERS: Order[] = [];
export const INITIAL_ARCHIVES: ArchiveProduction[] = [];
