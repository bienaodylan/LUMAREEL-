import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User, ConcertEvent, Order, Ticket, ArchiveProduction, PlatformSettings } from '../types';
import { INITIAL_EVENTS, INITIAL_NEWS, INITIAL_ORDERS, INITIAL_ARCHIVES } from '../data/initialData';
import { convertToYouTubeEmbed } from '../utils/mediaUtils';
import { supabase, isSupabaseConfigured, configureSupabase, testSupabaseConnection } from '../lib/supabaseClient';

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
  logoUrl: '',
  currency: 'XOF (FCFA)',
  infoline: '+225 01 53 508 210',
  gateToken: 'VIGILE_AUTH_LMR_2026',
  githubRepoUrl: '',
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
    categories: event.categories || [],
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
    }
    return 'home';
  });

  const [selectedEventSlug, setSelectedEventSlug] = useState<string | null>(null);

  // Données initialisées en mémoire (AUCUN localStorage)
  const [events, setEvents] = useState<ConcertEvent[]>(INITIAL_EVENTS);
  const [featuredEvent, setFeaturedEvent] = useState<ConcertEvent | null>(INITIAL_EVENTS[0] || null);
  const [news, setNews] = useState<any[]>(INITIAL_NEWS);
  const [archives, setArchives] = useState<ArchiveProduction[]>(INITIAL_ARCHIVES);
  const [customerOrders, setCustomerOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);

  // Modals & Navigation
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [checkoutEvent, setCheckoutEvent] = useState<ConcertEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

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

  // Utilisateur connecté par défaut (Super Administrateur)
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: 'usr_admin_dylan',
    email: 'bienaodylan428@gmail.com',
    name: 'Dylan B.',
    role: 'super_admin',
    emailVerified: true,
    createdAt: '2026-01-10T00:00:00Z',
  });

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
    // Cache check : ne pas requêter si le cache est encore frais (sauf force refresh)
    if (!force && now - cacheTimestamps.current.events < CACHE_TTL_MS.events && events.length > 0) {
      return;
    }

    // Requête déjà en cours : mutualisation pour éviter les requêtes doublons
    if (inFlightPromises.current.events) {
      return inFlightPromises.current.events;
    }

    const fetchTask = async () => {
      setIsLoadingEvents(true);
      try {
        if (isSupabaseConfigured) {
          // Requête directe PostgreSQL haute performance via le Connection Pooler Supabase
          const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('date', { ascending: true });

          if (error) {
            console.warn('[Supabase] Erreur lecture events:', error.message);
            setCloudSyncError(`Supabase: ${error.message}`);
            // Fallback vers l'API Express si configurée
            await fetchEventsFromBackend();
          } else if (data && data.length > 0) {
            const mapped = data.map(mapDbRowToEvent);
            setEvents(mapped);
            const feat = mapped.find((e) => e.isFeatured) || mapped[0];
            setFeaturedEvent(feat || null);
            cacheTimestamps.current.events = Date.now();
            setIsCloudDbActive(true);
            setCloudSyncError(null);
          } else {
            // Table vide : tentative de seeding initial
            await seedInitialEventsToSupabase();
          }
        } else {
          // Supabase non configuré pour le moment : requête l'API Express
          await fetchEventsFromBackend();
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

  const fetchEventsFromBackend = async () => {
    try {
      const res = await fetch('/api/events');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.events && data.events.length > 0) {
        setEvents(data.events);
        const feat = data.events.find((e: ConcertEvent) => e.isFeatured) || data.events[0];
        setFeaturedEvent(feat || null);
        cacheTimestamps.current.events = Date.now();
      }
    } catch {}
  };

  const seedInitialEventsToSupabase = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const rows = INITIAL_EVENTS.map(mapEventToDbRow);
      const { error } = await supabase.from('events').upsert(rows, { onConflict: 'id' });
      if (!error) {
        setEvents(INITIAL_EVENTS);
        setFeaturedEvent(INITIAL_EVENTS[0]);
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
    // 1. Mise à jour instantanée de l'état React pour fluidité totale
    setEvents((prev) => {
      const exists = prev.some((e) => e.id === updatedEvent.id);
      return exists
        ? prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e))
        : [updatedEvent, ...prev];
    });

    if (updatedEvent.isFeatured) {
      setFeaturedEvent(updatedEvent);
    }

    // Invalide le cache local
    cacheTimestamps.current.events = 0;

    // 2. Persistance dans la base Supabase Cloud (PostgreSQL)
    if (isSupabaseConfigured) {
      try {
        const dbRow = mapEventToDbRow(updatedEvent);
        const { error } = await supabase.from('events').upsert(dbRow, { onConflict: 'id' });
        if (error) {
          throw new Error(error.message);
        }
        showToast('Événement synchronisé dans la base Cloud Supabase.', 'success');
      } catch (err: any) {
        console.error('[Supabase Save Event Error]', err);
        showToast(`Erreur Cloud Supabase: ${err.message}`, 'error');
      }
    }

    // 3. Persistance de secours sur le backend Node.js
    try {
      await fetch(`/api/events/${updatedEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEvent),
      });
    } catch {}

    // Notifie immédiatement les autres onglets ouverts (Aperçu Google AI Studio <-> Onglet Externe)
    notifyCrossTabSync();
  };

  const deleteEvent = async (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    cacheTimestamps.current.events = 0;

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('events').delete().eq('id', eventId);
        if (error) throw new Error(error.message);
        showToast('Événement supprimé de la base Cloud.', 'info');
      } catch (err: any) {
        showToast(`Erreur suppression Cloud: ${err.message}`, 'error');
      }
    }

    try {
      await fetch(`/api/events/${eventId}`, { method: 'DELETE' });
    } catch {}

    notifyCrossTabSync();
  };

  // ============================================================================
  // 2. GESTION DES ARCHIVES & MÉMOIRE D'ESSAI (SUPABASE CLOUD)
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
        if (isSupabaseConfigured) {
          const { data, error } = await supabase
            .from('archives')
            .select('*')
            .order('order_index', { ascending: true });

          if (!error && data && data.length > 0) {
            setArchives(data.map(mapDbRowToArchive));
            cacheTimestamps.current.archives = Date.now();
          } else {
            await fetchArchivesFromBackend();
          }
        } else {
          await fetchArchivesFromBackend();
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

  const fetchArchivesFromBackend = async () => {
    try {
      const res = await fetch('/api/archives');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.archives && data.archives.length > 0) {
        setArchives(data.archives);
        cacheTimestamps.current.archives = Date.now();
      }
    } catch {}
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

    setArchives((prev) => [newArchive, ...prev.filter((a) => a.id !== id)]);
    cacheTimestamps.current.archives = 0;

    if (isSupabaseConfigured) {
      try {
        const row = mapArchiveToDbRow(newArchive);
        await supabase.from('archives').upsert(row, { onConflict: 'id' });
        showToast('Archive enregistrée dans le Cloud.', 'success');
      } catch (e: any) {
        console.warn('Supabase archive save warning:', e.message);
      }
    }

    try {
      await fetch('/api/archives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newArchive),
      });
    } catch {}

    notifyCrossTabSync();
  };

  const deleteArchive = async (id: string) => {
    setArchives((prev) => prev.filter((a) => a.id !== id));
    cacheTimestamps.current.archives = 0;

    if (isSupabaseConfigured) {
      try {
        await supabase.from('archives').delete().eq('id', id);
        showToast('Archive supprimée du Cloud.', 'info');
      } catch {}
    }

    try {
      await fetch(`/api/archives/${id}`, { method: 'DELETE' });
    } catch {}

    notifyCrossTabSync();
  };

  // ============================================================================
  // 3. GESTION DES COMMANDES & BILLETS (SUPABASE POSTGRESQL MULTI-UTILISATEURS)
  // ============================================================================

  const refreshCustomerOrders = useCallback(async () => {
    if (!currentUser?.email) return;

    const email = currentUser.email.toLowerCase().trim();
    setIsLoadingOrders(true);

    try {
      if (isSupabaseConfigured) {
        // Requête indexée par B-Tree sur customer_email (O(log N), < 5ms)
        const { data: ordersData, error: ordersErr } = await supabase
          .from('orders')
          .select('*')
          .ilike('customer_email', email)
          .order('created_at', { ascending: false });

        if (!ordersErr && ordersData && ordersData.length > 0) {
          // Récupère les billets associés pour chaque commande
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
              currency: row.currency || 'XOF',
              paymentStatus: row.payment_status || 'completed',
              paymentProvider: row.payment_provider || 'geniuspay',
              paymentRef: row.payment_ref,
              createdAt: row.created_at,
              paidAt: row.paid_at,
              tickets: mappedTickets,
            };
          });

          setCustomerOrders(formattedOrders);
          cacheTimestamps.current.orders = Date.now();
        } else {
          await fetchCustomerOrdersFromBackend(email);
        }
      } else {
        await fetchCustomerOrdersFromBackend(email);
      }
    } catch (err) {
      console.warn('[Orders] Fetch error:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [currentUser?.email]);

  const fetchCustomerOrdersFromBackend = async (email: string) => {
    try {
      const res = await fetch(`/api/customer/orders?email=${encodeURIComponent(email)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.orders) {
        setCustomerOrders(data.orders);
      }
    } catch {}
  };

  const addLocalOrder = async (newOrder: Order) => {
    // 1. Mise à jour instantanée de l'état mémoire
    setCustomerOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);

    // 2. Écriture sécurisée dans Supabase Cloud
    if (isSupabaseConfigured) {
      try {
        // Enregistre la commande
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

        // Enregistre les billets individuels avec leurs tokens cryptographiques
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

          const { error: tktErr } = await supabase.from('tickets').upsert(ticketRows, { onConflict: 'id' });
          if (tktErr) console.warn('Supabase tickets error:', tktErr.message);
        }

        showToast('Commande et billets enregistrés dans la base centrale Supabase !', 'success');
      } catch (err: any) {
        console.error('[Supabase Order Insert Error]', err);
      }
    }

    // 3. Envoi au backend Express pour persistance miroir
    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
      });
    } catch {}
  };

  // ============================================================================
  // 4. RÉGLAGES DE LA PLATEFORME (LOGO, MONOGRAMME, DEVISE DANS LE CLOUD)
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
        if (isSupabaseConfigured) {
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
              currency: data.currency || 'XOF (FCFA)',
              infoline: data.infoline || '+225 01 53 508 210',
              gateToken: data.gate_token || 'VIGILE_AUTH_LMR_2026',
              githubRepoUrl: data.github_repo_url || '',
            });
            cacheTimestamps.current.settings = Date.now();
          } else {
            await fetchSettingsFromBackend();
          }
        } else {
          await fetchSettingsFromBackend();
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

  const fetchSettingsFromBackend = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.settings) {
        setPlatformSettings((prev) => ({ ...prev, ...data.settings }));
        cacheTimestamps.current.settings = Date.now();

        // Si des identifiants Supabase sont trouvés dans les paramètres, les configurer automatiquement
        if (data.settings.supabaseUrl && data.settings.supabaseAnonKey && !isSupabaseConfigured) {
          configureSupabase(data.settings.supabaseUrl, data.settings.supabaseAnonKey);
          setIsCloudDbActive(true);
        }
      }
    } catch {}
  };

  const updatePlatformSettings = async (newSettings: Partial<PlatformSettings>) => {
    setPlatformSettings((prev) => ({ ...prev, ...newSettings }));
    cacheTimestamps.current.settings = 0;

    if (isSupabaseConfigured) {
      try {
        const dbRow = {
          id: 1,
          platform_name: newSettings.platformName ?? platformSettings.platformName,
          tagline: newSettings.tagline ?? platformSettings.tagline,
          logo_monogram: newSettings.logoMonogram ?? platformSettings.logoMonogram,
          logo_url: newSettings.logoUrl ?? platformSettings.logoUrl,
          currency: newSettings.currency ?? platformSettings.currency,
          infoline: newSettings.infoline ?? platformSettings.infoline,
          gate_token: newSettings.gateToken ?? platformSettings.gateToken,
          github_repo_url: newSettings.githubRepoUrl ?? platformSettings.githubRepoUrl,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('platform_settings').upsert(dbRow, { onConflict: 'id' });
        if (error) throw new Error(error.message);
        showToast('Identité et paramètres sauvegardés dans le Cloud Supabase.', 'success');
      } catch (err: any) {
        showToast(`Erreur sauvegarde Cloud: ${err.message}`, 'error');
      }
    }

    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
    } catch {}

    notifyCrossTabSync();
  };

  // Connexion directe à Supabase en 1 clic
  const connectSupabaseDirectly = async (url: string, key: string) => {
    const cleanUrl = url.trim();
    const cleanKey = key.trim();

    try {
      const res = await fetch('/api/admin/supabase-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabaseUrl: cleanUrl, supabaseAnonKey: cleanKey }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur enregistrement config');
      }

      // Reconfigure le client Supabase en mémoire
      configureSupabase(cleanUrl, cleanKey);
      setIsCloudDbActive(true);

      // Mesure de latence
      const diag = await testSupabaseConnection(cleanUrl, cleanKey);

      // Seeding des concerts initiaux si besoin
      await seedInitialEventsToSupabase();

      // Recharge tous les états
      await refreshEvents(true);
      await refreshArchives(true);
      await refreshPlatformSettings(true);

      notifyCrossTabSync();

      return {
        success: true,
        message: `Base Supabase connectée avec succès ! (${diag.latencyMs}ms)`,
        latencyMs: diag.latencyMs,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Échec de connexion Supabase.',
      };
    }
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
