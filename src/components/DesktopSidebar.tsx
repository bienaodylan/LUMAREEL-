import React from 'react';
import { useApp, PageView } from '../context/AppContext';
import { Home, Ticket, Compass, CreditCard, User } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Barre latérale desktop alignée sur les 5 accès principaux des maquettes :
 * 1. Accueil  2. Billets  3. Explorer  4. Black Card  5. Compte
 */
export const DesktopSidebar: React.FC = () => {
  const { currentPage, setCurrentPage, language, setLanguage, currentUser } = useApp();

  if (['splash', 'gate_scanner', 'admin'].includes(currentPage)) {
    return null;
  }

  const isEn = language === 'en';

  const items: Array<{
    id: string;
    label: string;
    page: PageView;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
    active: boolean;
  }> = [
    {
      id: 'home',
      label: isEn ? 'Home' : 'Accueil',
      page: 'home',
      icon: Home,
      active: currentPage === 'home' || currentPage === 'discover',
    },
    {
      id: 'tickets',
      label: isEn ? 'Tickets' : 'Billets',
      page: 'client_space',
      icon: Ticket,
      active: currentPage === 'client_space',
    },
    {
      id: 'explore',
      label: isEn ? 'Explore' : 'Explorer',
      page: 'explore',
      icon: Compass,
      active: [
        'explore',
        'concert_detail',
        'backstage',
        'media_detail',
        'memories',
        'archive',
        'rewards',
        'flash_drops',
        'suggestions',
        'organizers',
        'news',
      ].includes(currentPage),
    },
    {
      id: 'black_card',
      label: 'Black Card',
      page: 'member_card',
      icon: CreditCard,
      active: ['member_card', 'card', 'card_verify'].includes(currentPage),
    },
    {
      id: 'account',
      label: isEn ? 'Account' : 'Compte',
      page: 'profile',
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

  const userInitial =
    currentUser?.name?.trim()?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase();

  return (
    <aside
      aria-label={isEn ? 'Desktop navigation' : 'Navigation principale'}
      className="fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r border-white/[0.08] bg-[#050505] px-4 pb-6 pt-7 text-white md:flex"
    >
      <button
        type="button"
        onClick={() => setCurrentPage('home')}
        aria-label={`LUMARÉEL — ${isEn ? 'Home' : 'Accueil'}`}
        className="mb-10 flex h-10 shrink-0 items-center px-2.5 cursor-pointer focus:outline-none text-left"
      >
        <span className="font-agrandir-extrabold text-sm tracking-[0.34em] text-white whitespace-nowrap">
          LUMARÉEL
        </span>
      </button>

      <nav className="space-y-1.5">
        {items.map(({ id, label, page, icon: Icon, active }) => (
          <button
            key={id}
            type="button"
            onClick={() => setCurrentPage(page)}
            aria-current={active ? 'page' : undefined}
            className={`relative group flex min-h-[44px] w-full items-center gap-3 rounded-full px-4 text-left text-[13px] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9B36C]/50 ${
              active
                ? 'font-agrandir-extrabold text-black'
                : 'text-neutral-400 hover:bg-white/[0.04] hover:text-white font-agrandir-regular'
            }`}
          >
            {active && (
              <motion.span
                layoutId="lumareel-desktop-nav-pill"
                transition={{ type: 'spring', stiffness: 460, damping: 36, mass: 0.78 }}
                className="absolute inset-0 rounded-full bg-[#D9B36C]"
              />
            )}
            <Icon
              size={18}
              strokeWidth={active ? 2.1 : 1.75}
              className={`relative z-10 transition-colors ${
                active ? 'text-black' : 'text-neutral-400 group-hover:text-white'
              }`}
            />
            <span className="relative z-10 min-w-0 flex-1 truncate whitespace-nowrap">{label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto space-y-4 border-t border-white/[0.08] pt-5">
        {currentUser && (
          <button
            type="button"
            onClick={() => setCurrentPage('profile')}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D9B36C]/15 border border-[#D9B36C]/40 text-xs font-agrandir-extrabold text-[#D9B36C]">
              {userInitial}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-agrandir-semibold text-white">
                {currentUser.name || currentUser.email.split('@')[0]}
              </span>
              <span className="block truncate text-[10px] text-neutral-500">
                {currentUser.email}
              </span>
            </span>
          </button>
        )}

        <div className="flex items-center justify-between px-2">
          <span className="text-[11px] text-neutral-500">{isEn ? 'Language' : 'Langue'}</span>
          <div className="flex items-center rounded-lg bg-[#101010] border border-white/[0.08] p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setLanguage('fr')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                language === 'fr'
                  ? 'bg-[#D9B36C] text-black font-agrandir-extrabold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                language === 'en'
                  ? 'bg-[#D9B36C] text-black font-agrandir-extrabold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
