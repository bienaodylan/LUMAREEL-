import React from 'react';
import { useApp, PageView } from '../context/AppContext';
import {
  Camera,
  Clapperboard,
  CreditCard,
  Gift,
  Home,
  Mic2,
  Moon,
  Settings,
  Sun,
  Ticket,
  UserRound,
} from 'lucide-react';

/** Navigation desktop LUMARÉEL: sidebar fixe organisée en Principal + Club LUMARÉEL + Mode & Langue en bas. */
export const DesktopSidebar: React.FC = () => {
  const { currentPage, setCurrentPage, platformSettings, language, setLanguage, theme, setTheme, t } = useApp();
  if (['splash', 'gate_scanner', 'admin'].includes(currentPage)) return null;

  const isEn = language === 'en';

  const mainItems: Array<{
    label: string;
    page: PageView;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number; fill?: string; className?: string }>;
  }> = [
    { label: t('nav.home'), page: 'home', icon: Home },
    { label: isEn ? 'My tickets' : 'Mes billets', page: 'client_space', icon: Ticket },
    { label: 'LUMARÉEL Black Card', page: 'member_card', icon: CreditCard },
    { label: t('nav.account'), page: 'profile', icon: UserRound },
  ];

  const clubItems: Array<{
    label: string;
    page: PageView;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  }> = [
    { label: isEn ? 'Gift Points & Referrals' : 'Gift Points & Parrainage', page: 'rewards', icon: Gift },
    { label: 'Backstage', page: 'backstage', icon: Clapperboard },
    { label: isEn ? 'Memories' : 'Souvenirs', page: 'memories', icon: Camera },
    { label: isEn ? 'Your Voice' : 'Ta Voix', page: 'suggestions', icon: Mic2 },
  ];

  const go = (page: PageView) => setCurrentPage(page);

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-[244px] flex-col overflow-y-auto border-r border-black/[0.08] bg-white px-3 pb-5 pt-6 text-[#111111] dark:border-white/[0.10] dark:bg-black dark:text-white transition-colors duration-200">
      <button
        type="button"
        onClick={() => go('home')}
        aria-label={`LUMARÉEL ${t('nav.home')}`}
        className="mb-6 flex h-12 shrink-0 items-center px-3 cursor-pointer"
      >
        <img
          src="/assets/logo-lumareel.png"
          alt={platformSettings.platformName || 'LUMARÉEL'}
          className="h-8 w-auto object-contain invert dark:invert-0"
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
              className={`group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] leading-snug transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.07] cursor-pointer ${
                active
                  ? 'font-bold text-[#111111] bg-black/[0.06] dark:bg-white/[0.10] dark:text-white'
                  : 'text-[#6E6E73] dark:text-neutral-400'
              }`}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.3 : 1.75}
                fill={active && page === 'home' ? 'currentColor' : 'none'}
                className="shrink-0 transition-transform group-hover:scale-105"
              />
              <span className="min-w-0 truncate">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-5 pt-4 border-t border-black/[0.08] dark:border-white/10">
        <div className="px-3 pb-2 text-[10px] font-agrandir-bold uppercase tracking-[0.18em] text-[#86868B] dark:text-neutral-500">
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
                className={`group flex min-h-10 items-center gap-3 rounded-lg px-3 py-1.5 text-left text-[13.5px] leading-snug transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.07] cursor-pointer ${
                  active
                    ? 'font-bold text-[#111111] bg-black/[0.06] dark:bg-white/[0.10] dark:text-white'
                    : 'text-[#6E6E73] dark:text-neutral-400'
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={active ? 2.2 : 1.75}
                  className="shrink-0 transition-transform group-hover:scale-105"
                />
                <span className="min-w-0 truncate">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bas de barre : Mode Clair / Sombre + Langue + Paramètres */}
      <div className="mt-auto flex flex-col gap-2.5 pt-4 border-t border-black/[0.08] dark:border-white/10">
        <div className="flex items-center justify-between px-3 py-0.5">
          <span className="text-xs text-[#6E6E73] dark:text-neutral-500">
            {isEn ? 'Theme' : 'Mode'}
          </span>
          <div className="flex items-center p-0.5 rounded-full bg-black/[0.05] dark:bg-white/[0.07] border border-black/[0.08] dark:border-white/10 text-[11px] font-agrandir-bold">
            <button
              type="button"
              onClick={() => setTheme('light')}
              aria-label={isEn ? 'Light mode' : 'Mode clair'}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                theme === 'light'
                  ? 'bg-[#111111] text-white'
                  : 'text-[#6E6E73] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white'
              }`}
            >
              <Sun size={12} />
              <span>{isEn ? 'Light' : 'Clair'}</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              aria-label={isEn ? 'Dark mode' : 'Mode sombre'}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                theme === 'dark'
                  ? 'bg-white text-black'
                  : 'text-[#6E6E73] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white'
              }`}
            >
              <Moon size={12} />
              <span>{isEn ? 'Dark' : 'Sombre'}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between px-3 py-0.5">
          <span className="text-xs text-[#6E6E73] dark:text-neutral-500">
            {isEn ? 'Language' : 'Langue'}
          </span>
          <div className="flex items-center p-0.5 rounded-full bg-black/[0.05] dark:bg-white/[0.07] border border-black/[0.08] dark:border-white/10 text-[11px] font-agrandir-bold">
            <button
              type="button"
              onClick={() => setLanguage('fr')}
              className={`px-2.5 py-0.5 rounded-full cursor-pointer transition-colors ${
                language === 'fr'
                  ? 'bg-[#111111] text-white dark:bg-white dark:text-black'
                  : 'text-[#6E6E73] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white'
              }`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-0.5 rounded-full cursor-pointer transition-colors ${
                language === 'en'
                  ? 'bg-[#111111] text-white dark:bg-white dark:text-black'
                  : 'text-[#6E6E73] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white'
              }`}
            >
              EN
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => go('profile')}
          className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-[#6E6E73] dark:text-neutral-400 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
        >
          <Settings size={18} />
          <span className="truncate">{isEn ? 'Settings' : 'Paramètres'}</span>
        </button>
      </div>
    </aside>
  );
};
