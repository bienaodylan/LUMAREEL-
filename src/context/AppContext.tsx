import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User, ConcertEvent, Order, Ticket, ArchiveProduction, PlatformSettings } from '../types';
import { INITIAL_EVENTS, INITIAL_NEWS, INITIAL_ORDERS, INITIAL_ARCHIVES } from '../data/initialData.ts';
import { convertToYouTubeEmbed } from '../utils/mediaUtils';
import { supabase, isSupabaseConfigured, configureSupabase, testSupabaseConnection } from '../lib/supabaseClient';
import { clearLocalAuthToken, getAuthHeaders } from '../utils/authSession';
import { SupportedLanguage, getTranslation } from '../i18n/translations';
import {
  BrowserNotificationPermission,
  CONCERT_REMINDER_OFFSET_MS,
  dispatchLocalPushNotification,
  formatTimeHHmm,
  getBrowserNotificationPermission,
  getConcertReminderTimestamp,
  parseConcertStartTimestamp,
  requestBrowserNotificationPermission,
  shouldTriggerReminderNow,
} from '../utils/concertNotifications';

export type PageView =
  | 'splash'
  | 'home'
  | 'discover'
  | 'concert_detail'
  | 'archive'
  | 'news'
  | 'client_space'
  | 'profile'
  | 'organizers'
  | 'gate_scanner'
  | 'admin'
  | 'card'
  | 'member_card'
  | 'card_verify'
  | 'contact'
  | 'about'
  | 'partners';

interface AppContextType {
  currentPage: PageView;
  setCurrentPage: (page: PageView) => void;
  hasEnteredPlatform: boolean;
  enterPlatform: () => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  selectedEventSlug: string | null;
  setSelectedEventSlug: (slug: string | null) => void;
  events: ConcertEvent[];
  featuredEvent: ConcertEvent | null;
  saveEvent: (event: ConcertEvent) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  news: any[];
  archives: ArchiveProduction[];
  saveArchive: (archive: Partial<ArchiveProduction> & { title: string; coverImage: string }) => Promise<void>;
  deleteArchive: (id: string) => Promise<void>;
  refreshArchives: (force?: boolean) => Promise<void>;
  refreshEvents: (force?: boolean) => Promise<void>;
  customerOrders: Order[];
  refreshCustomerOrders: () => Promise<void>;
  addLocalOrder: (order: Order) => Promise<void>;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  checkoutEvent: ConcertEvent | null;
  setCheckoutEvent: (event: ConcertEvent | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  toast: { message: string; type: 'info' | 'success' | 'error' } | null;
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  platformSettings: PlatformSettings;
  updatePlatformSettings: (settings: Partial<PlatformSettings>) => Promise<void>;
  
  // Internationalisation
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, fallback?: string) => string;

  // Favoris & Notifications Push Locales (Rappel 30 min avant le concert)
  favoriteEventIds: string[];
  toggleFavoriteEvent: (eventId: string) => void;
  isFavoriteEvent: (eventId: string) => boolean;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  notificationPermission: BrowserNotificationPermission;
  refreshNotificationPermission: () => BrowserNotificationPermission;
  requestNotificationPermission: () => Promise<BrowserNotificationPermission>;
  notifiedEventIds: string[];
  sendTestNotification: () => Promise<boolean>;

  // États de scalabilité et base de données Cloud
  isLoadingEvents: boolean;
  isLoadingOrders: boolean;
  isCloudDbActive: boolean;
  cloudSyncError: string | null;
  connectSupabaseDirectly: (url: string, key: string) => Promise<{ success: boolean; message: string; latencyMs?: number }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Paramètres par défaut de la plateforme
const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platformName: 'LUMARÉEL',
  tagline: 'CO.',
  logoMonogram: 'LR',
  logoUrl: '/assets/logo-lumareel.png',
  currency: 'FCFA',
  infoline: '+225 01 53 508 210',
  gateToken: '',
  githubRepoUrl: '',
  socialLinks: {
    tiktok: 'https://www.tiktok.com/@lumareelco',
    instagram: 'https://www.instagram.com/lumareelco/',
    snapchat: 'https://www.snapchat.com/add/lumareelco',
    youtube: '',
    facebook: 'https://www.facebook.com/share/19oZK7vQvR/?mibextid=wwXIfr',
  },
};

// ============================================================================
// CONVERTISSEURS / MAPPERS SQL (snake_case) <-> FRONTEND (camelCase)
// ============================================================================

function mapDbRowToEvent(row: any): ConcertEvent {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle || '',
    artist: row.artist,
    date: row.date,
    time: row.time,
    doorsOpen: row.doors_open || row.doorsOpen || '19:30',
    venue: row.venue,
    city: row.city,
    country: row.country,
    address: row.address || '',
    description: row.description || '',
    artistPortrait: row.artist_portrait || row.artistPortrait || '',
    officialPoster: row.official_poster || row.officialPoster || '',
    bannerImage: row.banner_image || row.bannerImage || '',
    coverImage: row.cover_image || row.coverImage || '',
    status: row.status || 'published',
    isFeatured: Boolean(row.is_featured ?? row.isFeatured),
    organizerType: row.organizer_type || row.organizerType || 'lumareel',
    organizerName: row.organizer_name || row.organizerName || 'LUMARÉEL CO.',
    organizerId: row.organizer_id || row.organizerId,
    genre: row.genre || 'Concert Live',
    platformFeePercent: row.platform_fee_percent ? Number(row.platform_fee_percent) : 0,
    infoline: row.infoline || '+225 01 53 508 210',
    categories: Array.isArray(row.categories) ? row.categories : [],
  };
}

