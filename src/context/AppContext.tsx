import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, ConcertEvent, Order, Ticket } from '../types';
import { INITIAL_EVENTS, INITIAL_NEWS, INITIAL_ORDERS } from '../data/initialData';

export type PageView = 'splash' | 'home' | 'discover' | 'concert_detail' | 'archive' | 'news' | 'client_space' | 'organizers' | 'gate_scanner' | 'admin' | 'contact' | 'about' | 'partners';

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
  news: any[];
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasEnteredPlatform, setHasEnteredPlatform] = useState<boolean>(() => {
    return typeof window !== 'undefined' && sessionStorage.getItem('lumareel_entered') === 'true';
  });
  const [currentPage, setCurrentPage] = useState<PageView>(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('lumareel_entered') === 'true') {
      return 'home';
    }
    return 'splash';
  });
  const [selectedEventSlug, setSelectedEventSlug] = useState<string | null>(null);
  const [events, setEvents] = useState<ConcertEvent[]>(INITIAL_EVENTS);
  const [featuredEvent, setFeaturedEvent] = useState<ConcertEvent | null>(INITIAL_EVENTS[0] || null);
  const [news, setNews] = useState<any[]>(INITIAL_NEWS);
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

  const enterPlatform = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('lumareel_entered', 'true');
    }
    setHasEnteredPlatform(true);
    setCurrentPage('home');
  };

  // Default demo user (can switch in UI to admin, agent, or customer)
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: 'usr_client_01',
    email: 'bienaodylan428@gmail.com',
    name: 'Alexandre V.',
    role: 'customer',
    emailVerified: true,
    createdAt: '2026-03-01T00:00:00Z',
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
        const feat = data.events.find((e: ConcertEvent) => e.isFeatured) || data.events[0];
        setFeaturedEvent(feat || null);
      }
    } catch (err) {
      // Gracefully preserve initial events in static environments (e.g., Vercel)
      console.warn('API /api/events unreachable, using initial events', err);
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

  useEffect(() => {
    refreshEvents();
    refreshNews();
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
        news,
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
