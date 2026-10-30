import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, ConcertEvent, Order, Ticket, ArchiveProduction, PlatformSettings } from '../types';
import { INITIAL_EVENTS, INITIAL_NEWS, INITIAL_ORDERS, INITIAL_ARCHIVES } from '../data/initialData';
import { convertToYouTubeEmbed } from '../utils/mediaUtils';

export type PageView = 'splash' | 'home' | 'discover' | 'concert_detail' | 'archive' | 'news' | 'client_space' | 'profile' | 'organizers' | 'gate_scanner' | 'admin' | 'contact' | 'about' | 'partners';

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
  refreshArchives: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  customerOrders: Order[];
  refreshCustomerOrders: () => Promise<void>;
  addLocalOrder: (order: Order) => void;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

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
  const [events, setEvents] = useState<ConcertEvent[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lumareel_events');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.warn('Could not read events from localStorage', e);
      }
    }
    return INITIAL_EVENTS;
  });
  const [featuredEvent, setFeaturedEvent] = useState<ConcertEvent | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lumareel_events');
        if (saved) {
          const parsed: ConcertEvent[] = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.find((e) => e.isFeatured) || parsed[0];
          }
        }
      } catch {}
    }
    return INITIAL_EVENTS[0] || null;
  });
  const [news, setNews] = useState<any[]>(INITIAL_NEWS);
  const [archives, setArchives] = useState<ArchiveProduction[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lumareel_archives');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('Could not read archives from localStorage', e);
      }
    }
    return INITIAL_ARCHIVES;
  });
  const [customerOrders, setCustomerOrders] = useState<Order[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lumareel_orders');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('Could not read saved orders from localStorage', e);
      }
    }
    return INITIAL_ORDERS;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [checkoutEvent, setCheckoutEvent] = useState<ConcertEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

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

  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lumareel_platform_settings');
        if (saved) return { ...DEFAULT_PLATFORM_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        console.warn('Could not read settings from localStorage', e);
      }
    }
    return DEFAULT_PLATFORM_SETTINGS;
  });

  const enterPlatform = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('lumareel_entered', 'true');
    }
    setHasEnteredPlatform(true);
    setCurrentPage('home');
  };

  // Utilisateur connecté par défaut : Dylan B. (bienaodylan428@gmail.com) en tant que Super Administrateur
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: 'usr_admin_dylan',
    email: 'bienaodylan428@gmail.com',
    name: 'Dylan B.',
    role: 'super_admin',
    emailVerified: true,
    createdAt: '2026-01-10T00:00:00Z',
  });

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const addLocalOrder = (newOrder: Order) => {
    setCustomerOrders((prev) => {
      const updated = [newOrder, ...prev.filter((o) => o.id !== newOrder.id)];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('lumareel_orders', JSON.stringify(updated));
        } catch (e) {
          console.warn('LocalStorage error', e);
        }
      }
      return updated;
    });
  };

  const refreshEvents = async () => {
    try {
      const res = await fetch('/api/events');
      if (!res.ok) return;
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) return;
      const data = await res.json();
      if (data.success && data.events && data.events.length > 0) {
        setEvents(data.events);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('lumareel_events', JSON.stringify(data.events));
          } catch (e) {
            console.warn('LocalStorage save error', e);
          }
        }
        const feat = data.events.find((e: ConcertEvent) => e.isFeatured) || data.events[0];
        setFeaturedEvent(feat || null);
      }
    } catch (err) {
      console.warn('API /api/events unreachable, using local storage/initial events', err);
    }
  };

  const saveEvent = async (updatedEvent: ConcertEvent) => {
    // 1. Immediate local state & localStorage update for instant public reflection
    setEvents((prev) => {
      const exists = prev.some((e) => e.id === updatedEvent.id);
      const updated = exists
        ? prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e))
        : [updatedEvent, ...prev];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('lumareel_events', JSON.stringify(updated));
        } catch (e) {
          console.warn('LocalStorage save error', e);
        }
      }
      return updated;
    });

    if (updatedEvent.isFeatured) {
      setFeaturedEvent(updatedEvent);
    }

    // 2. Persist to Express backend / disk storage
    try {
      const res = await fetch(`/api/events/${updatedEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEvent),
      });
      if (!res.ok) {
        await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedEvent),
        });
      }
      await refreshEvents();
    } catch (err) {
      console.warn('Network save error, local changes kept safe', err);
    }
  };

  const deleteEvent = async (eventId: string) => {
    // 1. Immediate local state & localStorage update
    setEvents((prev) => {
      const updated = prev.filter((e) => e.id !== eventId);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('lumareel_events', JSON.stringify(updated));
        } catch (e) {
          console.warn('LocalStorage delete error', e);
        }
      }
      return updated;
    });

    // 2. Persist to Express backend / disk storage
    try {
      await fetch(`/api/events/${eventId}`, { method: 'DELETE' });
      await refreshEvents();
    } catch (err) {
      console.warn('Network delete error, local state updated', err);
    }
  };

  const refreshCustomerOrders = async () => {
    if (!currentUser?.email) return;
    try {
      const res = await fetch(`/api/customer/orders?email=${encodeURIComponent(currentUser.email)}`);
      if (!res.ok) return;
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) return;
      const data = await res.json();
      if (data.success && data.orders && data.orders.length > 0) {
        setCustomerOrders(data.orders);
        if (typeof window !== 'undefined') {
          localStorage.setItem('lumareel_orders', JSON.stringify(data.orders));
        }
      }
    } catch (err) {
      console.warn('API /api/customer/orders unreachable, preserving local orders', err);
    }
  };

  const refreshNews = async () => {
    try {
      const res = await fetch('/api/news');
      if (!res.ok) return;
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) return;
      const data = await res.json();
      if (data.success && data.news && data.news.length > 0) {
        setNews(data.news);
      }
    } catch (err) {
      console.warn('API /api/news unreachable, preserving initial news', err);
    }
  };

  const refreshArchives = async () => {
    try {
      const res = await fetch('/api/archives');
      if (!res.ok) return;
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) return;
      const data = await res.json();
      if (data.success && data.archives && data.archives.length > 0) {
        setArchives(data.archives);
        if (typeof window !== 'undefined') {
          localStorage.setItem('lumareel_archives', JSON.stringify(data.archives));
        }
      }
    } catch (err) {
      console.warn('API /api/archives unreachable, preserving local archives', err);
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

    setArchives((prev) => {
      const filtered = prev.filter((a) => a.id !== id);
      const updated = [newArchive, ...filtered];
      if (typeof window !== 'undefined') {
        localStorage.setItem('lumareel_archives', JSON.stringify(updated));
      }
      return updated;
    });

    try {
      const res = await fetch('/api/archives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newArchive),
      });
      if (res.ok) {
        await refreshArchives();
      }
    } catch (err) {
      console.warn('Failed to save archive on server', err);
    }
  };

  const deleteArchive = async (id: string) => {
    setArchives((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('lumareel_archives', JSON.stringify(updated));
      }
      return updated;
    });

    try {
      const res = await fetch(`/api/archives/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await refreshArchives();
      }
    } catch (err) {
      console.warn('Failed to delete archive on server', err);
    }
  };

  const refreshPlatformSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (!res.ok) return;
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) return;
      const data = await res.json();
      if (data.success && data.settings) {
        setPlatformSettings((prev) => ({ ...prev, ...data.settings }));
        if (typeof window !== 'undefined') {
          localStorage.setItem('lumareel_platform_settings', JSON.stringify(data.settings));
        }
      }
    } catch (err) {
      console.warn('API /api/admin/settings unreachable, preserving local settings', err);
    }
  };

  const updatePlatformSettings = async (newSettings: Partial<PlatformSettings>) => {
    // 1. Instant local update
    setPlatformSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('lumareel_platform_settings', JSON.stringify(updated));
        } catch (e) {
          console.warn('LocalStorage save error', e);
        }
      }
      return updated;
    });

    // 2. Persist to Express backend / disk
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      await refreshPlatformSettings();
    } catch (err) {
      console.warn('Server settings save warning', err);
    }
  };

  useEffect(() => {
    refreshEvents();
    refreshNews();
    refreshArchives();
    refreshPlatformSettings();
  }, []);

  useEffect(() => {
    if (currentUser?.email) {
      refreshCustomerOrders();
    }
  }, [currentUser]);

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