function mapEventToDbRow(event: ConcertEvent): any {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    subtitle: event.subtitle || '',
    artist: event.artist,
    date: event.date,
    time: event.time,
    doors_open: event.doorsOpen,
    venue: event.venue,
    city: event.city,
    country: event.country,
    address: event.address || '',
    description: event.description || '',
    artist_portrait: event.artistPortrait || '',
    official_poster: event.officialPoster || '',
    banner_image: event.bannerImage || '',
    cover_image: event.coverImage || '',
    status: event.status,
    is_featured: event.isFeatured,
    organizer_type: event.organizerType,
    organizer_name: event.organizerName,
    organizer_id: event.organizerId || null,
    genre: event.genre,
    platform_fee_percent: event.platformFeePercent || 0,
    infoline: event.infoline || '+225 01 53 508 210',
    categories: (event.categories || []).map(({ ticketImageFile, ...category }: any) => category),
    updated_at: new Date().toISOString(),
  };
}

function mapDbRowToArchive(row: any): ArchiveProduction {
  return {
    id: row.id,
    title: row.title,
    year: row.year,
    date: row.date || '',
    city: row.city,
    country: row.country,
    venue: row.venue,
    artists: Array.isArray(row.artists) ? row.artists : [],
    coverImage: row.cover_image || row.coverImage,
    description: row.description || '',
    youtubeUrl: row.youtube_url || row.youtubeUrl || '',
    youtubeEmbedUrl: row.youtube_embed_url || row.youtubeEmbedUrl || '',
    duration: row.duration || 'Live HD',
    photos: Array.isArray(row.photos) ? row.photos : [],
    isPublished: Boolean(row.is_published ?? row.isPublished ?? true),
    orderIndex: row.order_index ?? row.orderIndex ?? 1,
  };
}

