import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, ConcertEvent, Order, Ticket } from '../types';

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
  const [events, setEvents] = useState<ConcertEvent[]>([]);
  const [featuredEvent, setFeaturedEvent] = useState<ConcertEvent | null>(null);
  const [news, setNews] = useState<any[]>([]);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
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
    email: 'collecteur@lumareel.co',
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

  const refreshEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (data.success && data.events) {
        setEvents(data.events);
        const feat = data.events.find((e: ConcertEvent) => e.isFeatured) || data.events[0];
        setFeaturedEvent(feat || null);
      }
    } catch (err) {
      console.error('Failed to load events', err);
    }
  };

  const refreshCustomerOrders = async () => {
    if (!currentUser?.email) return;
    try {
      const res = await fetch(`/api/customer/orders?email=${encodeURIComponent(currentUser.email)}`);
      const data = await res.json();
      if (data.success && data.orders) {
        setCustomerOrders(data.orders);
      }
    } catch (err) {
      console.error('Failed to load orders', err);
    }
  };

  const refreshNews = async () => {
    try {
      const res = await fetch('/api/news');
      const data = await res.json();
      if (data.success && data.news) {
        setNews(data.news);
      }
    } catch (err) {
      console.error('Failed to load news', err);
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
