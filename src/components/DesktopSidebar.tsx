import React from 'react';
import { useApp, PageView } from '../context/AppContext';
import {
  Archive,
  Camera,
  Clapperboard,
  CreditCard,
  Gift,
  Home,
  Mic2,
  Settings,
  Ticket,
  UserRound,
} from 'lucide-react';

/** Navigation desktop LUMARÉEL: sidebar fixe organisée en Principal + Club LUMARÉEL. */
export const DesktopSidebar: React.FC = () => {
  const { currentPage, setCurrentPage, platformSettings, language, setLanguage, t } = useApp();
  if (['splash', 'gate_scanner', 'admin'].includes(currentPage)) return null;

  const isEn = language === 'en';

  const mainItems: Array<{
    label: string;
    page: PageView;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number; fill?: string; className?: string }>;
  }> = [
    { label: t('nav.home'), page: 'home', icon: Home },
    { label: t('nav.orders'), page: 'client_space', icon: Ticket },
    { label: 'LUMARÉEL Black Card', page: 'member_card', icon: CreditCard },
    { label: t('nav.account'), page: 'profile', icon: UserRound },
  ];

  const clubItems: Array<{
    label: string;
    page: PageView;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  }> = [
    { label: isEn ? 'Gifts, Points & Referrals' : 'Gifts, Points & Parrainage', page: 'rewards', icon: Gift },
    { label: 'Backstage', page: 'backstage', icon: Clapperboard },
    { label: isEn ? 'My Moments' : 'Mes Moments', page: 'memories', icon: Camera },
    { label: isEn ? 'Your Voice' : 'Ta Voix', page: 'suggestions', icon: Mic2 },
    { label: t('nav.archives'), page: 'archive', icon: Archive },
  ];

  const go = (page: PageView) => setCurrentPage(page);

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-[244px] flex-col overflow-y-auto border-r border-[#dbdbdb] bg-white px-3 pb-5 pt-6 text-[#262626] dark:border-[#262626] dark:bg-black dark:text-white">
      <button
        type="button"
        onClick={() => go('home')}
        aria-label={`LUMARÉEL ${t('nav.home')}`}
        className="mb-6 flex h-12 shrink-0 items-center px-3 cursor-pointer"
      >
        <img
          src="/assets/logo-lumareel.png"
          alt={platformSettings.platformName || 'LUMARÉEL'}
          className="h-8 w-auto object-contain"
        />
      </button>

      <nav className="flex flex-col gap-0.5">
        {mainItems.map(({ label, page, icon: Icon }) => {
          const active =
            currentPage === page ||
            (page === 'home' && currentPage === 'discover') ||
            (page === 'member_card' && currentPage === 'card');
          return (
            <button
              key={page}
              type="button"
              onClick={() => go(page)}
              aria-current={active ? 'page' : undefined}
              className={`group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] leading-snug transition-colors hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] cursor-pointer ${
                active ? 'font-bold text-[#D4AF37]' : ''
              }`}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.4 : 1.85}
                fill={active && page === 'home' ? 'currentColor' : 'none'}
                className="shrink-0 transition-transform group-hover:scale-105"
              />
              <span className="min-w-0 truncate">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-5 pt-4 border-t border-white/10">
        <div className="px-3 pb-2 text-[10px] font-agrandir-bold uppercase tracking-[0.18em] text-neutral-500">
          {isEn ? 'LUMARÉEL Club' : 'Club LUMARÉEL'}
        </div>
        <nav className="flex flex-col gap-0.5">
          {clubItems.map(({ label, page, icon: Icon }) => {
            const active =
              currentPage === page || (page === 'rewards' && currentPage === 'flash_drops');
            return (
              <button
                key={page}
                type="button"
                onClick={() => go(page)}
                aria-current={active ? 'page' : undefined}
                className={`group flex min-h-10 items-center gap-3 rounded-lg px-3 py-1.5 text-left text-[13.5px] leading-snug transition-colors hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] cursor-pointer ${
                  active ? 'font-bold text-[#D4AF37]' : 'text-neutral-300'
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={active ? 2.3 : 1.8}
                  className="shrink-0 transition-transform group-hover:scale-105"
                />
                <span className="min-w-0 truncate">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs text-neutral-500">{isEn ? 'Language' : 'Langue'}</span>
          <div className="flex items-center p-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-agrandir-bold">
            <button
              type="button"
              onClick={() => setLanguage('fr')}
              className={`px-2.5 py-0.5 rounded-full cursor-pointer transition-colors ${
                language === 'fr' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-0.5 rounded-full cursor-pointer transition-colors ${
                language === 'en' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => go('profile')}
          className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-neutral-500 hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] cursor-pointer"
        >
          <Settings size={18} />
          <span className="truncate">{t('nav.accountSettings')}</span>
        </button>
      </div>
    </aside>
  );
};