function mapArchiveToDbRow(arch: ArchiveProduction): any {
  return {
    id: arch.id,
    title: arch.title,
    year: arch.year,
    date: arch.date || '',
    city: arch.city,
    country: arch.country,
    venue: arch.venue,
    artists: arch.artists || [],
    cover_image: arch.coverImage,
    description: arch.description || '',
    youtube_url: arch.youtubeUrl || '',
    youtube_embed_url: arch.youtubeEmbedUrl || '',
    duration: arch.duration || 'Live HD',
    photos: arch.photos || [],
    is_published: arch.isPublished,
    order_index: arch.orderIndex,
    updated_at: new Date().toISOString(),
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasEnteredPlatform, setHasEnteredPlatform] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<PageView>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('token') || params.get('page') === 'gate_scanner' || window.location.pathname.includes('scanner')) {
        return 'gate_scanner';
      }
      if (params.get('page') === 'admin' || params.get('admin') === 'true' || params.get('admin') === '1' || window.location.pathname.includes('admin')) {
        return 'admin';
      }
    }
    return 'home';
  });

  const [selectedEventSlug, setSelectedEventSlug] = useState<string | null>(null);

  // Storage keys pour persistance indestructible (résout le problème d'images qui quittent)
  const STORAGE_KEYS = {
    EVENTS: 'lumareel_persisted_events_v5',
    ORDERS: 'lumareel_persisted_orders_v5',
    ARCHIVES: 'lumareel_persisted_archives_v5',
    SETTINGS: 'lumareel_persisted_settings_v5',
    CURRENT_USER: 'lumareel_persisted_user_v5',
    FAVORITES: 'lumareel_favorite_events_v1',
    NOTIF_ENABLED: 'lumareel_notifications_enabled_v1',
    NOTIFIED_EVENTS: 'lumareel_notified_events_v1',
  };

  const readLocal = <T,>(key: string, fallback: T): T => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed) return parsed;
        }
      }
    } catch {}
    return fallback;
  };

  const writeLocal = <T,>(key: string, val: T) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, JSON.stringify(val));
      }
    } catch {}
  };

  // Données initialisées avec persistance locale automatique
  const [events, setEvents] = useState<ConcertEvent[]>(() =>
    readLocal<ConcertEvent[]>(STORAGE_KEYS.EVENTS, INITIAL_EVENTS)
  );
  const [featuredEvent, setFeaturedEvent] = useState<ConcertEvent | null>(() => {
    const list = readLocal<ConcertEvent[]>(STORAGE_KEYS.EVENTS, INITIAL_EVENTS);
    return list.find((e) => e.isFeatured) || list[0] || null;
  });
  const [news, setNews] = useState<any[]>(INITIAL_NEWS);
  const [archives, setArchives] = useState<ArchiveProduction[]>(() =>
    readLocal<ArchiveProduction[]>(STORAGE_KEYS.ARCHIVES, INITIAL_ARCHIVES)
  );
  const [customerOrders, setCustomerOrders] = useState<Order[]>(() =>
    readLocal<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS)
  );
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(() =>
    readLocal<PlatformSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_PLATFORM_SETTINGS)
  );

  // Modals & Navigation
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [checkoutEvent, setCheckoutEvent] = useState<ConcertEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  // Internationalisation (Français / Anglais)
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('lumareel_lang') as SupportedLanguage) || 'fr';
    }
    return 'fr';
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lumareel_lang', lang);
    }
  };

  const t = (key: string, fallback?: string): string => {
    return getTranslation(language, key, fallback);
  };

  // ============================================================================
  // FAVORIS & NOTIFICATIONS PUSH LOCALES (RAPPEL 30 MIN AVANT LE CONCERT)
  // ============================================================================
  const [favoriteEventIds, setFavoriteEventIds] = useState<string[]>(() => {
    const raw = readLocal<unknown>(STORAGE_KEYS.FAVORITES, []);
    return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : [];
  });

  const [notificationsEnabled, setNotificationsEnabledState] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(STORAGE_KEYS.NOTIF_ENABLED);
        if (stored !== null) return JSON.parse(stored) !== false;
      }
    } catch {}
    return true;
  });

  const [notifiedEventIds, setNotifiedEventIds] = useState<string[]>(() => {
    const raw = readLocal<unknown>(STORAGE_KEYS.NOTIFIED_EVENTS, []);
    return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : [];
  });
  const notifiedEventIdsRef = useRef<string[]>(notifiedEventIds);
  notifiedEventIdsRef.current = notifiedEventIds;

  const [notificationPermission, setNotificationPermission] = useState<BrowserNotificationPermission>(() =>
    getBrowserNotificationPermission()
  );

  const refreshNotificationPermission = useCallback((): BrowserNotificationPermission => {
    const perm = getBrowserNotificationPermission();
    setNotificationPermission(perm);
    return perm;
  }, []);

  const setNotificationsEnabled = useCallback((enabled: boolean) => {
    setNotificationsEnabledState(enabled);
    writeLocal(STORAGE_KEYS.NOTIF_ENABLED, enabled);
  }, []);

  const requestNotificationPermission = useCallback(async (): Promise<BrowserNotificationPermission> => {
    const result = await requestBrowserNotificationPermission();
    setNotificationPermission(result);
    if (result === 'granted') {
      setNotificationsEnabled(true);
    }
    return result;
  }, [setNotificationsEnabled]);

  const isFavoriteEvent = useCallback(
    (eventId: string) => favoriteEventIds.includes(eventId),
    [favoriteEventIds]
  );

  const toggleFavoriteEvent = useCallback(
    (eventId: string) => {
      const exists = favoriteEventIds.includes(eventId);
      const next = exists
        ? favoriteEventIds.filter((id) => id !== eventId)
        : [eventId, ...favoriteEventIds];

      setFavoriteEventIds(next);
      writeLocal(STORAGE_KEYS.FAVORITES, next);

      const targetEvent = events.find((e) => e.id === eventId);
      const label = targetEvent ? `${targetEvent.artist} EN CONCERT` : 'Concert';

      if (exists) {
        showToast(
          language === 'en'
            ? `${label} removed from favorites.`
            : `${label} retiré de vos favoris.`,
          'info'
        );
      } else {
        const reminderTs = targetEvent ? getConcertReminderTimestamp(targetEvent) : null;
        const reminderHour = reminderTs ? formatTimeHHmm(reminderTs) : '';
        const currentPerm = getBrowserNotificationPermission();

        if (!notificationsEnabled) {
          showToast(
            language === 'en'
              ? `${label} added to favorites. Enable alerts in Profile for 30-min reminders.`
              : `${label} ajouté aux favoris. Activez les alertes dans Profil pour recevoir le rappel 30 min avant.`,
            'success'
          );
        } else if (currentPerm === 'granted') {
          showToast(
            language === 'en'
              ? `${label} added to favorites · Push alert scheduled 30 min before${reminderHour ? ` (${reminderHour})` : ''}.`
              : `${label} ajouté aux favoris · Alerte push programmée 30 min avant${reminderHour ? ` (${reminderHour})` : ''}.`,
            'success'
          );
        } else {
          showToast(
            language === 'en'
              ? `${label} added to favorites · Reminder scheduled 30 min before. Authorize push alerts in Profile.`
              : `${label} ajouté aux favoris · Rappel prévu 30 min avant. Autorisez les notifications dans Profil.`,
            'success'
          );
        }
      }
    },
    [favoriteEventIds, events, notificationsEnabled, language]
  );

  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    const sampleEvent =
      events.find((e) => favoriteEventIds.includes(e.id)) || featuredEvent || events[0];
    const title = sampleEvent
      ? `LUMARÉEL · Rappel Concert (${sampleEvent.artist})`
      : 'LUMARÉEL · Test de notification';
    const body = sampleEvent
      ? `Votre concert au ${sampleEvent.venue} commence dans 30 minutes (${sampleEvent.time || '20:00'}).`
      : 'Les alertes locales 30 minutes avant vos concerts favoris fonctionnent parfaitement.';

    const res = await dispatchLocalPushNotification({
      title,
      body,
      tag: `lumareel-test-${Date.now()}`,
      icon: '/assets/logo-lumareel.png',
      onClick: () => {
        if (sampleEvent) {
          setSelectedEventSlug(sampleEvent.slug);
          setCurrentPage('concert_detail');
        }
      },
    });

    if (res.deliveredViaBrowser) {
      showToast(
        language === 'en'
          ? 'Test push notification sent to your device!'
          : 'Notification push de test envoyée sur votre appareil !',
        'success'
      );
      return true;
    }

    showToast(
      language === 'en'
        ? `In-app preview: "${body}" (Allow browser permission for system push alerts).`
        : `Aperçu local : "${body}" (Autorisez les notifications navigateur pour les alertes système).`,
      'info'
    );
    return false;
  }, [events, favoriteEventIds, featuredEvent, language]);

  // Indicateurs de performance & Cloud DB
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isCloudDbActive, setIsCloudDbActive] = useState(isSupabaseConfigured);
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);

  // Cache mémoire côté client & In-flight request deduplication (évite les sur-sollicitations lors de rechargements)
  const cacheTimestamps = useRef<{
    events: number;
    archives: number;
    settings: number;
    orders: number;
  }>({
    events: 0,
    archives: 0,
    settings: 0,
    orders: 0,
  });

  const inFlightPromises = useRef<{
    events: Promise<void> | null;
    archives: Promise<void> | null;
    settings: Promise<void> | null;
    orders: Promise<void> | null;
  }>({
    events: null,
    archives: null,
    settings: null,
    orders: null,
  });

  const CACHE_TTL_MS = {
    events: 20000,    // 20 secondes de cache mémoire pour les événements
    archives: 60000,  // 60 secondes pour les archives vidéo
    settings: 60000,  // 60 secondes pour les réglages globaux
    orders: 10000,    // 10 secondes pour les commandes du compte
  };

  // Session utilisateur persistante (cache d'affichage uniquement, vérité vérifiée via GET /api/auth/me)
  const [currentUser, setCurrentUserState] = useState<User | null>(() => {
    const saved = readLocal<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (!saved || !saved.id || !saved.email) return null;
    return {
      id: saved.id,
      email: saved.email,
      name: saved.name,
      role: 'customer',
      emailVerified: Boolean(saved.emailVerified),
      createdAt: saved.createdAt || new Date().toISOString(),
    };
  });

  useEffect(() => {
    let active = true;
    clearLocalAuthToken();

    const verifyCookieSession = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
          headers: await getAuthHeaders(),
        });
        if (!active) return;
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.success && data.user) {
            setCurrentUserState(data.user);
            writeLocal(STORAGE_KEYS.CURRENT_USER, {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              role: data.user.role,
              emailVerified: data.user.emailVerified,
            });
            return;
          }
        }
        if (res.status === 401) {
          setCurrentUserState(null);
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        }
      } catch {
        // Ne pas déconnecter en cas de perte réseau transitoire
      }
    };

    void verifyCookieSession();
    return () => {
      active = false;
    };
  }, []);

  const setCurrentUser = (user: User | null) => {
    clearLocalAuthToken();
    setCurrentUserState(user);
    if (user) {
      writeLocal(STORAGE_KEYS.CURRENT_USER, {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      });
    } else {
      try {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        if (isSupabaseConfigured) {
          supabase.auth.signOut().catch(() => {});
        }
      } catch {}
    }
  };

  const enterPlatform = () => {
    setHasEnteredPlatform(true);
    setCurrentPage('home');
  };

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // ============================================================================
  // 1. GESTION DES ÉVÉNEMENTS (SUPABASE CLOUD AVEC CACHE & DEDUPLICATION)
  // ============================================================================

  const refreshEvents = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - cacheTimestamps.current.events < CACHE_TTL_MS.events && events.length > 0) {
      return;
    }

    if (inFlightPromises.current.events) {
      return inFlightPromises.current.events;
    }

    const fetchTask = async () => {
      setIsLoadingEvents(true);
      try {
        // Source d'autorité SQLite / Express
        const loaded = await fetchEventsFromBackend();
        if (!loaded && isSupabaseConfigured) {
          const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('date', { ascending: true });
          if (!error && data) {
            const mapped = data.map(mapDbRowToEvent);
            setEvents(mapped);
            const feat = mapped.find((e) => e.isFeatured) || mapped[0];
            setFeaturedEvent(feat || null);
            cacheTimestamps.current.events = Date.now();
            setIsCloudDbActive(true);
            setCloudSyncError(null);
          }
        }
      } catch (err: any) {
        console.warn('[Events] Erreur réseau:', err.message);
      } finally {
        setIsLoadingEvents(false);
        inFlightPromises.current.events = null;
      }
    };

    inFlightPromises.current.events = fetchTask();
    return inFlightPromises.current.events;
  }, [events.length]);

  const fetchEventsFromBackend = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/events');
      if (!res.ok) return false;
      const data = await res.json();
      if (data.success && Array.isArray(data.events)) {
        const serverEvents = data.events as ConcertEvent[];
        setEvents(serverEvents);
        writeLocal(STORAGE_KEYS.EVENTS, serverEvents);
        const feat = serverEvents.find((e) => e.isFeatured && e.status === 'published') || serverEvents.find((e) => e.status === 'published');
        setFeaturedEvent(feat || null);
        cacheTimestamps.current.events = Date.now();
        setCloudSyncError(null);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const seedInitialEventsToSupabase = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const rows = events.map(mapEventToDbRow);
      const { error } = await supabase.from('events').upsert(rows, { onConflict: 'id' });
      if (!error) {
        setIsCloudDbActive(true);
      }
    } catch (e) {
      console.warn('Seeding initial events skipped:', e);
    }
  };

  const notifyCrossTabSync = () => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('lumareel_live_sync');
        bc.postMessage({ type: 'DATA_CHANGED', timestamp: Date.now() });
        bc.close();
      }
    } catch {}
  };

  const saveEvent = async (updatedEvent: ConcertEvent) => {
    const previousEvents = events;
    const previousFeatured = featuredEvent;
    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const response = await fetch(`/api/events/${encodeURIComponent(updatedEvent.id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify(updatedEvent),
      });
      const resJson = await response.json().catch(() => null);
      if (!response.ok || resJson?.success === false) {
        throw new Error(resJson?.error || `API événements : HTTP ${response.status}`);
      }

      const confirmedEvent: ConcertEvent = resJson?.event || updatedEvent;
      const next = previousEvents.some((event) => event.id === confirmedEvent.id)
        ? previousEvents.map((event) => (event.id === confirmedEvent.id ? confirmedEvent : event))
        : [confirmedEvent, ...previousEvents];
      setEvents(next);
      writeLocal(STORAGE_KEYS.EVENTS, next);
      setFeaturedEvent(
        confirmedEvent.isFeatured
          ? confirmedEvent
          : previousFeatured?.id === confirmedEvent.id
            ? next.find((event) => event.isFeatured) || null
            : previousFeatured
      );

      // Miroir cloud optionnel si Supabase est connecté
      if (isSupabaseConfigured) {
        try {
          const dbRow = mapEventToDbRow(confirmedEvent);
          await supabase.from('events').upsert(dbRow, { onConflict: 'id' });
          setIsCloudDbActive(true);
        } catch (sbErr) {
          console.warn('[Supabase event mirror warning]', sbErr);
        }
      }

      setCloudSyncError(null);
      cacheTimestamps.current.events = Date.now();
      notifyCrossTabSync();
    } catch (err: any) {
      setEvents(previousEvents);
      writeLocal(STORAGE_KEYS.EVENTS, previousEvents);
      setFeaturedEvent(previousFeatured);
      setCloudSyncError(`Événement : ${err.message}`);
      throw err;
    }
  };

  const deleteEvent = async (eventId: string) => {
    const previousEvents = events;
    const headers = await getAuthHeaders();
    const response = await fetch(`/api/events/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
      credentials: 'include',
      headers,
    });
    const resJson = await response.json().catch(() => null);
    if (!response.ok && response.status !== 404) {
      throw new Error(resJson?.error || `API événements : HTTP ${response.status}`);
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('events').delete().eq('id', eventId);
      } catch (sbErr) {
        console.warn('[Supabase delete mirror warning]', sbErr);
      }
    }

    const next = previousEvents.filter((event) => event.id !== eventId);
    setEvents(next);
    writeLocal(STORAGE_KEYS.EVENTS, next);
    if (featuredEvent?.id === eventId) setFeaturedEvent(next.find((event) => event.isFeatured) || next[0] || null);
    cacheTimestamps.current.events = 0;
    notifyCrossTabSync();
  };

  // ============================================================================
  // 2. GESTION DES ARCHIVES (BASE SQLITE PRINCIPALE + MIROIR CLOUD OPTIONNEL)
  // ============================================================================

  const refreshArchives = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - cacheTimestamps.current.archives < CACHE_TTL_MS.archives && archives.length > 0) {
      return;
    }

    if (inFlightPromises.current.archives) {
      return inFlightPromises.current.archives;
    }

    const task = async () => {
      try {
        const loaded = await fetchArchivesFromBackend();
        if (!loaded && isSupabaseConfigured) {
          const { data, error } = await supabase
            .from('archives')
            .select('*')
            .order('order_index', { ascending: true });
          if (!error && data) {
            const mappedArchives = data.map(mapDbRowToArchive);
            setArchives(mappedArchives);
            writeLocal(STORAGE_KEYS.ARCHIVES, mappedArchives);
            cacheTimestamps.current.archives = Date.now();
            setIsCloudDbActive(true);
          }
        }
      } catch (err) {
        console.warn('[Archives] Fetch error:', err);
      } finally {
        inFlightPromises.current.archives = null;
      }
    };

    inFlightPromises.current.archives = task();
    return inFlightPromises.current.archives;
  }, [archives.length]);

  const fetchArchivesFromBackend = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/archives');
      if (!res.ok) return false;
      const data = await res.json();
      if (data.success && Array.isArray(data.archives)) {
        setArchives(data.archives);
        writeLocal(STORAGE_KEYS.ARCHIVES, data.archives);
        cacheTimestamps.current.archives = Date.now();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const saveArchive = async (archiveData: Partial<ArchiveProduction> & { title: string; coverImage: string }) => {
    const id = archiveData.id || `arch_${Date.now()}`;
    const embedUrl = archiveData.youtubeUrl ? convertToYouTubeEmbed(archiveData.youtubeUrl) : archiveData.youtubeEmbedUrl;

    const newArchive: ArchiveProduction = {
      id,
      title: archiveData.title,
      year: archiveData.year || '2026',
      date: archiveData.date || '2026',
      city: archiveData.city || 'Abidjan',
      country: archiveData.country || 'Côte d’Ivoire',
      venue: archiveData.venue || 'Palais de la Culture',
      artists: archiveData.artists || ['LUMARÉEL CO.'],
      coverImage: archiveData.coverImage,
      description: archiveData.description || '',
      youtubeUrl: archiveData.youtubeUrl || '',
      youtubeEmbedUrl: embedUrl || '',
      duration: archiveData.duration || 'Live HD',
      photos: archiveData.photos || [],
      isPublished: archiveData.isPublished !== undefined ? archiveData.isPublished : true,
      orderIndex: archiveData.orderIndex || 1,
    };

    const previousArchives = archives;
    setArchives((prev) => [newArchive, ...prev.filter((a) => a.id !== id)]);
    cacheTimestamps.current.archives = 0;

    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const response = await fetch('/api/archives', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(newArchive),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || `API archives : HTTP ${response.status}`);
      }
      const savedArchive: ArchiveProduction = data?.archive || newArchive;
      setArchives((prev) => {
        const next = [savedArchive, ...prev.filter((a) => a.id !== savedArchive.id)];
        writeLocal(STORAGE_KEYS.ARCHIVES, next);
        return next;
      });

      if (isSupabaseConfigured) {
        try {
          const row = mapArchiveToDbRow(savedArchive);
          await supabase.from('archives').upsert(row, { onConflict: 'id' });
          setIsCloudDbActive(true);
        } catch (sbErr) {
          console.warn('[Supabase archive mirror warning]', sbErr);
        }
      }

      setCloudSyncError(null);
      showToast('Archive enregistrée en base de données.', 'success');
      cacheTimestamps.current.archives = Date.now();
      notifyCrossTabSync();
    } catch (err: any) {
      setArchives(previousArchives);
      writeLocal(STORAGE_KEYS.ARCHIVES, previousArchives);
      cacheTimestamps.current.archives = 0;
      showToast(`Échec de synchronisation de l’archive : ${err.message}`, 'error');
      throw err;
    }
  };

  const deleteArchive = async (id: string) => {
    const previousArchives = archives;
    setArchives((prev) => prev.filter((a) => a.id !== id));
    cacheTimestamps.current.archives = 0;

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/archives/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers,
      });
      if (!response.ok && response.status !== 404) {
        throw new Error(`API archives : HTTP ${response.status}`);
      }

      if (isSupabaseConfigured) {
        try {
          await supabase.from('archives').delete().eq('id', id);
        } catch (sbErr) {
          console.warn('[Supabase archive delete warning]', sbErr);
        }
      }

      setCloudSyncError(null);
      showToast('Archive supprimée.', 'success');

      setArchives((prev) => {
        const next = prev.filter((a) => a.id !== id);
        writeLocal(STORAGE_KEYS.ARCHIVES, next);
        return next;
      });
      cacheTimestamps.current.archives = Date.now();
      notifyCrossTabSync();
    } catch (err: any) {
      setArchives(previousArchives);
      writeLocal(STORAGE_KEYS.ARCHIVES, previousArchives);
      cacheTimestamps.current.archives = 0;
      showToast(`Échec de suppression de l’archive : ${err.message}`, 'error');
      throw err;
    }
  };

  // ============================================================================
  // 3. GESTION DES COMMANDES & BILLETS (BASE SQLITE + MIROIR OPTIONNEL)
  // ============================================================================

  const refreshCustomerOrders = useCallback(async () => {
    if (!currentUser?.email) return;

    const email = currentUser.email.toLowerCase().trim();
    setIsLoadingOrders(true);

    try {
      const loaded = await fetchCustomerOrdersFromBackend(email);
      if (!loaded && isSupabaseConfigured) {
        const { data: ordersData, error: ordersErr } = await supabase
          .from('orders')
          .select('*')
          .ilike('customer_email', email)
          .order('created_at', { ascending: false });

        if (!ordersErr && ordersData && ordersData.length > 0) {
          const orderIds = ordersData.map((o) => o.id);
          const { data: ticketsData } = await supabase
            .from('tickets')
            .select('*')
            .in('order_id', orderIds);

          const formattedOrders: Order[] = ordersData.map((row) => {
            const rawTickets = (ticketsData || []).filter((t) => t.order_id === row.id);
            const mappedTickets: Ticket[] = rawTickets.map((t) => ({
              id: t.id,
              orderId: t.order_id,
              orderRef: t.order_ref,
              eventId: t.event_id,
              eventTitle: t.event_title,
              eventDate: t.event_date,
              eventTime: t.event_time,
              eventVenue: t.event_venue,
              categoryId: t.category_id,
              categoryName: t.category_name,
              serialNumber: t.serial_number,
              token: t.token,
              holderName: t.holder_name,
              holderEmail: t.holder_email,
              status: t.status,
              issuedAt: t.issued_at,
              checkedInAt: t.checked_in_at,
              checkedInBy: t.checked_in_by,
            }));

            return {
              id: row.id,
              reference: row.reference,
              customerId: row.customer_id,
              customerName: row.customer_name,
              customerEmail: row.customer_email,
              customerPhone: row.customer_phone,
              eventId: row.event_id,
              eventTitle: row.event_title,
              eventDate: row.event_date,
              eventVenue: row.event_venue,
              categoryId: row.category_id,
              categoryName: row.category_name,
              quantity: row.quantity,
              unitPrice: Number(row.unit_price),
              totalAmount: Number(row.total_amount),
              currency: row.currency || 'FCFA',
              paymentStatus: row.payment_status || 'completed',
              paymentProvider: row.payment_provider || 'geniuspay',
              paymentRef: row.payment_ref,
              createdAt: row.created_at,
              paidAt: row.paid_at,
              tickets: mappedTickets,
            };
          });

          setCustomerOrders(formattedOrders);
          writeLocal(STORAGE_KEYS.ORDERS, formattedOrders);
          cacheTimestamps.current.orders = Date.now();
        }
      }
    } catch (err) {
      console.warn('[Orders] Fetch error:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [currentUser?.email]);

  const fetchCustomerOrdersFromBackend = async (_email: string): Promise<boolean> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/customer/orders', {
        credentials: 'include',
        headers,
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setCustomerOrders(data.orders);
        writeLocal(STORAGE_KEYS.ORDERS, data.orders);
        cacheTimestamps.current.orders = Date.now();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const addLocalOrder = async (newOrder: Order) => {
    // Mise à jour optimiste locale (la création & validation sont strictement côté serveur)
    setCustomerOrders((prev) => {
      const next = [newOrder, ...prev.filter((o) => o.id !== newOrder.id)];
      writeLocal(STORAGE_KEYS.ORDERS, next);
      return next;
    });

    setEvents((prev) => {
      const next = prev.map((ev) => {
        if (ev.id === newOrder.eventId) {
          const updatedCategories = ev.categories.map((c) =>
            c.id === newOrder.categoryId
              ? { ...c, sold: c.sold + newOrder.quantity }
              : c
          );
          return { ...ev, categories: updatedCategories };
        }
        return ev;
      });
      writeLocal(STORAGE_KEYS.EVENTS, next);
      return next;
    });

    // 3. Synchronisation optionnelle vers Supabase Cloud
    if (isSupabaseConfigured) {
      try {
        const orderRow = {
          id: newOrder.id,
          reference: newOrder.reference,
          customer_id: newOrder.customerId,
          customer_name: newOrder.customerName,
          customer_email: newOrder.customerEmail,
          customer_phone: newOrder.customerPhone || null,
          event_id: newOrder.eventId,
          event_title: newOrder.eventTitle,
          event_date: newOrder.eventDate,
          event_venue: newOrder.eventVenue,
          category_id: newOrder.categoryId,
          category_name: newOrder.categoryName,
          quantity: newOrder.quantity,
          unit_price: newOrder.unitPrice,
          total_amount: newOrder.totalAmount,
          currency: newOrder.currency,
          payment_status: newOrder.paymentStatus,
          payment_provider: newOrder.paymentProvider,
          payment_ref: newOrder.paymentRef,
          created_at: newOrder.createdAt,
          paid_at: newOrder.paidAt || new Date().toISOString(),
        };

        const { error: orderErr } = await supabase.from('orders').upsert(orderRow, { onConflict: 'id' });
        if (orderErr) throw new Error(orderErr.message);

        if (newOrder.tickets && newOrder.tickets.length > 0) {
          const ticketRows = newOrder.tickets.map((t) => ({
            id: t.id,
            order_id: newOrder.id,
            order_ref: newOrder.reference,
            event_id: t.eventId,
            event_title: t.eventTitle,
            event_date: t.eventDate,
            event_time: t.eventTime,
            event_venue: t.eventVenue,
            category_id: t.categoryId,
            category_name: t.categoryName,
            serial_number: t.serialNumber,
            token: t.token,
            holder_name: t.holderName,
            holder_email: t.holderEmail,
            status: t.status,
            issued_at: t.issuedAt,
          }));

          await supabase.from('tickets').upsert(ticketRows, { onConflict: 'id' });
        }
      } catch (err: any) {
        console.warn('[Supabase Order Mirror Notice]', err);
      }
    }
  };

  // ============================================================================
  // 4. RÉGLAGES DE LA PLATEFORME (LOGO, MONOGRAMME, DEVISE DANS SQLITE)
  // ============================================================================

  const refreshPlatformSettings = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - cacheTimestamps.current.settings < CACHE_TTL_MS.settings) {
      return;
    }

    if (inFlightPromises.current.settings) {
      return inFlightPromises.current.settings;
    }

    const task = async () => {
      try {
        const loaded = await fetchSettingsFromBackend();
        if (!loaded && isSupabaseConfigured) {
          const { data, error } = await supabase
            .from('platform_settings')
            .select('*')
            .eq('id', 1)
            .single();

          if (!error && data) {
            setPlatformSettings({
              platformName: data.platform_name || 'LUMARÉEL',
              tagline: data.tagline || 'CO.',
              logoMonogram: data.logo_monogram || 'LR',
              logoUrl: data.logo_url || '',
              currency: data.currency || 'FCFA',
              infoline: data.infoline || '+225 01 53 508 210',
              gateToken: data.gate_token || 'VIGILE_AUTH_LMR_2026',
              githubRepoUrl: data.github_repo_url || '',
              socialLinks: data.social_links || {},
            });
            cacheTimestamps.current.settings = Date.now();
          }
        }
      } catch (e) {
        console.warn('[Settings] Fetch error:', e);
      } finally {
        inFlightPromises.current.settings = null;
      }
    };

    inFlightPromises.current.settings = task();
    return inFlightPromises.current.settings;
  }, []);

  const fetchSettingsFromBackend = async (): Promise<boolean> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/settings', {
        credentials: 'include',
        headers,
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.success && data.settings) {
        setPlatformSettings((prev) => ({ ...prev, ...data.settings }));
        cacheTimestamps.current.settings = Date.now();

        if (
          data.settings.supabaseUrl &&
          data.settings.supabaseAnonKey &&
          !data.settings.supabaseUrl.includes('kupznytxykaesfqnngtb.supabase.co') &&
          !isSupabaseConfigured
        ) {
          configureSupabase(data.settings.supabaseUrl, data.settings.supabaseAnonKey);
          setIsCloudDbActive(true);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const updatePlatformSettings = async (newSettings: Partial<PlatformSettings>) => {
    const previousSettings = platformSettings;
    const mergedSettings = { ...previousSettings, ...newSettings };

    // 1. Sauvegarde locale et mémoire immédiate
    setPlatformSettings(mergedSettings);
    writeLocal(STORAGE_KEYS.SETTINGS, mergedSettings);

    // 2. Sauvegarde sur le serveur Node.js (SQLite + JSON miroir)
    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify(mergedSettings),
      });
      if (!res.ok) throw new Error(`API paramètres : HTTP ${res.status}`);
    } catch (serverErr) {
      console.warn('[Settings Disk Save Warning]', serverErr);
    }

    // 3. Synchronisation optionnelle avec Supabase
    if (isSupabaseConfigured) {
      try {
        const dbRow: any = {
          id: 1,
          platform_name: mergedSettings.platformName,
          tagline: mergedSettings.tagline,
          logo_monogram: mergedSettings.logoMonogram,
          logo_url: mergedSettings.logoUrl,
          currency: mergedSettings.currency,
          infoline: mergedSettings.infoline,
          gate_token: mergedSettings.gateToken,
          github_repo_url: mergedSettings.githubRepoUrl,
          updated_at: new Date().toISOString(),
        };
        await supabase.from('platform_settings').upsert(dbRow, { onConflict: 'id' });
        setCloudSyncError(null);
        setIsCloudDbActive(true);
      } catch (sbErr) {
        console.warn('[Settings Supabase Sync Notice]', sbErr);
      }
    }

    cacheTimestamps.current.settings = Date.now();
    notifyCrossTabSync();
  };

  // Configuration Supabase gérée strictement via variables d'environnement serveur (.env)
  const connectSupabaseDirectly = async (_url: string, _key: string) => {
    return {
      success: false,
      message: 'La configuration Supabase s’effectue exclusivement côté serveur via variables d’environnement.',
    };
  };

  // Chargement initial au montage de l'application
  useEffect(() => {
    refreshEvents();
    refreshArchives();
    refreshPlatformSettings();
  }, [refreshEvents, refreshArchives, refreshPlatformSettings]);

  // Synchronisation en direct multi-onglets (Lien externe <-> Aperçu Google AI Studio)
  useEffect(() => {
    // 1. BroadcastChannel inter-onglets (synchronisation instantanée < 50ms)
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('lumareel_live_sync');
        bc.onmessage = (msg) => {
          if (msg.data?.type === 'DATA_CHANGED') {
            refreshEvents(true);
            refreshArchives(true);
            refreshPlatformSettings(true);
          }
        };
      }
    } catch {}

    // 2. Focus & Visibilité (rechargement automatique quand l'onglet redevient actif)
    const onWindowFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshEvents(true);
        refreshArchives(true);
        refreshPlatformSettings(true);
      }
    };

    window.addEventListener('focus', onWindowFocusOrVisible);
    document.addEventListener('visibilitychange', onWindowFocusOrVisible);

    // 3. Polling en arrière-plan toutes les 3.5 secondes pour synchronisation en parallèle automatique
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshEvents();
        refreshPlatformSettings();
      }
    }, 3500);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('focus', onWindowFocusOrVisible);
      document.removeEventListener('visibilitychange', onWindowFocusOrVisible);
      clearInterval(pollInterval);
    };
  }, [refreshEvents, refreshArchives, refreshPlatformSettings]);

  // Synchronisation des commandes lorsque l'utilisateur connecté change
  useEffect(() => {
    if (currentUser?.email) {
      refreshCustomerOrders();
    }
  }, [currentUser?.email, refreshCustomerOrders]);

  // ============================================================================
  // PLANIFICATEUR DE NOTIFICATIONS PUSH LOCALES (30 MIN AVANT LE CONCERT)
  // ============================================================================
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const markAsNotified = (eventId: string) => {
      if (notifiedEventIdsRef.current.includes(eventId)) return;
      const updated = [...notifiedEventIdsRef.current, eventId];
      notifiedEventIdsRef.current = updated;
      setNotifiedEventIds(updated);
      writeLocal(STORAGE_KEYS.NOTIFIED_EVENTS, updated);
    };

    const fireConcertReminder = async (event: ConcertEvent) => {
      if (notifiedEventIdsRef.current.includes(event.id)) return;
      markAsNotified(event.id);

      const startTs = parseConcertStartTimestamp(event.date, event.time);
      const minsLeft = startTs
        ? Math.max(1, Math.round((startTs - Date.now()) / 60000))
        : 30;

      const title =
        language === 'en'
          ? `LUMARÉEL · Starts in ${minsLeft} min: ${event.artist}`
          : `LUMARÉEL · Dans ${minsLeft} min : ${event.artist} EN CONCERT`;
      const body =
        language === 'en'
          ? `${event.venue} (${event.city}) · Show starts at ${event.time}. Prepare your ticket!`
          : `${event.venue} (${event.city}) · Début à ${event.time}. Préparez votre billet !`;

      await dispatchLocalPushNotification({
        title,
        body,
        tag: `lumareel-concert-30m-${event.id}`,
        icon: event.officialPoster || '/assets/logo-lumareel.png',
        onClick: () => {
          setSelectedEventSlug(event.slug);
          setCurrentPage('concert_detail');
        },
      });

      showToast(`${title} — ${event.venue}`, 'info');
    };

    const evaluateUpcomingFavorites = () => {
      refreshNotificationPermission();
      if (!notificationsEnabled || favoriteEventIds.length === 0) return;

      const now = Date.now();
      const favoritedEvents = events.filter((e) => favoriteEventIds.includes(e.id));

      for (const evt of favoritedEvents) {
        if (shouldTriggerReminderNow(evt, now, notifiedEventIdsRef.current)) {
          void fireConcertReminder(evt);
        }
      }
    };

    // 1. Évaluation immédiate
    evaluateUpcomingFavorites();

    // 2. Planification par timer exact à T - 30 min pour les concerts favoris à venir
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (notificationsEnabled && favoriteEventIds.length > 0) {
      const now = Date.now();
      const MAX_TIMEOUT_MS = 2147483647; // Limite 32-bit de setTimeout (~24.8 jours)

      events
        .filter((e) => favoriteEventIds.includes(e.id) && !notifiedEventIdsRef.current.includes(e.id))
        .forEach((evt) => {
          const startTs = parseConcertStartTimestamp(evt.date, evt.time);
          if (!startTs || startTs <= now) return;

          const reminderTs = startTs - CONCERT_REMINDER_OFFSET_MS;
          const delay = reminderTs - now;
          if (delay > 0 && delay <= MAX_TIMEOUT_MS) {
            const timer = setTimeout(() => {
              evaluateUpcomingFavorites();
            }, delay + 250);
            timers.push(timer);
          }
        });
    }

    // 3. Vérification périodique (15s) et au retour au premier plan
    const interval = setInterval(evaluateUpcomingFavorites, 15000);
    const onVisibilityOrFocus = () => {
      refreshNotificationPermission();
      if (document.visibilityState === 'visible') {
        evaluateUpcomingFavorites();
      }
    };

    window.addEventListener('focus', onVisibilityOrFocus);
    document.addEventListener('visibilitychange', onVisibilityOrFocus);

    return () => {
      timers.forEach((timerId) => clearTimeout(timerId));
      clearInterval(interval);
      window.removeEventListener('focus', onVisibilityOrFocus);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
    };
  }, [
    events,
    favoriteEventIds,
    notificationsEnabled,
    notificationPermission,
    language,
    refreshNotificationPermission,
  ]);

  return (
    <AppContext.Provider
      value={{
        currentPage,
        setCurrentPage,
        hasEnteredPlatform,
        enterPlatform,
        currentUser,
        setCurrentUser,
        selectedEventSlug,
        setSelectedEventSlug,
        events,
        featuredEvent,
        saveEvent,
        deleteEvent,
        news,
        archives,
        saveArchive,
        deleteArchive,
        refreshArchives,
        refreshEvents,
        customerOrders,
        refreshCustomerOrders,
        addLocalOrder,
        isAuthModalOpen,
        setIsAuthModalOpen,
        checkoutEvent,
        setCheckoutEvent,
        searchQuery,
        setSearchQuery,
        toast,
        showToast,
        platformSettings,
        updatePlatformSettings,
        language,
        setLanguage,
        t,
        favoriteEventIds,
        toggleFavoriteEvent,
        isFavoriteEvent,
        notificationsEnabled,
        setNotificationsEnabled,
        notificationPermission,
        refreshNotificationPermission,
        requestNotificationPermission,
        notifiedEventIds,
        sendTestNotification,
        isLoadingEvents,
        isLoadingOrders,
        isCloudDbActive,
        cloudSyncError,
        connectSupabaseDirectly,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};