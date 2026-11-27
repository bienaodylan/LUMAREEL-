import React from 'react';
import { useApp, PageView } from '../context/AppContext';
import { Home, Ticket, Compass, CreditCard, User } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Navigation mobile flottante LUMARÉEL — 5 accès principaux :
 * Accueil · Billets · Explorer · Black Card · Compte
 * Hauteur 64px, marges 16px, fond rgba(16,16,16,0.94), capsule active #D4AF6A.
 */
export const FloatingAppNavbar: React.FC = () => {
  const { currentPage, setCurrentPage, language, hideBottomNav } = useApp();

  if (hideBottomNav || ['splash', 'gate_scanner', 'admin', 'booking'].includes(currentPage)) {
    return null;
  }

  const isEn = language === 'en';

  const items: Array<{
    id: string;
    page: PageView;
    label: string;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
    active: boolean;
  }> = [
    {
      id: 'home',
      page: 'home',
      label: isEn ? 'Home' : 'Accueil',
      icon: Home,
      active: currentPage === 'home' || currentPage === 'discover',
    },
    {
      id: 'tickets',
      page: 'client_space',
      label: isEn ? 'Tickets' : 'Billets',
      icon: Ticket,
      active: currentPage === 'client_space',
    },
    {
      id: 'explore',
      page: 'explore',
      label: isEn ? 'Explore' : 'Explorer',
      icon: Compass,
      active: [
        'explore',
        'discover_detail',
        'backstage',
        'media_detail',
        'memories',
        'archive',
        'privileged_access',
        'flash_drops',
        'suggestions',
        'organizers',
      ].includes(currentPage),
    },
    {
      id: 'black_card',
      page: 'member_card',
      label: 'Black Card',
      icon: CreditCard,
      active: ['member_card', 'card', 'card_verify', 'rewards'].includes(currentPage),
    },
    {
      id: 'account',
      page: 'profile',
      label: isEn ? 'Account' : 'Compte',
      icon: User,
      active: [
        'profile',
        'contact',
        'contributor_studio',
        'about',
        'partners',
      ].includes(currentPage),
    },
  ];

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[70] md:hidden pointer-events-none px-4"
      style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}
    >
      <nav
        aria-label={isEn ? 'Primary navigation' : 'Navigation principale'}
        className="pointer-events-auto mx-auto w-full max-w-[396px] h-[64px] rounded-full border border-white/[0.12] bg-[rgba(16,16,16,0.94)] backdrop-blur-2xl shadow-[0_18px_48px_rgba(0,0,0,0.9)] px-2 flex items-center"
      >
        <div className="flex items-center justify-between gap-1 w-full">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentPage(item.page)}
                aria-label={item.label}
                aria-current={item.active ? 'page' : undefined}
                className={`relative flex items-center justify-center gap-2 h-[48px] rounded-full transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF6A]/70 ${
                  item.active
                    ? 'px-4 text-black shrink-0'
                    : 'min-w-[44px] flex-1 text-white/75 hover:text-white'
                }`}
              >
                {item.active && (
                  <motion.span
                    layoutId="lumareel-mobile-gold-capsule"
                    transition={{ type: 'spring', stiffness: 430, damping: 34, mass: 0.8 }}
                    className="absolute inset-0 rounded-full bg-[#D4AF6A]"
                  />
                )}
                <Icon
                  size={18}
                  strokeWidth={1.6}
                  className="relative z-10 shrink-0"
                />
                {item.active && (
                  <span className="relative z-10 text-xs font-agrandir-extrabold tracking-tight whitespace-nowrap leading-none">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
